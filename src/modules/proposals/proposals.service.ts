import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface OfferItem {
  id?: number
  partId?: number
  quantity?: number
  unitPrice?: number
  totalPrice?: number
  partName?: string
}

export interface Proposal {
  id?: number
  elevatorId?: number
  elevatorBuildingName?: string
  elevatorIdentityNumber?: string
  date: string
  vatRate?: number
  discountAmount?: number
  subtotal?: number
  totalAmount?: number
  status?: string
  items?: OfferItem[]
  createdAt?: string
}

export interface ProposalLineItemRequest {
  partId: number
  quantity: number
  unitPrice: number
}

export const proposalsService = {
  list(page: number, size: number): Promise<SpringPage<Proposal>> {
    return getPage<Proposal>('/proposals', { page, size })
  },
  create(payload: Proposal) {
    return apiClient.post<ApiResponse<Proposal>>('/proposals', payload).then((r) => unwrapResponse(r.data))
  },
  addLineItem(proposalId: number, payload: ProposalLineItemRequest) {
    return apiClient.post<ApiResponse<Proposal>>(`/proposals/${proposalId}/items`, payload).then((r) => unwrapResponse(r.data))
  },
  removeLineItem(proposalId: number, itemId: number) {
    return apiClient.delete<ApiResponse<Proposal>>(`/proposals/${proposalId}/items/${itemId}`).then((r) => unwrapResponse(r.data))
  },
}
