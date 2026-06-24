import './SharedSidebar.css'
import { LayoutDashboard, BookOpen, User, LogOut } from 'lucide-react'

const navItems = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'dashboard', label: 'Study', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
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
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`shared-sidebar-item ${active === item.id ? 'shared-sidebar-item-active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="shared-sidebar-item-icon" />
              <span className="shared-sidebar-item-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="shared-sidebar-logout">
        <button type="button" className="shared-sidebar-item" onClick={() => onNavigate('logout')}>
          <LogOut className="shared-sidebar-item-icon" />
          <span className="shared-sidebar-item-label">Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default SharedSidebar
