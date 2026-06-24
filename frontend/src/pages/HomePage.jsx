import { useEffect, useState } from 'react'
import SharedSidebar from '../components/SharedSidebar'
import { DEFAULT_SUBMISSION_STREAK, fetchSubmissionStreak } from '../services/submissionStreakService'
import { fetchLeaderboard } from '../services/backendApi'
import { Crown, Star, Zap, Share2, Play } from 'lucide-react'
import './HomePage.css'

const heroSlides = [
  {
    id: 1,
    kicker: 'Sponsored',
    heading: 'Sumant Mahesh Adky',
    value: '3.5 LPA',
    brand: 'BARYONS',
    image:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs><linearGradient id='g1' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23f59e0b'/><stop offset='1' stop-color='%238b5cf6'/></linearGradient></defs><rect width='120' height='120' fill='url(%23g1)'/><circle cx='60' cy='46' r='22' fill='%23f5f5f5'/><rect x='24' y='73' width='72' height='34' rx='17' fill='%23f5f5f5'/></svg>",
    background: 'linear-gradient(120deg, #fffbeb 0%, #fef3c7 100%)',
  },
  {
    id: 2,
    kicker: 'Sponsored',
    heading: 'Data Science Bootcamp',
    value: 'Up to 45% Off',
    brand: 'EDUWAVE',
    image:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs><linearGradient id='g2' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%2322c55e'/><stop offset='1' stop-color='%2314b8a6'/></linearGradient></defs><rect width='120' height='120' fill='url(%23g2)'/><circle cx='60' cy='46' r='22' fill='%23f5f5f5'/><rect x='24' y='73' width='72' height='34' rx='17' fill='%23f5f5f5'/></svg>",
    background: 'linear-gradient(120deg, #ecfdf5 0%, #d1fae5 100%)',
  },
  {
    id: 3,
    kicker: 'Sponsored',
    heading: 'Frontend Mentor Pro',
    value: 'Live Cohort Open',
    brand: 'PIXELHIVE',
    image:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs><linearGradient id='g3' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%233b82f6'/><stop offset='1' stop-color='%230ea5e9'/></linearGradient></defs><rect width='120' height='120' fill='url(%23g3)'/><circle cx='60' cy='46' r='22' fill='%23f5f5f5'/><rect x='24' y='73' width='72' height='34' rx='17' fill='%23f5f5f5'/></svg>",
    background: 'linear-gradient(120deg, #eff6ff 0%, #dbeafe 100%)',
  },
  {
    id: 4,
    kicker: 'Sponsored',
    heading: 'Aptitude Master Sprint',
    value: '7-Day Free Trial',
    brand: 'QUANTIX',
    image:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><defs><linearGradient id='g4' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%23fb7185'/><stop offset='1' stop-color='%23f97316'/></linearGradient></defs><rect width='120' height='120' fill='url(%23g4)'/><circle cx='60' cy='46' r='22' fill='%23f5f5f5'/><rect x='24' y='73' width='72' height='34' rx='17' fill='%23f5f5f5'/></svg>",
    background: 'linear-gradient(120deg, #fff1f2 0%, #ffe4e6 100%)',
  },
]

const driveDefaultVisibleCount = 3
function HomePage({ onNavigate = () => {}, userQuizPoints = 0, authToken = '', currentUser = null, attempts = [], activityVersion = 0 }) {
  const [leaderboardFilter, setLeaderboardFilter] = useState('Total')
  const [activeSlide, setActiveSlide] = useState(0)
  const [submissionStreak, setSubmissionStreak] = useState(DEFAULT_SUBMISSION_STREAK)
  const [showAllDriveRows, setShowAllDriveRows] = useState(false)
  const [showAllLeaderboardRows, setShowAllLeaderboardRows] = useState(false)
  const [liveLeaderboardEntries, setLiveLeaderboardEntries] = useState([])

  const activityRows = attempts.map((attempt, index) => ({
    id: attempt.id || index + 1,
    title: attempt.topic || 'Quiz Session',
    subtitle: `${attempt.difficulty || 'Mixed'} · ${attempt.date || 'Recent'}`,
    score: attempt.score || `${attempt.scoreNumber || 0} / ${attempt.totalQuestions || 0}`,
    accuracy: Number(attempt.accuracy || 0),
  }))

  const visibleActivityRows = showAllDriveRows
    ? activityRows
    : activityRows.slice(0, driveDefaultVisibleCount)

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    }, 3600)

    return () => clearInterval(slideTimer)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSubmissionStreak = async () => {
      if (!authToken) {
        return
      }

      try {
        const payload = await fetchSubmissionStreak(authToken)
        if (!cancelled) {
          setSubmissionStreak(payload)
        }
      } catch {
        if (!cancelled) {
          setSubmissionStreak(DEFAULT_SUBMISSION_STREAK)
        }
      }
    }

    loadSubmissionStreak()

    return () => {
      cancelled = true
    }
  }, [authToken, activityVersion])

  useEffect(() => {
    let cancelled = false

    const loadLeaderboard = async () => {
      if (!authToken) {
        return
      }

      try {
        const payload = await fetchLeaderboard({ token: authToken, difficulty: 'overall', limit: 7 })
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

  const mappedRows = liveLeaderboardEntries.map((entry, idx) => {
    const displayName = `User ${entry.user_id}`
    return {
      userId: entry.user_id,
      rank: idx + 1,
      avatar: displayName.slice(0, 1).toUpperCase(),
      name: displayName,
      score: Math.round(entry.score || 0),
    }
  })

  const currentUserId = Number(currentUser?.id || 0)
  const currentUserExisting = mappedRows.find((row) => Number(row.userId) === currentUserId)
  const topThreeRows = mappedRows.slice(0, 3)
  const rankMap = new Map(topThreeRows.map((row) => [row.rank, row]))
  const podiumFirst = rankMap.get(1) || null
  const podiumSecond = rankMap.get(2) || null
  const podiumThird = rankMap.get(3) || null
  const trailingRows = mappedRows.filter((row) => row.rank > 3)
  const visibleTrailingRows = showAllLeaderboardRows ? trailingRows : trailingRows.slice(0, 3)

  const leaderboardPersonalRank = {
    rank: currentUserExisting?.rank || '-',
    name: currentUser?.name || 'You',
  }

  return (
    <div className="home-page">
      <SharedSidebar active="home" onNavigate={onNavigate} />

      <main className="home-main">
        <div className="home-shell">
          <section className="home-hero home-hero-carousel">
            <div
              className="home-hero-track"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {heroSlides.map((slide) => (
                <article key={slide.id} className="home-hero-slide" style={{ background: slide.background }}>
                  <div>
                    <p className="home-ad-kicker">{slide.kicker}</p>
                    <h2>{slide.heading}</h2>
                    <h1>{slide.value}</h1>
                  </div>

                  <div className="home-hero-right">
                    <img className="home-avatar" alt={slide.heading} src={slide.image} />
                    <div className="home-avatar-label">{slide.brand}</div>
                  </div>
                </article>
              ))}
            </div>

            <div className="home-hero-dots">
              {heroSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`home-hero-dot ${idx === activeSlide ? 'home-hero-dot-active' : ''}`}
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Show slide ${idx + 1}`}
                />
              ))}
            </div>
          </section>

          <section className="home-grid">
            <div>
              <article className="home-card">
                <h3 className="home-card-title">Recent Quiz Activity</h3>

                {visibleActivityRows.map((row, index) => (
                  <div
                    key={`${row.id}-${index}`}
                    className={`home-drive-section ${index > 0 ? 'home-drive-section-separated' : ''}`}
                  >
                    <div className="home-drive-row">
                      <span className="home-ring" style={{ '--value': `${Math.max(0, Math.min(100, row.accuracy))}%` }} />
                      <div>
                        <p className="home-drive-name">{row.title}</p>
                        <p className="home-drive-sub">{row.subtitle}</p>
                      </div>
                      <p className="home-drive-percent">{row.score}</p>
                    </div>
                    <div className="home-progress-wrap">
                      <div className="home-progress-meta">Accuracy {row.accuracy}%</div>
                      <div className="home-progress-track"><div className="home-progress-fill" style={{ width: `${Math.max(0, Math.min(100, row.accuracy))}%` }} /></div>
                    </div>
                    <div className="home-drive-action-wrap">
                      <button
                        type="button"
                        className="home-drive-action-btn"
                        title="View quiz results"
                        aria-label={`View results for ${row.title}`}
                        onClick={() => onNavigate('results')}
                      >
                        <Play className="home-drive-action-icon" fill="currentColor" size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {visibleActivityRows.length === 0 ? (
                  <div className="home-drive-section">
                    <div className="home-drive-row">
                      <span className="home-ring" style={{ '--value': '0%' }} />
                      <div>
                        <p className="home-drive-name">No quiz attempts yet</p>
                        <p className="home-drive-sub">Finish a quiz to see your activity timeline</p>
                      </div>
                      <p className="home-drive-percent">-</p>
                    </div>
                  </div>
                ) : null}

                {activityRows.length > driveDefaultVisibleCount ? (
                  <div className="home-drive-show-more-wrap">
                    <button
                      type="button"
                      className="home-drive-show-more"
                      onClick={() => setShowAllDriveRows((prev) => !prev)}
                    >
                      {showAllDriveRows ? 'Show less' : 'Show more'}
                    </button>
                  </div>
                ) : null}
              </article>
            </div>

            <div>
              <article className="home-card">
                <div className="home-lead-header">
                  <h3>Leaderboard</h3>
                  <select
                    className="home-filter"
                    value={leaderboardFilter}
                    onChange={(event) => setLeaderboardFilter(event.target.value)}
                  >
                    <option value="Total">Total</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <p className="home-lead-sub">Overall Top 5 Performers</p>

                <div className="home-lead-chart" role="img" aria-label="Top 3 podium with first place centered">
                  {topThreeRows.length > 0 ? (
                    <>
                      <div className="home-podium">
                        <div className="home-podium-item home-podium-second">
                          <div className="home-podium-circle">{podiumSecond ? podiumSecond.avatar : '-'}</div>
                          <span className="home-podium-rank">2</span>
                          <p className="home-podium-name">{podiumSecond ? podiumSecond.name : '-'}</p>
                          <p className="home-podium-score">{podiumSecond ? podiumSecond.score : 0}</p>
                        </div>

                        <div className="home-podium-item home-podium-first">
                          <div className="home-crown" style={{ top: '-14px' }}><Crown size={20} fill="#fbbf24" style={{ color: '#d97706' }} /></div>
                          <div className="home-podium-circle">{podiumFirst ? podiumFirst.avatar : '-'}</div>
                          <span className="home-podium-rank">1</span>
                          <p className="home-podium-name">{podiumFirst ? podiumFirst.name : '-'}</p>
                          <p className="home-podium-score">{podiumFirst ? podiumFirst.score : 0}</p>
                        </div>

                        <div className="home-podium-item home-podium-third">
                          <div className="home-podium-circle">{podiumThird ? podiumThird.avatar : '-'}</div>
                          <span className="home-podium-rank">3</span>
                          <p className="home-podium-name">{podiumThird ? podiumThird.name : '-'}</p>
                          <p className="home-podium-score">{podiumThird ? podiumThird.score : 0}</p>
                        </div>
                      </div>

                      <div className="home-rank-list">
                        {visibleTrailingRows.length > 0 ? (
                          visibleTrailingRows.map((row) => (
                            <div
                              key={row.userId}
                              className={`home-rank-row ${Number(row.userId) === currentUserId ? 'home-rank-highlight' : ''}`}
                            >
                              <span className="home-rank-number">{row.rank}</span>
                              <span className="home-rank-avatar">{row.avatar}</span>
                              <span className="home-rank-name">{row.name}</span>
                              <span className="home-rank-score">{row.score}</span>
                            </div>
                          ))
                        ) : (
                          <div className="home-rank-row">
                            <span className="home-rank-number">-</span>
                            <span className="home-rank-avatar">-</span>
                            <span className="home-rank-name">No additional ranks</span>
                            <span className="home-rank-score">0</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="home-rank-list">
                      <div className="home-rank-row">
                        <span className="home-rank-number">-</span>
                        <span className="home-rank-avatar">-</span>
                        <span className="home-rank-name">No leaderboard data yet</span>
                        <span className="home-rank-score">0</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="home-personal-rank">
                  <span className="home-personal-rank-number">#{leaderboardPersonalRank.rank}</span>
                  <div>
                    <p className="home-personal-rank-label">Your Rank</p>
                    <p className="home-personal-rank-name">{leaderboardPersonalRank.name}</p>
                  </div>
                  <span className="home-personal-rank-score">{userQuizPoints} pts</span>
                </div>

                {trailingRows.length > 3 ? (
                  <div className="home-show-more">
                    <button
                      type="button"
                      className="home-link-btn"
                      onClick={() => setShowAllLeaderboardRows((prev) => !prev)}
                    >
                      {showAllLeaderboardRows ? 'Show less ->' : 'Show more ->'}
                    </button>
                  </div>
                ) : null}
              </article>
            </div>
          </section>

          <article className="home-card home-submission-full">
            <div className="home-streak-head">
              <h3 className="home-streak-title">Submission Streak</h3>
              <span className="home-share"><Share2 size={16} /></span>
            </div>

            <div className="home-contrib">
              <div className="home-day-labels" aria-hidden="true">
                {submissionStreak.dayLabels.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="home-contrib-main">
                <div className="home-months">
                  {submissionStreak.months.map((month) => (
                    <span key={month.label} style={{ gridColumn: `${month.col} / span 4` }}>
                      {month.label}
                    </span>
                  ))}
                </div>

                <div className="home-heatmap" role="img" aria-label="Submission activity heatmap">
                  {submissionStreak.levels.map((level, idx) => (
                    <span key={idx} className={`home-square home-level-${level}`} title={`Level ${level}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="home-legend">
              <span className="home-legend-label">No Practice</span>
              <span className="home-legend-squares" aria-label="Heatmap levels">
                <span className="home-legend-level"><span className="home-square home-level-0" />L0</span>
                <span className="home-legend-level"><span className="home-square home-level-1" />L1</span>
                <span className="home-legend-level"><span className="home-square home-level-2" />L2</span>
                <span className="home-legend-level"><span className="home-square home-level-3" />L3</span>
                <span className="home-legend-level"><span className="home-square home-level-4" />L4</span>
              </span>
              <span className="home-legend-label">{submissionStreak.streakWeeks} Weeks Of Skill Streak</span>
            </div>
          </article>

          <article className="home-card home-current-streak home-current-streak-full">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={20} fill="#fbbf24" style={{ color: '#d97706' }} />
              <span>Current Streak</span>
            </h3>
            <p>Consistency is key: Start your streak by practicing for at least 10 minutes each day</p>
            <div className="home-day-badges">
              {submissionStreak.recentActiveDays.length > 0 ? (
                submissionStreak.recentActiveDays.map((day) => (
                  <span key={day} className="home-day-badge">
                    <Zap size={12} fill="#fbbf24" style={{ color: '#d97706', marginRight: '4px' }} />
                    <span>Day {day}</span>
                  </span>
                ))
              ) : (
                <span className="home-day-badge">Start today</span>
              )}
            </div>
            <span className="home-streak-pill">{submissionStreak.currentStreakDays}<br />Days</span>
          </article>
        </div>
      </main>
    </div>
  )
}

export default HomePage
