import { useMemo, useState } from 'react'
import { useStore } from '../store'
import Cover from '../components/Cover'
import { toDraft } from '../types'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Wishlist({ onAdd }: { onAdd: () => void }) {
  const { wishlist, users, addBook, deleteWish } = useStore()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const list = useMemo(() => {
    const q = norm(query.trim())
    return wishlist
      .filter((w) => !q || norm(`${w.title} ${w.author}`).includes(q))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [wishlist, query])

  const guard = async (fn: () => Promise<void>) => {
    try { setError(''); await fn() } catch (e) { setError((e as Error).message) }
  }
  const bought = (id: string) =>
    guard(async () => {
      const w = wishlist.find((x) => x.id === id)!
      await addBook(toDraft(w))
      await deleteWish(id)
    })

  return (
    <section>
      <div className="toolbar">
        <input type="search" placeholder="Pesquisar na lista…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn" onClick={onAdd}>+ Adicionar</button>
      </div>
      {error && <p className="error">{error}</p>}
      {wishlist.length === 0 ? (
        <p className="empty">Sua lista de desejos está vazia.</p>
      ) : (
        <div className="grid">
          {list.map((w) => (
            <article key={w.id} className="card book">
              <Cover src={w.cover} title={w.title} />
              <div className="book-body">
                <h3>{w.title}</h3>
                <p className="muted">{w.author || 'Autor desconhecido'}</p>
                <p className="muted small">
                  {w.genre}{w.pages > 0 && <> · {w.pages} págs.</>} · pedido por{' '}
                  {users.find((u) => u.username === w.addedBy)?.displayName ?? w.addedBy}
                </p>
                <div className="row-actions">
                  <button className="link" onClick={() => bought(w.id)}>Já comprei</button>
                  <button
                    className="link danger"
                    onClick={() => confirm(`Remover "${w.title}" da lista?`) && guard(() => deleteWish(w.id))}
                  >
                    Remover
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
