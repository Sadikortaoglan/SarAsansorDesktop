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

export const elevatorDocumentsService = {
  getLabels(page: number, size: number, elevatorId?: number): Promise<SpringPage<ElevatorLabel>> {
    return getPage<ElevatorLabel>('/elevator-labels', { page, size, elevatorId })
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

  getContracts(page: number, size: number, elevatorId?: number): Promise<SpringPage<ElevatorContract>> {
    return getPage<ElevatorContract>('/elevator-contracts', { page, size, elevatorId })
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
