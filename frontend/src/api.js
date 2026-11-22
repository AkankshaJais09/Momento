// Simple API helper using standard fetch.
// Automatically adds JWT access token from localStorage to headers.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
let refreshPromise = null

export function getToken() {
  return localStorage.getItem('access_token')
}

export function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('access_token', token)
  } else {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}

export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem('refresh_token', token)
  } else {
    localStorage.removeItem('refresh_token')
  }
}

function fetchRequest(path, options, token) {
  const headers = { ...options.headers }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) return null

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })
      const data = await response.json()
      if (!response.ok || !data.access) {
        setToken(null)
        return null
      }

      setToken(data.access)
      if (data.refresh) setRefreshToken(data.refresh)
      return data.access
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

function readableError(data) {
  if (!data) return 'Request failed'
  if (typeof data === 'string') return data
  if (data.detail || data.message || data.error) {
    const single = data.detail || data.message || data.error
    return typeof single === 'string' ? single : JSON.stringify(single)
  }
  const parts = []
  for (const [field, value] of Object.entries(data)) {
    const text = Array.isArray(value) ? value.join(' ') : String(value)
    const label = field === 'non_field_errors' ? '' : `${field.replace(/_/g, ' ')}: `
    parts.push(`${label}${text}`)
  }
  return parts.join(' ') || 'Request failed'
}

async function responseData(response) {
  let data = null
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  }

  if (!response.ok) {
    throw new Error(readableError(data))
  }

  return data
}

export async function request(path, options = {}) {
  let response = await fetchRequest(path, options, getToken())
  const isAuthRequest = path.startsWith('/auth/login')
    || path.startsWith('/auth/register')
    || path.startsWith('/auth/refresh')

  if (response.status === 401 && !isAuthRequest) {
    const access = await refreshAccessToken()
    if (access) response = await fetchRequest(path, options, access)
  }
  return responseData(response)
}

export async function requestBlob(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message = data?.detail || data?.message || 'Download failed'
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return response.blob()
}
