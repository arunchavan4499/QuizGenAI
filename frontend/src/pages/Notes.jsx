import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'

const quizRows = [
  {
    id: 1,
    topic: 'Photosynthesis Quiz',
    date: 'April 20',
    score: '8/10',
    result: 'Passed',
  },
  {
    id: 2,
    topic: 'Cell Structure Quiz',
    date: 'April 15',
    score: '7/10',
    result: 'Passed',
  },
  { id: 3, topic: 'Ecology Basics', date: 'April 10', score: '6/10', result: 'Retake' },
  { id: 4, topic: 'Genetics Quiz', date: 'April 5', score: '4/10', result: 'Retake' },
]

const columns = [
  { key: 'topic', header: 'Quiz Topic' },
  { key: 'date', header: 'Date Taken' },
  { key: 'score', header: 'Score' },
  {
    key: 'result',
    header: 'Result',
    render: (value) => <Badge variant={value === 'Passed' ? 'success' : 'error'}>{value}</Badge>,
  },
]

function Notes() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card title="Study Notes">
        <div className="space-y-5 text-sm text-slate-700">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Topic</p>
            <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-900">Photosynthesis Explained</p>
          </div>

          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">Overview</p>
            <p className="mt-1.5 leading-relaxed">
              Photosynthesis is the process by which green plants use sunlight,
              water, and carbon dioxide to produce glucose and oxygen.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">Key Stages</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Light Reactions</li>
              <li>Calvin Cycle</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">Additional Notes</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Chlorophyll captures light energy in chloroplasts.</li>
              <li>ATP and NADPH are generated during light reactions.</li>
              <li>Calvin cycle synthesizes glucose using carbon dioxide.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/75 p-3.5">
            <p className="text-sm font-semibold tracking-tight text-slate-900">Attachment</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm text-slate-600">photosynthesis_diagram.jpg</p>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
              >
                View
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Quiz History">
        <Table columns={columns} rows={quizRows} />
        <div className="mt-5 text-right">
          <button type="button" className="text-sm font-semibold text-[#0f3d2e] hover:underline">
            View All Quizzes
          </button>
        </div>
      </Card>
    </div>
  )
}

export default Notes
