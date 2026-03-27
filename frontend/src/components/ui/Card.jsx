function Card({ title, action, className = '', children }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(15,61,46,0.06)] sm:p-6 ${className}`}
    >
      {(title || action) && (
        <header className="mb-5 flex items-start justify-between gap-3">
          {title ? (
            <h3 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</h3>
          ) : (
            <div />
          )}
          {action ? <div>{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  )
}

export default Card
