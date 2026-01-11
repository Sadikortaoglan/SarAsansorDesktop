// Backend API Response Wrapper
export interface ApiResponse<T> {
  success: boolean
  message: string | null
  data: T
  errors: string[] | null
}

// Response helper function
export function unwrapResponse<T>(response: ApiResponse<T> | T, allowFailure = false): T {
  // Eğer response zaten unwrapped ise direkt döndür
  if (response && typeof response === 'object' && 'success' in response) {
    const apiResponse = response as ApiResponse<T>
    if (apiResponse.success) {
      // data null veya undefined olabilir
      if (apiResponse.data !== undefined && apiResponse.data !== null) {
        return apiResponse.data
      }
      // data yoksa boş array veya null döndür
      return apiResponse.data as T
    }
    // success: false durumunda
    if (allowFailure) {
      // Opsiyonel endpoint'ler için boş veri döndür
      console.warn('API request failed (allowed):', apiResponse.message)
      return null as T
    }
    const errorMsg = apiResponse.message || apiResponse.errors?.join(', ') || 'API request failed'
    throw new Error(errorMsg)
  }
  // Zaten unwrapped ise
  return response as T
}

// Array response helper
export function unwrapArrayResponse<T>(data: ApiResponse<T[]> | T[], allowFailure = false): T[] {
  try {
    const unwrapped = unwrapResponse(data, allowFailure)
    return Array.isArray(unwrapped) ? unwrapped : []
  } catch (error) {
    if (allowFailure) {
      console.warn('Array unwrap failed (allowed):', error)
      return []
    }
    throw error
  }
}

