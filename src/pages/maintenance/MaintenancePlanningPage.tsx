import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Building2, CheckSquare, Square, Info, Calendar as CalendarIcon, CheckCircle2, QrCode, ChevronLeft, ChevronRight, Sparkles, MoreVertical, Edit, Calendar, X, Eye, Trash2 } from 'lucide-react'
import { elevatorService } from '@/services/elevator.service'
import { maintenancePlanService, type MaintenancePlan } from '@/services/maintenance-plan.service'
import { userService } from '@/services/user.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatElevatorDisplayName, formatMaintenancePlanElevator } from '@/lib/elevator-format'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { formatDateForAPI } from '@/lib/date-utils'

export function MaintenancePlanningPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [selectedElevators, setSelectedElevators] = useState<Set<number>>(new Set())
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedPlanForQR, setSelectedPlanForQR] = useState<MaintenancePlan | null>(null)
  const [qrCode, setQrCode] = useState('')
  
  // Edit modal states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<MaintenancePlan | null>(null)
  const [editPlannedDate, setEditPlannedDate] = useState('')
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null)
  const [editTechnicianId, setEditTechnicianId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  
  // Plan list modal (for multiple plans on same date)
  const [planListDialogOpen, setPlanListDialogOpen] = useState(false)
  const [selectedDateForPlans, setSelectedDateForPlans] = useState<Date | null>(null)
  
  // Cancel confirm modal
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [planToCancel, setPlanToCancel] = useState<MaintenancePlan | null>(null)

  // Fetch elevators
  const { data: elevators = [], isLoading: elevatorsLoading } = useQuery({
    queryKey: ['elevators', 'for-planning'],
    queryFn: () => elevatorService.getAll(),
  })

  // Mock maintenance templates - TODO: Replace with actual API
  const maintenanceTemplates = [
    { id: 1, name: 'Aylık Bakım', status: 'ACTIVE' },
    { id: 2, name: 'Yıllık Bakım', status: 'ACTIVE' },
  ]

  // Fetch technicians (users with PERSONEL role)
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const users = await userService.getAll()
      return users.filter((u) => u.role === 'PERSONEL' && u.enabled !== false)
    },
  })

  // Fetch existing plans for current month
  const { data: existingPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['maintenance-plans', currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: () =>
      maintenancePlanService.getByMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
  })

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: maintenancePlanService.create,
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch maintenance plans
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'upcoming'] })
      setSelectedElevators(new Set())
      toast({
        title: 'Başarılı',
        description: 'Bakım planı oluşturuldu',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım planı oluşturulamadı',
        variant: 'destructive',
      })
    },
  })

  // Complete with QR mutation
  const completeWithQRMutation = useMutation({
    mutationFn: ({ id, qrCode }: { id: number; qrCode: string }) =>
      maintenancePlanService.completeWithQR(id, qrCode),
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch maintenance plans
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'completed'] })
      setQrDialogOpen(false)
      setQrCode('')
      setSelectedPlanForQR(null)
      toast({
        title: 'Başarılı',
        description: 'Bakım tamamlandı',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'QR kodu geçersiz veya bakım tamamlanamadı',
        variant: 'destructive',
      })
    },
  })

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ id, plan }: { id: number; plan: { plannedDate?: string; templateId?: number; technicianId?: number; note?: string } }) => {
      const updateData: any = {}
      if (plan.plannedDate) {
        updateData.plannedDate = formatDateForAPI(plan.plannedDate)
      }
      if (plan.templateId) {
        updateData.templateId = plan.templateId
      }
      // Backend expects "technicianId", not "assignedTechnicianId"
      if (plan.technicianId) {
        updateData.technicianId = plan.technicianId
      }
      if (plan.note !== undefined) {
        updateData.note = plan.note
      }
      return maintenancePlanService.update(id, updateData)
    },
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch maintenance plans
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      setEditDialogOpen(false)
      resetEditForm()
      toast({
        title: 'Başarılı',
        description: 'Bakım planı güncellendi',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım planı güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Delete/Cancel plan mutation
  const cancelPlanMutation = useMutation({
    mutationFn: (id: number) => maintenancePlanService.update(id, { status: 'CANCELLED' }),
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch - rely ONLY on backend response
      // DO NOT manually filter or merge old state
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      setCancelConfirmOpen(false)
      setPlanToCancel(null)
      
      toast({
        title: 'Başarılı',
        description: 'Bakım planı iptal edildi',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım planı iptal edilemedi',
        variant: 'destructive',
      })
    },
  })

  // Reset edit form
  const resetEditForm = () => {
    setSelectedPlanForEdit(null)
    setEditPlannedDate('')
    setEditTemplateId(null)
    setEditTechnicianId(null)
    setEditNote('')
  }

  // Open edit dialog
  const openEditDialog = (plan: MaintenancePlan) => {
    setSelectedPlanForEdit(plan)
    setEditPlannedDate(plan.scheduledDate)
    // Use selected template or default to first template
    setEditTemplateId(selectedTemplateId || maintenanceTemplates[0]?.id || null)
    // Note: technicianId is not in MaintenancePlan interface
    // We'll leave it null for now - backend may not return it
    setEditTechnicianId(null)
    // Backend'den gelen note'u set et
    setEditNote(plan.note || '')
    setEditDialogOpen(true)
  }

  // Handle edit form submit
  const handleEditSubmit = () => {
    if (!selectedPlanForEdit) return
    
    updatePlanMutation.mutate({
      id: selectedPlanForEdit.id,
      plan: {
        plannedDate: editPlannedDate,
        templateId: editTemplateId || undefined,
        technicianId: editTechnicianId || undefined, // Backend expects "technicianId"
        note: editNote || undefined,
      },
    })
  }

  // Reschedule mutation (sadece tarih değiştirmek için)
  const reschedulePlanMutation = useMutation({
    mutationFn: ({ id, plannedDate }: { id: number; plannedDate: string }) =>
      maintenancePlanService.reschedule(id, { plannedDate }),
    onSuccess: async () => {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Invalidate and refetch maintenance plans
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ 
        queryKey: ['maintenance-plans', year, month],
        exact: true
      })
      
      // Invalidate and refetch dashboard counts
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'counts'] })
      
      setEditDialogOpen(false)
      resetEditForm()
      toast({
        title: 'Başarılı',
        description: 'Bakım planı tarihi güncellendi',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım planı tarihi güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Handle date update only (reschedule endpoint kullan)
  const handleDateUpdate = () => {
    if (!selectedPlanForEdit) return
    
    reschedulePlanMutation.mutate({
      id: selectedPlanForEdit.id,
      plannedDate: editPlannedDate,
    })
  }

  // Handle cancel plan
  const handleCancelPlan = () => {
    if (!planToCancel) return
    cancelPlanMutation.mutate(planToCancel.id)
  }

  // Filter elevators by building
  const filteredElevators = useMemo(() => {
    let filtered = elevators

    // Filter by building
    if (selectedBuilding !== 'all') {
      filtered = filtered.filter((e) => e.bina === selectedBuilding)
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.kimlikNo?.toLowerCase().includes(searchLower) ||
          e.bina?.toLowerCase().includes(searchLower) ||
          e.adres?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [elevators, selectedBuilding, searchTerm])

  // Get unique buildings
  const buildings = useMemo(() => {
    const buildingSet = new Set(elevators.map((e) => e.bina).filter(Boolean))
    return Array.from(buildingSet).sort()
  }, [elevators])

  // Handle building change - unselect elevators from other buildings
  const handleBuildingChange = (building: string) => {
    setSelectedBuilding(building)
    if (building !== 'all') {
      // Unselect elevators not in selected building
      const newSelected = new Set<number>()
      selectedElevators.forEach((id) => {
        const elevator = elevators.find((e) => e.id === id)
        if (elevator?.bina === building) {
          newSelected.add(id)
        }
      })
      setSelectedElevators(newSelected)
    }
  }

  // Check if elevator already has a plan in current month
  const hasPlanInMonth = (elevatorId: number): boolean => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return existingPlans.some((plan) => {
      if (plan.elevatorId !== elevatorId || plan.status === 'CANCELLED') return false
      const planDate = new Date(plan.scheduledDate)
      return planDate.getFullYear() === year && planDate.getMonth() === month
    })
  }

  // Get plans for a specific date (excluding CANCELLED - they should not appear in calendar)
  const getPlansForDate = (date: Date): MaintenancePlan[] => {
    const dateStr = date.toISOString().split('T')[0]
    return existingPlans.filter((plan) => {
      if (plan.status === 'CANCELLED') return false // CANCELLED planlar takvimde gösterilmez
      const planDate = new Date(plan.scheduledDate)
      const planDateStr = planDate.toISOString().split('T')[0]
      return planDateStr === dateStr
    })
  }

  // Get all plans for a date including CANCELLED (for plan list modal)
  const getAllPlansForDate = (date: Date): MaintenancePlan[] => {
    const dateStr = date.toISOString().split('T')[0]
    return existingPlans.filter((plan) => {
      const planDate = new Date(plan.scheduledDate)
      const planDateStr = planDate.toISOString().split('T')[0]
      return planDateStr === dateStr
    })
  }

  // Check if date is disabled for selected elevators
  const isDateDisabled = (date: Date): boolean => {
    if (selectedElevators.size === 0) return false
    const dateStr = date.toISOString().split('T')[0]
    const year = date.getFullYear()
    const month = date.getMonth()

    // Check if any selected elevator already has a plan in this month
    for (const elevatorId of selectedElevators) {
      const hasPlan = existingPlans.some((plan) => {
        if (plan.elevatorId !== elevatorId || plan.status === 'CANCELLED') return false
        const planDate = new Date(plan.scheduledDate)
        return (
          planDate.getFullYear() === year &&
          planDate.getMonth() === month &&
          plan.scheduledDate !== dateStr
        )
      })
      if (hasPlan) return true
    }

    return false
  }

  const toggleElevatorSelection = (elevatorId: number) => {
    // Check if elevator already has a plan in current month
    if (hasPlanInMonth(elevatorId)) {
      toast({
        title: 'Uyarı',
        description: 'Bu asansör bu ay için zaten planlanmış',
        variant: 'destructive',
      })
      return
    }

    const newSelected = new Set(selectedElevators)
    if (newSelected.has(elevatorId)) {
      newSelected.delete(elevatorId)
    } else {
      newSelected.add(elevatorId)
    }
    setSelectedElevators(newSelected)
  }

  const handleDayClick = (date: Date) => {
    const plans = getPlansForDate(date) // Already excludes CANCELLED
    
    // If there are existing active plans, open plan list modal or edit modal
    if (plans.length > 0) {
      if (plans.length === 1) {
        // Single plan - open edit modal
        openEditDialog(plans[0])
      } else {
        // Multiple plans - open list modal
        setSelectedDateForPlans(date)
        setPlanListDialogOpen(true)
      }
      return
    }

    // No plans - create new plan (existing logic)
    if (selectedElevators.size === 0) {
      toast({
        title: 'Uyarı',
        description: 'Lütfen önce asansör seçin',
        variant: 'destructive',
      })
      return
    }

    if (isDateDisabled(date)) {
      toast({
        title: 'Uyarı',
        description: 'Seçili asansörlerden biri bu ay için zaten planlanmış',
        variant: 'destructive',
      })
      return
    }

    const dateStr = date.toISOString().split('T')[0]

    // Check for conflicts
    const conflicts: number[] = []
    selectedElevators.forEach((elevatorId) => {
      const hasConflict = existingPlans.some((plan) => {
        if (plan.elevatorId !== elevatorId || plan.status === 'CANCELLED') return false
        const planDate = new Date(plan.scheduledDate)
        const planDateStr = planDate.toISOString().split('T')[0]
        return planDateStr === dateStr
      })
      if (hasConflict) conflicts.push(elevatorId)
    })

    if (conflicts.length > 0) {
      toast({
        title: 'Çakışma',
        description: `${conflicts.length} asansör bu tarihe zaten planlanmış`,
        variant: 'destructive',
      })
      return
    }

    // Create plans for all selected elevators
    // Filter out invalid elevator IDs
    const validElevatorIds = Array.from(selectedElevators).filter(
      (id) => id != null && !isNaN(Number(id)) && id > 0
    )

    console.log('🔍 DEBUG handleDayClick:', {
      selectedElevators: Array.from(selectedElevators),
      validElevatorIds,
      dateStr,
    })

    if (validElevatorIds.length === 0) {
      toast({
        title: 'Hata',
        description: 'Geçerli asansör seçilmedi',
        variant: 'destructive',
      })
      return
    }

    // Check if template is selected
    console.log('🔍 Template check:', { selectedTemplateId, type: typeof selectedTemplateId })
    if (!selectedTemplateId || selectedTemplateId <= 0) {
      toast({
        title: 'Uyarı',
        description: 'Lütfen bakım şablonu seçin',
        variant: 'destructive',
      })
      return
    }

    const promises = validElevatorIds.map((elevatorId) => {
      const planData = {
        elevatorId: Number(elevatorId),
        templateId: Number(selectedTemplateId),
        plannedDate: dateStr, // Backend expects "plannedDate", not "scheduledDate"
      }
      console.log('📤 Sending plan data:', planData)
      console.log('📤 Template ID in payload:', planData.templateId, 'type:', typeof planData.templateId)
      return createPlanMutation.mutateAsync(planData)
    })

    Promise.all(promises)
      .then(() => {
        toast({
          title: 'Başarılı',
          description: `${validElevatorIds.length} asansör için bakım planı oluşturuldu`,
        })
      })
      .catch(() => {
        // Error handling is done in mutation
      })
  }

  const handleCompleteWithQR = (plan: MaintenancePlan) => {
    setSelectedPlanForQR(plan)
    setQrCode('')
    setQrDialogOpen(true)
  }

  const handleQRSubmit = () => {
    if (!selectedPlanForQR || !qrCode.trim()) {
      toast({
        title: 'Hata',
        description: 'Lütfen QR kodunu girin',
        variant: 'destructive',
      })
      return
    }

    completeWithQRMutation.mutate({
      id: selectedPlanForQR.id,
      qrCode: qrCode.trim(),
    })
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const monthNames = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ]

  const groupedElevators = useMemo(() => {
    const grouped: Record<string, typeof filteredElevators> = {}
    filteredElevators.forEach((elevator) => {
      const building = elevator.bina || 'Diğer'
      if (!grouped[building]) {
        grouped[building] = []
      }
      grouped[building].push(elevator)
    })
    return grouped
  }, [filteredElevators])

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const planned = existingPlans.filter((p) => p.status === 'PLANNED').length
    const completed = existingPlans.filter((p) => p.status === 'COMPLETED').length
    const today = new Date()
    const overdue = existingPlans.filter((p) => {
      if (p.status !== 'PLANNED') return false
      const planDate = new Date(p.scheduledDate)
      return planDate < today
    }).length
    return { planned, completed, overdue }
  }, [existingPlans])

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Premium Page Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">Bakım Planlama</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Asansörleri seçin ve takvimde bir tarihe tıklayarak bakım planlayın
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Premium Design */}
          <div className="lg:col-span-1 space-y-4">
            {/* Section Title */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#111827]">Bakım Planlama</h2>
            </div>

            {/* Building Filter - Premium Style */}
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  <Input
                    placeholder="Asansör ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11 bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                </div>

                {/* Building Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#111827]">Bina Filtresi</Label>
                  <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
                    <SelectTrigger className="h-11 bg-[#F9FAFB] border-[#E5E7EB]">
                      <Building2 className="h-4 w-4 mr-2 text-[#6B7280]" />
                      <SelectValue placeholder="Bina seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Binalar</SelectItem>
                      {buildings.map((building) => (
                        <SelectItem key={building} value={building}>
                          {building}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Selector - Segmented Control Style */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#111827]">
                    Bakım Şablonu <span className="text-[#DC2626]">*</span>
                  </Label>
                  <div className="flex gap-2 p-1 bg-[#F3F4F6] rounded-lg">
                    {maintenanceTemplates.map((template) => {
                      const isSelected = selectedTemplateId === template.id
                      return (
                        <button
                          key={template.id}
                          onClick={() => {
                            const templateId = Number(template.id)
                            console.log('🔍 Template selected:', { value: template.id, templateId, type: typeof templateId })
                            setSelectedTemplateId(templateId)
                          }}
                          className={cn(
                            'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                            isSelected
                              ? 'bg-[#4F46E5] text-white shadow-sm'
                              : 'bg-transparent text-[#6B7280] hover:text-[#111827]'
                          )}
                        >
                          {template.name}
                        </button>
                      )
                    })}
                  </div>
                  {selectedTemplateId && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="success" className="text-xs">
                        ✅ {maintenanceTemplates.find(t => t.id === selectedTemplateId)?.name || selectedTemplateId}
                      </Badge>
                    </div>
                  )}
                  {!selectedTemplateId && (
                    <p className="text-xs text-[#DC2626] font-medium mt-1">
                      ⚠️ Bakım planlamak için şablon seçmeniz gerekiyor
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Elevator List - Premium Cards */}
            <Card className="border border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-[#111827]">Asansörler</CardTitle>
                  {selectedElevators.size > 0 && (
                    <Badge variant="active" className="text-xs">
                      {selectedElevators.size} seçildi
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {elevatorsLoading ? (
                    <div className="text-center py-8 text-[#6B7280]">Yükleniyor...</div>
                  ) : Object.keys(groupedElevators).length === 0 ? (
                    <div className="text-center py-8 text-[#6B7280]">
                      Asansör bulunamadı
                    </div>
                  ) : (
                    Object.entries(groupedElevators).map(([building, buildingElevators]) => (
                      <div key={building} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827] mb-2 px-2">
                          <Building2 className="h-4 w-4 text-[#4F46E5]" />
                          {building}
                        </div>
                        {buildingElevators.map((elevator) => {
                          const hasPlan = hasPlanInMonth(elevator.id)
                          const isSelected = selectedElevators.has(elevator.id)
                          return (
                            <div
                              key={elevator.id}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                                hasPlan
                                  ? 'bg-[#F3F4F6] border-[#D1D5DB] opacity-60 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-[#EEF2FF] border-[#4F46E5] border-2 shadow-sm'
                                    : 'bg-white border-[#E5E7EB] hover:border-[#4F46E5] hover:shadow-sm cursor-pointer'
                              )}
                              onClick={() => !hasPlan && toggleElevatorSelection(elevator.id)}
                            >
                              {hasPlan ? (
                                <CheckCircle2 className="h-5 w-5 text-[#9CA3AF] flex-shrink-0" />
                              ) : isSelected ? (
                                <CheckSquare className="h-5 w-5 text-[#4F46E5] flex-shrink-0" />
                              ) : (
                                <Square className="h-5 w-5 text-[#9CA3AF] flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                {(() => {
                                  const displayInfo = formatElevatorDisplayName(elevator)
                                  return (
                                    <>
                                      <div className="font-semibold text-sm text-[#111827] truncate">
                                        {displayInfo.fullName}
                                      </div>
                                      <div className="text-xs text-[#6B7280] truncate">
                                        {elevator.bina && `${elevator.bina} • `}
                                        {elevator.adres}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        {hasPlan && (
                                          <Badge variant="secondary" className="text-xs">
                                            Bu ay planlanmış
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className="text-xs text-[#9CA3AF] border-[#E5E7EB]">
                                          {displayInfo.technicalCode}
                                        </Badge>
                                      </div>
                                    </>
                                  )
                                })()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rules Info Card - Premium Style */}
            <Card className="bg-[#EFF6FF] border-l-4 border-l-[#4F46E5] border-r border-t border-b border-[#DBEAFE] shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-[#4F46E5] mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-[#1E40AF]">
                    <p className="font-semibold mb-2 text-[#111827]">Kurallar</p>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-[#4F46E5] mt-1">•</span>
                        <span>Her asansör ayda sadece bir kez planlanabilir</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#4F46E5] mt-1">•</span>
                        <span>Bina seçildiğinde diğer binalardan seçimler kaldırılır</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#4F46E5] mt-1">•</span>
                        <span>Planlanmış asansörler gri görünür</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#4F46E5] mt-1">•</span>
                        <span>Bakım tamamlama için QR kod gerekir</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area - Premium Calendar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Monthly Summary Card */}
            <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#4F46E5]" />
                    <span className="text-sm font-medium text-[#111827]">Bu Ay Özeti</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="planned" className="text-xs">
                        {monthlySummary.planned} Planlandı
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="completed" className="text-xs">
                        {monthlySummary.completed} Tamamlandı
                      </Badge>
                    </div>
                    {monthlySummary.overdue > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="aborted" className="text-xs">
                          {monthlySummary.overdue} Gecikti
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Card - Premium Design */}
            <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-teal-50/50 border-b border-[#E5E7EB]">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-[#111827]">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </CardTitle>
                    <CardDescription className="text-sm text-[#6B7280] mt-1">
                      Bakım planlaması takvimi
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      disabled={plansLoading}
                      className="h-9 px-3 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                      disabled={plansLoading}
                      className="h-9 px-3 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
                    >
                      Bugün
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      disabled={plansLoading}
                      className="h-9 px-3 border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {plansLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-[#6B7280]">Yükleniyor...</div>
                  </div>
                ) : (
                  <>
                    {/* Calendar Grid - Premium Design */}
                    <div className="grid grid-cols-7 gap-3 mb-6">
                      {/* Day Headers */}
                      {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-semibold text-[#6B7280] py-2"
                        >
                          {day}
                        </div>
                      ))}

                      {/* Calendar Days - Premium Cells */}
                      {getDaysInMonth().map((date, index) => {
                        if (!date) {
                          return <div key={`empty-${index}`} className="aspect-square" />
                        }

                        const isToday = date.toDateString() === new Date().toDateString()
                        const plans = getPlansForDate(date) // Already excludes CANCELLED
                        const isPast = date < new Date() && !isToday
                        const isDisabled = isDateDisabled(date) || isPast
                        const hasPlanned = plans.some((p) => p.status === 'PLANNED')
                        const hasCompleted = plans.some((p) => p.status === 'COMPLETED')
                        // CANCELLED plans are not shown in calendar

                        return (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              'aspect-square rounded-xl border-2 p-3 transition-all duration-200 relative group',
                              isPast && 'bg-[#F9FAFB] border-[#E5E7EB] opacity-50',
                              isToday && !isPast && 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-[#4F46E5] shadow-md',
                              hasPlanned && !hasCompleted && !isPast && 'bg-[#FEF3C7] border-[#F59E0B]',
                              hasCompleted && !isPast && 'bg-[#DCFCE7] border-[#16A34A]',
                              !hasPlanned && !hasCompleted && !isToday && !isPast && 'bg-white border-[#E5E7EB] hover:border-[#4F46E5] hover:shadow-sm',
                              isDisabled && !isPast && 'cursor-not-allowed opacity-60',
                              !isDisabled && !isPast && 'cursor-pointer hover:scale-[1.02]'
                            )}
                            onClick={(e) => {
                              // Don't trigger if clicking on dropdown menu
                              if ((e.target as HTMLElement).closest('[role="menu"]')) return
                              !isDisabled && handleDayClick(date)
                            }}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span
                                className={cn(
                                  'text-sm font-semibold',
                                  isToday && 'text-[#4F46E5]',
                                  !isToday && 'text-[#111827]'
                                )}
                              >
                                {date.getDate()}
                              </span>
                              <div className="flex items-center gap-1">
                              {plans.length > 0 && (
                                <Badge
                                  variant={
                                    hasCompleted
                                      ? 'completed'
                                      : 'planned'
                                  }
                                  className="h-5 px-1.5 text-xs font-semibold"
                                >
                                  {plans.length}
                                </Badge>
                              )}
                                {plans.length > 0 && !isPast && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#F3F4F6] rounded"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <MoreVertical className="h-3.5 w-3.5 text-[#6B7280]" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      {plans.length === 1 ? (
                                        <>
                                          {plans[0].status === 'PLANNED' && (
                                            <>
                                              <DropdownMenuItem onClick={() => openEditDialog(plans[0])}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Düzenle
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => {
                                                setEditPlannedDate(plans[0].scheduledDate)
                                                openEditDialog(plans[0])
                                              }}>
                                                <Calendar className="h-4 w-4 mr-2" />
                                                Tarih Değiştir
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setPlanToCancel(plans[0])
                                                  setCancelConfirmOpen(true)
                                                }}
                                                className="text-[#DC2626]"
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                İptal Et
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                          {plans[0].status === 'COMPLETED' && (
                                            <DropdownMenuItem onClick={() => handleCompleteWithQR(plans[0])}>
                                              <Eye className="h-4 w-4 mr-2" />
                                              QR Detay Gör
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => openEditDialog(plans[0])}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            Detay Gör
                                          </DropdownMenuItem>
                                        </>
                                      ) : (
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedDateForPlans(date)
                                          setPlanListDialogOpen(true)
                                        }}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          {plans.length} Bakımı Görüntüle
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1 mt-2">
                              {plans.slice(0, 2).map((plan) => {
                                const elevator = elevators.find((e) => e.id === plan.elevatorId)
                                const displayInfo = formatElevatorDisplayName(
                                  elevator || {
                                    kimlikNo: plan.elevatorCode || plan.elevatorName,
                                    bina: plan.buildingName,
                                  }
                                )
                                return (
                                  <div
                                    key={plan.id}
                                    className="text-xs truncate flex items-center gap-1.5"
                                    title={`${displayInfo.fullName} - ${plan.status === 'COMPLETED' ? 'Tamamlandı' : 'Planlandı'}`}
                                  >
                                    {plan.status === 'COMPLETED' ? (
                                      <CheckCircle2 className="h-3 w-3 text-[#16A34A] flex-shrink-0" />
                                    ) : (
                                      <CalendarIcon className="h-3 w-3 text-[#F59E0B] flex-shrink-0" />
                                    )}
                                    <span className="truncate text-[#111827] font-medium">
                                      {displayInfo.shortName}
                                    </span>
                                  </div>
                                )
                              })}
                              {plans.length > 2 && (
                                <div className="text-xs text-[#6B7280] font-medium">
                                  +{plans.length - 2} daha
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend - Premium Style */}
                    <div className="flex flex-wrap items-center gap-6 text-sm pt-4 border-t border-[#E5E7EB]">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-lg border-2 border-[#F59E0B] bg-[#FEF3C7]" />
                        <span className="text-[#6B7280]">Planlandı</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-lg border-2 border-[#16A34A] bg-[#DCFCE7]" />
                        <span className="text-[#6B7280]">Tamamlandı</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-[#D1D5DB] bg-[#F9FAFB] opacity-50" />
                        <span className="text-[#6B7280]">Geçmiş</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Planned Maintenance List - Premium Cards */}
            {existingPlans.length > 0 && (
              <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-teal-50/50 border-b border-[#E5E7EB]">
                  <CardTitle className="text-lg font-semibold text-[#111827]">Planlanan Bakımlar</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">
                    {currentMonth.getFullYear()} {monthNames[currentMonth.getMonth()]} ayı planları
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {existingPlans
                      .filter((p) => p.status !== 'CANCELLED')
                      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                      .map((plan, index) => (
                        <div
                          key={plan.id}
                          className={cn(
                            'flex items-center justify-between p-5 rounded-xl border bg-white transition-all duration-200',
                            'hover:shadow-md hover:-translate-y-0.5',
                            index < existingPlans.length - 1 && 'border-b border-[#F3F4F6]'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            {(() => {
                              const elevator = elevators.find((e) => e.id === plan.elevatorId)
                              const planInfo = formatMaintenancePlanElevator(
                                plan,
                                elevator,
                                maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name
                              )
                              return (
                                <>
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-lg font-bold text-[#111827]">
                                      🛗 {planInfo.title}
                                    </span>
                                    <Badge
                                      variant={plan.status === 'COMPLETED' ? 'completed' : 'planned'}
                                      className="text-xs font-semibold"
                                    >
                                      {plan.status === 'COMPLETED' ? 'Tamamlandı' : 'Planlandı'}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-[#6B7280] space-y-1">
                                    <div>
                                      {plan.buildingName && (
                                        <span className="font-medium">{plan.buildingName}</span>
                                      )}
                                      {plan.buildingName && ' • '}
                                      <span>
                                        Planlanan Tarih: {new Date(plan.scheduledDate).toLocaleDateString('tr-TR', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                    {maintenanceTemplates.find((t) => t.id === selectedTemplateId) && (
                                      <div>
                                        Bakım Türü: {maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name}
                                      </div>
                                    )}
                                    {plan.completedDate && (
                                      <div className="text-[#16A34A] font-medium">
                                        Tamamlandı: {new Date(plan.completedDate).toLocaleDateString('tr-TR')}
                                      </div>
                                    )}
                                    <div className="mt-1">
                                      <Badge variant="outline" className="text-xs text-[#9CA3AF] border-[#E5E7EB]">
                                        ({planInfo.technicalCode})
                                      </Badge>
                                    </div>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                          {plan.status === 'PLANNED' && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteWithQR(plan)}
                              className="ml-4 bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white hover:from-[#4338CA] hover:to-[#3730A3] shadow-md hover:shadow-lg transition-all duration-200"
                            >
                              <QrCode className="h-4 w-4 mr-2" />
                              QR ile Tamamla
                            </Button>
                          )}
                          {plan.status === 'COMPLETED' && (
                            <div className="ml-4">
                              <Badge variant="completed" className="text-xs font-semibold">
                                ✓ Tamamlandı
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open)
        if (!open) resetEditForm()
      }}>
        <DialogContent className="sm:max-w-lg rounded-xl border border-[#E5E7EB] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827]">
              {selectedPlanForEdit && (() => {
                const elevator = elevators.find((e) => e.id === selectedPlanForEdit.elevatorId)
                const displayInfo = formatElevatorDisplayName(
                  elevator || {
                    kimlikNo: selectedPlanForEdit.elevatorCode || selectedPlanForEdit.elevatorName,
                    bina: selectedPlanForEdit.buildingName,
                  }
                )
                return `🛗 ${displayInfo.fullName}`
              })()}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Bakım planını düzenleyin
            </DialogDescription>
          </DialogHeader>
          {selectedPlanForEdit && (
            <div className="space-y-4">
              {/* Planlanan Tarih */}
              <div className="space-y-2">
                <Label htmlFor="editPlannedDate" className="text-sm font-medium text-[#111827]">
                  Planlanan Tarih
                </Label>
                <Input
                  id="editPlannedDate"
                  type="date"
                  value={editPlannedDate}
                  onChange={(e) => setEditPlannedDate(e.target.value)}
                  className="h-11 border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  disabled={selectedPlanForEdit.status === 'COMPLETED' || selectedPlanForEdit.status === 'CANCELLED'}
                />
              </div>

              {/* Bakım Şablonu */}
              <div className="space-y-2">
                <Label htmlFor="editTemplate" className="text-sm font-medium text-[#111827]">
                  Bakım Şablonu
                </Label>
                <Select
                  value={editTemplateId ? String(editTemplateId) : ''}
                  onValueChange={(value) => setEditTemplateId(Number(value))}
                  disabled={selectedPlanForEdit.status === 'COMPLETED' || selectedPlanForEdit.status === 'CANCELLED'}
                >
                  <SelectTrigger className="h-11 bg-[#F9FAFB] border-[#E5E7EB]">
                    <SelectValue placeholder="Bakım şablonu seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTemplates.map((template) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Teknisyen */}
              <div className="space-y-2">
                <Label htmlFor="editTechnician" className="text-sm font-medium text-[#111827]">
                  Teknisyen
                </Label>
                <Select
                  value={editTechnicianId ? String(editTechnicianId) : ''}
                  onValueChange={(value) => setEditTechnicianId(Number(value))}
                  disabled={selectedPlanForEdit.status === 'COMPLETED' || selectedPlanForEdit.status === 'CANCELLED'}
                >
                  <SelectTrigger className="h-11 bg-[#F9FAFB] border-[#E5E7EB]">
                    <SelectValue placeholder="Teknisyen seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={String(tech.id)}>
                        {tech.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Not */}
              <div className="space-y-2">
                <Label htmlFor="editNote" className="text-sm font-medium text-[#111827]">
                  Not
                </Label>
                <Textarea
                  id="editNote"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Bakım planı hakkında notlar..."
                  className="min-h-[100px] border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  disabled={selectedPlanForEdit.status === 'COMPLETED' || selectedPlanForEdit.status === 'CANCELLED'}
                />
              </div>

              {/* Status Info */}
              <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#6B7280]">Durum:</span>
                  <Badge
                    variant={
                      selectedPlanForEdit.status === 'COMPLETED'
                        ? 'completed'
                        : selectedPlanForEdit.status === 'CANCELLED'
                          ? 'aborted'
                          : 'planned'
                    }
                    className="text-xs"
                  >
                    {selectedPlanForEdit.status === 'COMPLETED'
                      ? 'Tamamlandı'
                      : selectedPlanForEdit.status === 'CANCELLED'
                        ? 'İptal Edildi'
                        : 'Planlandı'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              Kapat
            </Button>
            {selectedPlanForEdit?.status === 'PLANNED' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDateUpdate}
                  disabled={reschedulePlanMutation.isPending || !editPlannedDate}
                  className="border-[#4F46E5] text-[#4F46E5] hover:bg-[#EEF2FF]"
                >
                  {reschedulePlanMutation.isPending ? 'Güncelleniyor...' : 'Tarihi Güncelle'}
                </Button>
                <Button
                  onClick={handleEditSubmit}
                  disabled={updatePlanMutation.isPending || !editPlannedDate}
                  className="bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white hover:from-[#4338CA] hover:to-[#3730A3] shadow-md"
                >
                  {updatePlanMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setPlanToCancel(selectedPlanForEdit)
                    setCancelConfirmOpen(true)
                    setEditDialogOpen(false)
                  }}
                  className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                >
                  Bakımı İptal Et
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan List Dialog (Multiple plans on same date) */}
      <Dialog open={planListDialogOpen} onOpenChange={setPlanListDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-xl border border-[#E5E7EB] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827]">
              {selectedDateForPlans &&
                new Date(selectedDateForPlans).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
              - Bakım Planları
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Bu tarihte planlanmış bakımlar
            </DialogDescription>
          </DialogHeader>
          {selectedDateForPlans && (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {getAllPlansForDate(selectedDateForPlans)
                .filter((p) => p.status !== 'CANCELLED') // CANCELLED planları listede gösterme
                .map((plan) => {
                const elevator = elevators.find((e) => e.id === plan.elevatorId)
                const displayInfo = formatElevatorDisplayName(
                  elevator || {
                    kimlikNo: plan.elevatorCode || plan.elevatorName,
                    bina: plan.buildingName,
                  }
                )
                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-xl border border-[#E5E7EB] bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-[#111827]">
                            🛗 {displayInfo.fullName}
                          </span>
                          <Badge
                            variant={
                              plan.status === 'COMPLETED'
                                ? 'completed'
                                : plan.status === 'CANCELLED'
                                  ? 'aborted'
                                  : 'planned'
                            }
                            className="text-xs"
                          >
                            {plan.status === 'COMPLETED'
                              ? 'Tamamlandı'
                              : plan.status === 'CANCELLED'
                                ? 'İptal Edildi'
                                : 'Planlandı'}
                          </Badge>
                        </div>
                        <div className="text-sm text-[#6B7280] space-y-1">
                          <div>{plan.buildingName || elevator?.bina}</div>
                          <div>
                            {new Date(plan.scheduledDate).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.status === 'PLANNED' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPlanListDialogOpen(false)
                                openEditDialog(plan)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setPlanToCancel(plan)
                                setCancelConfirmOpen(true)
                                setPlanListDialogOpen(false)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              İptal
                            </Button>
                          </>
                        )}
                        {plan.status === 'COMPLETED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPlanListDialogOpen(false)
                              handleCompleteWithQR(plan)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detay
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPlanListDialogOpen(false)}
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Bakım Planını İptal Et"
        message="Bu planlanan bakımı iptal etmek istediğinize emin misiniz?"
        confirmText="Evet, İptal Et"
        cancelText="Vazgeç"
        onConfirm={handleCancelPlan}
        variant="destructive"
      />

      {/* QR Code Dialog - Premium Style */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl border border-[#E5E7EB] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827]">QR Kod ile Bakım Tamamla</DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Bakımı tamamlamak için QR kodunu girin veya tarayın
            </DialogDescription>
          </DialogHeader>
          {selectedPlanForQR && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                {(() => {
                  const elevator = elevators.find((e) => e.id === selectedPlanForQR.elevatorId)
                  const planInfo = formatMaintenancePlanElevator(
                    selectedPlanForQR,
                    elevator,
                    maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name
                  )
                  return (
                    <>
                      <div className="text-sm font-medium text-[#6B7280] mb-1">Asansör</div>
                      <div className="text-lg font-bold text-[#111827] mb-2">
                        🛗 {planInfo.title}
                      </div>
                      <div className="text-sm text-[#6B7280] space-y-1">
                        <div>
                          <span className="font-medium">Adres:</span> {elevator?.adres || selectedPlanForQR.buildingName || '-'}
                        </div>
                        <div>
                          <span className="font-medium">Planlanan Tarih:</span>{' '}
                          {new Date(selectedPlanForQR.scheduledDate).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                        {maintenanceTemplates.find((t) => t.id === selectedTemplateId) && (
                          <div>
                            <span className="font-medium">Bakım Türü:</span>{' '}
                            {maintenanceTemplates.find((t) => t.id === selectedTemplateId)?.name}
                          </div>
                        )}
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs text-[#9CA3AF] border-[#E5E7EB]">
                            ({planInfo.technicalCode})
                          </Badge>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="space-y-2">
                <Label htmlFor="qrCode" className="text-sm font-medium text-[#111827]">QR Kod</Label>
                <Input
                  id="qrCode"
                  placeholder="QR kodunu girin veya tarayın"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  autoFocus
                  className="h-11 border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQRSubmit()
                    }
                  }}
                />
                <p className="text-xs text-[#6B7280]">
                  Mobil cihazınızın kamerasını kullanarak QR kodu tarayabilirsiniz
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setQrDialogOpen(false)}
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              İptal
            </Button>
            <Button
              onClick={handleQRSubmit}
              disabled={!qrCode.trim() || completeWithQRMutation.isPending}
              className="bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white hover:from-[#4338CA] hover:to-[#3730A3] shadow-md"
            >
              {completeWithQRMutation.isPending ? 'Tamamlanıyor...' : 'Tamamla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
