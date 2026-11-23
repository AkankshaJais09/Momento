import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const actionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexShrink: 0,
}

const logoutStyle = {
  background: '#fff',
  color: '#ad4720',
  border: '1px solid #ad4720',
  borderRadius: 999,
  padding: '8px 16px',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export default function PageHeader({ label, title, rightContent }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function closePage() {
    if (window.history.state?.idx > 0) {
      navigate(-1)
      return
    }

    const parts = pathname.split('/').filter(Boolean)
    if (parts[0] === 'events' && parts[1] && parts.length > 2) {
      navigate(`/events/${parts[1]}`)
      return
    }
    if (parts[0] === 'events' && parts[1]) {
      navigate('/dashboard')
      return
    }
    if (pathname === '/login' || pathname === '/register' || pathname === '/dashboard') {
      navigate('/')
      return
    }
    navigate('/dashboard')
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="page-header">
      <div className="page-header__copy">
        <p className="label-accent page-header__label">{label}</p>
        <h1 className="headline page-header__title">{title}</h1>
      </div>
      {rightContent ? <div className="page-header__right-content">{rightContent}</div> : null}
      <div style={actionsStyle}>
        {user ? (
          <button type="button" onClick={handleLogout} style={logoutStyle}>
            Log out
          </button>
        ) : null}
        <button type="button" className="page-header__close" onClick={closePage} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="#2B2520" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}