import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

export interface MaintenanceTemplate {
  id: number
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  sectionCount?: number
  sections?: MaintenanceSection[]
}

export interface MaintenanceSection {
  id: number
  templateId: number
  name: string
  orderIndex: number
  active: boolean
  items?: MaintenanceItem[]
  subSections?: MaintenanceSubSection[] // Alt bölümler
}

export interface MaintenanceSubSection {
  id: number
  sectionId: number
  name: string
  orderIndex: number
  active: boolean
  items?: MaintenanceItem[]
}

export interface MaintenanceItem {
  id: number
  sectionId?: number // Ana bölüm ID (eğer alt bölümde değilse)
  subSectionId?: number // Alt bölüm ID (eğer alt bölümdeyse)
  title: string
  required: boolean
  photoRequired: boolean
  note?: string
  active: boolean
  orderIndex: number
}

export interface CreateSectionRequest {
  templateId: number
  name: string
  orderIndex?: number
  active?: boolean
}

export interface UpdateSectionRequest {
  name?: string
  orderIndex?: number
  active?: boolean
}

export interface CreateItemRequest {
  sectionId: number
  title: string
  required?: boolean
  photoRequired?: boolean
  note?: string
  active?: boolean
  orderIndex?: number
}

export interface UpdateItemRequest {
  title?: string
  required?: boolean
  photoRequired?: boolean
  note?: string
  active?: boolean
  orderIndex?: number
}

export interface CreateSubSectionRequest {
  sectionId: number
  name: string
  orderIndex?: number
  active?: boolean
}

export interface UpdateSubSectionRequest {
  name?: string
  orderIndex?: number
  active?: boolean
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

function mapTemplateFromBackend(backend: any): MaintenanceTemplate {
  return {
    id: backend.id,
    name: backend.name,
    status: backend.status || 'ACTIVE',
    sectionCount: backend.sectionCount || backend.sections?.length || 0,
    sections: backend.sections?.map(mapSectionFromBackend) || [],
  }
}

function mapSubSectionFromBackend(backend: any): MaintenanceSubSection {
  return {
    id: backend.id,
    sectionId: backend.sectionId || backend.section_id,
    name: backend.name,
    orderIndex: backend.orderIndex || backend.order_index || 0,
    active: backend.active !== false,
    items: backend.items?.map(mapItemFromBackend) || [],
  }
}

function mapSectionFromBackend(backend: any): MaintenanceSection {
  return {
    id: backend.id,
    templateId: backend.templateId || backend.template_id,
    name: backend.name,
    orderIndex: backend.orderIndex || backend.order_index || 0,
    active: backend.active !== false,
    items: backend.items?.filter((item: any) => !item.subSectionId)?.map(mapItemFromBackend) || [], // Sadece direkt section'a ait item'lar
    subSections: backend.subSections?.map(mapSubSectionFromBackend) || [],
  }
}

function mapItemFromBackend(backend: any): MaintenanceItem {
  return {
    id: backend.id,
    sectionId: backend.sectionId || backend.section_id,
    subSectionId: backend.subSectionId || backend.sub_section_id,
    title: backend.title,
    required: backend.required || backend.mandatory || false,
    photoRequired: backend.photoRequired || backend.photo_required || backend.photo || false,
    note: backend.note || '',
    active: backend.active !== false,
    orderIndex: backend.orderIndex || backend.order_index || 0,
  }
}

export const maintenanceTemplateService = {
  getAll: async (): Promise<MaintenanceTemplate[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(API_ENDPOINTS.MAINTENANCE_TEMPLATES.BASE)
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapTemplateFromBackend)
  },

  getById: async (id: number): Promise<MaintenanceTemplate> => {
    try {
      const { data } = await apiClient.get<ApiResponse<any>>(API_ENDPOINTS.MAINTENANCE_TEMPLATES.BY_ID(id))
      const unwrapped = unwrapResponse(data)
      let template = mapTemplateFromBackend(unwrapped)
      
      // Eğer sections gelmediyse veya items gelmediyse, ayrı ayrı fetch et
      if (!template.sections || template.sections.length === 0) {
        // Sections'ı ayrı fetch et
        try {
          const sectionsResponse = await apiClient.get<ApiResponse<any[]>>(
            API_ENDPOINTS.MAINTENANCE_TEMPLATES.SECTIONS(id)
          )
          const sections = unwrapArrayResponse(sectionsResponse.data)
          template.sections = sections.map(mapSectionFromBackend)
        } catch (error) {
          console.warn('⚠️ Sections fetch edilemedi:', error)
          template.sections = []
        }
      }
      
      // Her section için items'ı ayrı fetch et (eğer gelmediyse)
      if (template.sections && template.sections.length > 0) {
        for (const section of template.sections) {
          if (!section.items || section.items.length === 0) {
            try {
              const itemsResponse = await apiClient.get<ApiResponse<any[]>>(
                API_ENDPOINTS.MAINTENANCE_SECTIONS.ITEMS(section.id)
              )
              const items = unwrapArrayResponse(itemsResponse.data)
              section.items = items.map(mapItemFromBackend)
            } catch (error) {
              console.warn(`⚠️ Items for section ${section.id} fetch edilemedi:`, error)
              section.items = []
            }
          }
          
          // Sub-sections için de aynı işlemi yap
          if (!section.subSections || section.subSections.length === 0) {
            try {
              const subSectionsResponse = await apiClient.get<ApiResponse<any[]>>(
                API_ENDPOINTS.MAINTENANCE_SECTIONS.SUB_SECTIONS(section.id)
              )
              const subSections = unwrapArrayResponse(subSectionsResponse.data)
              section.subSections = subSections.map(mapSubSectionFromBackend)
              
              // Her sub-section için items'ı fetch et
              for (const subSection of section.subSections) {
                try {
                  const subItemsResponse = await apiClient.get<ApiResponse<any[]>>(
                    API_ENDPOINTS.MAINTENANCE_SUB_SECTIONS.ITEMS(subSection.id)
                  )
                  const subItems = unwrapArrayResponse(subItemsResponse.data)
                  subSection.items = subItems.map(mapItemFromBackend)
                } catch (error) {
                  console.warn(`⚠️ Items for sub-section ${subSection.id} fetch edilemedi:`, error)
                  subSection.items = []
                }
              }
            } catch (error) {
              console.warn(`⚠️ Sub-sections for section ${section.id} fetch edilemedi:`, error)
              section.subSections = []
            }
          }
        }
      }
      
      return template
    } catch (error) {
      console.error('❌ GET TEMPLATE BY ID ERROR:', error)
      throw error
    }
  },

  // Section operations
  createSection: async (templateId: number, request: CreateSectionRequest): Promise<MaintenanceSection> => {
    console.log('🔍 CREATE SECTION - Template ID:', templateId, 'Request:', request)
    const payload = {
      name: request.name,
      orderIndex: request.orderIndex ?? 0,
      active: request.active !== false,
    }
    const { data } = await apiClient.post<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_TEMPLATES.SECTIONS(templateId),
      payload
    )
    console.log('📥 CREATE SECTION RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapSectionFromBackend(unwrapped)
  },

  updateSection: async (sectionId: number, request: UpdateSectionRequest): Promise<MaintenanceSection> => {
    console.log('🔍 UPDATE SECTION - Section ID:', sectionId, 'Request:', request)
    const { data } = await apiClient.put<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_SECTIONS.BY_ID(sectionId),
      request
    )
    console.log('📥 UPDATE SECTION RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapSectionFromBackend(unwrapped)
  },

  deleteSection: async (sectionId: number): Promise<void> => {
    console.log('🔍 DELETE SECTION - Section ID:', sectionId)
    await apiClient.delete(API_ENDPOINTS.MAINTENANCE_SECTIONS.BY_ID(sectionId))
    console.log('✅ SECTION DELETED')
  },

  // Item operations
  createItem: async (sectionId: number, request: CreateItemRequest): Promise<MaintenanceItem> => {
    console.log('🔍 CREATE ITEM - Section ID:', sectionId, 'Request:', request)
    const payload = {
      title: request.title,
      required: request.required ?? false,
      photoRequired: request.photoRequired ?? false,
      note: request.note || '',
      active: request.active !== false,
      orderIndex: request.orderIndex ?? 0,
    }
    const { data } = await apiClient.post<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_SECTIONS.ITEMS(sectionId),
      payload
    )
    console.log('📥 CREATE ITEM RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapItemFromBackend(unwrapped)
  },

  updateItem: async (itemId: number, request: UpdateItemRequest): Promise<MaintenanceItem> => {
    console.log('🔍 UPDATE ITEM - Item ID:', itemId, 'Request:', request)
    const { data } = await apiClient.put<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_ITEMS.BY_ID(itemId),
      request
    )
    console.log('📥 UPDATE ITEM RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapItemFromBackend(unwrapped)
  },

  deleteItem: async (itemId: number): Promise<void> => {
    console.log('🔍 DELETE ITEM - Item ID:', itemId)
    await apiClient.delete(API_ENDPOINTS.MAINTENANCE_ITEMS.BY_ID(itemId))
    console.log('✅ ITEM DELETED')
  },

  // Template operations
  create: async (request: CreateTemplateRequest): Promise<MaintenanceTemplate> => {
    console.log('🔍 CREATE TEMPLATE - Request:', request)
    const payload = {
      name: request.name,
      description: request.description || '',
      status: request.status || 'ACTIVE',
    }
    const { data } = await apiClient.post<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_TEMPLATES.BASE,
      payload
    )
    console.log('📥 CREATE TEMPLATE RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapTemplateFromBackend(unwrapped)
  },

  update: async (id: number, request: UpdateTemplateRequest): Promise<MaintenanceTemplate> => {
    console.log('🔍 UPDATE TEMPLATE - Template ID:', id, 'Request:', request)
    const { data } = await apiClient.put<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_TEMPLATES.BY_ID(id),
      request
    )
    console.log('📥 UPDATE TEMPLATE RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapTemplateFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    console.log('🔍 DELETE TEMPLATE - Template ID:', id)
    await apiClient.delete(API_ENDPOINTS.MAINTENANCE_TEMPLATES.BY_ID(id))
    console.log('✅ TEMPLATE DELETED')
  },

  // Sub-Section operations
  createSubSection: async (sectionId: number, request: CreateSubSectionRequest): Promise<MaintenanceSubSection> => {
    console.log('🔍 CREATE SUB-SECTION - Section ID:', sectionId, 'Request:', request)
    const payload = {
      name: request.name,
      orderIndex: request.orderIndex ?? 0,
      active: request.active !== false,
    }
    const { data } = await apiClient.post<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_SECTIONS.SUB_SECTIONS(sectionId),
      payload
    )
    console.log('📥 CREATE SUB-SECTION RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapSubSectionFromBackend(unwrapped)
  },

  updateSubSection: async (subSectionId: number, request: UpdateSubSectionRequest): Promise<MaintenanceSubSection> => {
    console.log('🔍 UPDATE SUB-SECTION - Sub-Section ID:', subSectionId, 'Request:', request)
    const { data } = await apiClient.put<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_SUB_SECTIONS.BY_ID(subSectionId),
      request
    )
    console.log('📥 UPDATE SUB-SECTION RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapSubSectionFromBackend(unwrapped)
  },

  deleteSubSection: async (subSectionId: number): Promise<void> => {
    console.log('🔍 DELETE SUB-SECTION - Sub-Section ID:', subSectionId)
    await apiClient.delete(API_ENDPOINTS.MAINTENANCE_SUB_SECTIONS.BY_ID(subSectionId))
    console.log('✅ SUB-SECTION DELETED')
  },

  // Item operations for sub-sections
  createItemInSubSection: async (subSectionId: number, request: CreateItemRequest): Promise<MaintenanceItem> => {
    console.log('🔍 CREATE ITEM IN SUB-SECTION - Sub-Section ID:', subSectionId, 'Request:', request)
    const payload = {
      title: request.title,
      required: request.required ?? false,
      photoRequired: request.photoRequired ?? false,
      note: request.note || '',
      active: request.active !== false,
      orderIndex: request.orderIndex ?? 0,
    }
    const { data } = await apiClient.post<ApiResponse<any>>(
      API_ENDPOINTS.MAINTENANCE_SUB_SECTIONS.ITEMS(subSectionId),
      payload
    )
    console.log('📥 CREATE ITEM IN SUB-SECTION RESPONSE:', data)
    const unwrapped = unwrapResponse(data)
    return mapItemFromBackend(unwrapped)
  },
}
