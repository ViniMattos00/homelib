import type { BookDraft } from './types'
import { resizeImage } from './image'

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
const GB_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY

export const hasAI = Boolean(OPENAI_KEY)

export const GENRES = [
  'Fantasia', 'Ficção', 'Ficção científica', 'Romance', 'Mistério e suspense', 'Terror',
  'Aventura', 'Infantojuvenil', 'HQ e mangá', 'Biografia', 'História', 'Autoajuda',
  'Negócios', 'Tecnologia', 'Ciências', 'Filosofia', 'Psicologia', 'Religião e espiritualidade',
  'Poesia', 'Culinária', 'Arte', 'Outros',
]

// A ordem importa: o primeiro padrão que casar define o gênero.
const GENRE_RULES: [RegExp, string][] = [
  [/fantasy|fantasia/i, 'Fantasia'],
  [/science fiction|sci-fi|ficção científica/i, 'Ficção científica'],
  [/horror|terror/i, 'Terror'],
  [/mystery|thriller|crime|detective|suspense|mistério/i, 'Mistério e suspense'],
  [/romance/i, 'Romance'],
  [/comic|graphic novel|manga|quadrinhos/i, 'HQ e mangá'],
  [/juvenile|young adult|children|infantil|juvenil/i, 'Infantojuvenil'],
  [/adventure|aventura/i, 'Aventura'],
  [/poetry|poesia|poems/i, 'Poesia'],
  [/biograph|autobiograph|memoir/i, 'Biografia'],
  [/history|história/i, 'História'],
  [/self-help|autoajuda|personal development/i, 'Autoajuda'],
  [/business|economics|finance|management|negócios/i, 'Negócios'],
  [/computer|programming|technology|engineering/i, 'Tecnologia'],
  [/psycholog/i, 'Psicologia'],
  [/philosoph|filosofia/i, 'Filosofia'],
  [/religio|spiritual|bible/i, 'Religião e espiritualidade'],
  [/cooking|cookbook|culin/i, 'Culinária'],
  [/science|nature|mathematic|medical/i, 'Ciências'],
  [/art|music|photograph|design/i, 'Arte'],
  [/fiction|literary|ficção|novel/i, 'Ficção'],
]

export function mapGenre(categories: string[] | undefined): string {
  const text = (categories ?? []).join(' / ')
  for (const [re, genre] of GENRE_RULES) if (re.test(text)) return genre
  return 'Outros'
}

interface GBVolume {
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    pageCount?: number
    categories?: string[]
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    industryIdentifiers?: { type: string; identifier: string }[]
  }
}

export async function searchBooks(query: string): Promise<BookDraft[]> {
  const q = query.trim()
  if (!q) return []
  const params = new URLSearchParams({ q, maxResults: '8', printType: 'books' })
  if (GB_KEY) params.set('key', GB_KEY)
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
  if (!res.ok) throw new Error('Falha ao consultar o Google Books. Você pode preencher manualmente.')
  const json = (await res.json()) as { items?: GBVolume[] }
  return (json.items ?? [])
    .map((it) => it.volumeInfo)
    .filter((v): v is NonNullable<GBVolume['volumeInfo']> => !!v?.title)
    .map((v) => ({
      title: v.title!,
      author: (v.authors ?? []).join(', '),
      pages: v.pageCount ?? 0,
      genre: mapGenre(v.categories),
      cover: (v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? '').replace(/^http:/, 'https:'),
      isbn:
        v.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier ??
        v.industryIdentifiers?.[0]?.identifier ??
        '',
    }))
}

async function openai(messages: unknown[]): Promise<string> {
  if (!OPENAI_KEY) throw new Error('Defina VITE_OPENAI_API_KEY no .env para usar IA.')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI retornou erro ${res.status}`)
  const json = await res.json()
  return json.choices?.[0]?.message?.content ?? '{}'
}

/** Lê a capa/lombada em uma foto e devolve título e autor. */
export async function identifyFromPhoto(file: File): Promise<{ title: string; author: string; isbn: string }> {
  const dataUrl = await resizeImage(file, 1024, 0.8)
  const content = await openai([
    {
      role: 'system',
      content:
        'Você identifica livros a partir de fotos de capa ou lombada. Responda apenas JSON: {"title": string, "author": string, "isbn": string}. Use "" para o que não souber.',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Qual é o livro desta foto?' },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ])
  const parsed = JSON.parse(content)
  return { title: parsed.title ?? '', author: parsed.author ?? '', isbn: parsed.isbn ?? '' }
}

/** Classifica o gênero com IA quando o Google Books não informa. */
export async function classifyGenre(title: string, author: string): Promise<string> {
  if (!hasAI) return 'Outros'
  try {
    const content = await openai([
      {
        role: 'system',
        content: `Classifique o livro em exatamente um destes gêneros: ${GENRES.join(', ')}. Responda JSON: {"genre": string}.`,
      },
      { role: 'user', content: `Título: ${title}\nAutor: ${author}` },
    ])
    const g = JSON.parse(content).genre
    return GENRES.includes(g) ? g : 'Outros'
  } catch {
    return 'Outros'
  }
}
