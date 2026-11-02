export interface User {
  username: string
  displayName: string
  photo: string
}

export interface BookDraft {
  title: string
  author: string
  pages: number
  genre: string
  cover: string
  isbn: string
}

export interface Book extends BookDraft {
  id: string
  addedBy: string
  addedAt: number
  readBy: string[]
}

export interface WishItem extends BookDraft {
  id: string
  addedBy: string
  addedAt: number
}

export interface Share extends BookDraft {
  id: string
  fromUser: string
  toUser: string
  message: string
  createdAt: number
  seen: boolean
}

export interface SyncData {
  me: string
  users: User[]
  books: Book[]
  wishlist: WishItem[]
  shares: Share[]
}

export const emptyDraft = (): BookDraft => ({
  title: '',
  author: '',
  pages: 0,
  genre: 'Outros',
  cover: '',
  isbn: '',
})

export const toDraft = (b: BookDraft): BookDraft => ({
  title: b.title,
  author: b.author,
  pages: b.pages,
  genre: b.genre,
  cover: b.cover,
  isbn: b.isbn,
})
