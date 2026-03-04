import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

export interface QRValidateRequest {
  qrCode: string
  elevatorId?: number // Optional, if already known
  intent?: QRValidateIntent
}

export type QRValidateIntent = 'VIEW_ELEVATOR' | 'START_MAINTENANCE'

export interface QRElevatorSummary {
  elevatorId: number
  elevatorNo: string
  buildingName: string
  labelStatus: string
  lastMaintenanceDate: string | null
}

export interface QRValidateResponse {
  success: boolean
  elevatorId: number
  qrSessionToken?: string
  expiresAt?: string // ISO 8601
  elevatorSummary?: QRElevatorSummary
  elevatorNo?: string
  buildingName?: string
  labelStatus?: string
  lastMaintenanceDate?: string | null
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
      {
        ...request,
        intent: request.intent || 'START_MAINTENANCE',
      }
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
