import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'
import { formatDateForAPI } from '@/lib/date-utils'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

export interface MaintenancePlan {
  id: number
  elevatorId: number
  elevatorName?: string
  elevatorCode?: string
  buildingName?: string
  scheduledDate: string // YYYY-MM-DD
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED'
  completedDate?: string
  qrCode?: string
  note?: string // Backend'den gelen not
  createdAt: string
  updatedAt: string
}

export interface CreateMaintenancePlanRequest {
  elevatorId: number
  templateId: number // Required by backend
  plannedDate: string // YYYY-MM-DD (backend expects "plannedDate", not "scheduledDate")
  assignedTechnicianId?: number // Optional
  dateWindowDays?: number // Optional, default 7
}

export interface UpdateMaintenancePlanRequest {
  plannedDate?: string // Backend expects "plannedDate", not "scheduledDate"
  status?: 'PLANNED' | 'COMPLETED' | 'CANCELLED'
  templateId?: number // Optional - update template
  technicianId?: number // Backend expects "technicianId", not "assignedTechnicianId"
  note?: string // Optional - update note
}

export interface RescheduleMaintenancePlanRequest {
  plannedDate: string // YYYY-MM-DD - Required for reschedule
}

function mapPlanFromBackend(backend: any): MaintenancePlan {
  return {
    id: backend.id,
    elevatorId: backend.elevatorId || backend.elevator_id,
    elevatorName: backend.elevatorName || backend.elevator_name,
    elevatorCode: backend.elevatorCode || backend.elevator_code,
    buildingName: backend.buildingName || backend.building_name,
    // Backend returns "plannedDate" but we map it to "scheduledDate" for frontend consistency
    scheduledDate: backend.plannedDate || backend.planned_date || backend.scheduledDate || backend.scheduled_date,
    status: backend.status || 'PLANNED',
    completedDate: backend.completedDate || backend.completed_date,
    qrCode: backend.qrCode || backend.qr_code,
    note: backend.note || undefined,
    createdAt: backend.createdAt || backend.created_at,
    updatedAt: backend.updatedAt || backend.updated_at,
  }
}

export const maintenancePlanService = {
  getAll: async (params?: {
    month?: string // YYYY-MM
    year?: number
    elevatorId?: number
    status?: 'PLANNED' | 'COMPLETED' | 'CANCELLED'
  }): Promise<MaintenancePlan[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(API_ENDPOINTS.MAINTENANCE_PLANS.BASE, { params })
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapPlanFromBackend)
  },

  getByMonth: async (year: number, month: number): Promise<MaintenancePlan[]> => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    return maintenancePlanService.getAll({ month: monthStr })
  },

  getByElevatorId: async (elevatorId: number): Promise<MaintenancePlan[]> => {
    return maintenancePlanService.getAll({ elevatorId })
  },

  getById: async (id: number): Promise<MaintenancePlan> => {
    const { data } = await apiClient.get<ApiResponse<any>>(API_ENDPOINTS.MAINTENANCE_PLANS.BY_ID(id))
    const unwrapped = unwrapResponse(data)
    return mapPlanFromBackend(unwrapped)
  },

  create: async (plan: CreateMaintenancePlanRequest): Promise<MaintenancePlan> => {
    // Validate required fields
    if (!plan.elevatorId || plan.elevatorId <= 0) {
      throw new Error('Elevator ID is required and must be a positive number')
    }
    
    if (!plan.templateId || plan.templateId <= 0) {
      throw new Error('Template ID is required and must be a positive number')
    }
    
    if (!plan.plannedDate) {
      throw new Error('Planned date is required')
    }

    // Ensure plannedDate is in YYYY-MM-DD format
    const plannedDate = formatDateForAPI(plan.plannedDate)
    
    if (!plannedDate) {
      throw new Error('Invalid planned date format')
    }
    
    // Backend expects camelCase (standard Spring Boot)
    // Ensure elevatorId is a valid number
    const elevatorIdNum = Number(plan.elevatorId)
    if (isNaN(elevatorIdNum) || elevatorIdNum <= 0) {
      console.error('❌ Invalid elevator ID:', plan.elevatorId, 'type:', typeof plan.elevatorId)
      throw new Error(`Invalid elevator ID: ${plan.elevatorId}`)
    }
    
    const templateIdNum = Number(plan.templateId)
    if (isNaN(templateIdNum) || templateIdNum <= 0) {
      console.error('❌ Invalid template ID:', plan.templateId, 'type:', typeof plan.templateId)
      throw new Error(`Invalid template ID: ${plan.templateId}`)
    }
    
    // Backend expects: elevatorId, templateId, plannedDate, assignedTechnicianId (optional), dateWindowDays (optional)
    const payload: any = {
      elevatorId: elevatorIdNum,
      templateId: templateIdNum,
      plannedDate, // Backend expects "plannedDate", not "scheduledDate"
    }
    
    // Optional fields
    if (plan.assignedTechnicianId) {
      payload.assignedTechnicianId = Number(plan.assignedTechnicianId)
    }
    
    if (plan.dateWindowDays !== undefined) {
      payload.dateWindowDays = Number(plan.dateWindowDays)
    }
    
    console.log('🔍 Creating maintenance plan - Input:', plan)
    console.log('📤 Creating maintenance plan - Payload:', JSON.stringify(payload, null, 2))
    console.log('📤 Payload elevatorId type:', typeof payload.elevatorId, 'value:', payload.elevatorId)
    console.log('📤 Payload templateId type:', typeof payload.templateId, 'value:', payload.templateId)
    console.log('📤 Payload plannedDate:', payload.plannedDate)
    
    try {
      console.log('🚀 FINAL REQUEST - Endpoint:', API_ENDPOINTS.MAINTENANCE_PLANS.BASE)
      console.log('🚀 FINAL REQUEST - Payload (exact JSON):', JSON.stringify(payload, null, 2))
      console.log('🚀 FINAL REQUEST - Payload (object):', payload)
      console.log('🚀 FINAL REQUEST - Payload keys:', Object.keys(payload))
      console.log('🚀 FINAL REQUEST - elevatorId:', payload.elevatorId, 'type:', typeof payload.elevatorId)
      console.log('🚀 FINAL REQUEST - templateId:', payload.templateId, 'type:', typeof payload.templateId)
      console.log('🚀 FINAL REQUEST - plannedDate:', payload.plannedDate, 'type:', typeof payload.plannedDate)
      
      const { data } = await apiClient.post<ApiResponse<any>>(API_ENDPOINTS.MAINTENANCE_PLANS.BASE, payload)
      const unwrapped = unwrapResponse(data)
      return mapPlanFromBackend(unwrapped)
    } catch (error: any) {
      console.error('❌ Maintenance plan creation failed:', error)
      console.error('❌ Error response:', error.response?.data)
      console.error('❌ Error response status:', error.response?.status)
      console.error('❌ Error response headers:', error.response?.headers)
      console.error('❌ Request payload was:', JSON.stringify(payload, null, 2))
      console.error('❌ Request config:', error.config)
      throw error
    }
  },

  update: async (id: number, plan: UpdateMaintenancePlanRequest): Promise<MaintenancePlan> => {
    const payload: any = {}
    
    // Backend expects "plannedDate", not "scheduledDate"
    if (plan.plannedDate) {
      payload.plannedDate = formatDateForAPI(plan.plannedDate)
    }
    
    if (plan.status) {
      payload.status = plan.status
    }
    
    if (plan.templateId) {
      payload.templateId = Number(plan.templateId)
    }
    
    // Backend expects "technicianId", not "assignedTechnicianId"
    if (plan.technicianId) {
      payload.technicianId = Number(plan.technicianId)
    }
    
    if (plan.note !== undefined) {
      payload.note = plan.note
    }
    
    const { data } = await apiClient.put<ApiResponse<any>>(API_ENDPOINTS.MAINTENANCE_PLANS.BY_ID(id), payload)
    const unwrapped = unwrapResponse(data)
    return mapPlanFromBackend(unwrapped)
  },

  reschedule: async (id: number, plan: RescheduleMaintenancePlanRequest): Promise<MaintenancePlan> => {
    // Reschedule endpoint - sadece tarih değiştirmek için
    const payload = {
      plannedDate: formatDateForAPI(plan.plannedDate),
    }
    
    const { data } = await apiClient.patch<ApiResponse<any>>(API_ENDPOINTS.MAINTENANCE_PLANS.RESCHEDULE(id), payload)
    const unwrapped = unwrapResponse(data)
    return mapPlanFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.MAINTENANCE_PLANS.BY_ID(id))
  },

  completeWithQR: async (id: number, qrCode: string): Promise<MaintenancePlan> => {
    const { data } = await apiClient.post<ApiResponse<any>>(API_ENDPOINTS.MAINTENANCE_PLANS.COMPLETE(id), {
      qrCode,
    })
    const unwrapped = unwrapResponse(data)
    return mapPlanFromBackend(unwrapped)
  },
}
