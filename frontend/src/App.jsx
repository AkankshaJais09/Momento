<<<<<<< HEAD
// Momento routes with authenticated event pages and public account screens.

import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import PageHeader from './components/PageHeader'
import MomentoShell from './components/MomentoShell'

const Home = lazy(() => import('./pages/Home'))
const CreateEvent = lazy(() => import('./pages/CreateEvent'))
const ShareEvent = lazy(() => import('./pages/ShareEvent'))
const EventGallery = lazy(() => import('./pages/EventGallery'))
const GuestUpload = lazy(() => import('./pages/GuestUpload'))
const PhotoView = lazy(() => import('./pages/PhotoView'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const MomentoId = lazy(() => import('./pages/MomentoId'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const JoinEvent = lazy(() => import('./pages/JoinEvent'))
const WhoShared = lazy(() => import('./pages/WhoShared'))
const ManageEvent = lazy(() => import('./pages/ManageEvent'))
const EventSettings = lazy(() => import('./pages/EventSettings'))
const PhotoQuests = lazy(() => import('./pages/PhotoQuests'))
const Recap = lazy(() => import('./pages/Recap'))
const Film = lazy(() => import('./pages/Film'))

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

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

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          role: location.state?.role || (location.pathname === '/join' ? 'guest' : 'host'),
        }}
        replace
      />
    )
  }

  return children
=======
// Main Application component configuring routes, authentication provider, and site layout.
// Uses plain React Router 7 and React Context.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Events from './pages/Events';
import CreateEvent from './pages/CreateEvent';
import JoinEvent from './pages/JoinEvent';
import Login from './pages/Login';
import Register from './pages/Register';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import './index.css';

// Root route displaying the Events dashboard for logged-in users, or the landing hero for guests
function RootRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return null;
  }
  return isAuthenticated ? <Events /> : <Home />;
>>>>>>> 898b826f7d4c2eb9d89ffa11785bb347e39fe93f
}

export default function App() {
  return (
<<<<<<< HEAD
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<MomentoShell><main className="momento-scroll"><p role="status" className="subtext">Loading page…</p></main></MomentoShell>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/id" element={<RequireAuth><MomentoId /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/join" element={<RequireAuth><JoinEvent /></RequireAuth>} />
            <Route path="/create" element={<RequireAuth><CreateEvent /></RequireAuth>} />
            <Route path="/events/:eventId/share" element={<RequireAuth><ShareEvent /></RequireAuth>} />
            <Route path="/events/:eventId/upload" element={<RequireAuth><GuestUpload /></RequireAuth>} />
            <Route path="/events/:eventId/photos/:photoId" element={<RequireAuth><PhotoView /></RequireAuth>} />
            <Route path="/events/:eventId/who-shared" element={<RequireAuth><WhoShared /></RequireAuth>} />
            <Route path="/events/:eventId/manage" element={<RequireAuth><ManageEvent /></RequireAuth>} />
            <Route path="/events/:eventId/settings" element={<RequireAuth><EventSettings /></RequireAuth>} />
            <Route path="/events/:eventId/quests" element={<RequireAuth><PhotoQuests /></RequireAuth>} />
            <Route path="/events/:eventId/recap" element={<RequireAuth><Recap /></RequireAuth>} />
            <Route path="/events/:eventId/film" element={<RequireAuth><Film /></RequireAuth>} />
            <Route path="/events/:eventId" element={<RequireAuth><EventGallery /></RequireAuth>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
=======
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <div
              style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
              }}
            >
              <Navbar />
              <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Routes>
                  <Route path="/" element={<RootRoute />} />
                  <Route path="/landing" element={<Home />} />
                  <Route
                    path="/events"
                    element={
                      <ProtectedRoute>
                        <Events />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/events/new"
                    element={
                      <ProtectedRoute>
                        <CreateEvent />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/events/:id"
                    element={
                      <ProtectedRoute>
                        <Events />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/join/:code" element={<JoinEvent />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
>>>>>>> 898b826f7d4c2eb9d89ffa11785bb347e39fe93f
}
