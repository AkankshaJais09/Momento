// Authentication Context providing logged-in user state to all components.
// Uses plain React useState and useEffect with localStorage tokens.

import { createContext, useContext, useState, useEffect } from 'react'
import {
  request,
  setToken,
  setRefreshToken,
  getToken,
  SESSION_EXPIRED_EVENT,
} from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  // api.js announces this when the login can no longer be renewed
  useEffect(() => {
    function handleExpired() {
      setUser(null)
      setSessionExpired(true)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  // On initial page load, verify existing token and load user profile
  useEffect(() => {
    async function loadUser() {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const profile = await request('/auth/me/')
        setUser(profile)
      } catch {
        // Token is invalid or expired
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  // Log in with email and password
  async function login(email, password) {
    const data = await request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.access)
    setRefreshToken(data.refresh)
    setUser(data.user)
    setSessionExpired(false)
    return data.user
  }

  // Register a new user
  async function register(email, displayName, password) {
    const data = await request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        email,
        display_name: displayName,
        password,
      }),
    })
    setToken(data.access)
    setRefreshToken(data.refresh)
    setUser(data.user)
    setSessionExpired(false)
    return data.user
  }

  // Log out by clearing token and state
  function logout() {
    setToken(null)
    setUser(null)
    setSessionExpired(false)
  }

  function dismissSessionExpired() {
    setSessionExpired(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        sessionExpired,
        dismissSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}