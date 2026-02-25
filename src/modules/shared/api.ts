import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import type { SpringPage } from './types'

export async function getPage<T>(url: string, params?: Record<string, unknown>): Promise<SpringPage<T>> {
  const cleanedParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => {
      if (value === undefined || value === null) return false
      if (typeof value === 'string' && value.trim() === '') return false
      return true
    })
  )
  const { data } = await apiClient.get<ApiResponse<SpringPage<T>>>(url, { params: cleanedParams })
  return unwrapResponse(data)
}

export function toMultipartPayload(payload: unknown, file?: File | null): FormData {
  const form = new FormData()
  form.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) {
    form.append('file', file)
  }
  return form
}
