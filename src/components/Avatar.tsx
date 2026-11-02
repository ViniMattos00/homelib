import type { User } from '../types'

export default function Avatar({ user, size = 36 }: { user?: User; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.42 }
  if (user?.photo) return <img className="avatar" src={user.photo} alt={user.displayName} style={style} />
  return (
    <span className="avatar avatar-fallback" style={style} aria-label={user?.displayName}>
      {(user?.displayName ?? '?').slice(0, 1).toUpperCase()}
    </span>
  )
}
