// Polaroid photo card with warm shadow and optional handwritten caption.
// Used on home, share, gallery, and photo view screens.

const TILT_CLASS = {
  1: 'polaroid--tilt-1',
  2: 'polaroid--tilt-2',
  3: 'polaroid--tilt-3',
  4: 'polaroid--tilt-4',
}

export default function Polaroid({
  src,
  alt = '',
  caption,
  tilt = 1,
  placeholderColor = '#E8D5C4',
  style,
  onClick,
  className = '',
  loading,
}) {
  const tiltClass = TILT_CLASS[tilt] || TILT_CLASS[1]
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`polaroid ${tiltClass} ${className}`.trim()}
      style={{
        border: 'none',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {src ? (
        <img className="polaroid__image" src={src} alt={alt} loading={loading} />
      ) : (
        <span
          className="polaroid__placeholder"
          style={{ backgroundColor: placeholderColor }}
          aria-hidden="true"
        />
      )}
      {caption ? <p className="caption-hand" style={{ margin: 0 }}>{caption}</p> : null}
    </Wrapper>
  )
}
