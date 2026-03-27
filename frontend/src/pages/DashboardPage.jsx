import { useEffect, useState } from 'react'
import SharedSidebar from '../components/SharedSidebar'
import { fetchLeaderboard } from '../services/backendApi'
import './DashboardPage.css'

function DashboardPage({ onNavigate = () => {}, userQuizPoints = 0, onAnalyze = async () => {}, authToken = '', currentUser = null }) {
  const [topic, setTopic] = useState('')
  const [file, setFile] = useState(null)
  const [showProgress, setShowProgress] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisError, setAnalysisError] = useState('')
  const [liveLeaderboardEntries, setLiveLeaderboardEntries] = useState([])

  const handleFileChange = (event) => {
    const selected = event.target.files && event.target.files[0] ? event.target.files[0] : null
    setFile(selected)
  }

  useEffect(() => {
    if (!showProgress) {
      return undefined
    }

    if (analysisProgress >= 92) {
      return undefined
    }

    const timer = setTimeout(() => {
      setAnalysisProgress((prev) => Math.min(92, prev + 4))
    }, 90)

    return () => clearTimeout(timer)
  }, [showProgress, analysisProgress])

  useEffect(() => {
    let cancelled = false

    const loadLeaderboard = async () => {
      if (!authToken) {
        return
      }

      try {
        const payload = await fetchLeaderboard({ token: authToken, difficulty: 'overall', limit: 5 })
        if (!cancelled) {
          setLiveLeaderboardEntries(Array.isArray(payload?.entries) ? payload.entries : [])
        }
      } catch {
        if (!cancelled) {
          setLiveLeaderboardEntries([])
        }
      }
    }

    loadLeaderboard()
    return () => {
      cancelled = true
    }
  }, [authToken])

  const mappedLeaderboard = liveLeaderboardEntries.map((entry, index) => {
    const displayName = `User ${entry.user_id}`

    return {
      userId: entry.user_id,
      rank: index + 1,
      name: displayName,
      points: Math.round(entry.score || 0),
    }
  })

  const currentUserId = Number(currentUser?.id || 0)
  const topThreeRows = mappedLeaderboard.slice(0, 3)
  const rankMap = new Map(topThreeRows.map((row) => [row.rank, row]))
  const podiumOrder = [rankMap.get(2) || null, rankMap.get(1) || null, rankMap.get(3) || null]
  const maxPodiumPoints = Math.max(1, ...topThreeRows.map((row) => Number(row.points || 0)))
  const userName = currentUser?.name || 'You'
  const yourRank =
    mappedLeaderboard.length > 0
      ? Math.max(
          1,
          mappedLeaderboard.findIndex((row) => Number(row.userId) === currentUserId) + 1,
        )
      : '-'

  const handleAnalyzeClick = async () => {
    if (showProgress) {
      return
    }

    if (!topic.trim() && !file) {
      setAnalysisError('Enter a topic or upload a file before analyzing.')
      return
    }

    setAnalysisError('')
    setShowProgress(true)
    setAnalysisProgress(0)

    try {
      await onAnalyze({ topic, file })
      setAnalysisProgress(100)
    } catch (error) {
      setShowProgress(false)
      setAnalysisProgress(0)
      setAnalysisError(error?.message || 'Unable to analyze your content right now. Please try again.')
    }
  }

  return (
    <div className="dashboard-page">
      <SharedSidebar active="dashboard" onNavigate={onNavigate} />

      <main className="dashboard-main">
        <div className="dashboard-shell">
          <header className="dashboard-header">
            <h1>Learn</h1>
            <p>Create quizzes from any topic or document with AI</p>
          </header>

          <div className="dashboard-inputs-grid">
            <section className="dashboard-card">
              <h3 className="dashboard-section-title">
                <span className="dashboard-icon-circle">✏️</span>
                <span>1. Explain a Topic</span>
              </h3>
              <p className="dashboard-section-subtitle">
                Type or paste the topic you want a quiz on. Our AI will understand and generate relevant questions.
              </p>
              <textarea
                className="dashboard-textarea"
                placeholder="e.g., Photosynthesis in Plants, Newton's Laws of Motion, Python Functions..."
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              />
            </section>

            <section className="dashboard-card">
              <h3 className="dashboard-section-title">
                <span className="dashboard-icon-circle">📄</span>
                <span>2. Upload a Document</span>
                <span className="dashboard-section-title-inline">(RAG Powered)</span>
              </h3>
              <p className="dashboard-section-subtitle">
                Upload notes, PDFs, or study materials. Our AI will use Retrieval Augmented Generation to learn from your content.
              </p>

              <label className="dashboard-upload-box">
                <div className="dashboard-upload-icon">☁️</div>
                <p className="dashboard-upload-title">Click to Upload or Drag & Drop</p>
                <p className="dashboard-upload-meta">Supports: PDF, TXT, MD, CSV, JSON, LOG (Max 20MB)</p>
                <span className="dashboard-browse-btn">Browse Files</span>
                <input type="file" accept=".pdf,.txt,.md,.csv,.json,.log,text/*,application/pdf" hidden onChange={handleFileChange} />
              </label>

              {file ? <p className="dashboard-upload-meta">Selected file: {file.name}</p> : null}
            </section>
          </div>

          <section className="dashboard-card dashboard-analyze-card">
            <h3 className="dashboard-difficulty-title">Ready to Analyze?</h3>

            {showProgress && (
              <>
                <div className="dashboard-progress-head">
                  <span className="dashboard-progress-label">Analyzing content</span>
                  <span className="dashboard-progress-value">{analysisProgress}%</span>
                </div>
                <div className="dashboard-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={analysisProgress}>
                  <div className="dashboard-progress-fill" style={{ width: `${analysisProgress}%` }} />
                </div>
              </>
            )}

            <button
              type="button"
              className="dashboard-generate-btn"
              onClick={handleAnalyzeClick}
              disabled={showProgress}
            >
              {showProgress ? `Analyzing with LLM... ${analysisProgress}%` : 'Analyze'}
            </button>
            <p className="dashboard-generate-subtitle">
              Analyze sends your topic/module to the LLM and prepares notes, insights, and quiz levels.
            </p>
            {analysisError ? <p className="dashboard-error-text">{analysisError}</p> : null}
          </section>

          <section className="dashboard-bottom-grid">
            <article className="dashboard-card">
              <h3 className="dashboard-step-title">✦ How It Works</h3>
              <ol className="dashboard-steps">
                <li className="dashboard-step-item"><span className="dashboard-step-number">1</span>Provide a topic or upload a document</li>
                <li className="dashboard-step-item"><span className="dashboard-step-number">2</span>AI (LLM + RAG) processes and understands</li>
                <li className="dashboard-step-item"><span className="dashboard-step-number">3</span>Quizzes are generated in 3 difficulty levels</li>
                <li className="dashboard-step-item"><span className="dashboard-step-number">4</span>Take the quiz and get instant results</li>
                <li className="dashboard-step-item"><span className="dashboard-step-number">5</span>Track your progress and improve!</li>
                <li className="dashboard-step-item"><span className="dashboard-step-number">6</span>Review explanations for wrong answers</li>
                <li className="dashboard-step-item"><span className="dashboard-step-number">7</span>Focus on weak topics using targeted practice</li>
                <li className="dashboard-step-item"><span className="dashboard-step-number">8</span>Retake quizzes to improve accuracy and rank</li>
              </ol>
            </article>

            <article className="dashboard-card">
              <h3 className="dashboard-leaderboard-title">🏆 Leaderboard</h3>
              <p className="dashboard-leaderboard-subtitle">Top 5 Performers This Week</p>

              <div className="dashboard-leaderboard-chart" role="img" aria-label="Top 3 leaderboard podium with first rank in center">
                {topThreeRows.length > 0 ? (
                  <div className="dashboard-podium-chart">
                    {podiumOrder.map((item, idx) => {
                      if (!item) {
                        return (
                          <div key={`empty-${idx}`} className="dashboard-podium-column dashboard-podium-column-empty">
                            <div className="dashboard-podium-bar dashboard-podium-bar-empty" style={{ height: '36px' }} />
                            <p className="dashboard-podium-user">-</p>
                            <p className="dashboard-podium-points">0 pts</p>
                          </div>
                        )
                      }

                      const barHeight = Math.max(44, Math.round((Number(item.points || 0) / maxPodiumPoints) * 170))
                      const isFirst = item.rank === 1
                      return (
                        <div key={item.userId} className={`dashboard-podium-column ${isFirst ? 'dashboard-podium-column-first' : ''}`}>
                          <p className="dashboard-podium-rank-tag">#{item.rank}</p>
                          <div className={`dashboard-podium-bar ${isFirst ? 'dashboard-podium-bar-first' : ''}`} style={{ height: `${barHeight}px` }}>
                            <span className="dashboard-podium-bar-score">{item.points}</span>
                          </div>
                          <p className="dashboard-podium-user">{item.name}</p>
                          <p className="dashboard-podium-points">{item.points} pts</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="dashboard-podium-chart">
                    <div className="dashboard-podium-column dashboard-podium-column-empty">
                      <div className="dashboard-podium-bar dashboard-podium-bar-empty" style={{ height: '36px' }} />
                      <p className="dashboard-podium-user">No data</p>
                      <p className="dashboard-podium-points">0 pts</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="dashboard-personal-rank">
                <span className="dashboard-personal-rank-number">#{yourRank}</span>
                <div>
                  <p className="dashboard-personal-rank-label">Your Rank</p>
                  <p className="dashboard-personal-rank-name">You ({userName})</p>
                </div>
                <span className="dashboard-personal-rank-points">{userQuizPoints} pts</span>
              </div>

              <div className="dashboard-link-wrap">
                <a href="#" className="dashboard-link">View Full Leaderboard →</a>
              </div>
            </article>
          </section>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
