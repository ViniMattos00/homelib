export default function Cover({ src, title }: { src: string; title: string }) {
  if (src) return <img className="cover" src={src} alt={`Capa de ${title}`} loading="lazy" />
  return (
    <div className="cover cover-fallback" aria-hidden>
      <span>{title}</span>
    </div>
  )
}
