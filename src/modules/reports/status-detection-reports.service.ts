import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { getPage, toMultipartPayload } from '@/modules/shared/api'

export interface StatusDetectionReport {
  id?: number
  reportDate: string
  buildingName: string
  elevatorName: string
  identityNumber?: string
  status?: string
  filePath?: string
  note?: string
}

export const statusDetectionReportsService = {
  list(page: number, size: number, filters: { startDate?: string; endDate?: string; building?: string; status?: string }) {
    return getPage<StatusDetectionReport>('/reports/status-detections', { page, size, ...filters })
  },
  create(payload: StatusDetectionReport, file?: File | null) {
    return apiClient
      .post<ApiResponse<StatusDetectionReport>>('/reports/status-detections', toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  update(id: number, payload: StatusDetectionReport, file?: File | null) {
    return apiClient
      .put<ApiResponse<StatusDetectionReport>>(`/reports/status-detections/${id}`, toMultipartPayload(payload, file))
      .then((r) => unwrapResponse(r.data))
  },
  delete(id: number) {
    return apiClient.delete(`/reports/status-detections/${id}`).then(() => undefined)
  },
}
