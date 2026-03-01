import { useEffect, useState } from 'react'
import apiClient from '@/lib/api'

interface QrCodePreviewImageProps {
  src: string
  alt: string
  className?: string
}

const qrImageBlobCache = new Map<string, string>()
const qrImageInFlight = new Map<string, Promise<string>>()

export const clearQrPreviewImageCache = (): void => {
  qrImageBlobCache.forEach((blobUrl) => {
    try {
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      // no-op
    }
  })
  qrImageBlobCache.clear()
  qrImageInFlight.clear()
}

const resolveApiPath = (url: string): string => {
  if (!url) return ''
  if (url.startsWith('/api/')) return url.replace(/^\/api/, '')
  if (/^https?:\/\//i.test(url) && url.includes('/api/')) {
    const parsed = new URL(url)
    const apiPathIndex = parsed.pathname.indexOf('/api/')
    const apiPath = apiPathIndex >= 0 ? parsed.pathname.slice(apiPathIndex + 4) : parsed.pathname
    return `${apiPath}${parsed.search || ''}`
  }
  return url
}

const loadProtectedQrImage = async (rawUrl: string): Promise<string> => {
  const cached = qrImageBlobCache.get(rawUrl)
  if (cached) return cached

  const existingRequest = qrImageInFlight.get(rawUrl)
  if (existingRequest) return existingRequest

  const request = apiClient
    .get(resolveApiPath(rawUrl), { responseType: 'blob' })
    .then((response) => {
      const objectUrl = window.URL.createObjectURL(response.data)
      qrImageBlobCache.set(rawUrl, objectUrl)
      return objectUrl
    })
    .finally(() => {
      qrImageInFlight.delete(rawUrl)
    })

  qrImageInFlight.set(rawUrl, request)
  return request
}

export function QrCodePreviewImage({ src, alt, className }: QrCodePreviewImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setFailed(false)
      setResolvedSrc('')

      if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
        setResolvedSrc(src)
        setFailed(false)
        return
      }

      if (src.startsWith('/api/') || (/^https?:\/\//i.test(src) && src.includes('/api/'))) {
        try {
          const imageUrl = await loadProtectedQrImage(src)
          if (!cancelled) {
            setResolvedSrc(imageUrl)
            setFailed(false)
          }
          return
        } catch {
          if (!cancelled) {
            setFailed(true)
          }
          return
        }
      }

      setResolvedSrc(src)
      setFailed(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [src])

  if (failed) {
    return <div className={className} aria-label={alt}>QR yok</div>
  }

  if (!resolvedSrc) {
    return <div className={className} aria-label={alt}>QR yükleniyor</div>
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
