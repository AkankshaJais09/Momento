// Shows a Log out button on every page (except Home), and a banner when the session expires.

import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const bannerStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  background: '#ad4720',
  color: '#fff',
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  fontSize: '0.95rem',
}

const closeStyle = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontSize: '1.4rem',
  lineHeight: 1,
  cursor: 'pointer',
}

const logoutStyle = {
  position: 'fixed',
  left: 16,
  bottom: 16,
  zIndex: 1000,
  background: '#fff',
  color: '#ad4720',
  border: '1px solid #ad4720',
  borderRadius: 999,
  padding: '8px 16px',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
}

export default function SessionBar() {
  const { user, logout, sessionExpired, dismissSessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const hideLogout = location.pathname === '/'

  return (
    <>
      {sessionExpired && !user && (
        <div role="alert" style={bannerStyle}>
          <span>Your session expired. Please sign in again.</span>
          <button
            type="button"
            onClick={dismissSessionExpired}
            aria-label="Dismiss message"
            style={closeStyle}
          >
            ×
          </button>
        </div>
      )}
      {user && !hideLogout && (
        <button type="button" onClick={handleLogout} style={logoutStyle}>
          Log out
        </button>
      )}
    </>
  )
}