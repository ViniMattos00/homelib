import { useStore } from '../store'
import type { Book } from '../types'
import Cover from './Cover'

interface Props {
  book: Book
  onEdit: (b: Book) => void
  onShare: (b: Book) => void
  onError: (msg: string) => void
}

export default function BookCard({ book, onEdit, onShare, onError }: Props) {
  const { me, users, toggleRead, deleteBook } = useStore()

  const remove = async () => {
    if (!confirm(`Remover "${book.title}" da biblioteca?`)) return
    try { await deleteBook(book.id) } catch (e) { onError((e as Error).message) }
  }

  return (
    <article className="card book">
      <Cover src={book.cover} title={book.title} />
      <div className="book-body">
        <h3>{book.title}</h3>
        <p className="muted">{book.author || 'Autor desconhecido'}</p>
        <p className="muted small">
          {book.genre}{book.pages > 0 && <> · {book.pages} págs.</>}
        </p>
        <div className="chips">
          {users.map((u) => {
            const read = book.readBy.includes(u.username)
            const mine = u.username === me
            return (
              <button
                key={u.username}
                className={`chip ${read ? 'on' : ''}`}
                disabled={!mine}
                title={mine ? 'Clique para marcar/desmarcar' : undefined}
                onClick={() => toggleRead(book.id).catch((e) => onError(e.message))}
              >
                {read ? '✓' : '○'} {mine ? 'Eu' : u.displayName}
              </button>
            )
          })}
        </div>
        <div className="row-actions">
          <button className="link" onClick={() => onShare(book)}>Compartilhar</button>
          <button className="link" onClick={() => onEdit(book)}>Editar</button>
          <button className="link danger" onClick={remove}>Remover</button>
        </div>
      </div>
    </article>
  )
}
