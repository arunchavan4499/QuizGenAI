const navItems = [
  { id: 'study', label: 'Study', icon: 'S' },
  { id: 'quiz', label: 'Quiz', icon: 'Q' },
  { id: 'profile', label: 'Profile', icon: 'P' },
  { id: 'progress', label: 'Progress', icon: 'R' },
]

function Sidebar({ activeItem, onItemSelect }) {
  return (
    <aside className="w-64 bg-[#0f3d2e] p-5 text-slate-100">
      <div className="mb-8 rounded-xl border border-white/15 bg-white/10 p-4">
        <p className="text-lg font-bold tracking-wide">QuizGen AI</p>
        <p className="mt-1 text-xs text-slate-200">Smarter learning dashboard</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = activeItem === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemSelect(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white/20 text-white' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-xs font-bold">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
