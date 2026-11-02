import type { Book, BookDraft, Share, SyncData, User, WishItem } from './types'

const API = import.meta.env.VITE_APPS_SCRIPT_URL
const TOKEN_KEY = 'homelib.token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

async function call<T>(action: string, payload: object = {}): Promise<T> {
  if (!API) throw new Error('VITE_APPS_SCRIPT_URL não configurada. Veja o README.')
  // text/plain evita o preflight CORS, que o Apps Script não suporta
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: getToken(), ...payload }),
  })
  if (!res.ok) throw new Error(`Erro de rede (${res.status})`)
  const json = await res.json()
  if (!json.ok) {
    if (json.error === 'unauthorized') {
      setToken(null)
      window.dispatchEvent(new Event('homelib:unauthorized'))
      throw new Error('Sessão expirada. Entre novamente.')
    }
    throw new Error(json.error || 'Erro desconhecido')
  }
  return json.data as T
}

export const api = {
  login: (username: string, password: string) =>
    call<{ token: string; username: string }>('login', { username, password }),
  sync: () => call<SyncData>('sync'),
  addBook: (book: BookDraft) => call<Book>('addBook', { book }),
  updateBook: (id: string, fields: Partial<BookDraft>) => call<Book>('updateBook', { id, fields }),
  deleteBook: (id: string) => call<{ id: string }>('deleteBook', { id }),
  toggleRead: (id: string, read: boolean) => call<{ id: string; readBy: string[] }>('toggleRead', { id, read }),
  addWish: (item: BookDraft) => call<WishItem>('addWish', { item }),
  deleteWish: (id: string) => call<{ id: string }>('deleteWish', { id }),
  updateProfile: (p: { displayName?: string; photo?: string }) => call<User>('updateProfile', p),
  shareBook: (book: BookDraft, toUser: string, message: string) =>
    call<Share>('shareBook', { book, toUser, message }),
  markSeen: () => call<{ ok: boolean }>('markSeen'),
}
