import { useEffect, useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import ProgressRing from '../components/ui/ProgressRing'

const fallbackSubmitResponse = {
  score: 80,
  insights: {
    strengths: ['Strong recall of chloroplast structure', 'Good understanding of light reactions'],
    weaknesses: ['Confusion in Calvin cycle sequence', 'Inconsistent handling of gas exchange questions'],
    recommendations: ['Revise Calvin cycle steps with a flowchart', 'Practice 2 timed quizzes on plant biology'],
  },
}

const fallbackLeaderboard = [
  { name: 'Ananya', score: 96 },
  { name: 'Rahul', score: 92 },
  { name: 'Priya', score: 80 },
]

async function submitQuiz(apiBaseUrl, payload) {
  try {
    const response = await fetch(`${apiBaseUrl}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('Unable to submit quiz')
    }

    return await response.json()
  } catch {
    return fallbackSubmitResponse
  }
}

async function fetchLeaderboard(apiBaseUrl, difficulty) {
  try {
    const response = await fetch(`${apiBaseUrl}/leaderboard/${difficulty}`)
    if (!response.ok) {
      throw new Error('Unable to fetch leaderboard')
    }
    return await response.json()
  } catch {
    return fallbackLeaderboard
  }
}

function QuizResults({
  quizPayload,
  difficulty,
  apiBaseUrl = '',
  onRetry,
  onDashboard,
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadResult = async () => {
      setIsLoading(true)
      setError('')

      try {
        const submitResponse = await submitQuiz(apiBaseUrl, quizPayload)
        const board = await fetchLeaderboard(apiBaseUrl, difficulty)

        if (isMounted) {
          setResult(submitResponse)
          setLeaderboard(Array.isArray(board) ? board.slice(0, 3) : fallbackLeaderboard)
        }
      } catch {
        if (isMounted) {
          setError('Could not load quiz result. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadResult()

    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, difficulty, quizPayload])

  const wrongAnswers = useMemo(() => {
    const totalQuestions = quizPayload?.answers?.length || 10
    const score = result?.score || 0
    const correctAnswers = Math.round((score / 100) * totalQuestions)
    return Math.max(totalQuestions - correctAnswers, 0)
  }, [quizPayload, result])

  if (isLoading) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Loading quiz results...</p>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm font-medium text-red-600">{error}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-7">
      <Card className="border-[#0f8f5b]/15 bg-gradient-to-r from-[#eefbf4] to-white">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
              <path d="M7 4V2h10v2h3v3c0 2.97-2.16 5.43-5 5.91V15h2a1 1 0 0 1 1 1v2H6v-2a1 1 0 0 1 1-1h2v-2.09C6.16 12.43 4 9.97 4 7V4h3zm11 2v1c0 1.66-1.34 3-3 3V6h3zM6 6h3v4c-1.66 0-3-1.34-3-3V6z" />
            </svg>
          </span>
          <div>
            <p className="text-base font-semibold text-emerald-700">Congratulations!</p>
            <p className="mt-1.5 text-sm text-slate-700">
              You scored <span className="font-bold text-slate-900">{result?.score}</span> on the quiz Photosynthesis in Plants.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Accuracy" hint="Percentage correct">
          <ProgressRing value={result?.score || 0} size={84} strokeWidth={9} />
        </StatCard>
        <StatCard label="Time Taken" value="12m 30s" />
        <StatCard label="Wrong Answers" value={wrongAnswers} hint="Distractors selected" />
      </div>

      <Card title="Insights">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
            <p className="text-sm font-semibold text-emerald-700">Strengths</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {(result?.insights?.strengths || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50/40 p-3.5">
            <p className="text-sm font-semibold text-red-700">Weaknesses</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {(result?.insights?.weaknesses || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#0f3d2e]/15 bg-[#f1f7f4] p-3.5">
            <p className="text-sm font-semibold text-[#0f3d2e]">Recommendations</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {(result?.insights?.recommendations || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Leaderboard Preview">
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={`${entry.name}-${index}`}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
            >
              <p className="text-sm font-medium text-slate-800">{entry.name}</p>
              <p className="text-sm font-semibold text-slate-700">{entry.score}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-[#f08b24] px-5 py-2.5 text-sm font-semibold text-[#f08b24] transition hover:bg-[#fff4e9]"
        >
          Retry Quiz
        </button>
        <button
          type="button"
          onClick={onDashboard}
          className="rounded-lg bg-[#f08b24] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97816]"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

export default QuizResults
