export default function MomentoShell({ children, wallColor, wallStyle = 'polaroid' }) {
  return (
    <div
      className="momento-shell"
      data-theme={wallStyle}
      style={wallColor ? { backgroundColor: wallColor } : undefined}
    >
      {children}
    </div>
  )
}
