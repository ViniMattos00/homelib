import { useState } from 'react'
import Modal from './Modal'
import { useStore } from '../store'
import { toDraft, type BookDraft } from '../types'

export default function ShareDialog({ book, onClose }: { book: BookDraft; onClose: () => void }) {
  const { me, users, shareBook } = useStore()
  const others = users.filter((u) => u.username !== me)
  const [to, setTo] = useState(others[0]?.username ?? '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    setBusy(true); setError('')
    try {
      await shareBook(toDraft(book), to, message)
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal title="Compartilhar livro" onClose={onClose}>
      <p><strong>{book.title}</strong>{book.author && <> — {book.author}</>}</p>
      <label>
        Para
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          {others.map((u) => <option key={u.username} value={u.username}>{u.displayName}</option>)}
        </select>
      </label>
      <label>
        Mensagem (opcional)
        <textarea rows={3} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn" disabled={busy || !to} onClick={send}>{busy ? 'Enviando…' : 'Enviar'}</button>
      </div>
    </Modal>
  )
}
