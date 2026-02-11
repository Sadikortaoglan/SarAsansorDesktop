import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Building2, CheckSquare, Square, Info, Calendar as CalendarIcon, CheckCircle2, QrCode } from 'lucide-react'
import { elevatorService } from '@/services/elevator.service'
import { maintenancePlanService, type MaintenancePlan } from '@/services/maintenance-plan.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'


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

  // Fetch existing plans for current month
  const { data: existingPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['maintenance-plans', currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: () =>
      maintenancePlanService.getByMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
  })

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: maintenancePlanService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'completed'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
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

  // Get plans for a specific date
  const getPlansForDate = (date: Date): MaintenancePlan[] => {
    const dateStr = date.toISOString().split('T')[0]
    return existingPlans.filter((plan) => {
      const planDate = new Date(plan.scheduledDate)
      const planDateStr = planDate.toISOString().split('T')[0]
      return planDateStr === dateStr && plan.status !== 'CANCELLED'
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bakım Planla</h1>
          <p className="text-muted-foreground mt-1">
            Asansörleri seçin ve takvimde bir tarihe tıklayarak bakım planlayın
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Elevator Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asansör Seçimi</CardTitle>
              <CardDescription>
                {selectedElevators.size > 0 && (
                  <Badge variant="active" className="mt-2">
                    {selectedElevators.size} asansör seçildi
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Asansör ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Building Filter */}
              <div className="space-y-2">
                <Label>Bina Filtresi</Label>
                <Select value={selectedBuilding} onValueChange={handleBuildingChange}>
                  <SelectTrigger>
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

              {/* Template Selection */}
              <div className="space-y-2">
                <Label>Bakım Şablonu *</Label>
                <Select
                  value={selectedTemplateId ? String(selectedTemplateId) : ''}
                  onValueChange={(value) => {
                    const templateId = Number(value)
                    console.log('🔍 Template selected:', { value, templateId, type: typeof templateId })
                    setSelectedTemplateId(templateId)
                  }}
                >
                  <SelectTrigger>
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
                {!selectedTemplateId && (
                  <p className="text-xs text-red-500 font-medium">
                    ⚠️ Bakım planlamak için şablon seçmeniz gerekiyor
                  </p>
                )}
                {selectedTemplateId && (
                  <p className="text-xs text-green-600">
                    ✅ Şablon seçildi: {maintenanceTemplates.find(t => t.id === selectedTemplateId)?.name || selectedTemplateId}
                  </p>
                )}
              </div>

              {/* Elevator List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {elevatorsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                ) : Object.keys(groupedElevators).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Asansör bulunamadı
                  </div>
                ) : (
                  Object.entries(groupedElevators).map(([building, buildingElevators]) => (
                    <div key={building} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <Building2 className="h-4 w-4" />
                        {building}
                      </div>
                      {buildingElevators.map((elevator) => {
                        const hasPlan = hasPlanInMonth(elevator.id)
                        const isSelected = selectedElevators.has(elevator.id)
                        return (
                          <div
                            key={elevator.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                              hasPlan
                                ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-indigo-50 border-indigo-500'
                                  : 'bg-white border-gray-200 hover:border-indigo-300'
                            )}
                            onClick={() => !hasPlan && toggleElevatorSelection(elevator.id)}
                          >
                            {hasPlan ? (
                              <CheckCircle2 className="h-5 w-5 text-gray-400" />
                            ) : isSelected ? (
                              <CheckSquare className="h-5 w-5 text-indigo-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {elevator.kimlikNo || `ELEV-${elevator.id}`}
                              </div>
                              <div className="text-xs text-muted-foreground">{elevator.adres}</div>
                              {hasPlan && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  Bu ay planlanmış
                                </Badge>
                              )}
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

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Kurallar</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Her asansör ayda sadece bir kez planlanabilir</li>
                    <li>Bina seçildiğinde diğer binalardan seçimler kaldırılır</li>
                    <li>Planlanmış asansörler gri görünür</li>
                    <li>Bakım tamamlama için QR kod gerekir</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </CardTitle>
                  <CardDescription>Bakım planlaması takvimi</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                    disabled={plansLoading}
                  >
                    ← Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                    disabled={plansLoading}
                  >
                    Bugün
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                    disabled={plansLoading}
                  >
                    Sonraki →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Yükleniyor...</div>
                </div>
              ) : (
                <>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day Headers */}
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-semibold text-gray-600 py-2"
                      >
                        {day}
                      </div>
                    ))}

                    {/* Calendar Days */}
                    {getDaysInMonth().map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} className="h-24" />
                      }

                      const isToday = date.toDateString() === new Date().toDateString()
                      const plans = getPlansForDate(date)
                      const isPast = date < new Date() && !isToday
                      const isDisabled = isDateDisabled(date) || isPast
                      const hasPlanned = plans.some((p) => p.status === 'PLANNED')
                      const hasCompleted = plans.some((p) => p.status === 'COMPLETED')

                      return (
                        <div
                          key={date.toISOString()}
                          className={cn(
                            'h-24 border rounded-lg p-2 transition-all',
                            isPast && 'bg-gray-50 opacity-50',
                            isToday && 'border-indigo-500 border-2',
                            hasPlanned && !hasCompleted && 'bg-indigo-50 border-indigo-300',
                            hasCompleted && 'bg-green-50 border-green-300',
                            isDisabled && !isPast && 'cursor-not-allowed opacity-60',
                            !isDisabled && !isPast && 'cursor-pointer hover:shadow-md'
                          )}
                          onClick={() => !isDisabled && handleDayClick(date)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                isToday && 'text-indigo-600 font-bold'
                              )}
                            >
                              {date.getDate()}
                            </span>
                            {plans.length > 0 && (
                              <Badge
                                variant={hasCompleted ? 'completed' : 'pending'}
                                className="h-5 px-1.5 text-xs"
                              >
                                {plans.length}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            {plans.slice(0, 2).map((plan) => (
                              <div
                                key={plan.id}
                                className="text-xs truncate flex items-center gap-1"
                                title={`${plan.elevatorCode || plan.elevatorName || `ELEV-${plan.elevatorId}`} - ${plan.status === 'COMPLETED' ? 'Tamamlandı' : 'Planlandı'}`}
                              >
                                {plan.status === 'COMPLETED' ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                                ) : (
                                  <CalendarIcon className="h-3 w-3 text-indigo-600 flex-shrink-0" />
                                )}
                                <span className="truncate">
                                  {plan.elevatorCode || plan.elevatorName || `ELEV-${plan.elevatorId}`}
                                </span>
                              </div>
                            ))}
                            {plans.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{plans.length - 2} daha
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border-2 border-indigo-500 bg-indigo-50" />
                      <span>Planlandı</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50" />
                      <span>Tamamlandı</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-gray-300 bg-gray-50 opacity-50" />
                      <span>Geçmiş</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Existing Plans List */}
          {existingPlans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Planlanan Bakımlar</CardTitle>
                <CardDescription>
                  {currentMonth.getFullYear()} {monthNames[currentMonth.getMonth()]} ayı planları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {existingPlans
                    .filter((p) => p.status !== 'CANCELLED')
                    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                    .map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {plan.elevatorCode || plan.elevatorName || `ELEV-${plan.elevatorId}`}
                            </span>
                            <Badge
                              variant={plan.status === 'COMPLETED' ? 'completed' : 'pending'}
                            >
                              {plan.status === 'COMPLETED' ? 'Tamamlandı' : 'Planlandı'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {plan.buildingName && `${plan.buildingName} • `}
                            {new Date(plan.scheduledDate).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                            {plan.completedDate &&
                              ` • Tamamlandı: ${new Date(plan.completedDate).toLocaleDateString('tr-TR')}`}
                          </div>
                        </div>
                        {plan.status === 'PLANNED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteWithQR(plan)}
                            className="ml-4"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            QR ile Tamamla
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Kod ile Bakım Tamamla</DialogTitle>
            <DialogDescription>
              Bakımı tamamlamak için QR kodunu girin veya tarayın
            </DialogDescription>
          </DialogHeader>
          {selectedPlanForQR && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium mb-1">Asansör</div>
                <div className="text-lg">
                  {selectedPlanForQR.elevatorCode ||
                    selectedPlanForQR.elevatorName ||
                    `ELEV-${selectedPlanForQR.elevatorId}`}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Planlanan Tarih:{' '}
                  {new Date(selectedPlanForQR.scheduledDate).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qrCode">QR Kod</Label>
                <Input
                  id="qrCode"
                  placeholder="QR kodunu girin veya tarayın"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQRSubmit()
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Mobil cihazınızın kamerasını kullanarak QR kodu tarayabilirsiniz
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={handleQRSubmit}
              disabled={!qrCode.trim() || completeWithQRMutation.isPending}
            >
              {completeWithQRMutation.isPending ? 'Tamamlanıyor...' : 'Tamamla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
