import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

export interface QRValidateRequest {
  qrCode: string
  elevatorId?: number // Optional, if already known
}

export interface QRValidateResponse {
  success: boolean
  qrSessionToken: string
  elevatorId: number
  expiresAt: string // ISO 8601
}

export interface QRRemoteStartRequest {
  elevatorId: number
}

export interface QRRemoteStartResponse {
  success: boolean
  qrSessionToken: string
  elevatorId: number
  expiresAt: string
  startedRemotely: boolean
}

export const qrSessionService = {
  /**
   * Validate QR code and get session token
   * POST /api/qr/validate
   */
  validate: async (request: QRValidateRequest): Promise<QRValidateResponse> => {
    const { data } = await apiClient.post<ApiResponse<QRValidateResponse>>(
      '/qr/validate',
      request
    )
    return unwrapResponse(data)
  },

  /**
   * Remote start (ADMIN only)
   * POST /api/qr/remote-start
   */
  remoteStart: async (request: QRRemoteStartRequest): Promise<QRRemoteStartResponse> => {
    const { data } = await apiClient.post<ApiResponse<QRRemoteStartResponse>>(
      '/qr/remote-start',
      request
    )
    return unwrapResponse(data)
  },
}
