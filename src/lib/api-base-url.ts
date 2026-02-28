const DEFAULT_API_BASE_PATH = '/api'

function normalizeBaseUrl(value?: string): string {
  const raw = (value || '').trim()
  if (!raw) return DEFAULT_API_BASE_PATH
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export function resolveApiBaseUrl(): string {
  const envBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)

  // Dev ortamında her zaman local backend kullan: prod URL'ye asla gitme.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('.sara.local')) {
      return `http://${host}:8080${DEFAULT_API_BASE_PATH}`
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:8080${DEFAULT_API_BASE_PATH}`
    }
  }

  // Prod/stage ortamında absolute env değeri varsa onu kullan.
  if (/^https?:\/\//i.test(envBase)) {
    return envBase
  }

  return envBase || DEFAULT_API_BASE_PATH
}
