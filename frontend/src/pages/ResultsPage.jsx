import { useState } from 'react'
import SharedSidebar from '../components/SharedSidebar'
import './ResultsPage.css'

const baseLeaderboard = [
  { id: 1, name: 'Priya', points: 507, initial: 'P', avatarClass: 'rp-avatar-priya' },
  { id: 2, name: 'Rahul', points: 482, initial: 'R', avatarClass: 'rp-avatar-rahul' },
  { id: 3, name: 'Nat', points: 445, initial: 'N', avatarClass: 'rp-avatar-nat' },
  { id: 4, name: 'Ananya', points: 389, initial: 'A', avatarClass: 'rp-avatar-ananya' },
  { id: 5, name: 'Vikram', points: 373, initial: 'V', avatarClass: 'rp-avatar-vikram' },
]

const defaultInsights = {
  strengths: ['Keep practicing consistently to improve speed and accuracy.'],
  weaknesses: ['No weaknesses available yet. Complete a full quiz session first.'],
  recommendations: ['Take all three sections and review final insights for targeted improvement.'],
}

function sanitizeInsightText(text = '') {
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .trim()
}

function sanitizeInsightList(items = [], fallback = []) {
  const cleaned = Array.isArray(items)
    ? items.map((item) => sanitizeInsightText(item)).filter(Boolean)
    : []
  return cleaned.length > 0 ? cleaned : fallback
}

function ResultsPage({ onNavigate = () => {}, latestAttempt = null, attempts = [], userQuizPoints = 0 }) {
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showAllRows, setShowAllRows] = useState(false)
  const activeTopic = latestAttempt ? latestAttempt.topic : 'No Quiz Attempt Yet'
  const reviewedAnswers = latestAttempt ? latestAttempt.reviewAnswers : []
  const totalQuizzes = attempts.length
  const accuracy = latestAttempt ? latestAttempt.accuracy : 0
  const bestStreak = Math.max(1, Math.min(7, totalQuizzes))
  const yourLeaderboardPoints = userQuizPoints
  const apiLeaderboard = Array.isArray(latestAttempt?.overallLeaderboard)
    ? latestAttempt.overallLeaderboard.map((entry, idx) => ({
        id: entry.user_id,
        name: `User ${entry.user_id}`,
        points: Math.round(entry.score),
        initial: String(entry.user_id).slice(0, 1),
        avatarClass: 'rp-avatar-priya',
        rank: idx + 1,
      }))
    : []
  const fallbackPool = apiLeaderboard.length > 0 ? apiLeaderboard : baseLeaderboard

  const yourEntry = {
    id: 'you',
    name: 'You',
    points: yourLeaderboardPoints,
    initial: 'Y',
    avatarClass: 'rp-avatar-you',
  }
  const rankedLeaderboard = [...fallbackPool, yourEntry].sort((a, b) => b.points - a.points)
  const yourRank = rankedLeaderboard.findIndex((entry) => entry.id === 'you') + 1
  let leaderboard = rankedLeaderboard.slice(0, 5)
  if (!leaderboard.some((entry) => entry.id === 'you')) {
    leaderboard = [...leaderboard.slice(0, 4), yourEntry]
  }
  const tableRows = attempts.map((attempt, index) => ({
    id: attempt.id || index + 1,
    date: attempt.date,
    topic: attempt.topic,
    score: attempt.score,
    difficulty: attempt.difficulty,
  }))
  const hasMoreThanThree = tableRows.length > 3
  const visibleRows = showAllRows ? tableRows : tableRows.slice(0, 3)
  const sectionScores = latestAttempt?.sectionScores || {}
  const insights = {
    strengths: sanitizeInsightList(latestAttempt?.insights?.strengths, defaultInsights.strengths),
    weaknesses: sanitizeInsightList(latestAttempt?.insights?.weaknesses, defaultInsights.weaknesses),
    recommendations: sanitizeInsightList(latestAttempt?.insights?.recommendations, defaultInsights.recommendations),
  }
  const sectionScoreRows = [
    { key: 'Beginner', value: sectionScores.Beginner || 0 },
    { key: 'Intermediate', value: sectionScores.Intermediate || 0 },
    { key: 'Advanced', value: sectionScores.Advanced || 0 },
  ]

  const handleCloseModal = () => {
    setShowReviewModal(false)
  }

  return (
    <div className="rp-page">
      <SharedSidebar active="results" onNavigate={onNavigate} />

      <main className="rp-main">
        <div className="rp-container">
          <header className="rp-header">
            <h1>Results &amp; Progress</h1>
            <p>Track your learning journey and quiz performance</p>
          </header>

          <section className="rp-banner">
            <div>
              <p className="rp-banner-title">🏆 🎉 Congratulations!</p>
              <p className="rp-banner-text">
                You scored <strong>{latestAttempt ? latestAttempt.score : '0 / 0'}</strong> on the quiz <strong>'{activeTopic}'</strong>
              </p>
            </div>
            <button type="button" className="rp-great-btn">
              Great work!
            </button>
          </section>

          <section className="rp-grid">
            <article className="rp-card rp-progress-card">
              <h2>Progress Overview</h2>
              <div className="rp-metric rp-metric-green">✅ <strong>{accuracy}%</strong> accuracy in your latest quiz</div>
              <div className="rp-metric rp-metric-orange">🔥 <strong>{bestStreak} day{bestStreak > 1 ? 's' : ''}</strong> Best Streak</div>
              <div className="rp-metric rp-metric-gray">📅 <strong>{totalQuizzes}</strong> Total Quizzes</div>

              <div className="rp-section-scores">
                <p className="rp-section-scores-title">Section-wise Score</p>
                <div className="rp-section-scores-grid">
                  {sectionScoreRows.map((row) => (
                    <div key={row.key} className="rp-section-score-card">
                      <p className="rp-section-score-label">{row.key}</p>
                      <p className="rp-section-score-value">{row.value} pts</p>
                    </div>
                  ))}
                </div>
              </div>

              <button type="button" className="rp-review-btn" onClick={() => setShowReviewModal(true)}>
                Review Answers
              </button>
            </article>

            <article className="rp-card rp-leaderboard-card">
              <h2>🏆 Leaderboard</h2>
              <div className="rp-leaderboard-list">
                {leaderboard.map((entry) => (
                  <div key={entry.id} className="rp-leader-row">
                    <div className={`rp-avatar ${entry.avatarClass}`}>{entry.initial}</div>
                    <p className="rp-leader-name">{entry.name}</p>
                    <p className="rp-leader-points">{entry.points} pts</p>
                  </div>
                ))}
              </div>
              <p className="rp-link">Your Rank: #{yourRank || '-'} · {yourLeaderboardPoints} pts</p>
              <a href="#" className="rp-link">
                View Full Leaderboard →
              </a>
            </article>
          </section>

          <section className="rp-card rp-table-card">
            <h2>Final Insights</h2>
            <div className="notes-insights-grid">
              <div className="notes-insight-card notes-insight-good">
                <p className="notes-insight-title">Strengths</p>
                <ul className="notes-insight-list">
                  {insights.strengths.map((item, index) => (
                    <li key={`strength-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="notes-insight-card notes-insight-warn">
                <p className="notes-insight-title">Weaknesses</p>
                <ul className="notes-insight-list">
                  {insights.weaknesses.map((item, index) => (
                    <li key={`weakness-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="notes-insight-card notes-insight-info">
                <p className="notes-insight-title">Recommendations</p>
                <ul className="notes-insight-list">
                  {insights.recommendations.map((item, index) => (
                    <li key={`recommendation-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="rp-card rp-table-card">
            <h2>Date Taken</h2>
            <div className="rp-table-wrap">
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>Date Taken</th>
                    <th>Topic</th>
                    <th>Score</th>
                    <th>Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length > 0 ? (
                    visibleRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td className="rp-topic-cell">{row.topic}</td>
                        <td className="rp-score-cell">{row.score}</td>
                        <td>
                          <span className="rp-difficulty-pill">{row.difficulty}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4">No quiz attempts yet. Complete a quiz to see real results.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {hasMoreThanThree && (
              <button
                type="button"
                className="rp-link rp-link-center rp-link-button"
                onClick={() => setShowAllRows((prev) => !prev)}
              >
                {showAllRows ? 'Show Less Quizzes' : 'View All Quizzes →'}
              </button>
            )}
          </section>
        </div>

        {showReviewModal && (
          <div className="rp-modal-overlay" role="dialog" aria-modal="true" aria-label="Review answers">
            <div className="rp-modal">
              <div className="rp-modal-head">
                <h3>Answer Review</h3>
                <button type="button" className="rp-modal-close" onClick={handleCloseModal}>
                  ✕
                </button>
              </div>

              <div className="rp-modal-body">
                <p className="rp-review-topic">Topic: {activeTopic}</p>
                {reviewedAnswers.length > 0 ? (
                  reviewedAnswers.map((item, idx) => {
                    const questionId = item.id || idx + 1
                    const questionText = item.question || item.prompt || '-'
                    const yourAnswer = item.yourAnswer || item.selected_answer || '-'
                    const correctAnswer = item.correctAnswer || item.correct_answer || '-'
                    const status = item.status || (item.is_correct ? 'Correct' : 'Incorrect')
                    const explanation = item.explanation || '-'

                    return (
                    <article key={questionId} className="rp-answer-card">
                      <p className="rp-answer-question">Q{questionId}. {questionText}</p>
                      <p className="rp-answer-line"><strong>Your Answer:</strong> {yourAnswer}</p>
                      <p className="rp-answer-line"><strong>Correct Answer:</strong> {correctAnswer}</p>
                      <p className="rp-answer-line"><strong>Explanation:</strong> {explanation}</p>
                      <span className={`rp-answer-status ${status === 'Correct' ? 'rp-answer-status-correct' : 'rp-answer-status-incorrect'}`}>
                        {status}
                      </span>
                    </article>
                    )
                  })
                ) : (
                  <p className="rp-answer-line">No answer review available yet. Take a quiz first.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ResultsPage
