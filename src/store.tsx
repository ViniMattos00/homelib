import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api'
import type { Book, BookDraft, Share, User, WishItem } from './types'

interface Store {
  me: string | null
  users: User[]
  books: Book[]
  wishlist: WishItem[]
  shares: Share[]
  booting: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  addBook: (d: BookDraft) => Promise<void>
  updateBook: (id: string, d: Partial<BookDraft>) => Promise<void>
  deleteBook: (id: string) => Promise<void>
  toggleRead: (id: string) => Promise<void>
  addWish: (d: BookDraft) => Promise<void>
  deleteWish: (id: string) => Promise<void>
  updateProfile: (p: { displayName?: string; photo?: string }) => Promise<void>
  shareBook: (d: BookDraft, toUser: string, message: string) => Promise<void>
  markSeen: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fora do provider')
  return s
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [wishlist, setWishlist] = useState<WishItem[]>([])
  const [shares, setShares] = useState<Share[]>([])
  const [booting, setBooting] = useState(() => Boolean(getToken()))

  const clear = useCallback(() => {
    setMe(null); setUsers([]); setBooks([]); setWishlist([]); setShares([])
  }, [])

  const refresh = useCallback(async () => {
    const d = await api.sync()
    setMe(d.me); setUsers(d.users); setBooks(d.books); setWishlist(d.wishlist); setShares(d.shares)
  }, [])

  useEffect(() => {
    if (getToken()) refresh().catch(() => clear()).finally(() => setBooting(false))
    const onUnauth = () => clear()
    window.addEventListener('homelib:unauthorized', onUnauth)
    return () => window.removeEventListener('homelib:unauthorized', onUnauth)
  }, [refresh, clear])

  const value = useMemo<Store>(
    () => ({
      me, users, books, wishlist, shares, booting,
      refresh,
      login: async (username, password) => {
        const r = await api.login(username, password)
        setToken(r.token)
        await refresh()
      },
      logout: () => { setToken(null); clear() },
      addBook: async (d) => { const b = await api.addBook(d); setBooks((x) => [...x, b]) },
      updateBook: async (id, d) => {
        const b = await api.updateBook(id, d)
        setBooks((x) => x.map((i) => (i.id === id ? b : i)))
      },
      deleteBook: async (id) => { await api.deleteBook(id); setBooks((x) => x.filter((i) => i.id !== id)) },
      toggleRead: async (id) => {
        if (!me) return
        const cur = books.find((b) => b.id === id)
        if (!cur) return
        const read = !cur.readBy.includes(me)
        const apply = (readBy: string[]) => setBooks((x) => x.map((b) => (b.id === id ? { ...b, readBy } : b)))
        apply(read ? [...cur.readBy, me] : cur.readBy.filter((u) => u !== me)) // otimista
        try {
          const r = await api.toggleRead(id, read)
          apply(r.readBy)
        } catch (e) {
          apply(cur.readBy)
          throw e
        }
      },
      addWish: async (d) => { const w = await api.addWish(d); setWishlist((x) => [...x, w]) },
      deleteWish: async (id) => { await api.deleteWish(id); setWishlist((x) => x.filter((i) => i.id !== id)) },
      updateProfile: async (p) => {
        const u = await api.updateProfile(p)
        setUsers((x) => x.map((i) => (i.username === u.username ? u : i)))
      },
      shareBook: async (d, toUser, message) => {
        const s = await api.shareBook(d, toUser, message)
        setShares((x) => [...x, s])
      },
      markSeen: async () => {
        await api.markSeen()
        setShares((x) => x.map((s) => (s.toUser === me ? { ...s, seen: true } : s)))
      },
    }),
    [me, users, books, wishlist, shares, booting, refresh, clear],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
