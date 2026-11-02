import { useEffect, useState } from 'react'
import { useStore } from '../store'
import Cover from '../components/Cover'
import { toDraft, type Share } from '../types'

export default function Shared() {
  const { me, users, shares, markSeen, addBook, addWish } = useStore()
  const [error, setError] = useState('')
  const [done, setDone] = useState<Record<string, string>>({})
  const name = (u: string) => users.find((x) => x.username === u)?.displayName ?? u

  const received = shares.filter((s) => s.toUser === me).sort((a, b) => b.createdAt - a.createdAt)
  const sent = shares.filter((s) => s.fromUser === me).sort((a, b) => b.createdAt - a.createdAt)

  // Marca como vistos ao abrir a aba (mantém o destaque "novo" só nesta visita)
  const [newIds] = useState(() => new Set(received.filter((s) => !s.seen).map((s) => s.id)))
  useEffect(() => {
    if (newIds.size > 0) markSeen().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const act = async (s: Share, kind: 'library' | 'wish') => {
    try {
      setError('')
      await (kind === 'library' ? addBook(toDraft(s)) : addWish(toDraft(s)))
      setDone((d) => ({ ...d, [s.id]: kind === 'library' ? 'Adicionado à estante' : 'Adicionado a "Quero ter"' }))
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <section>
      {error && <p className="error">{error}</p>}
      <h2 className="group-title">Recebidos</h2>
      {received.length === 0 && <p className="empty">Nada por aqui ainda.</p>}
      <div className="grid">
        {received.map((s) => (
          <article key={s.id} className="card book">
            <Cover src={s.cover} title={s.title} />
            <div className="book-body">
              {newIds.has(s.id) && <span className="badge">novo</span>}
              <h3>{s.title}</h3>
              <p className="muted">{s.author}</p>
              <p className="small">De <strong>{name(s.fromUser)}</strong> em {new Date(s.createdAt).toLocaleDateString('pt-BR')}</p>
              {s.message && <blockquote>{s.message}</blockquote>}
              {done[s.id] ? (
                <p className="small ok">{done[s.id]} ✓</p>
              ) : (
                <div className="row-actions">
                  <button className="link" onClick={() => act(s, 'wish')}>Quero ter</button>
                  <button className="link" onClick={() => act(s, 'library')}>Já tenho</button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <h2 className="group-title">Enviados</h2>
      {sent.length === 0 && <p className="empty">Você ainda não compartilhou nenhum livro.</p>}
      <ul className="plain-list">
        {sent.map((s) => (
          <li key={s.id}>
            <strong>{s.title}</strong> para {name(s.toUser)}
            <span className="muted small"> · {new Date(s.createdAt).toLocaleDateString('pt-BR')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
