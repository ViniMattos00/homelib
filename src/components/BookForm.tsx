import { GENRES } from '../lookup'
import type { BookDraft } from '../types'

export default function BookForm({ value, onChange }: { value: BookDraft; onChange: (v: BookDraft) => void }) {
  const set = <K extends keyof BookDraft>(k: K, v: BookDraft[K]) => onChange({ ...value, [k]: v })
  return (
    <div className="form-grid">
      <label>
        Título *
        <input value={value.title} onChange={(e) => set('title', e.target.value)} required />
      </label>
      <label>
        Autor
        <input value={value.author} onChange={(e) => set('author', e.target.value)} />
      </label>
      <label>
        Páginas
        <input
          type="number" min={0} inputMode="numeric"
          value={value.pages || ''}
          onChange={(e) => set('pages', Number(e.target.value) || 0)}
        />
      </label>
      <label>
        Gênero
        <input list="genres" value={value.genre} onChange={(e) => set('genre', e.target.value)} />
        <datalist id="genres">{GENRES.map((g) => <option key={g} value={g} />)}</datalist>
      </label>
      <label className="span-2">
        URL da capa
        <input value={value.cover} onChange={(e) => set('cover', e.target.value)} placeholder="https://…" />
      </label>
    </div>
  )
}
