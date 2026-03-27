import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import ProgressRing from '../components/ui/ProgressRing'
import Badge from '../components/ui/Badge'

const recentQuizzes = [
  { id: 1, topic: 'Photosynthesis in Plants', score: '8/10', date: 'Apr 20, 2026' },
  { id: 2, topic: 'Introduction to Cells', score: '7/10', date: 'Apr 15, 2026' },
  { id: 3, topic: 'Early Civilizations', score: '9/10', date: 'Apr 10, 2026' },
]

function Profile() {
  return (
    <div className="space-y-6 lg:space-y-7">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#dbeee5] ring-2 ring-[#0f3d2e]/15 shadow-inner" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Profile</p>
              <p className="text-xl font-semibold text-slate-900">Priya Sharma</p>
              <p className="text-sm text-slate-500">priya.sharma@example.com</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Edit Profile
          </button>
        </div>
      </Card>

      <section className="space-y-3.5">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Progress Overview</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Quizzes" value="42" hint="All completed attempts" />
          <StatCard label="Accuracy" hint="Overall accuracy">
            <ProgressRing value={85} />
          </StatCard>
          <StatCard label="Streak" hint="Current learning streak">
            <Badge variant="success">7 Days</Badge>
          </StatCard>
          <StatCard label="Best Score" value="9/10" hint="Highest single score" />
        </div>
      </section>

      <Card title="Recent Quizzes">
        <div className="space-y-2.5">
          {recentQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/75 px-4 py-3 text-sm sm:grid-cols-3 sm:items-center"
            >
              <p className="font-medium text-slate-800">{quiz.topic}</p>
              <p className="text-slate-600">Score: {quiz.score}</p>
              <p className="text-slate-500 sm:text-right">{quiz.date}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg bg-[#f08b24] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97816]"
        >
          Review Answers
        </button>
      </div>
    </div>
  )
}

export default Profile
