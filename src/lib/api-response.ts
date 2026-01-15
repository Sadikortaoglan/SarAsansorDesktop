export interface ApiResponse<T> {
  success: boolean
  message: string | null
  data: T
  errors: string[] | null
}

export function unwrapResponse<T>(response: ApiResponse<T> | T, allowFailure = false): T {
  if (response && typeof response === 'object' && 'success' in response) {
    const apiResponse = response as ApiResponse<T>
    if (apiResponse.success) {
      if (apiResponse.data !== undefined && apiResponse.data !== null) {
        return apiResponse.data
      }
      return apiResponse.data as T
    }
    if (allowFailure) {
      return null as T
    }
    const errorMsg = apiResponse.message || apiResponse.errors?.join(', ') || 'API request failed'
    throw new Error(errorMsg)
  }
  return response as T
}
export function unwrapArrayResponse<T>(data: ApiResponse<T[]> | T[], allowFailure = false): T[] {
  try {
    const unwrapped = unwrapResponse(data, allowFailure)
    return Array.isArray(unwrapped) ? unwrapped : []
  } catch (error) {
    if (allowFailure) {
      return []
    }
    throw error
  }
}

