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

const ICONS: Record<Tab | 'sun' | 'moon', string> = {
  library: 'M5 4h4v16H5zM11 4h4v16h-4zM17.2 5.2l3.6-.9 3 14.9-3.6.9z',
  add: 'M12 5v14M5 12h14',
  wish: 'M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.400-7.500 10-7.500 10z',
  shared: 'M3.500 6.500h17v11h-17zM3.500 7l8.500 6.500L20.500 7',
  profile: 'M12 12.500a4.200 4.200 0 1 0 0-8.400 4.200 4.200 0 0 0 0 8.400zM4.500 20.500c.8-4 3.700-6 7.500-6s6.700 2 7.500 6',
  sun: 'M12 16.500a4.500 4.500 0 1 0 0-9 4.500 4.500 0 0 0 0 9zM12 2.500v2M12 19.500v2M2.500 12h2M19.500 12h2M5.300 5.300l1.400 1.400M17.300 17.300l1.400 1.400M5.300 18.700l1.400-1.400M17.300 6.700l1.400-1.400',
  moon: 'M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500z',
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'library', label: 'Estante' },
  { id: 'add', label: 'Adicionar' },
  { id: 'wish', label: 'Quero ter' },
  { id: 'shared', label: 'Recebidos' },
  { id: 'profile', label: 'Perfil' },
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
        <h1 className="brand">Home<span>Lib</span></h1>
        <nav className="tabs" aria-label="Navegação principal">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)}>
              <Icon name={t.id} />
              <span>{t.label}</span>
              {t.id === 'shared' && unread > 0 && <span className="dot">{unread}</span>}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Alternar modo claro/escuro" title="Alternar tema">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
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
