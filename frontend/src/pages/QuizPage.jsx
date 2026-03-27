import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SharedSidebar from '../components/SharedSidebar'
import {
  fetchFinalInsights,
  fetchLeaderboard,
  generateQuiz,
  submitQuizSection,
} from '../services/backendApi'
import './QuizPage.css'

const difficultyOrder = ['Beginner', 'Intermediate', 'Advanced']

function normalizeDifficulty(level) {
  const value = String(level || '').toLowerCase()
  if (value === 'beginner') return 'Beginner'
  if (value === 'advanced') return 'Advanced'
  return 'Intermediate'
}

function toBackendDifficulty(level) {
  return String(level || 'Intermediate').toLowerCase()
}

function answerKeyFor(sectionName, questionId) {
  return `${sectionName}::${questionId}`
}

function buildLeaderboardRows(leaderboardPayload, userScore) {
  const apiEntries = Array.isArray(leaderboardPayload?.entries)
    ? leaderboardPayload.entries.map((row, idx) => ({
        id: row.user_id,
        name: `User ${row.user_id}`,
        points: Math.round(row.score),
        rank: idx + 1,
      }))
    : []

  const withYou = [...apiEntries, { id: 'you', name: 'You', points: userScore, rank: 0 }]
    .sort((a, b) => b.points - a.points)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }))

  const yourRank = withYou.find((row) => row.id === 'you')?.rank || 0
  let rows = withYou.slice(0, 5)
  if (!rows.some((row) => row.id === 'you')) {
    rows = [...rows.slice(0, 4), withYou.find((row) => row.id === 'you')].filter(Boolean)
  }

  return { rows, yourRank }
}

function QuizPage({ onNavigate = () => {}, onQuizComplete = () => {}, analysisData = null, authToken = '' }) {
  const totalTimeSeconds = 10 * 60
  const topic = analysisData?.topic || 'General Science'
  const questionCount = 5

  const [hasStarted, setHasStarted] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState('')

  const [quizSessionId, setQuizSessionId] = useState('')
  const [questionsByDifficulty, setQuestionsByDifficulty] = useState({
    Beginner: [],
    Intermediate: [],
    Advanced: [],
  })
  const [verificationByDifficulty, setVerificationByDifficulty] = useState({})
  const [submitResultByDifficulty, setSubmitResultByDifficulty] = useState({})

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [answersByQuestionId, setAnswersByQuestionId] = useState({})

  const [showSectionLeaderboard, setShowSectionLeaderboard] = useState(false)
  const [completedSection, setCompletedSection] = useState('')
  const [sectionLeaderboard, setSectionLeaderboard] = useState({ rows: [], yourRank: 0 })
  const [isFinalizing, setIsFinalizing] = useState(false)
  const terminationTriggeredRef = useRef(false)

  const [timeLeft, setTimeLeft] = useState(totalTimeSeconds)

  const availableSections = difficultyOrder
  const currentSectionName = availableSections[currentSectionIndex]
  const currentSectionQuestions = questionsByDifficulty[currentSectionName] || []
  const currentQuestion = currentSectionQuestions[currentQuestionIndex]
  const isLastQuestionInSection = currentQuestionIndex === currentSectionQuestions.length - 1
  const isLastSection = currentSectionIndex === availableSections.length - 1

  const totalQuestions = useMemo(
    () => difficultyOrder.reduce((sum, level) => sum + (questionsByDifficulty[level]?.length || 0), 0),
    [questionsByDifficulty],
  )

  const overallQuestionNumber = useMemo(() => {
    const before = availableSections
      .slice(0, currentSectionIndex)
      .reduce((sum, level) => sum + (questionsByDifficulty[level]?.length || 0), 0)
    return before + currentQuestionIndex + 1
  }, [availableSections, currentQuestionIndex, currentSectionIndex, questionsByDifficulty])

  useEffect(() => {
    if (!hasStarted || showSectionLeaderboard) {
      return undefined
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [hasStarted, showSectionLeaderboard])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const prepareQuiz = async () => {
    if (!authToken) {
      setError('You need to log in before starting a quiz.')
      return
    }

    setIsPreparing(true)
    setError('')

    try {
      const id = `quiz_${Date.now()}`
      const sectionPayloads = []
      for (const level of difficultyOrder) {
        // Sequential calls avoid cache races on backend and prevent duplicate full LLM generations.
        // The first request generates all sections; subsequent requests reuse cached sections.
        const payload = await generateQuiz({
          token: authToken,
          quizId: id,
          inputType: 'topic',
          topic,
          difficulty: toBackendDifficulty(level),
          questionCount,
        })
        sectionPayloads.push(payload)
      }

      const nextQuestions = {
        Beginner: [],
        Intermediate: [],
        Advanced: [],
      }
      const nextVerification = {}

      sectionPayloads.forEach((payload) => {
        const level = normalizeDifficulty(payload?.difficulty)
        nextQuestions[level] = (payload?.questions || []).map((q) => ({
          id: q.question_id,
          question: q.prompt,
          options: (q.options || []).map((label, idx) => ({
            id: String.fromCharCode(65 + idx),
            label,
            hint: '',
          })),
        }))
        nextVerification[level] = payload?.verification_token || ''
      })

      setQuizSessionId(id)
      setQuestionsByDifficulty(nextQuestions)
      setVerificationByDifficulty(nextVerification)
      setSubmitResultByDifficulty({})
      setAnswersByQuestionId({})
      setCurrentSectionIndex(0)
      setCurrentQuestionIndex(0)
      setSelectedOption(null)
      setTimeLeft(totalTimeSeconds)
      setShowSectionLeaderboard(false)
      setCompletedSection('')
      terminationTriggeredRef.current = false
      setHasStarted(true)
    } catch (err) {
      setError(err?.message || 'Failed to prepare quiz.')
    } finally {
      setIsPreparing(false)
    }
  }

  const buildSectionAnswers = useCallback((level) => {
    const sectionQuestions = questionsByDifficulty[level] || []
    return sectionQuestions.map((q) => {
      const selectedOptionId = answersByQuestionId[answerKeyFor(level, q.id)]
      const selectedOption = q.options.find((opt) => opt.id === selectedOptionId)
      return {
        question_id: q.id,
        answer: selectedOption?.label || '',
      }
    })
  }, [answersByQuestionId, questionsByDifficulty])

  const submitCurrentSection = async () => {
    const level = currentSectionName
    const verificationToken = verificationByDifficulty[level]
    const answers = buildSectionAnswers(level)

    const submitPayload = await submitQuizSection({
      token: authToken,
      quizId: quizSessionId,
      difficulty: toBackendDifficulty(level),
      verificationToken,
      answers,
    })

    setSubmitResultByDifficulty((prev) => ({ ...prev, [level]: submitPayload }))

    const leaderboardPayload = await fetchLeaderboard({
      token: authToken,
      difficulty: toBackendDifficulty(level),
      limit: 10,
    })

    const points = submitPayload?.marks_obtained || submitPayload?.correct_count || 0
    setSectionLeaderboard(buildLeaderboardRows(leaderboardPayload, points))
    return submitPayload
  }

  const finishQuiz = useCallback(async (sectionResultsOverride = null) => {
    setIsFinalizing(true)
    try {
      const [finalInsights, overallLeaderboard] = await Promise.all([
        fetchFinalInsights({ token: authToken, quizId: quizSessionId }),
        fetchLeaderboard({ token: authToken, difficulty: 'overall', limit: 10 }),
      ])

      const sectionResultSource = sectionResultsOverride || submitResultByDifficulty

      const sectionScores = {
        Beginner: sectionResultSource.Beginner?.marks_obtained || sectionResultSource.Beginner?.correct_count || 0,
        Intermediate: sectionResultSource.Intermediate?.marks_obtained || sectionResultSource.Intermediate?.correct_count || 0,
        Advanced: sectionResultSource.Advanced?.marks_obtained || sectionResultSource.Advanced?.correct_count || 0,
      }

      const correctCount = Object.values(sectionScores).reduce((sum, n) => sum + n, 0)
      const accuracy = Math.round((correctCount / Math.max(1, totalQuestions)) * 100)
      const sectionReviewItems = difficultyOrder.flatMap((level) => {
        const items = sectionResultSource[level]?.review_items
        return Array.isArray(items) ? items : []
      })

      const reviewAnswers = sectionReviewItems.length > 0
        ? sectionReviewItems.map((item, idx) => ({
            id: idx + 1,
            question: item.prompt,
            yourAnswer: item.selected_answer || 'Not Answered',
            correctAnswer: item.correct_answer || '-',
            status: item.is_correct ? 'Correct' : 'Incorrect',
            explanation: item.explanation || '',
          }))
        : (finalInsights?.wrong_answers || []).map((item, idx) => ({
            id: idx + 1,
            question: item.prompt,
            yourAnswer: item.selected_answer || 'Not Answered',
            correctAnswer: item.correct_answer || '-',
            status: 'Incorrect',
            explanation: item.explanation || '',
          }))

      onQuizComplete({
        id: Date.now(),
        topic,
        difficulty: 'Mixed',
        score: `${correctCount} / ${totalQuestions}`,
        scoreNumber: correctCount,
        totalQuestions,
        accuracy,
        timeTakenSeconds: totalTimeSeconds - timeLeft,
        sectionScores,
        insights: finalInsights?.insights || null,
        overallLeaderboard: overallLeaderboard?.entries || [],
        reviewAnswers,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      })
    } catch (err) {
      setError(err?.message || 'Failed to finalize quiz.')
    } finally {
      setIsFinalizing(false)
    }
  }, [authToken, onQuizComplete, quizSessionId, submitResultByDifficulty, timeLeft, topic, totalQuestions, totalTimeSeconds])

  useEffect(() => {
    if (!hasStarted || showSectionLeaderboard || isFinalizing) {
      return undefined
    }

    const terminateQuiz = async (reason) => {
      if (terminationTriggeredRef.current) {
        return
      }
      terminationTriggeredRef.current = true
      setError(`${reason} Quiz terminated. Unanswered questions were submitted as zero.`)
      setIsFinalizing(true)

      try {
        const mergedResults = { ...submitResultByDifficulty }
        for (let idx = currentSectionIndex; idx < difficultyOrder.length; idx += 1) {
          const level = difficultyOrder[idx]
          if (mergedResults[level]) {
            continue
          }

          const verificationToken = verificationByDifficulty[level]
          const answers = buildSectionAnswers(level)

          const submitPayload = await submitQuizSection({
            token: authToken,
            quizId: quizSessionId,
            difficulty: toBackendDifficulty(level),
            verificationToken,
            answers,
          })
          mergedResults[level] = submitPayload
        }

        setSubmitResultByDifficulty(mergedResults)
        await finishQuiz(mergedResults)
      } catch (err) {
        setError(err?.message || 'Failed to auto-submit terminated quiz.')
        setIsFinalizing(false)
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        void terminateQuiz('Tab switch detected.')
      }
    }

    const onWindowBlur = () => {
      void terminateQuiz('Window/tab focus lost.')
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onWindowBlur)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [
    hasStarted,
    showSectionLeaderboard,
    isFinalizing,
    submitResultByDifficulty,
    currentSectionIndex,
    verificationByDifficulty,
    answersByQuestionId,
    questionsByDifficulty,
    authToken,
    quizSessionId,
    buildSectionAnswers,
    finishQuiz,
  ])

  const handleNext = async () => {
    if (!currentQuestion) {
      return
    }

    if (!isLastQuestionInSection) {
      const nextQuestion = currentSectionQuestions[currentQuestionIndex + 1]
      setCurrentQuestionIndex((prev) => prev + 1)
      setSelectedOption(nextQuestion ? answersByQuestionId[answerKeyFor(currentSectionName, nextQuestion.id)] || null : null)
      return
    }

    try {
      const sectionResult = await submitCurrentSection()
      if (!isLastSection) {
        setCompletedSection(currentSectionName)
        setShowSectionLeaderboard(true)
      } else {
        const mergedResults = {
          ...submitResultByDifficulty,
          [currentSectionName]: sectionResult,
        }
        await finishQuiz(mergedResults)
      }
    } catch (err) {
      setError(err?.message || `Failed to submit ${currentSectionName} section.`)
    }
  }

  const handleStartNextSection = () => {
    const nextSectionIndex = currentSectionIndex + 1
    const nextSectionName = availableSections[nextSectionIndex]
    const firstQuestion = nextSectionName ? questionsByDifficulty[nextSectionName][0] : null

    setCurrentSectionIndex(nextSectionIndex)
    setCurrentQuestionIndex(0)
    setSelectedOption(firstQuestion ? answersByQuestionId[answerKeyFor(nextSectionName, firstQuestion.id)] || null : null)
    setShowSectionLeaderboard(false)
    setCompletedSection('')
  }

  return (
    <div className="quiz-page">
      <SharedSidebar active="quiz" onNavigate={onNavigate} />

      <main className="quiz-main">
        {!hasStarted ? (
          <section className="quiz-shell quiz-intro-shell">
            <h2 className="quiz-title">Quiz Overview</h2>
            <p className="quiz-subtitle">Backend-connected session quiz with 3 sections.</p>

            <div className="quiz-intro-grid">
              <article className="quiz-intro-item">
                <p className="quiz-intro-label">Topic</p>
                <p className="quiz-intro-value">{topic}</p>
              </article>
              <article className="quiz-intro-item">
                <p className="quiz-intro-label">Difficulty</p>
                <p className="quiz-intro-value">Beginner + Intermediate + Advanced</p>
              </article>
              <article className="quiz-intro-item">
                <p className="quiz-intro-label">Questions / section</p>
                <p className="quiz-intro-value">{questionCount}</p>
              </article>
              <article className="quiz-intro-item">
                <p className="quiz-intro-label">Time Limit</p>
                <p className="quiz-intro-value">10 Minutes</p>
              </article>
              <article className="quiz-intro-item">
                <p className="quiz-intro-label">Sections</p>
                <p className="quiz-intro-value">3</p>
              </article>
              <article className="quiz-intro-item">
                <p className="quiz-intro-label">Total Questions</p>
                <p className="quiz-intro-value">{questionCount * 3}</p>
              </article>
            </div>

            {error ? <p className="quiz-footer" style={{ color: '#b91c1c' }}>{error}</p> : null}

            <div className="quiz-actions quiz-actions-start">
              <button type="button" className="quiz-next-btn" onClick={prepareQuiz} disabled={isPreparing}>
                {isPreparing ? 'Preparing Quiz...' : 'Start Quiz'}
              </button>
            </div>
          </section>
        ) : showSectionLeaderboard ? (
          <section className="quiz-shell quiz-section-shell">
            <div className="quiz-top">
              <div>
                <h2 className="quiz-title">{completedSection} Section Complete</h2>
                <p className="quiz-subtitle">Top 5 and your current rank for {completedSection}</p>
              </div>
              <div className="quiz-timer">🕐 {timerText}</div>
            </div>

            <article className="quiz-section-board">
              <p className="quiz-section-points">
                Your {completedSection} Points: {submitResultByDifficulty[completedSection]?.correct_count || 0} pts
              </p>

              <div className="quiz-section-chart" role="img" aria-label="Section leaderboard bar chart">
                {sectionLeaderboard.rows.map((entry) => {
                  const numericPoints = Number(entry.points || 0)
                  const highest = Math.max(1, ...sectionLeaderboard.rows.map((item) => Number(item.points || 0)))
                  const width = Math.max(8, Math.round((numericPoints / highest) * 100))
                  return (
                    <div key={`${entry.id}-${entry.rank}`} className="quiz-section-bar-row">
                      <span className="quiz-section-rank">#{entry.rank}</span>
                      <span className="quiz-section-name">{entry.name}</span>
                      <div className="quiz-section-bar-track">
                        <div className="quiz-section-bar-fill" style={{ width: `${width}%` }} />
                      </div>
                      <span className="quiz-section-score">{entry.points} pts</span>
                    </div>
                  )
                })}
              </div>

              <p className="quiz-section-rank-note">Your Rank: #{sectionLeaderboard.yourRank || '-'}</p>
            </article>

            <div className="quiz-actions">
              <button type="button" className="quiz-next-btn" onClick={handleStartNextSection}>
                Next Section →
              </button>
            </div>
          </section>
        ) : (
          <section className="quiz-shell">
            <div className="quiz-top">
              <div>
                <h2 className="quiz-title">Quiz</h2>
                <p className="quiz-subtitle">Answer the following question</p>
              </div>
              <div className="quiz-timer">🕐 {timerText}</div>
            </div>

            {error ? <p className="quiz-footer" style={{ color: '#b91c1c' }}>{error}</p> : null}

            {currentQuestion ? (
              <>
                <article className="quiz-question-card">
                  <div className="quiz-question-top">
                    <div className="quiz-chip-group">
                      <span className="quiz-chip-left">🔍 Question {overallQuestionNumber} of {totalQuestions}</span>
                      <span className="quiz-chip-points">1 pts</span>
                    </div>
                    <span className="quiz-chip-right">● {currentSectionName}</span>
                  </div>
                  <p className="quiz-question-text">{currentQuestion.question}</p>
                </article>

                <div className="quiz-options">
                  {currentQuestion.options.map((option) => {
                    const isSelected = selectedOption === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`quiz-option ${isSelected ? 'quiz-option-selected' : ''}`}
                        onClick={() => {
                          setSelectedOption(option.id)
                          setAnswersByQuestionId((prev) => ({
                            ...prev,
                            [answerKeyFor(currentSectionName, currentQuestion.id)]: option.id,
                          }))
                        }}
                      >
                        <span className="quiz-radio">{isSelected ? '✓' : ''}</span>
                        <span>
                          <p className="quiz-option-title">{option.id}) {option.label}</p>
                          <p className="quiz-option-hint">{option.hint}</p>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="quiz-actions">
                  <button type="button" className="quiz-next-btn" onClick={handleNext} disabled={isFinalizing}>
                    {isFinalizing
                      ? 'Submitting...'
                      : isLastQuestionInSection
                        ? (isLastSection ? 'Submit & Finish' : `Finish ${currentSectionName} →`)
                        : 'Next →'}
                  </button>
                </div>
              </>
            ) : (
              <p className="quiz-subtitle">Loading questions...</p>
            )}

            <p className="quiz-footer">Multiple Choice · Single Answer · Auto-Grading · Backend Connected</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default QuizPage
