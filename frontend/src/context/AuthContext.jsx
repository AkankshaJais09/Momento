<<<<<<< HEAD
// Authentication Context providing logged-in user state to all components.
// Uses plain React useState and useEffect with localStorage tokens.

import { createContext, useContext, useState, useEffect } from 'react'
import { request, setToken, setRefreshToken, getToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
    return data.user
  }

  // Log out by clearing token and state
  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
=======
// Authentication Context providing global user state and login or logout actions.
// Uses plain React useState, useEffect, and createContext to manage session state.

import { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredTokens, setStoredTokens, clearStoredTokens } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for an existing session token on initial mount and fetch user details
  useEffect(() => {
    async function loadUser() {
      const { access } = getStoredTokens();
      if (!access) {
        setLoading(false);
        return;
      }

      try {
        const userData = await api.get('/auth/me/');
        setUser(userData);
      } catch {
        // If token verification fails, clear stored credentials
        clearStoredTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  // Submit login credentials to backend, save tokens, and update current user
  const login = async (email, password) => {
    const data = await api.post('/auth/login/', { email, password });
    setStoredTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  };

  // Submit registration details, save returned tokens, and set user state
  const register = async (email, displayName, password) => {
    const data = await api.post('/auth/register/', {
      email,
      display_name: displayName,
      password,
    });
    setStoredTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  };

  // Log out by removing tokens and resetting user state to null
  const logout = () => {
    clearStoredTokens();
    setUser(null);
  };

  // Permanently delete the user account and associated photos
  const deleteAccount = async () => {
    await api.delete('/auth/me/');
    clearStoredTokens();
    setUser(null);
  };

  // Update the logged-in user's display name
  const updateProfile = async (displayName) => {
    const data = await api.patch('/auth/me/', { display_name: displayName });
    setUser(data);
    return data;
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    deleteAccount,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to access authentication state anywhere in the application
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
>>>>>>> 898b826f7d4c2eb9d89ffa11785bb347e39fe93f
}
