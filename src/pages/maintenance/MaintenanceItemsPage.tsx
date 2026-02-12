import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Settings, ChevronDown, ChevronRight, GripVertical, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableResponsive } from '@/components/ui/table-responsive'
import { ActionButtons } from '@/components/ui/action-buttons'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText } from 'lucide-react'
import { maintenanceTemplateService, type MaintenanceTemplate, type MaintenanceSection, type MaintenanceSubSection, type MaintenanceItem } from '@/services/maintenance-template.service'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function MaintenanceItemsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [expandedSubSections, setExpandedSubSections] = useState<Set<number>>(new Set())

  // Modal states
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editSectionDialogOpen, setEditSectionDialogOpen] = useState(false)
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Form states
  const [sectionName, setSectionName] = useState('')
  const [itemTitle, setItemTitle] = useState('')
  const [itemRequired, setItemRequired] = useState(false)
  const [itemPhotoRequired, setItemPhotoRequired] = useState(false)
  const [itemNote, setItemNote] = useState('')
  const [itemActive, setItemActive] = useState(true)
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [selectedSubSectionId, setSelectedSubSectionId] = useState<number | null>(null)
  const [selectedSectionForEdit, setSelectedSectionForEdit] = useState<MaintenanceSection | null>(null)
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<MaintenanceItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'section' | 'subSection' | 'item'; id: number } | null>(null)
  
  // Sub-Section modal states (only for edit, not create)
  const [editSubSectionDialogOpen, setEditSubSectionDialogOpen] = useState(false)
  const [subSectionName, setSubSectionName] = useState('')
  const [selectedSubSectionForEdit, setSelectedSubSectionForEdit] = useState<MaintenanceSubSection | null>(null)
  
  // Template modal states
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false)
  const [deleteTemplateConfirmOpen, setDeleteTemplateConfirmOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateStatus, setTemplateStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState<MaintenanceTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<MaintenanceTemplate | null>(null)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['maintenance-templates'],
    queryFn: () => maintenanceTemplateService.getAll(),
  })

  const { data: templateDetail, refetch: refetchTemplate } = useQuery({
    queryKey: ['maintenance-template', selectedTemplate],
    queryFn: () => maintenanceTemplateService.getById(selectedTemplate!),
    enabled: !!selectedTemplate,
  })

  // Create Section Mutation with optimistic update
  const createSectionMutation = useMutation({
    mutationFn: (name: string) => {
      if (!selectedTemplate) throw new Error('Template seçilmedi')
      return maintenanceTemplateService.createSection(selectedTemplate, { 
        templateId: selectedTemplate,
        name 
      })
    },
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ['maintenance-template', selectedTemplate] })
      const previousTemplate = queryClient.getQueryData<MaintenanceTemplate>(['maintenance-template', selectedTemplate])
      
      if (previousTemplate) {
        const newSection: MaintenanceSection = {
          id: Date.now(), // Temporary ID
          templateId: selectedTemplate!,
          name,
          orderIndex: (previousTemplate.sections?.length || 0) + 1,
          active: true,
          items: [],
        }
        const updatedTemplate = {
          ...previousTemplate,
          sections: [...(previousTemplate.sections || []), newSection],
          sectionCount: (previousTemplate.sectionCount || 0) + 1,
        }
        queryClient.setQueryData(['maintenance-template', selectedTemplate], updatedTemplate)
      }
      
      return { previousTemplate }
    },
    onSuccess: async (newSection) => {
      await refetchTemplate()
      setSectionDialogOpen(false)
      setSectionName('')
      toast({
        title: 'Başarılı',
        description: 'Bölüm başarıyla eklendi',
      })
    },
    onError: (error: any, name, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(['maintenance-template', selectedTemplate], context.previousTemplate)
      }
      console.error('❌ CREATE SECTION ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bölüm eklenemedi',
        variant: 'destructive',
      })
    },
  })

  // Update Section Mutation with optimistic update
  const updateSectionMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => {
      return maintenanceTemplateService.updateSection(id, { name })
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['maintenance-template', selectedTemplate] })
      const previousTemplate = queryClient.getQueryData<MaintenanceTemplate>(['maintenance-template', selectedTemplate])
      
      if (previousTemplate) {
        const updatedTemplate = {
          ...previousTemplate,
          sections: previousTemplate.sections?.map((section) =>
            section.id === id ? { ...section, name } : section
          ) || [],
        }
        queryClient.setQueryData(['maintenance-template', selectedTemplate], updatedTemplate)
      }
      
      return { previousTemplate }
    },
    onSuccess: async () => {
      await refetchTemplate()
      setEditSectionDialogOpen(false)
      setSelectedSectionForEdit(null)
      setSectionName('')
      toast({
        title: 'Başarılı',
        description: 'Bölüm başarıyla güncellendi',
      })
    },
    onError: (error: any, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(['maintenance-template', selectedTemplate], context.previousTemplate)
      }
      console.error('❌ UPDATE SECTION ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bölüm güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Delete Section Mutation with optimistic update
  const deleteSectionMutation = useMutation({
    mutationFn: (id: number) => maintenanceTemplateService.deleteSection(id),
    onMutate: async (sectionId) => {
      await queryClient.cancelQueries({ queryKey: ['maintenance-template', selectedTemplate] })
      const previousTemplate = queryClient.getQueryData<MaintenanceTemplate>(['maintenance-template', selectedTemplate])
      
      if (previousTemplate && itemToDelete?.type === 'section') {
        const section = previousTemplate.sections?.find((s) => s.id === sectionId)
        const itemCount = section?.items?.length || 0
        const updatedTemplate = {
          ...previousTemplate,
          sections: previousTemplate.sections?.filter((s) => s.id !== sectionId) || [],
          sectionCount: Math.max(0, (previousTemplate.sectionCount || 0) - 1),
        }
        queryClient.setQueryData(['maintenance-template', selectedTemplate], updatedTemplate)
      }
      
      return { previousTemplate }
    },
    onSuccess: async () => {
      await refetchTemplate()
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      toast({
        title: 'Başarılı',
        description: 'Bölüm başarıyla silindi',
      })
    },
    onError: (error: any, sectionId, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(['maintenance-template', selectedTemplate], context.previousTemplate)
      }
      console.error('❌ DELETE SECTION ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bölüm silinemedi',
        variant: 'destructive',
      })
    },
  })

  // Create Item Mutation with optimistic update
  const createItemMutation = useMutation({
    mutationFn: (request: { sectionId?: number; subSectionId?: number; title: string; required: boolean; photoRequired: boolean; note: string; active: boolean }) => {
      if (request.subSectionId) {
        // Create in sub-section
        return maintenanceTemplateService.createItemInSubSection(request.subSectionId, {
          sectionId: request.subSectionId, // For type compatibility
          title: request.title,
          required: request.required,
          photoRequired: request.photoRequired,
          note: request.note,
          active: request.active,
        })
      } else if (request.sectionId) {
        // Create in section
        return maintenanceTemplateService.createItem(request.sectionId, {
          sectionId: request.sectionId,
          title: request.title,
          required: request.required,
          photoRequired: request.photoRequired,
          note: request.note,
          active: request.active,
        })
      } else {
        throw new Error('Section ID veya Sub-Section ID gereklidir')
      }
    },
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: ['maintenance-template', selectedTemplate] })
      const previousTemplate = queryClient.getQueryData<MaintenanceTemplate>(['maintenance-template', selectedTemplate])
      
      if (previousTemplate) {
        const newItem: MaintenanceItem = {
          id: Date.now(), // Temporary ID
          sectionId: request.sectionId,
          title: request.title,
          required: request.required,
          photoRequired: request.photoRequired,
          note: request.note,
          active: request.active,
          orderIndex: 0,
        }
        const updatedTemplate = {
          ...previousTemplate,
          sections: previousTemplate.sections?.map((section) =>
            section.id === request.sectionId
              ? {
                  ...section,
                  items: [...(section.items || []), newItem],
                }
              : section
          ) || [],
        }
        // Update section count dynamically
        updatedTemplate.sectionCount = updatedTemplate.sections?.length || 0
        queryClient.setQueryData(['maintenance-template', selectedTemplate], updatedTemplate)
      }
      
      return { previousTemplate }
    },
    onSuccess: async () => {
      await refetchTemplate()
      setItemDialogOpen(false)
      setItemTitle('')
      setItemRequired(false)
      setItemPhotoRequired(false)
      setItemNote('')
      setSelectedSectionId(null)
      toast({
        title: 'Başarılı',
        description: 'Madde başarıyla eklendi',
      })
    },
    onError: (error: any, request, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(['maintenance-template', selectedTemplate], context.previousTemplate)
      }
      console.error('❌ CREATE ITEM ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Madde eklenemedi',
        variant: 'destructive',
      })
    },
  })

  // Update Item Mutation with optimistic update
  const updateItemMutation = useMutation({
    mutationFn: ({ id, ...request }: { id: number; title: string; required: boolean; photoRequired: boolean; note: string; active: boolean }) => {
      return maintenanceTemplateService.updateItem(id, request)
    },
    onMutate: async ({ id, ...request }) => {
      await queryClient.cancelQueries({ queryKey: ['maintenance-template', selectedTemplate] })
      const previousTemplate = queryClient.getQueryData<MaintenanceTemplate>(['maintenance-template', selectedTemplate])
      
      if (previousTemplate && selectedItemForEdit) {
        const updatedTemplate = {
          ...previousTemplate,
          sections: previousTemplate.sections?.map((section) => ({
            ...section,
            items: section.items?.map((item) =>
              item.id === id
                ? {
                    ...item,
                    ...request,
                  }
                : item
            ) || [],
          })) || [],
        }
        queryClient.setQueryData(['maintenance-template', selectedTemplate], updatedTemplate)
      }
      
      return { previousTemplate }
    },
    onSuccess: async () => {
      await refetchTemplate()
      setEditItemDialogOpen(false)
      setSelectedItemForEdit(null)
      setItemTitle('')
      setItemRequired(false)
      setItemPhotoRequired(false)
      setItemNote('')
      toast({
        title: 'Başarılı',
        description: 'Madde başarıyla güncellendi',
      })
    },
    onError: (error: any, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(['maintenance-template', selectedTemplate], context.previousTemplate)
      }
      console.error('❌ UPDATE ITEM ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Madde güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Delete Item Mutation with optimistic update
  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => maintenanceTemplateService.deleteItem(id),
    onMutate: async (itemId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['maintenance-template', selectedTemplate] })
      
      // Snapshot previous value
      const previousTemplate = queryClient.getQueryData<MaintenanceTemplate>(['maintenance-template', selectedTemplate])
      
      // Optimistically update
      if (previousTemplate && itemToDelete?.type === 'item') {
        const section = previousTemplate.sections?.find((s) => s.items?.some((item) => item.id === itemId))
        const updatedTemplate = {
          ...previousTemplate,
          sections: previousTemplate.sections?.map((section) => ({
            ...section,
            items: section.items?.filter((item) => item.id !== itemId) || [],
          })) || [],
        }
        queryClient.setQueryData(['maintenance-template', selectedTemplate], updatedTemplate)
      }
      
      return { previousTemplate }
    },
    onSuccess: async () => {
      await refetchTemplate()
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      toast({
        title: 'Başarılı',
        description: 'Madde başarıyla silindi',
      })
    },
    onError: (error: any, itemId, context) => {
      // Revert optimistic update
      if (context?.previousTemplate) {
        queryClient.setQueryData(['maintenance-template', selectedTemplate], context.previousTemplate)
      }
      console.error('❌ DELETE ITEM ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Madde silinemedi',
        variant: 'destructive',
      })
    },
  })

  // Create Template Mutation
  const createTemplateMutation = useMutation({
    mutationFn: (request: { name: string; description?: string; status: 'ACTIVE' | 'INACTIVE' }) => {
      return maintenanceTemplateService.create(request)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance-templates'] })
      setTemplateDialogOpen(false)
      setTemplateName('')
      setTemplateDescription('')
      setTemplateStatus('ACTIVE')
      toast({
        title: 'Başarılı',
        description: 'Bakım şablonu başarıyla oluşturuldu',
      })
    },
    onError: (error: any) => {
      console.error('❌ CREATE TEMPLATE ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım şablonu oluşturulamadı',
        variant: 'destructive',
      })
    },
  })

  // Update Template Mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, ...request }: { id: number; name?: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }) => {
      return maintenanceTemplateService.update(id, request)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance-templates'] })
      setEditTemplateDialogOpen(false)
      setSelectedTemplateForEdit(null)
      setTemplateName('')
      setTemplateDescription('')
      setTemplateStatus('ACTIVE')
      toast({
        title: 'Başarılı',
        description: 'Bakım şablonu başarıyla güncellendi',
      })
    },
    onError: (error: any) => {
      console.error('❌ UPDATE TEMPLATE ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım şablonu güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Update Sub-Section Mutation
  const updateSubSectionMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => {
      return maintenanceTemplateService.updateSubSection(id, { name })
    },
    onSuccess: async () => {
      await refetchTemplate()
      setEditSubSectionDialogOpen(false)
      setSelectedSubSectionForEdit(null)
      setSubSectionName('')
      toast({
        title: 'Başarılı',
        description: 'Alt bölüm başarıyla güncellendi',
      })
    },
    onError: (error: any) => {
      console.error('❌ UPDATE SUB-SECTION ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Alt bölüm güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Delete Sub-Section Mutation
  const deleteSubSectionMutation = useMutation({
    mutationFn: (id: number) => maintenanceTemplateService.deleteSubSection(id),
    onSuccess: async () => {
      await refetchTemplate()
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
      toast({
        title: 'Başarılı',
        description: 'Alt bölüm başarıyla silindi',
      })
    },
    onError: (error: any) => {
      console.error('❌ DELETE SUB-SECTION ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Alt bölüm silinemedi',
        variant: 'destructive',
      })
    },
  })

  // Delete Template Mutation with optimistic update
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => maintenanceTemplateService.delete(id),
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: ['maintenance-templates'] })
      const previousTemplates = queryClient.getQueryData<MaintenanceTemplate[]>(['maintenance-templates'])
      
      if (previousTemplates) {
        const updatedTemplates = previousTemplates.filter((t) => t.id !== templateId)
        queryClient.setQueryData(['maintenance-templates'], updatedTemplates)
      }
      
      return { previousTemplates }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance-templates'] })
      setDeleteTemplateConfirmOpen(false)
      setTemplateToDelete(null)
      toast({
        title: 'Başarılı',
        description: 'Bakım şablonu başarıyla silindi',
      })
    },
    onError: (error: any, templateId, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(['maintenance-templates'], context.previousTemplates)
      }
      console.error('❌ DELETE TEMPLATE ERROR:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım şablonu silinemedi',
        variant: 'destructive',
      })
    },
  })

  const toggleSection = (sectionId: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const toggleSubSection = (subSectionId: number) => {
    const newExpanded = new Set(expandedSubSections)
    if (newExpanded.has(subSectionId)) {
      newExpanded.delete(subSectionId)
    } else {
      newExpanded.add(subSectionId)
    }
    setExpandedSubSections(newExpanded)
  }

  const handleAddSection = () => {
    setSectionName('')
    setSectionDialogOpen(true)
  }

  const handleAddItem = (sectionId: number) => {
    setSelectedSectionId(sectionId)
    setItemTitle('')
    setItemRequired(false)
    setItemPhotoRequired(false)
    setItemNote('')
    setItemActive(true)
    setItemDialogOpen(true)
  }

  const handleEditSection = (section: MaintenanceSection) => {
    setSelectedSectionForEdit(section)
    setSectionName(section.name)
    setEditSectionDialogOpen(true)
  }

  const handleEditItem = (item: MaintenanceItem) => {
    setSelectedItemForEdit(item)
    setItemTitle(item.title)
    setItemRequired(item.required)
    setItemPhotoRequired(item.photoRequired)
    setItemNote(item.note || '')
    setItemActive(item.active)
    setEditItemDialogOpen(true)
  }

  const handleDeleteSection = (section: MaintenanceSection) => {
    setItemToDelete({ type: 'section', id: section.id })
    setDeleteConfirmOpen(true)
  }

  const handleDeleteItem = (item: MaintenanceItem) => {
    setItemToDelete({ type: 'item', id: item.id })
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!itemToDelete) return
    if (itemToDelete.type === 'section') {
      deleteSectionMutation.mutate(itemToDelete.id)
    } else if (itemToDelete.type === 'subSection') {
      deleteSubSectionMutation.mutate(itemToDelete.id)
    } else {
      deleteItemMutation.mutate(itemToDelete.id)
    }
  }

  const handleSectionSubmit = () => {
    if (!sectionName.trim()) {
      toast({
        title: 'Hata',
        description: 'Bölüm adı gereklidir',
        variant: 'destructive',
      })
      return
    }
    createSectionMutation.mutate(sectionName.trim())
  }

  const handleSectionUpdate = () => {
    if (!selectedSectionForEdit || !sectionName.trim()) {
      toast({
        title: 'Hata',
        description: 'Bölüm adı gereklidir',
        variant: 'destructive',
      })
      return
    }
    updateSectionMutation.mutate({ id: selectedSectionForEdit.id, name: sectionName.trim() })
  }

  const handleItemSubmit = () => {
    if (!selectedSectionId || !itemTitle.trim()) {
      toast({
        title: 'Hata',
        description: 'Madde başlığı gereklidir',
        variant: 'destructive',
      })
      return
    }
    createItemMutation.mutate({
      sectionId: selectedSectionId || undefined,
      subSectionId: selectedSubSectionId || undefined,
      title: itemTitle.trim(),
      required: itemRequired,
      photoRequired: itemPhotoRequired,
      note: itemNote.trim(),
      active: itemActive,
    })
  }

  const handleItemUpdate = () => {
    if (!selectedItemForEdit || !itemTitle.trim()) {
      toast({
        title: 'Hata',
        description: 'Madde başlığı gereklidir',
        variant: 'destructive',
      })
      return
    }
    updateItemMutation.mutate({
      id: selectedItemForEdit.id,
      title: itemTitle.trim(),
      required: itemRequired,
      photoRequired: itemPhotoRequired,
      note: itemNote.trim(),
      active: itemActive,
    })
  }

  const handleAddTemplate = () => {
    setTemplateName('')
    setTemplateDescription('')
    setTemplateStatus('ACTIVE')
    setTemplateDialogOpen(true)
  }

  const handleEditTemplate = (template: MaintenanceTemplate) => {
    setSelectedTemplateForEdit(template)
    setTemplateName(template.name)
    setTemplateDescription('') // Backend'den description gelmiyorsa boş
    setTemplateStatus(template.status)
    setEditTemplateDialogOpen(true)
  }

  const handleDeleteTemplate = (template: MaintenanceTemplate) => {
    setTemplateToDelete(template)
    setDeleteTemplateConfirmOpen(true)
  }

  const handleTemplateSubmit = () => {
    if (!templateName.trim()) {
      toast({
        title: 'Hata',
        description: 'Şablon adı gereklidir',
        variant: 'destructive',
      })
      return
    }
    createTemplateMutation.mutate({
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      status: templateStatus,
    })
  }

  const handleTemplateUpdate = () => {
    if (!selectedTemplateForEdit || !templateName.trim()) {
      toast({
        title: 'Hata',
        description: 'Şablon adı gereklidir',
        variant: 'destructive',
      })
      return
    }
    updateTemplateMutation.mutate({
      id: selectedTemplateForEdit.id,
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      status: templateStatus,
    })
  }

  const handleConfirmDeleteTemplate = () => {
    if (!templateToDelete) return
    deleteTemplateMutation.mutate(templateToDelete.id)
  }

  // Sub-Section handlers
  const handleEditSubSection = (subSection: MaintenanceSubSection) => {
    setSelectedSubSectionForEdit(subSection)
    setSubSectionName(subSection.name)
    setEditSubSectionDialogOpen(true)
  }

  const handleDeleteSubSection = (subSection: MaintenanceSubSection) => {
    setItemToDelete({ type: 'subSection', id: subSection.id })
    setDeleteConfirmOpen(true)
  }

  const handleSubSectionUpdate = () => {
    if (!selectedSubSectionForEdit || !subSectionName.trim()) {
      toast({
        title: 'Hata',
        description: 'Alt bölüm adı gereklidir',
        variant: 'destructive',
      })
      return
    }
    updateSubSectionMutation.mutate({
      id: selectedSubSectionForEdit.id,
      name: subSectionName.trim(),
    })
  }

  const handleAddItemInSubSection = (subSectionId: number) => {
    setSelectedSectionId(null) // Ana section değil, sub-section
    setSelectedSubSectionId(subSectionId)
    setItemTitle('')
    setItemRequired(false)
    setItemPhotoRequired(false)
    setItemNote('')
    setItemActive(true)
    setItemDialogOpen(true)
  }

  if (selectedTemplate && templateDetail) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedTemplate(null)}
              className="mb-4"
            >
              ← Geri
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{templateDetail.name}</h1>
            <p className="text-muted-foreground mt-1">Bakım maddelerini yönetin</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-indigo-500 to-indigo-600"
            onClick={handleAddSection}
          >
            <Plus className="h-4 w-4 mr-2" />
            Bölüm Ekle
          </Button>
        </div>

        {templateDetail.sections?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-1">Henüz bölüm eklenmemiş</p>
              <p className="text-sm text-muted-foreground mb-4">
                İlk bakım bölümünü ekleyerek başlayın.
              </p>
              <Button 
                className="bg-gradient-to-r from-indigo-500 to-indigo-600"
                onClick={handleAddSection}
              >
                <Plus className="h-4 w-4 mr-2" />
                Bölüm Ekle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {templateDetail.sections?.map((section: MaintenanceSection) => (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      <Badge variant="secondary">{section.items?.length || 0} madde</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditSection(section)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSection(section)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedSections.has(section.id) && (
                  <CardContent>
                    <div className="mb-4 flex justify-end items-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddItem(section.id)}
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Madde Ekle
                      </Button>
                    </div>

                    {/* Alt Bölümler */}
                    {section.subSections && section.subSections.length > 0 && (
                      <div className="mb-6 space-y-3">
                        {section.subSections.map((subSection) => (
                          <Card key={subSection.id} className="ml-6 border-l-4 border-l-blue-400 bg-blue-50/30">
                            <CardHeader
                              className="cursor-pointer hover:bg-blue-50/50 transition-colors py-3"
                              onClick={() => toggleSubSection(subSection.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {expandedSubSections.has(subSection.id) ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <CardTitle className="text-base font-semibold text-blue-900">
                                    {subSection.name}
                                  </CardTitle>
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    {subSection.items?.length || 0} madde
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditSubSection(subSection)
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteSubSection(subSection)
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            {expandedSubSections.has(subSection.id) && (
                              <CardContent className="pt-0">
                                <div className="mb-3 flex justify-end">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleAddItemInSubSection(subSection.id)}
                                    className="bg-white"
                                  >
                                    <Plus className="h-3 w-3 mr-2" />
                                    Madde Ekle
                                  </Button>
                                </div>
                                {subSection.items && subSection.items.length > 0 ? (
                                  <TableResponsive
                                    data={subSection.items}
                                    columns={[
                                      {
                                        key: 'title',
                                        header: 'Madde Başlığı',
                                        mobileLabel: 'Madde',
                                        mobilePriority: 1,
                                        render: (item: MaintenanceItem) => (
                                          <span className="font-medium">{item.title}</span>
                                        ),
                                      },
                                      {
                                        key: 'required',
                                        header: 'Zorunlu',
                                        mobileLabel: 'Zorunlu',
                                        mobilePriority: 2,
                                        render: (item: MaintenanceItem) =>
                                          item.required ? (
                                            <Badge variant="active">Evet</Badge>
                                          ) : (
                                            <Badge variant="secondary">Hayır</Badge>
                                          ),
                                      },
                                      {
                                        key: 'photoRequired',
                                        header: 'Fotoğraf',
                                        mobileLabel: 'Foto',
                                        mobilePriority: 3,
                                        render: (item: MaintenanceItem) =>
                                          item.photoRequired ? (
                                            <Badge variant="active">Gerekli</Badge>
                                          ) : (
                                            <Badge variant="secondary">Gerekli Değil</Badge>
                                          ),
                                      },
                                      {
                                        key: 'actions',
                                        header: 'İşlemler',
                                        mobileLabel: '',
                                        mobilePriority: 1,
                                        hideOnMobile: false,
                                        render: (item: MaintenanceItem) => (
                                          <ActionButtons
                                            onEdit={() => handleEditItem(item)}
                                            onDelete={() => handleDeleteItem(item)}
                                          />
                                        ),
                                      },
                                    ]}
                                    keyExtractor={(item) => String(item.id)}
                                  />
                                ) : (
                                  <div className="text-center py-4 text-sm text-muted-foreground">
                                    Henüz madde eklenmemiş
                                  </div>
                                )}
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Ana Bölümün Direkt Maddeleri */}
                    {section.items && section.items.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Bölüm Maddeleri:</h4>
                      </div>
                    )}
                    <TableResponsive
                      data={section.items || []}
                      columns={[
                        {
                          key: 'order',
                          header: '',
                          mobileLabel: '',
                          mobilePriority: 0,
                          render: () => (
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          ),
                        },
                        {
                          key: 'title',
                          header: 'Madde Başlığı',
                          mobileLabel: 'Başlık',
                          mobilePriority: 1,
                          render: (item: MaintenanceItem) => <span className="font-medium">{item.title}</span>,
                        },
                        {
                          key: 'required',
                          header: 'Zorunlu',
                          mobileLabel: 'Zorunlu',
                          mobilePriority: 2,
                          render: (item: MaintenanceItem) =>
                            item.required ? (
                              <Badge variant="destructive">Zorunlu</Badge>
                            ) : (
                              <Badge variant="secondary">Opsiyonel</Badge>
                            ),
                        },
                        {
                          key: 'photoRequired',
                          header: 'Fotoğraf',
                          mobileLabel: 'Foto',
                          mobilePriority: 3,
                          render: (item: MaintenanceItem) =>
                            item.photoRequired ? (
                              <Badge variant="active">Gerekli</Badge>
                            ) : (
                              <Badge variant="secondary">Gerekli Değil</Badge>
                            ),
                        },
                        {
                          key: 'note',
                          header: 'Not',
                          mobileLabel: 'Not',
                          mobilePriority: 4,
                          render: (item: MaintenanceItem) => (
                            <span className="text-sm text-muted-foreground">
                              {item.note || '-'}
                            </span>
                          ),
                        },
                        {
                          key: 'active',
                          header: 'Aktif',
                          mobileLabel: 'Aktif',
                          mobilePriority: 5,
                          render: (item: MaintenanceItem) =>
                            item.active ? (
                              <Badge variant="active">Aktif</Badge>
                            ) : (
                              <Badge variant="secondary">Pasif</Badge>
                            ),
                        },
                        {
                          key: 'actions',
                          header: 'İşlemler',
                          mobileLabel: '',
                          mobilePriority: 1,
                          hideOnMobile: false,
                          render: (item: MaintenanceItem) => (
                            <ActionButtons
                              onEdit={() => handleEditItem(item)}
                              onDelete={() => handleDeleteItem(item)}
                            />
                          ),
                        },
                      ]}
                      keyExtractor={(item) => String(item.id)}
                    />
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Add Section Dialog */}
        <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bölüm Ekle</DialogTitle>
              <DialogDescription>
                Yeni bir bakım bölümü ekleyin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sectionName">Bölüm Adı *</Label>
                <Input
                  id="sectionName"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="Örn: Makine Dairesi"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSectionDialogOpen(false)
                  setSectionName('')
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleSectionSubmit}
                disabled={!sectionName.trim() || createSectionMutation.isPending}
              >
                {createSectionMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Section Dialog */}
        <Dialog open={editSectionDialogOpen} onOpenChange={setEditSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bölüm Düzenle</DialogTitle>
              <DialogDescription>
                Bölüm bilgilerini güncelleyin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editSectionName">Bölüm Adı *</Label>
                <Input
                  id="editSectionName"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="Örn: Makine Dairesi"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditSectionDialogOpen(false)
                  setSelectedSectionForEdit(null)
                  setSectionName('')
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleSectionUpdate}
                disabled={!sectionName.trim() || updateSectionMutation.isPending}
              >
                {updateSectionMutation.isPending ? 'Güncelleniyor...' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Madde Ekle</DialogTitle>
              <DialogDescription>
                Yeni bir bakım maddesi ekleyin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itemTitle">Madde Başlığı *</Label>
                <Input
                  id="itemTitle"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Örn: Motor kontrolü"
                  autoFocus
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="itemRequired"
                  checked={itemRequired}
                  onCheckedChange={(checked) => setItemRequired(checked === true)}
                />
                <Label htmlFor="itemRequired" className="cursor-pointer">
                  Zorunlu
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="itemPhotoRequired"
                  checked={itemPhotoRequired}
                  onCheckedChange={(checked) => setItemPhotoRequired(checked === true)}
                />
                <Label htmlFor="itemPhotoRequired" className="cursor-pointer">
                  Fotoğraf Gerekli
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemNote">Not</Label>
                <Textarea
                  id="itemNote"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="Opsiyonel not..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="itemActive"
                  checked={itemActive}
                  onCheckedChange={(checked) => setItemActive(checked === true)}
                />
                <Label htmlFor="itemActive" className="cursor-pointer">
                  Aktif
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setItemDialogOpen(false)
                  setItemTitle('')
                  setItemRequired(false)
                  setItemPhotoRequired(false)
                  setItemNote('')
                  setItemActive(true)
                  setSelectedSectionId(null)
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleItemSubmit}
                disabled={!itemTitle.trim() || createItemMutation.isPending}
              >
                {createItemMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Madde Düzenle</DialogTitle>
              <DialogDescription>
                Madde bilgilerini güncelleyin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editItemTitle">Madde Başlığı *</Label>
                <Input
                  id="editItemTitle"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Örn: Motor kontrolü"
                  autoFocus
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editItemRequired"
                  checked={itemRequired}
                  onCheckedChange={(checked) => setItemRequired(checked === true)}
                />
                <Label htmlFor="editItemRequired" className="cursor-pointer">
                  Zorunlu
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editItemPhotoRequired"
                  checked={itemPhotoRequired}
                  onCheckedChange={(checked) => setItemPhotoRequired(checked === true)}
                />
                <Label htmlFor="editItemPhotoRequired" className="cursor-pointer">
                  Fotoğraf Gerekli
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemNote">Not</Label>
                <Textarea
                  id="editItemNote"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="Opsiyonel not..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="editItemActive"
                  checked={itemActive}
                  onCheckedChange={(checked) => setItemActive(checked === true)}
                />
                <Label htmlFor="editItemActive" className="cursor-pointer">
                  Aktif
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditItemDialogOpen(false)
                  setSelectedItemForEdit(null)
                  setItemTitle('')
                  setItemRequired(false)
                  setItemPhotoRequired(false)
                  setItemNote('')
                  setItemActive(true)
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleItemUpdate}
                disabled={!itemTitle.trim() || updateItemMutation.isPending}
              >
                {updateItemMutation.isPending ? 'Güncelleniyor...' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Sub-Section Dialog */}
        <Dialog open={editSubSectionDialogOpen} onOpenChange={setEditSubSectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alt Bölüm Düzenle</DialogTitle>
              <DialogDescription>
                Alt bölüm bilgilerini güncelleyin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editSubSectionName">Alt Bölüm Adı *</Label>
                <Input
                  id="editSubSectionName"
                  value={subSectionName}
                  onChange={(e) => setSubSectionName(e.target.value)}
                  placeholder="Örn: Motor Kontrolü"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditSubSectionDialogOpen(false)
                  setSelectedSubSectionForEdit(null)
                  setSubSectionName('')
                }}
              >
                İptal
              </Button>
              <Button
                onClick={handleSubSectionUpdate}
                disabled={!subSectionName.trim() || updateSubSectionMutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600"
              >
                {updateSubSectionMutation.isPending ? 'Güncelleniyor...' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title={
            itemToDelete?.type === 'section'
              ? 'Bölümü Sil'
              : itemToDelete?.type === 'subSection'
              ? 'Alt Bölümü Sil'
              : 'Maddeyi Sil'
          }
          message={
            itemToDelete?.type === 'section'
              ? 'Bu bölümü silmek istediğinize emin misiniz? Bölümdeki tüm alt bölümler ve maddeler de silinecektir.'
              : itemToDelete?.type === 'subSection'
              ? 'Bu alt bölümü silmek istediğinize emin misiniz? Alt bölümdeki tüm maddeler de silinecektir.'
              : 'Bu maddeyi silmek istediğinize emin misiniz?'
          }
          confirmText="Sil"
          cancelText="İptal"
          onConfirm={handleConfirmDelete}
          variant="destructive"
        />
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'Şablon Adı',
      mobileLabel: 'Şablon',
      mobilePriority: 1,
      render: (template: MaintenanceTemplate) => (
        <span className="font-medium">{template.name}</span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      mobileLabel: 'Durum',
      mobilePriority: 2,
      render: (template: MaintenanceTemplate) =>
        template.status === 'ACTIVE' ? (
          <Badge variant="active">Aktif</Badge>
        ) : (
          <Badge variant="secondary">Pasif</Badge>
        ),
    },
    {
      key: 'sectionCount',
      header: 'Bölüm Sayısı',
      mobileLabel: 'Bölüm',
      mobilePriority: 3,
      render: (template: MaintenanceTemplate) => (
        <span className="text-sm text-muted-foreground">{template.sectionCount || 0} bölüm</span>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      mobileLabel: '',
      mobilePriority: 1,
      hideOnMobile: false,
      render: (template: MaintenanceTemplate) => (
        <ActionButtons
          onMaintenance={() => setSelectedTemplate(template.id)}
          onEdit={() => handleEditTemplate(template)}
          onDelete={() => handleDeleteTemplate(template)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bakım Maddeleri Yönet</h1>
          <p className="text-muted-foreground mt-1">
            Bakım şablonlarını oluşturun ve maddelerini yönetin
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-indigo-500 to-indigo-600"
          onClick={handleAddTemplate}
        >
          <Plus className="h-4 w-4 mr-2" />
          Bakım Şablonu Ekle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bakım Şablonları</CardTitle>
          <CardDescription>Mevcut bakım şablonlarını görüntüleyin ve yönetin</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Yükleniyor...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-1">Henüz şablon eklenmemiş</p>
              <p className="text-sm text-muted-foreground mb-4">
                İlk bakım şablonunu ekleyerek başlayın.
              </p>
              <Button 
                className="bg-gradient-to-r from-indigo-500 to-indigo-600"
                onClick={handleAddTemplate}
              >
                <Plus className="h-4 w-4 mr-2" />
                Bakım Şablonu Ekle
              </Button>
            </div>
          ) : (
            <TableResponsive
              data={templates}
              columns={columns}
              keyExtractor={(item) => String(item.id)}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bakım Şablonu Ekle</DialogTitle>
            <DialogDescription>
              Yeni bir bakım şablonu oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Şablon Adı *</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Örn: Aylık Bakım"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">Açıklama</Label>
              <Textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Opsiyonel açıklama..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateStatus">Durum</Label>
              <Select
                value={templateStatus}
                onValueChange={(value) => setTemplateStatus(value as 'ACTIVE' | 'INACTIVE')}
              >
                <SelectTrigger className="h-[44px] bg-white border-[#D1D5DB] rounded-[8px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTemplateDialogOpen(false)
                setTemplateName('')
                setTemplateDescription('')
                setTemplateStatus('ACTIVE')
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleTemplateSubmit}
              disabled={!templateName.trim() || createTemplateMutation.isPending}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600"
            >
              {createTemplateMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editTemplateDialogOpen} onOpenChange={setEditTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bakım Şablonu Düzenle</DialogTitle>
            <DialogDescription>
              Bakım şablonu bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTemplateName">Şablon Adı *</Label>
              <Input
                id="editTemplateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Örn: Aylık Bakım"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTemplateDescription">Açıklama</Label>
              <Textarea
                id="editTemplateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Opsiyonel açıklama..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTemplateStatus">Durum</Label>
              <Select
                value={templateStatus}
                onValueChange={(value) => setTemplateStatus(value as 'ACTIVE' | 'INACTIVE')}
              >
                <SelectTrigger className="h-[44px] bg-white border-[#D1D5DB] rounded-[8px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditTemplateDialogOpen(false)
                setSelectedTemplateForEdit(null)
                setTemplateName('')
                setTemplateDescription('')
                setTemplateStatus('ACTIVE')
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleTemplateUpdate}
              disabled={!templateName.trim() || updateTemplateMutation.isPending}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600"
            >
              {updateTemplateMutation.isPending ? 'Güncelleniyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTemplateConfirmOpen}
        onOpenChange={setDeleteTemplateConfirmOpen}
        title="Bakım Şablonunu Sil"
        message="Bu bakım şablonunu silmek istediğinize emin misiniz? Şablondaki tüm bölümler ve maddeler de silinecektir."
        confirmText="Sil"
        cancelText="İptal"
        onConfirm={handleConfirmDeleteTemplate}
        variant="destructive"
      />
    </div>
  )
}
