// Shows a banner when the session expires. The Log out button lives in PageHeader.

import { useAuth } from '../context/AuthContext'

const css = `
.session-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  background: #ad4720;
  color: #fff;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
}
.session-banner button {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}
`

export default function SessionBar() {
  const { user, sessionExpired, dismissSessionExpired } = useAuth()

  if (!sessionExpired || user) return null

  return (
    <>
      <style>{css}</style>
      <div role="alert" className="session-banner">
        <span>Your session expired. Please sign in again.</span>
        <button type="button" onClick={dismissSessionExpired} aria-label="Dismiss message">
          ×
        </button>
      </div>
    </>
  )
}