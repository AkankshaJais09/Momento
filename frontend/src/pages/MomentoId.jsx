import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'

export default function MomentoId() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const role = location.state?.role || 'host'

  function goToWall() {
    if (location.state?.from) {
      navigate(location.state.from, { replace: true })
    } else {
      navigate(role === 'host' ? '/dashboard' : '/join', { replace: true })
    }
  }

  return (
    <MomentoShell>
      <main className="momento-scroll">
        <PageHeader label="Your Momento ID" title={user?.display_name || 'Welcome'} />
        <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
          <span className="chip">{role.toUpperCase()}</span>
          <p className="frame-number" style={{ marginTop: 20 }}>EMAIL ID</p>
          <p className="subtext" style={{ marginTop: 8, overflowWrap: 'anywhere' }}>{user?.email}</p>
        </div>
        <button type="button" className="btn btn-primary btn-pinned" onClick={goToWall}>
          Go to the wall
        </button>
      </main>
    </MomentoShell>
  )
}
