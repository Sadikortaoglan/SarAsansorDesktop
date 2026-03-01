import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage, toMultipartPayload } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface ElevatorLabel {
  id?: number
  elevatorId: number
  elevatorName?: string
  labelName: string
  startAt: string
  endAt: string
  description?: string
  filePath?: string
}

export interface ElevatorContract {
  id?: number
  elevatorId: number
  elevatorName?: string
  contractDate: string
  contractHtml?: string
  filePath?: string
}

function isMissingEndpointError(error: any): boolean {
  const status = error?.response?.status
  const message = error?.response?.data?.message
  return status === 404 && typeof message === 'string' && message.includes('No static resource')
}

function emptyPage<T>(page: number, size: number): SpringPage<T> {
  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    size,
    number: page,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  }
}

export const elevatorDocumentsService = {
  async getLabels(page: number, size: number, elevatorId?: number): Promise<SpringPage<ElevatorLabel>> {
    try {
      return await getPage<ElevatorLabel>('/elevator-labels', { page, size, elevatorId })
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<ElevatorLabel>(page, size)
      throw error
    }
  },
  createLabel(payload: ElevatorLabel, file?: File | null): Promise<ElevatorLabel> {
    return apiClient
      .post<ApiResponse<ElevatorLabel>>('/elevator-labels', toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  updateLabel(id: number, payload: ElevatorLabel, file?: File | null): Promise<ElevatorLabel> {
    return apiClient
      .put<ApiResponse<ElevatorLabel>>(`/elevator-labels/${id}`, toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  deleteLabel(id: number): Promise<void> {
    return apiClient.delete(`/elevator-labels/${id}`).then(() => undefined)
  },

  async getContracts(page: number, size: number, elevatorId?: number): Promise<SpringPage<ElevatorContract>> {
    try {
      return await getPage<ElevatorContract>('/elevator-contracts', { page, size, elevatorId })
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<ElevatorContract>(page, size)
      throw error
    }
  },
  createContract(payload: ElevatorContract, file?: File | null): Promise<ElevatorContract> {
    return apiClient
      .post<ApiResponse<ElevatorContract>>('/elevator-contracts', toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  updateContract(id: number, payload: ElevatorContract, file?: File | null): Promise<ElevatorContract> {
    return apiClient
      .put<ApiResponse<ElevatorContract>>(`/elevator-contracts/${id}`, toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  deleteContract(id: number): Promise<void> {
    return apiClient.delete(`/elevator-contracts/${id}`).then(() => undefined)
  },
}
