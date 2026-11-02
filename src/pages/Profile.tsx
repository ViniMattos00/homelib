import { useRef, useState } from 'react'
import { useStore } from '../store'
import Avatar from '../components/Avatar'
import Cover from '../components/Cover'
import { squareAvatar } from '../image'

export default function Profile({ username, onOpen }: { username: string; onOpen: (u: string) => void }) {
  const { me, users, books, updateProfile, logout } = useStore()
  const user = users.find((u) => u.username === username)
  const mine = username === me
  const other = users.find((u) => u.username !== username)
  const [name, setName] = useState(user?.displayName ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!user) return <p className="empty">Perfil não encontrado.</p>

  const read = books.filter((b) => b.readBy.includes(username))
  const pages = read.reduce((n, b) => n + b.pages, 0)

  const guard = async (fn: () => Promise<void>) => {
    try { setError(''); setSaved(false); await fn(); setSaved(true) } catch (e) { setError((e as Error).message) }
  }
  const onPhoto = (file?: File) => file && guard(async () => updateProfile({ photo: await squareAvatar(file) }))

  return (
    <section className="profile">
      <div className="card profile-head">
        <Avatar user={user} size={96} />
        <div className="profile-info">
          {mine ? (
            <>
              <label>
                Nome
                <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              </label>
              <div className="actions left">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
                <button className="btn ghost" onClick={() => fileRef.current?.click()}>Trocar foto</button>
                {user.photo && <button className="btn ghost" onClick={() => guard(() => updateProfile({ photo: '' }))}>Remover foto</button>}
                <button
                  className="btn" disabled={!name.trim() || name === user.displayName}
                  onClick={() => guard(() => updateProfile({ displayName: name }))}
                >
                  Salvar nome
                </button>
              </div>
              {saved && <p className="ok small">Salvo ✓</p>}
            </>
          ) : (
            <h2>{user.displayName}</h2>
          )}
          <p className="muted">
            {read.length} {read.length === 1 ? 'livro lido' : 'livros lidos'}
            {pages > 0 && <> · {pages.toLocaleString('pt-BR')} páginas</>}
          </p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="actions left">
        {other && (
          <button className="btn ghost" onClick={() => onOpen(mine ? other.username : me!)}>
            {mine ? `Ver perfil de ${other.displayName}` : 'Voltar ao meu perfil'}
          </button>
        )}
        {mine && <button className="btn ghost" onClick={logout}>Sair</button>}
      </div>

      <h2 className="group-title">Livros lidos</h2>
      {read.length === 0 ? (
        <p className="empty">{mine ? 'Marque livros como lidos na estante.' : 'Nenhum livro lido ainda.'}</p>
      ) : (
        <div className="shelf">
          {read.map((b) => (
            <div key={b.id} className="shelf-item" title={`${b.title} — ${b.author}`}>
              <Cover src={b.cover} title={b.title} />
              <span>{b.title}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
