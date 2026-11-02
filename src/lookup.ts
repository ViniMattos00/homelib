import type { BookDraft } from './types'
import { resizeImage } from './image'

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'

export const hasAI = Boolean(OPENAI_KEY)

export const GENRES = [
  'Fantasia', 'Ficção', 'Ficção científica', 'Romance', 'Mistério e suspense', 'Terror',
  'Aventura', 'Infantojuvenil', 'HQ e mangá', 'Biografia', 'História', 'Autoajuda',
  'Negócios', 'Tecnologia', 'Ciências', 'Filosofia', 'Psicologia', 'Religião e espiritualidade',
  'Poesia', 'Culinária', 'Arte', 'Outros',
]

/** Schema de um livro, usado nas respostas estruturadas (Structured Outputs). */
const BOOK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'author', 'pages', 'genre', 'isbn'],
  properties: {
    title: { type: 'string', description: 'Título completo do livro, na edição em português quando existir.' },
    author: { type: 'string', description: 'Autor(es), separados por vírgula.' },
    pages: { type: 'integer', description: 'Número aproximado de páginas da edição mais comum. Use 0 se não souber.' },
    genre: { type: 'string', enum: GENRES, description: 'Gênero principal do livro.' },
    isbn: { type: 'string', description: 'ISBN-13 se tiver certeza; caso contrário, string vazia.' },
  },
} as const

interface RawBook { title: string; author: string; pages: number; genre: string; isbn: string }

const toDraft = (b: RawBook): BookDraft => ({
  title: b.title.trim(),
  author: b.author.trim(),
  pages: Math.max(0, Math.round(b.pages) || 0),
  genre: GENRES.includes(b.genre) ? b.genre : 'Outros',
  cover: '',
  isbn: b.isbn.replace(/[^0-9Xx]/g, ''),
})

async function openai<T>(schemaName: string, schema: object, messages: unknown[]): Promise<T> {
  if (!OPENAI_KEY) throw new Error('Defina VITE_OPENAI_API_KEY para usar a busca por IA. Você pode preencher manualmente.')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0,
      response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
    }),
  })
  if (!res.ok) throw new Error(`A OpenAI retornou erro ${res.status}. Tente de novo ou preencha manualmente.`)
  const json = await res.json()
  const message = json.choices?.[0]?.message
  if (message?.refusal) throw new Error('A IA recusou o pedido.')
  return JSON.parse(message?.content ?? '{}') as T
}

const SYSTEM =
  'Você é um bibliotecário especialista. Devolva dados bibliográficos reais e precisos. ' +
  'Não invente livros: se não tiver certeza de um campo, use 0 em pages e "" em isbn.'

/** Busca livros por título, autor ou ISBN e devolve até 5 candidatos já estruturados. */
export async function searchBooks(query: string): Promise<BookDraft[]> {
  const q = query.trim()
  if (!q) return []
  const data = await openai<{ results: RawBook[] }>(
    'book_candidates',
    {
      type: 'object',
      additionalProperties: false,
      required: ['results'],
      properties: { results: { type: 'array', maxItems: 5, items: BOOK_SCHEMA } },
    },
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `Busca do usuário: "${q}"\nListe até 5 livros que melhor correspondem, do mais provável ao menos. Se for claramente um único livro, devolva apenas ele.`,
      },
    ],
  )
  return data.results.filter((b) => b.title.trim()).map(toDraft)
}

/** Identifica o livro de uma foto de capa/lombada e devolve os dados estruturados (ou null). */
export async function identifyFromPhoto(file: File): Promise<BookDraft | null> {
  const dataUrl = await resizeImage(file, 1024, 0.8)
  const data = await openai<{ found: boolean; book: RawBook }>(
    'book_from_photo',
    {
      type: 'object',
      additionalProperties: false,
      required: ['found', 'book'],
      properties: {
        found: { type: 'boolean', description: 'false se a foto não mostra um livro identificável.' },
        book: BOOK_SCHEMA,
      },
    },
    [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identifique o livro desta foto (capa ou lombada) e preencha os dados.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  )
  return data.found && data.book.title.trim() ? toDraft(data.book) : null
}
