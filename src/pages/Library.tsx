import { useMemo, useState } from 'react'
import { useStore } from '../store'
import BookCard from '../components/BookCard'
import BookForm from '../components/BookForm'
import Modal from '../components/Modal'
import ShareDialog from '../components/ShareDialog'
import { toDraft, type Book, type BookDraft } from '../types'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Library({ onAdd }: { onAdd: () => void }) {
  const { me, books, updateBook } = useStore()
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<Book | null>(null)
  const [draft, setDraft] = useState<BookDraft | null>(null)
  const [sharing, setSharing] = useState<Book | null>(null)
  const [error, setError] = useState('')

  const genres = useMemo(() => [...new Set(books.map((b) => b.genre))].sort((a, b) => a.localeCompare(b)), [books])

  const groups = useMemo(() => {
    const q = norm(query.trim())
    const filtered = books.filter((b) => {
      if (q && !norm(`${b.title} ${b.author}`).includes(q)) return false
      if (genre && b.genre !== genre) return false
      const mine = !!me && b.readBy.includes(me)
      if (status === 'read' && !mine) return false
      if (status === 'unread' && mine) return false
      if (status === 'nobody' && b.readBy.length > 0) return false
      return true
    })
    const map = new Map<string, Book[]>()
    for (const b of filtered) map.set(b.genre, [...(map.get(b.genre) ?? []), b])
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([g, list]) => [g, list.sort((a, b) => a.title.localeCompare(b.title))] as const)
  }, [books, query, genre, status, me])

  const total = groups.reduce((n, [, l]) => n + l.length, 0)

  const startEdit = (b: Book) => { setEditing(b); setDraft(toDraft(b)) }
  const saveEdit = async () => {
    if (!editing || !draft) return
    try {
      await updateBook(editing.id, draft)
      setEditing(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <section>
      <div className="toolbar">
        <input
          type="search" placeholder="Pesquisar por título ou autor…" value={query}
          onChange={(e) => setQuery(e.target.value)} aria-label="Pesquisar livros"
        />
        <select value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Filtrar por gênero">
          <option value="">Todos os gêneros</option>
          {genres.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por leitura">
          <option value="all">Todos</option>
          <option value="read">Eu li</option>
          <option value="unread">Eu não li</option>
          <option value="nobody">Ninguém leu</option>
        </select>
      </div>
      {error && <p className="error" onClick={() => setError('')}>{error}</p>}

      {books.length === 0 ? (
        <div className="empty">
          <p>Nenhum livro cadastrado ainda.</p>
          <button className="btn" onClick={onAdd}>Cadastrar o primeiro livro</button>
        </div>
      ) : total === 0 ? (
        <p className="empty">Nenhum livro encontrado.</p>
      ) : (
        groups.map(([g, list]) => (
          <div key={g} className="group">
            <h2 className="group-title">{g} <span className="count">{list.length}</span></h2>
            <div className="grid">
              {list.map((b) => (
                <BookCard key={b.id} book={b} onEdit={startEdit} onShare={setSharing} onError={setError} />
              ))}
            </div>
          </div>
        ))
      )}

      {editing && draft && (
        <Modal title="Editar livro" onClose={() => setEditing(null)}>
          <BookForm value={draft} onChange={setDraft} />
          <div className="actions">
            <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn" disabled={!draft.title.trim()} onClick={saveEdit}>Salvar</button>
          </div>
        </Modal>
      )}
      {sharing && <ShareDialog book={sharing} onClose={() => setSharing(null)} />}
    </section>
  )
}
