import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage } from '@/modules/shared/api'

export interface InvoiceDto {
  id?: number
  invoiceNo?: string
  invoiceDate: string
  direction: string
  profile?: string
  status?: string
  senderName?: string
  senderVknTckn?: string
  receiverName?: string
  receiverVknTckn?: string
  currency?: string
  amount: number
  note?: string
  source?: string
  maintenancePlanId?: number
}

export interface EdmSettingDto {
  id?: number
  username: string
  password?: string
  email?: string
  invoiceSeriesEarchive?: string
  invoiceSeriesEfatura?: string
  mode?: string
  passwordConfigured?: boolean
}

export interface VknValidationResponse {
  valid: boolean
  type: string
  message: string
}

export const edmService = {
  incoming(page: number, size: number, params: { startDate?: string; endDate?: string; status?: string }) {
    return getPage<InvoiceDto>('/edm/invoices/incoming', { page, size, ...params })
  },
  outgoing(page: number, size: number, params: { startDate?: string; endDate?: string; status?: string }) {
    return getPage<InvoiceDto>('/edm/invoices/outgoing', { page, size, ...params })
  },
  createManual(payload: InvoiceDto) {
    return apiClient.post<ApiResponse<InvoiceDto>>('/edm/invoices/manual', payload).then((r) => unwrapResponse(r.data))
  },
  merge(invoiceIds: number[]) {
    return apiClient.post<ApiResponse<InvoiceDto>>('/edm/invoices/merge', { invoiceIds }).then((r) => unwrapResponse(r.data))
  },
  transferCompleted(maintenancePlanIds: number[]) {
    return apiClient
      .post<ApiResponse<InvoiceDto[]>>('/edm/invoices/transfer-completed', maintenancePlanIds)
      .then((r) => unwrapResponse(r.data))
  },
  validateVkn(value: string) {
    return apiClient
      .get<ApiResponse<VknValidationResponse>>('/edm/vkn-tckn/validate', { params: { value } })
      .then((r) => unwrapResponse(r.data))
  },
  getSettings() {
    return apiClient.get<ApiResponse<EdmSettingDto>>('/edm/settings').then((r) => unwrapResponse(r.data))
  },
  saveSettings(payload: EdmSettingDto) {
    return apiClient.put<ApiResponse<EdmSettingDto>>('/edm/settings', payload).then((r) => unwrapResponse(r.data))
  },
}
