import { useEffect, useMemo, useState } from 'react'
import SharedSidebar from '../components/SharedSidebar'
import { fetchUserProfile, updateUserProfile } from '../services/backendApi'
import styles from './ProfilePage.module.css'

const INITIAL_VISIBLE_QUIZZES = 3

function toPercentage(attempt) {
  const directAccuracy = Number(attempt?.accuracy)
  if (Number.isFinite(directAccuracy)) {
    return Math.max(0, Math.min(100, Math.round(directAccuracy)))
  }

  const scoreNumber = Number(attempt?.scoreNumber)
  const totalQuestions = Number(attempt?.totalQuestions)
  if (Number.isFinite(scoreNumber) && Number.isFinite(totalQuestions) && totalQuestions > 0) {
    return Math.max(0, Math.min(100, Math.round((scoreNumber / totalQuestions) * 100)))
  }

  const scoreText = String(attempt?.score || '')
  const scoreMatch = scoreText.match(/(\d+)\s*\/\s*(\d+)/)
  if (scoreMatch) {
    const obtained = Number(scoreMatch[1])
    const total = Number(scoreMatch[2])
    if (Number.isFinite(obtained) && Number.isFinite(total) && total > 0) {
      return Math.max(0, Math.min(100, Math.round((obtained / total) * 100)))
    }
  }

  return 0
}

function ProfilePage({ onNavigate = () => {}, currentUser = null, attempts = [], authToken = '', onProfileUpdated = () => {} }) {
  const [profile, setProfile] = useState({
    name: currentUser?.name || 'User',
    email: currentUser?.email || 'user@example.com',
    phone: '',
    location: 'Pune, India',
    classYear: 'B.Tech CSE - 3rd Year',
    bio: 'Focused on biology and logical reasoning. Preparing daily with adaptive quizzes.',
    photoUrl: '',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [draftProfile, setDraftProfile] = useState(profile)
  const [showAllQuizzes, setShowAllQuizzes] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [activeReviewTopic, setActiveReviewTopic] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!authToken) {
      return
    }

    let isMounted = true

    const loadProfile = async () => {
      try {
        const remoteProfile = await fetchUserProfile({ token: authToken })
        if (!isMounted) {
          return
        }
        setProfile((prev) => ({
          ...prev,
          ...remoteProfile,
        }))
        setDraftProfile((prev) => ({
          ...prev,
          ...remoteProfile,
        }))
      } catch {
        // Keep local fallback values if profile fetch fails.
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [authToken])

  const quizItems = useMemo(
    () =>
      attempts.map((attempt, index) => ({
        id: attempt.id || index + 1,
        topic: attempt.topic || 'Quiz Topic',
        date: attempt.date || '-',
        score: attempt.score || `${attempt.scoreNumber || 0} / ${attempt.totalQuestions || 0}`,
        time: typeof attempt.timeTakenSeconds === 'number'
          ? `${Math.floor(attempt.timeTakenSeconds / 60)}m ${String(attempt.timeTakenSeconds % 60).padStart(2, '0')}s`
          : '-',
        reviewAnswers: Array.isArray(attempt.reviewAnswers) ? attempt.reviewAnswers : [],
      })),
    [attempts],
  )

  const totalQuizzes = quizItems.length
  const accuracyRate =
    totalQuizzes > 0
      ? Math.round(
          quizItems.reduce((sum, _, idx) => sum + Number(attempts[idx]?.accuracy || 0), 0) /
            Math.max(1, totalQuizzes),
        )
      : 0

  const streakFromAttempts = useMemo(() => {
    if (!Array.isArray(attempts) || attempts.length === 0) {
      return 0
    }

    const parsedDates = attempts
      .map((attempt) => new Date(attempt.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime())

    if (parsedDates.length === 0) {
      return 0
    }

    const uniqueDescending = [...new Set(parsedDates)].sort((a, b) => b - a)
    let streak = 1

    for (let i = 1; i < uniqueDescending.length; i += 1) {
      const dayDelta = (uniqueDescending[i - 1] - uniqueDescending[i]) / (24 * 60 * 60 * 1000)
      if (dayDelta === 1) {
        streak += 1
      } else {
        break
      }
    }

    return streak
  }, [attempts])

  const scoreTrend = useMemo(() => {
    if (!Array.isArray(attempts) || attempts.length === 0) {
      return []
    }

    return attempts
      .slice(0, 10)
      .slice()
      .reverse()
      .map((attempt, index) => ({
        id: attempt.id || `${attempt.topic || 'quiz'}-${index}`,
        label: `Quiz ${index + 1}`,
        topic: attempt.topic || 'Quiz',
        percentage: toPercentage(attempt),
      }))
  }, [attempts])

  const lineChartData = useMemo(() => {
    const width = 560
    const height = 220
    const leftPad = 36
    const rightPad = 16
    const topPad = 18
    const bottomPad = 30
    const graphWidth = width - leftPad - rightPad
    const graphHeight = height - topPad - bottomPad
    const denominator = Math.max(1, scoreTrend.length - 1)

    const points = scoreTrend.map((entry, index) => {
      const x = leftPad + (index / denominator) * graphWidth
      const y = topPad + ((100 - entry.percentage) / 100) * graphHeight
      return {
        ...entry,
        x,
        y,
      }
    })

    return {
      width,
      height,
      leftPad,
      rightPad,
      topPad,
      bottomPad,
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
      yGuides: [0, 25, 50, 75, 100],
    }
  }, [scoreTrend])

  const hasMoreQuizzes = quizItems.length > INITIAL_VISIBLE_QUIZZES
  const visibleQuizzes = showAllQuizzes ? quizItems : quizItems.slice(0, INITIAL_VISIBLE_QUIZZES)

  const updateDraft = (key, value) => {
    setDraftProfile((prev) => ({ ...prev, [key]: value }))
  }

  const handleEdit = () => {
    setDraftProfile(profile)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setDraftProfile(profile)
    setIsEditing(false)
  }

  const handleSave = async () => {
    const nextProfile = {
      name: draftProfile.name.trim() || profile.name,
      email: draftProfile.email.trim() || profile.email,
      phone: draftProfile.phone.trim() || profile.phone,
      location: draftProfile.location.trim() || profile.location,
      classYear: draftProfile.classYear.trim() || profile.classYear,
      bio: draftProfile.bio.trim() || profile.bio,
      photoUrl: draftProfile.photoUrl,
    }

    setIsSaving(true)
    try {
      if (authToken) {
        const savedProfile = await updateUserProfile({ token: authToken, profile: nextProfile })
        setProfile(savedProfile)
        setDraftProfile(savedProfile)
        onProfileUpdated({ name: savedProfile.name, email: savedProfile.email })
      } else {
        setProfile(nextProfile)
      }
      setIsEditing(false)
    } catch {
      // Keep editor open if save fails.
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoChange = (event) => {
    const selectedFile = event.target.files && event.target.files[0] ? event.target.files[0] : null
    if (!selectedFile) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateDraft('photoUrl', String(reader.result || ''))
    }
    reader.readAsDataURL(selectedFile)
  }

  const handlePhotoRemove = () => {
    updateDraft('photoUrl', '')
  }

  const handleOpenReview = (topic) => {
    setActiveReviewTopic(topic)
    setShowReviewModal(true)
  }

  const reviewAnswers =
    quizItems.find((item) => item.topic === activeReviewTopic)?.reviewAnswers.map((item, idx) => ({
      id: item.id || idx + 1,
      question: item.question || item.prompt || '-',
      yourAnswer: item.yourAnswer || item.selected_answer || '-',
      correctAnswer: item.correctAnswer || item.correct_answer || '-',
      status: item.status || (item.is_correct ? 'Correct' : 'Incorrect'),
      explanation: item.explanation || '-',
    })) || []

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <SharedSidebar active="profile" onNavigate={onNavigate} />

        <main className={styles.main}>
          <header className={styles.header}>
            <h1 className={styles.title}>Profile</h1>
            <p className={styles.subtitle}>Manage your account and view your stats</p>
          </header>

          <section className={`${styles.card} ${styles.userCard}`}>
            <div className={styles.userLeft}>
              {isEditing && draftProfile.photoUrl ? (
                <img src={draftProfile.photoUrl} alt={draftProfile.name} className={styles.avatarImage} />
              ) : profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.name} className={styles.avatarImage} />
              ) : (
                <div className={styles.avatar}>{profile.name.charAt(0).toUpperCase()}</div>
              )}
              <div>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      className={styles.profileInput}
                      value={draftProfile.name}
                      onChange={(event) => updateDraft('name', event.target.value)}
                      placeholder="Full name"
                    />
                    <input
                      type="email"
                      className={styles.profileInput}
                      value={draftProfile.email}
                      onChange={(event) => updateDraft('email', event.target.value)}
                      placeholder="Email address"
                    />
                    <label className={styles.photoUpload}>
                      <span>Change Photo</span>
                      <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
                    </label>
                    <button
                      type="button"
                      className={styles.photoRemoveBtn}
                      onClick={handlePhotoRemove}
                      disabled={!draftProfile.photoUrl}
                    >
                      Remove Photo
                    </button>
                  </>
                ) : (
                  <>
                    <p className={styles.userName}>{profile.name}</p>
                    <p className={styles.userEmail}>{profile.email}</p>
                  </>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className={styles.editActions}>
                <button type="button" className={styles.cancelBtn} onClick={handleCancel}>Cancel</button>
                <button type="button" className={styles.editBtn} onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button type="button" className={styles.editBtn} onClick={handleEdit}>
                <span>✎</span>
                <span>Edit Profile</span>
              </button>
            )}
          </section>

          <section className={`${styles.card} ${styles.sectionCard}`}>
            <h3 className={styles.sectionTitle}>Progress Overview</h3>
            <p className={styles.sectionSub}>Your overall quiz performance</p>

            <div className={styles.statsRow}>
              <article className={`${styles.statBox} ${styles.statBlue}`}>
                <p className={styles.statValue}>{totalQuizzes}</p>
                <p className={styles.statLabel}>Total Quizzes</p>
              </article>

              <article className={`${styles.statBox} ${styles.statGreen}`}>
                <p className={styles.statValue}>{accuracyRate}%</p>
                <p className={styles.statLabel}>Accuracy Rate</p>
              </article>

              <article className={`${styles.statBox} ${styles.statOrange}`}>
                <p className={styles.statValue}>{streakFromAttempts} day{streakFromAttempts === 1 ? '' : 's'}</p>
                <p className={styles.statLabel}>Best Streak</p>
              </article>
            </div>

            <div className={styles.progressTrendWrap}>
              <div className={styles.progressTrendHead}>
                <p className={styles.progressTrendTitle}>Score Trend by Quiz</p>
                {scoreTrend.length > 0 ? (
                  <p className={styles.progressTrendMeta}>
                    Latest: {scoreTrend[scoreTrend.length - 1].percentage}%
                  </p>
                ) : null}
              </div>

              {scoreTrend.length > 0 ? (
                <div className={styles.progressLineChartWrap}>
                  <svg
                    viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`}
                    className={styles.progressLineChart}
                    role="img"
                    aria-label="Score trend line chart"
                  >
                    {lineChartData.yGuides.map((tick) => {
                      const y = lineChartData.topPad + ((100 - tick) / 100) * (lineChartData.height - lineChartData.topPad - lineChartData.bottomPad)
                      return (
                        <g key={tick}>
                          <line
                            x1={lineChartData.leftPad}
                            y1={y}
                            x2={lineChartData.width - lineChartData.rightPad}
                            y2={y}
                            className={styles.progressGuide}
                          />
                          <text x={8} y={y + 4} className={styles.progressTick}>
                            {tick}%
                          </text>
                        </g>
                      )
                    })}

                    {lineChartData.points.length > 1 ? (
                      <polyline points={lineChartData.polyline} className={styles.progressPolyline} />
                    ) : null}

                    {lineChartData.points.map((point) => (
                      <g key={point.id}>
                        <circle cx={point.x} cy={point.y} r="4" className={styles.progressDot} />
                        <text x={point.x} y={lineChartData.height - 8} textAnchor="middle" className={styles.progressXAxisLabel}>
                          {point.label.replace('Quiz ', 'Q')}
                        </text>
                      </g>
                    ))}
                  </svg>

                  <div className={styles.progressLegendList}>
                    {scoreTrend.map((entry) => (
                      <div key={`legend-${entry.id}`} className={styles.progressLegendItem}>
                        <span className={styles.progressLegendQuiz}>{entry.label}</span>
                        <span className={styles.progressLegendTopic}>{entry.topic}</span>
                        <span className={styles.progressLegendValue}>{entry.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className={styles.progressTrendEmpty}>Take quizzes to see your score trend graph here.</p>
              )}
            </div>
          </section>

          <section className={`${styles.card} ${styles.quizCard}`}>
            <h3 className={styles.sectionTitle}>Recent Quizzes</h3>

            <div className={styles.quizHead}>
              <span className={styles.quizHeadItem}>Topic</span>
              <span className={styles.quizHeadItem}>Marks</span>
              <span className={styles.quizHeadItem}>Time Taken</span>
              <span className={styles.quizHeadItem}>Review</span>
            </div>

            <div className={styles.quizList}>
              {visibleQuizzes.map((quiz) => (
                <article key={quiz.id} className={styles.quizRow}>
                  <div>
                    <p className={styles.quizTopic}>{quiz.topic}</p>
                    <p className={styles.quizDate}>{quiz.date}</p>
                  </div>
                  <p className={styles.quizScore}>{quiz.score}</p>
                  <p className={styles.quizTime}>{quiz.time}</p>
                  <button
                    type="button"
                    className={styles.quizReviewBtn}
                    onClick={() => handleOpenReview(quiz.topic)}
                    disabled={!quiz.reviewAnswers || quiz.reviewAnswers.length === 0}
                  >
                    Review
                  </button>
                </article>
              ))}
              {visibleQuizzes.length === 0 ? (
                <article className={styles.quizRow}>
                  <div>
                    <p className={styles.quizTopic}>No quiz attempts yet</p>
                    <p className={styles.quizDate}>Take a quiz to populate this section</p>
                  </div>
                  <p className={styles.quizScore}>-</p>
                  <p className={styles.quizTime}>-</p>
                  <button type="button" className={styles.quizReviewBtn} disabled>
                    Review
                  </button>
                </article>
              ) : null}
            </div>

            {hasMoreQuizzes && (
              <div className={styles.viewAll}>
                <button
                  type="button"
                  className={styles.viewAllBtn}
                  onClick={() => setShowAllQuizzes((prev) => !prev)}
                >
                  {showAllQuizzes ? 'Show Less Topics' : 'View All Topics'}
                </button>
              </div>
            )}
          </section>

          {showReviewModal && (
            <div className={styles.reviewModalOverlay} role="dialog" aria-modal="true" aria-label="Review answers">
              <div className={styles.reviewModal}>
                <div className={styles.reviewModalHead}>
                  <h3>Review Answers</h3>
                  <button type="button" className={styles.reviewModalClose} onClick={() => setShowReviewModal(false)}>
                    ✕
                  </button>
                </div>

                <div className={styles.reviewModalBody}>
                  <p className={styles.reviewTopic}>Topic: {activeReviewTopic}</p>
                  {reviewAnswers.map((item) => (
                    <article key={item.id} className={styles.reviewCard}>
                      <p className={styles.reviewQuestion}>Q{item.id}. {item.question}</p>
                      <p className={styles.reviewLine}><strong>Your Answer:</strong> {item.yourAnswer}</p>
                      <p className={styles.reviewLine}><strong>Correct Answer:</strong> {item.correctAnswer}</p>
                      <p className={styles.reviewLine}><strong>Explanation:</strong> {item.explanation}</p>
                      <span className={`${styles.reviewStatus} ${item.status === 'Correct' ? styles.reviewStatusCorrect : styles.reviewStatusIncorrect}`}>
                        {item.status}
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default ProfilePage
