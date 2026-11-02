import { useEffect, useState } from 'react'
import { useStore } from './store'
import Login from './pages/Login'
import Library from './pages/Library'
import Add from './pages/Add'
import Wishlist from './pages/Wishlist'
import Shared from './pages/Shared'
import Profile from './pages/Profile'
import Avatar from './components/Avatar'

type Tab = 'library' | 'add' | 'wish' | 'shared' | 'profile'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'library', label: 'Estante', icon: '📚' },
  { id: 'add', label: 'Adicionar', icon: '➕' },
  { id: 'wish', label: 'Quero ter', icon: '🎁' },
  { id: 'shared', label: 'Recebidos', icon: '💌' },
  { id: 'profile', label: 'Perfil', icon: '👤' },
]

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.dataset.theme as 'light' | 'dark') || 'light',
  )
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('homelib.theme', theme) } catch { /* ignore */ }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const
}

export default function App() {
  const { me, users, shares, booting } = useStore()
  const [theme, toggleTheme] = useTheme()
  const [tab, setTab] = useState<Tab>('library')
  const [addDest, setAddDest] = useState<'library' | 'wish'>('library')
  const [profileUser, setProfileUser] = useState<string | null>(null)

  if (booting) return <main className="login"><p className="muted">Carregando…</p></main>
  if (!me) return <Login />

  const unread = shares.filter((s) => s.toUser === me && !s.seen).length
  const go = (t: Tab) => { setTab(t); if (t === 'profile') setProfileUser(null) }
  const openAdd = (dest: 'library' | 'wish') => { setAddDest(dest); setTab('add') }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">HomeLib</h1>
        <nav className="tabs" aria-label="Navegação principal">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>
              <span className="tab-icon" aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
              {t.id === 'shared' && unread > 0 && <span className="dot">{unread}</span>}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Alternar modo claro/escuro" title="Alternar tema">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="icon-btn" onClick={() => go('profile')} aria-label="Meu perfil">
            <Avatar user={users.find((u) => u.username === me)} size={32} />
          </button>
        </div>
      </header>

      <main className="content">
        {tab === 'library' && <Library onAdd={() => openAdd('library')} />}
        {tab === 'add' && (
          <Add key={addDest} initialDest={addDest} onDone={(d) => setTab(d === 'library' ? 'library' : 'wish')} />
        )}
        {tab === 'wish' && <Wishlist onAdd={() => openAdd('wish')} />}
        {tab === 'shared' && <Shared />}
        {tab === 'profile' && <Profile key={profileUser ?? me} username={profileUser ?? me} onOpen={setProfileUser} />}
      </main>
    </div>
  )
}
