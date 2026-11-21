import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CAPTIONS = [
  'dance floor', 'the toast', 'garden', 'late night',
  'golden hour', 'sunset walk', 'the squad', 'cake chaos',
  'first dance', 'road trip', 'sparklers', 'front row',
  'selfie time', 'best table', 'rooftop', 'last song',
]

const PHOTO_COLORS = [
  ['#F2A65A', '#C4572B'],
  ['#8FB3D9', '#2F5A8A'],
  ['#9CB89A', '#4F6F57'],
  ['#E7B7C8', '#9B5C86'],
  ['#F3D58A', '#B7862B'],
  ['#C6D8EC', '#5C7FA8'],
  ['#BFE3D6', '#3F8F7A'],
  ['#F3C9A8', '#B5703F'],
]

const TILTS = [-6, 4, -3, 7, -5, 3, -7, 5]

const POLAROIDS = Array.from({ length: 28 }, (_, index) => {
  const row = Math.floor(index / 7)
  const column = index % 7

  return {
    caption: CAPTIONS[index % CAPTIONS.length],
    color: PHOTO_COLORS[index % PHOTO_COLORS.length],
    tilt: TILTS[index % TILTS.length],
    left: -60 + column * 230 + (row % 2 ? 115 : 0),
    top: -40 + row * 240,
    mobileLeft: index % 2 ? 'calc(50vw - 20px)' : '-30px',
    mobileTop: 40 + Math.floor(index / 2) * 170,
  }
})

const FEATURES = ['Photos', 'Voice notes', 'Time capsule', 'Photo quests']

export default function Home() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const initial = (user?.display_name || user?.email || 'M').trim().charAt(0).toUpperCase()

  return (
    <div className="home-page">
      <div className="home-wall" aria-hidden="true">
        {POLAROIDS.map((photo, index) => (
          <figure
            key={index}
            className="home-polaroid"
            style={{
              '--desktop-left': `${photo.left}px`,
              '--desktop-top': `${photo.top}px`,
              '--mobile-left': photo.mobileLeft,
              '--mobile-top': `${photo.mobileTop}px`,
              '--photo-tilt': `${photo.tilt}deg`,
              '--photo-start': photo.color[0],
              '--photo-end': photo.color[1],
            }}
          >
            <span className="home-polaroid__photo" />
            <figcaption>{photo.caption}</figcaption>
          </figure>
        ))}
      </div>

      <header className="home-header">
        <span className="home-header__brand">MOMENTO</span>
        <nav className="home-header__nav" aria-label="Main navigation">
          <Link to="/dashboard" className="home-header__link">My events</Link>
          {user ? (
            <>
              <button type="button" className="home-header__link" onClick={logout}>Log out</button>
              <span className="home-header__avatar" aria-hidden="true">{initial}</span>
            </>
          ) : (
            <Link to="/login" className="home-header__link">Log in</Link>
          )}
        </nav>
      </header>

      <main className="home-main">
        <div className="home-card-wrap">
          <section className="home-card" aria-labelledby="home-title">
            <p className="home-label">For parties, trips and weddings</p>
            <h1 className="home-title" id="home-title">
              Your night,<br />
              <span>together.</span>
            </h1>
            <p className="home-description">
              One wall for every photo, voice note and comment from the people who were there.
            </p>
            <div className="home-actions-row">
              <button type="button" className="home-button home-button--primary" onClick={() => navigate('/create')}>
                Start a Momento
              </button>
              <button type="button" className="home-button home-button--secondary" onClick={() => navigate('/join', { state: { role: 'guest' } })}>
                I have a link
              </button>
            </div>
            <div className="home-chips" aria-label="Momento features">
              {FEATURES.map((feature) => <span className="home-chip" key={feature}>{feature}</span>)}
            </div>
          </section>

          <span className="home-pill home-pill--love" aria-hidden="true">♥ 14</span>
          <span className="home-pill home-pill--voice" aria-hidden="true">
            <span className="home-pill__play">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 1.8v8.4L10 6 3 1.8Z" fill="white" />
              </svg>
            </span>
            0:12 · Riya
          </span>
          <span className="home-pill home-pill--activity" aria-hidden="true">Meera added 3 photos</span>
        </div>
      </main>
    </div>
  )
}
