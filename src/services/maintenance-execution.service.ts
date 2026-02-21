import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

export type MaintenanceExecutionStatus = 'IN_PROGRESS' | 'WAITING_APPROVAL'

export interface MaintenanceStepDefinition {
  id: number
  templateId: number
  sectionName: string
  title: string
  orderNo: number
  requiredPhotoCount: number
  isRequired: boolean
}

export interface MaintenancePhoto {
  id: number
  stepExecutionId: number
  fileUrl: string
  createdAt: string
  createdBy?: number
}

export interface MaintenanceStepExecution {
  id: number
  executionId: number
  stepDefinitionId: number
  stepDefinition?: MaintenanceStepDefinition
  isDone: boolean
  note?: string
  completedAt?: string
  photos: MaintenancePhoto[]
}

export interface MaintenanceExecution {
  id: number
  taskId: number
  task?: {
    id: number
    elevatorId: number
    elevatorCode?: string
    buildingName?: string
    plannedDate: string
  }
  startedAt: string
  submittedAt?: string
  startedByUserId: number
  startedByUserName?: string
  status: MaintenanceExecutionStatus
  steps: MaintenanceStepExecution[]
}

export interface StartExecutionRequest {
  maintenancePlanId: number
  qrToken?: string
  remoteStart?: boolean
}

export interface UpdateStepExecutionRequest {
  stepExecutionId: number
  isDone?: boolean
  note?: string
}

export interface SubmitExecutionRequest {
  executionId: number
}

export interface QRTokenValidation {
  valid: boolean
  taskId?: number
  task?: MaintenanceExecution['task']
  error?: string
}

function mapStepDefinitionFromBackend(backend: any): MaintenanceStepDefinition {
  return {
    id: backend.id,
    templateId: backend.templateId || backend.template_id,
    sectionName: backend.sectionName || backend.section_name,
    title: backend.title,
    orderNo: backend.orderNo || backend.order_no,
    requiredPhotoCount: backend.requiredPhotoCount || backend.required_photo_count || 0,
    isRequired: backend.isRequired !== undefined ? backend.isRequired : backend.is_required !== undefined ? backend.is_required : true,
  }
}

function mapPhotoFromBackend(backend: any): MaintenancePhoto {
  return {
    id: backend.id,
    stepExecutionId: backend.stepExecutionId || backend.step_execution_id,
    fileUrl: backend.fileUrl || backend.file_url,
    createdAt: backend.createdAt || backend.created_at,
    createdBy: backend.createdBy || backend.created_by,
  }
}

function mapStepExecutionFromBackend(backend: any): MaintenanceStepExecution {
  return {
    id: backend.id,
    executionId: backend.executionId || backend.execution_id,
    stepDefinitionId: backend.stepDefinitionId || backend.step_definition_id,
    stepDefinition: backend.stepDefinition ? mapStepDefinitionFromBackend(backend.stepDefinition) : undefined,
    isDone: backend.isDone !== undefined ? backend.isDone : backend.is_done !== undefined ? backend.is_done : false,
    note: backend.note,
    completedAt: backend.completedAt || backend.completed_at,
    photos: (backend.photos || []).map(mapPhotoFromBackend),
  }
}

function mapExecutionFromBackend(backend: any): MaintenanceExecution {
  return {
    id: backend.id,
    taskId: backend.taskId || backend.task_id,
    task: backend.task ? {
      id: backend.task.id,
      elevatorId: backend.task.elevatorId || backend.task.elevator_id,
      elevatorCode: backend.task.elevatorCode || backend.task.elevator_code,
      buildingName: backend.task.buildingName || backend.task.building_name,
      plannedDate: backend.task.plannedDate || backend.task.planned_date,
    } : undefined,
    startedAt: backend.startedAt || backend.started_at,
    submittedAt: backend.submittedAt || backend.submitted_at,
    startedByUserId: backend.startedByUserId || backend.started_by_user_id,
    startedByUserName: backend.startedByUserName || backend.started_by_user_name,
    status: (backend.status || 'IN_PROGRESS') as MaintenanceExecutionStatus,
    steps: (backend.steps || []).map(mapStepExecutionFromBackend),
  }
}

export const maintenanceExecutionService = {
  validateQRToken: async (token: string): Promise<QRTokenValidation> => {
    try {
      const { data } = await apiClient.get<ApiResponse<any>>('/maintenance-executions/validate-qr', {
        params: { token },
      })
      const unwrapped = unwrapResponse(data)
      
      if (unwrapped.taskId) {
        return {
          valid: true,
          taskId: unwrapped.taskId,
          task: unwrapped.task ? {
            id: unwrapped.task.id,
            elevatorId: unwrapped.task.elevatorId,
            elevatorCode: unwrapped.task.elevatorCode,
            buildingName: unwrapped.task.buildingName,
            plannedDate: unwrapped.task.plannedDate,
          } : undefined,
        }
      }
      
      return {
        valid: false,
        error: unwrapped.error || 'Geçersiz QR kodu',
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.message || 'QR kodu doğrulanamadı',
      }
    }
  },

  getByTaskId: async (taskId: number): Promise<MaintenanceExecution | null> => {
    try {
      const { data } = await apiClient.get<ApiResponse<any>>(`/maintenance-executions/task/${taskId}`)
      const unwrapped = unwrapResponse(data)
      return unwrapped ? mapExecutionFromBackend(unwrapped) : null
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  getById: async (id: number): Promise<MaintenanceExecution> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/maintenance-executions/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapExecutionFromBackend(unwrapped)
  },

  start: async (request: StartExecutionRequest): Promise<MaintenanceExecution> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/maintenance/start', {
      maintenancePlanId: request.maintenancePlanId,
      qrToken: request.qrToken,
      remoteStart: request.remoteStart || false,
    })
    const unwrapped = unwrapResponse(data)
    return mapExecutionFromBackend(unwrapped)
  },

  updateStep: async (request: UpdateStepExecutionRequest): Promise<MaintenanceStepExecution> => {
    const { data } = await apiClient.put<ApiResponse<any>>(
      `/maintenance-executions/steps/${request.stepExecutionId}`,
      {
        isDone: request.isDone,
        note: request.note,
      }
    )
    const unwrapped = unwrapResponse(data)
    return mapStepExecutionFromBackend(unwrapped)
  },

  uploadPhoto: async (stepExecutionId: number, photo: File): Promise<MaintenancePhoto> => {
    const formData = new FormData()
    formData.append('photo', photo)
    
    const { data } = await apiClient.post<ApiResponse<any>>(
      `/maintenance-executions/steps/${stepExecutionId}/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    const unwrapped = unwrapResponse(data)
    return mapPhotoFromBackend(unwrapped)
  },

  deletePhoto: async (photoId: number): Promise<void> => {
    await apiClient.delete(`/maintenance-executions/photos/${photoId}`)
  },

  submit: async (request: SubmitExecutionRequest): Promise<MaintenanceExecution> => {
    const { data } = await apiClient.post<ApiResponse<any>>(
      `/maintenance-executions/${request.executionId}/submit`
    )
    const unwrapped = unwrapResponse(data)
    return mapExecutionFromBackend(unwrapped)
  },
}
