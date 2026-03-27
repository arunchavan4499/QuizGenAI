const DEFAULT_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DEFAULT_MONTHS = [
  { label: 'Sep', col: 1 },
  { label: 'Oct', col: 6 },
  { label: 'Nov', col: 10 },
  { label: 'Dec', col: 14 },
  { label: 'Jan', col: 19 },
  { label: 'Feb', col: 23 },
  { label: 'Mar', col: 28 },
  { label: 'Apr', col: 32 },
  { label: 'May', col: 36 },
  { label: 'Jun', col: 41 },
  { label: 'Jul', col: 45 },
  { label: 'Aug', col: 49 },
]

function createEmptyLevels() {
  return Array.from({ length: 364 }, () => 0)
}

export const DEFAULT_SUBMISSION_STREAK = {
  dayLabels: DEFAULT_DAY_LABELS,
  months: DEFAULT_MONTHS,
  levels: createEmptyLevels(),
  streakWeeks: 0,
  currentStreakDays: 0,
  recentActiveDays: [],
}

function normalizeStreakPayload(payload = {}) {
  const levels = Array.isArray(payload.levels)
    ? payload.levels.map((level) => {
        const num = Number(level)
        return Number.isNaN(num) ? 0 : Math.max(0, Math.min(4, num))
      })
    : DEFAULT_SUBMISSION_STREAK.levels

  return {
    dayLabels:
      Array.isArray(payload.dayLabels) && payload.dayLabels.length === 7
        ? payload.dayLabels
        : DEFAULT_SUBMISSION_STREAK.dayLabels,
    months:
      Array.isArray(payload.months) && payload.months.length > 0
        ? payload.months
        : DEFAULT_SUBMISSION_STREAK.months,
    levels,
    streakWeeks:
      typeof payload.streakWeeks === 'number' ? payload.streakWeeks : DEFAULT_SUBMISSION_STREAK.streakWeeks,
    currentStreakDays:
      typeof payload.currentStreakDays === 'number'
        ? Math.max(0, payload.currentStreakDays)
        : DEFAULT_SUBMISSION_STREAK.currentStreakDays,
    recentActiveDays:
      Array.isArray(payload.recentActiveDays)
        ? payload.recentActiveDays.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day > 0)
        : DEFAULT_SUBMISSION_STREAK.recentActiveDays,
  }
}

export async function fetchSubmissionStreak(token = '') {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const response = await fetch(`${baseUrl}/api/submission-streak`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch submission streak: ${response.status}`)
  }

  const payload = await response.json()
  return normalizeStreakPayload(payload)
}
