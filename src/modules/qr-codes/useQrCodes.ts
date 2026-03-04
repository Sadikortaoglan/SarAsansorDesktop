import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qrCodesService } from './qr-codes.service'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [value, delayMs])

  return debouncedValue
}

export function useQrCodes(initialPageSize = 10) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(initialPageSize)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch])

  const query = useQuery({
    queryKey: ['qr-codes', page, size, debouncedSearch],
    queryFn: () => qrCodesService.list(page, size, debouncedSearch || undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => qrCodesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] })
    },
  })

  return {
    page,
    setPage,
    size,
    searchInput,
    setSearchInput,
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    deleteQrCode: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
