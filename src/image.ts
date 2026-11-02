/** Redimensiona uma imagem e devolve um data URL JPEG. */
export async function resizeImage(file: File, maxSize: number, quality = 0.75): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Não foi possível ler a imagem'))
      i.src = url
    })
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Foto de perfil quadrada (recorte central) pequena o bastante para caber numa célula da planilha. */
export async function squareAvatar(file: File, size = 160, quality = 0.7): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Não foi possível ler a imagem'))
      i.src = url
    })
    const side = Math.min(img.width, img.height)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    canvas
      .getContext('2d')!
      .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}
