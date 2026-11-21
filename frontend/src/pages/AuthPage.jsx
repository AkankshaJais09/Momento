import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MomentoShell from '../components/MomentoShell'
import PageHeader from '../components/PageHeader'
import PasswordInput from '../components/PasswordInput'

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { user, loading, login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [role, setRole] = useState(location.state?.role || 'host')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <MomentoShell>
        <main className="momento-scroll">
          <PageHeader label="Momento" title="Checking your sign-in" />
          <p role="status" className="subtext">Checking your sign-in…</p>
        </main>
      </MomentoShell>
    )
  }

  if (user) {
    return <Navigate to="/id" state={{ from: location.state?.from, role }} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (isRegister) {
        await register(email, displayName, password)
      } else {
        await login(email, password)
      }
      navigate('/id', {
        replace: true,
        state: { from: location.state?.from, role },
      })
    } catch (err) {
      setError(err.message || 'We could not authenticate your account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MomentoShell>
      <main className="momento-scroll">
        <PageHeader
          label="Momento"
          title={isRegister ? 'Make room for the memories.' : 'Welcome back.'}
        />
        <p className="subtext" style={{ marginBottom: 28 }}>
          {isRegister
            ? 'Create an account to start your photo wall.'
            : 'Sign in to create or join a photo wall.'}
        </p>

        <div className="chip-row" role="group" aria-label="Choose account type" style={{ marginBottom: 24 }}>
          {['guest', 'host'].map((value) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={role === value}
              onClick={() => setRole(value)}
            >
              {value === 'guest' ? 'Guest' : 'Host'}
            </button>
          ))}
        </div>

        <form id="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {isRegister ? (
              <div className="field">
                <label htmlFor="display-name">Full name</label>
                <input
                  id="display-name"
                  name="name"
                  className="input"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
              />
              {isRegister ? (
                <span className="subtext" style={{ fontSize: '0.8125rem' }}>
                  Use at least 8 characters, including uppercase, lowercase, and a number.
                </span>
              ) : null}
            </div>
          </div>

          {error ? (
            <p role="alert" style={{ marginTop: 16, color: 'var(--color-accent)', fontSize: '0.875rem' }}>
              {error}
            </p>
          ) : null}
        </form>

        <p className="subtext" style={{ marginTop: 24, textAlign: 'center', fontSize: '0.9375rem' }}>
          {isRegister ? 'Already have an account? ' : 'New to Momento? '}
          <Link
            to={isRegister ? '/login' : '/register'}
            state={{ ...location.state, role }}
            style={{ color: 'var(--color-accent)', fontWeight: 700 }}
          >
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </main>

      <button
        type="submit"
        form="auth-form"
        className="btn btn-primary btn-pinned"
        disabled={submitting}
      >
        {submitting
          ? (isRegister ? 'Creating account…' : 'Signing in…')
          : (isRegister ? 'Create account' : 'Sign in')}
      </button>
    </MomentoShell>
  )
}
