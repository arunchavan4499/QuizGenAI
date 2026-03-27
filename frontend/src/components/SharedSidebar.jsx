import './SharedSidebar.css'

function IconBase({ children }) {
  return (
    <svg
      className="shared-sidebar-item-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function IconDashboard() {
  return (
    <IconBase>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </IconBase>
  )
}

function IconStudy() {
  return (
    <IconBase>
      <path d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <path d="M12 4h6.5c.83 0 1.5.67 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H12" />
      <path d="M8 8h2" />
      <path d="M14 8h2" />
    </IconBase>
  )
}

function IconQuiz() {
  return (
    <IconBase>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 11h5" />
      <path d="M8 15h4" />
      <path d="m15 14 1.5 1.5L19 13" />
    </IconBase>
  )
}

function IconProfile() {
  return (
    <IconBase>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </IconBase>
  )
}

function IconLogout() {
  return (
    <IconBase>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H4" />
    </IconBase>
  )
}

const navItems = [
  { id: 'home', label: 'Dashboard', icon: IconDashboard },
  { id: 'dashboard', label: 'Study', icon: IconStudy },
  { id: 'profile', label: 'Profile', icon: IconProfile },
]

function SharedSidebar({ active = '', onNavigate = () => {} }) {
  return (
    <aside className="shared-sidebar">
      <div className="shared-sidebar-brand">
        <div className="shared-sidebar-brand-mark" aria-hidden="true">Q</div>
        <div className="shared-sidebar-brand-copy">
          <p className="shared-sidebar-title">QuizGen AI</p>
          <p className="shared-sidebar-subtitle">Adaptive Quiz Generator for Courses</p>
        </div>
      </div>

      <nav className="shared-sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`shared-sidebar-item ${active === item.id ? 'shared-sidebar-item-active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <item.icon />
            <span className="shared-sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="shared-sidebar-logout">
        <button type="button" className="shared-sidebar-item" onClick={() => onNavigate('logout')}>
          <IconLogout />
          <span className="shared-sidebar-item-label">Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default SharedSidebar
