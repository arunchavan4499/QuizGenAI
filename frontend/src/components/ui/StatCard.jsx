import Card from './Card'

function StatCard({ label, value, hint, className = '', children }) {
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="mt-3">{children ? children : <p className="text-[28px] font-bold leading-none text-slate-900">{value}</p>}</div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  )
}

export default StatCard
