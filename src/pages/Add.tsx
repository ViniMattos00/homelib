import { useRef, useState, type FormEvent } from 'react'
import { useStore } from '../store'
import BookForm from '../components/BookForm'
import Cover from '../components/Cover'
import { hasAI, identifyFromPhoto, searchBooks } from '../lookup'
import { emptyDraft, type BookDraft } from '../types'

type Mode = 'text' | 'photo'
type Dest = 'library' | 'wish'

export default function Add({ initialDest = 'library', onDone }: { initialDest?: Dest; onDone: (dest: Dest) => void }) {
  const { books, addBook, addWish } = useStore()
  const [mode, setMode] = useState<Mode>('text')
  const [dest, setDest] = useState<Dest>(initialDest)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookDraft[]>([])
  const [draft, setDraft] = useState<BookDraft>(emptyDraft())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true); setError(''); setStatus(label)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false); setStatus('') }
  }

  const pick = (b: BookDraft) => {
    setDraft(b)
    setResults([])
  }

  const search = (e: FormEvent) => {
    e.preventDefault()
    run('Consultando a IA…', async () => {
      const r = await searchBooks(query)
      setResults(r)
      if (r.length === 0) setError('Nada encontrado. Preencha os dados manualmente abaixo.')
    })
  }

  const onPhoto = (file?: File) => {
    if (!file) return
    run('Identificando o livro pela foto…', async () => {
      const book = await identifyFromPhoto(file)
      if (!book) throw new Error('Não consegui identificar o livro. Tente outra foto ou busque pelo texto.')
      setDraft(book)
      setResults([])
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  const save = () => {
    const dup = dest === 'library' && books.some((b) => b.title.trim().toLowerCase() === draft.title.trim().toLowerCase())
    if (dup && !confirm('Já existe um livro com esse título na biblioteca. Cadastrar mesmo assim?')) return
    run('Salvando…', async () => {
      await (dest === 'library' ? addBook(draft) : addWish(draft))
      setDraft(emptyDraft()); setResults([]); setQuery('')
      onDone(dest)
    })
  }

  return (
    <section className="add">
      <div className="seg" role="tablist">
        <button className={dest === 'library' ? 'on' : ''} onClick={() => setDest('library')}>Na estante</button>
        <button className={dest === 'wish' ? 'on' : ''} onClick={() => setDest('wish')}>Quero ter</button>
      </div>
      <div className="seg" role="tablist">
        <button className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>Por texto</button>
        <button className={mode === 'photo' ? 'on' : ''} onClick={() => setMode('photo')}>Por foto</button>
      </div>

      {mode === 'text' ? (
        <form className="search-row" onSubmit={search}>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título, autor ou ISBN…"
            aria-label="Buscar livro"
          />
          <button className="btn" disabled={busy || !query.trim() || !hasAI}>Buscar</button>
        </form>
      ) : hasAI ? (
        <div className="photo-box">
          <p className="muted">Tire uma foto da capa (ou escolha da galeria). A IA identifica o livro.</p>
          <input
            ref={fileRef} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
          <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>📷 Fotografar capa</button>
        </div>
      ) : (
        <p className="error">
          Cadastro por foto requer uma chave da OpenAI. Defina <code>VITE_OPENAI_API_KEY</code> no <code>.env</code> e
          gere o site novamente.
        </p>
      )}

      {mode === 'text' && !hasAI && (
        <p className="error">
          A busca automática usa a OpenAI e a chave não está configurada (<code>VITE_OPENAI_API_KEY</code>).
          Preencha os dados manualmente abaixo.
        </p>
      )}
      {status && <p className="muted">{status}</p>}
      {error && <p className="error">{error}</p>}

      {results.length > 0 && (
        <ul className="results">
          {results.map((r, i) => (
            <li key={i}>
              <button onClick={() => pick(r)}>
                <Cover src={r.cover} title={r.title} />
                <span>
                  <strong>{r.title}</strong>
                  <small>{r.author || 'Autor desconhecido'} · {r.genre}{r.pages > 0 && ` · ${r.pages} págs.`}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="group-title">Dados do livro</h2>
      {draft.title && <p className="muted small">Dados sugeridos pela IA: confira páginas e gênero antes de salvar.</p>}
      <BookForm value={draft} onChange={setDraft} />
      <div className="actions">
        <button className="btn" disabled={busy || !draft.title.trim()} onClick={save}>
          {dest === 'library' ? 'Salvar na estante' : 'Salvar em "Quero ter"'}
        </button>
      </div>
    </section>
  )
}
