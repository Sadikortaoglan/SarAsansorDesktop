import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, QrCode, CheckCircle2, Clock, X, Edit, Eye, Play, FileText, Search, Filter } from 'lucide-react'
import { maintenancePlanService, type MaintenancePlan } from '@/services/maintenance-plan.service'
import { maintenanceExecutionService } from '@/services/maintenance-execution.service'
import { elevatorService } from '@/services/elevator.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatElevatorDisplayName } from '@/lib/elevator-format'
import { formatDateForAPI } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type StatusFilter = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL'

export function MaintenancePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('ALL')
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null)
  
  // Modal states
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completeNote, setCompleteNote] = useState('')
  const [completePrice, setCompletePrice] = useState('')
  const [completePhotos, setCompletePhotos] = useState<File[]>([])
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [planToCancel, setPlanToCancel] = useState<MaintenancePlan | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedElevatorId, setSelectedElevatorId] = useState<number | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Fetch elevators for display
  const { data: elevators = [] } = useQuery({
    queryKey: ['elevators', 'for-maintenance'],
    queryFn: () => elevatorService.getAll(),
  })

  // Fetch all maintenance plans
  const { data: allPlans = [], isLoading, error } = useQuery({
    queryKey: ['maintenance-plans', 'all'],
    queryFn: async () => {
      console.log('🔍 MAINTENANCE PAGE - Fetching all plans')
      const result = await maintenancePlanService.getAll()
      console.log('📥 MAINTENANCE PAGE - Raw response:', result)
      return result
    },
  })

  // Filter plans by selected status and filters - Exclude CANCELLED and NOT_PLANNED
  const filteredPlans = allPlans.filter((plan) => {
    // Always exclude cancelled and not planned plans
    if (plan.status === 'CANCELLED' || plan.status === 'NOT_PLANNED') return false
    
    // Status filter
    if (selectedStatus !== 'ALL' && plan.status !== selectedStatus) return false
    
    // Elevator filter
    if (selectedElevatorId && plan.elevatorId !== selectedElevatorId) return false
    
    // Search term filter (elevator name, building, code)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const elevator = elevators.find((e) => e.id === plan.elevatorId)
      const displayInfo = formatElevatorDisplayName(
        elevator || {
          kimlikNo: plan.elevatorCode || plan.elevatorName || '',
          bina: plan.buildingName || '',
          adres: undefined,
        }
      )
      
      const searchableText = [
        displayInfo.fullName,
        displayInfo.technicalCode,
        plan.buildingName,
        plan.elevatorCode,
        plan.elevatorName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      
      if (!searchableText.includes(searchLower)) return false
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      const planDate = new Date(plan.scheduledDate)
      planDate.setHours(0, 0, 0, 0)
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (planDate < fromDate) return false
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (planDate > toDate) return false
      }
    }
    
    return true
  })

  // Log state after query
  useEffect(() => {
    console.log('📊 MAINTENANCE PAGE - State after query:', {
      allPlansCount: allPlans.length,
      filteredPlansCount: filteredPlans.length,
      selectedStatus,
      plans: filteredPlans,
    })
  }, [allPlans, filteredPlans, selectedStatus])

  // Start maintenance mutation (with QR)
  const startMaintenanceMutation = useMutation({
    mutationFn: async ({ planId, qrCode }: { planId: number; qrCode: string }) => {
      console.log('🔍 START MAINTENANCE - Plan ID:', planId, 'QR Code:', qrCode)
      
      // First validate QR code
      const validation = await maintenanceExecutionService.validateQRToken(qrCode)
      console.log('📥 QR VALIDATION RESULT:', validation)
      
      if (!validation.valid || validation.taskId !== planId) {
        throw new Error(validation.error || 'Geçersiz QR kodu')
      }
      
      // Then start execution - this will change plan status to IN_PROGRESS
      console.log('🚀 STARTING EXECUTION - Task ID:', planId)
      const execution = await maintenanceExecutionService.start({ taskId: planId })
      console.log('📥 EXECUTION STARTED:', execution)
      
      return execution
    },
    onSuccess: async () => {
      // Invalidate and refetch to get updated status
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ queryKey: ['maintenance-plans', 'all'] })
      
      // Close QR modal and open Complete modal
      setQrDialogOpen(false)
      setCompleteDialogOpen(true)
      // Keep qrCode and selectedPlan for Complete modal
      
      toast({
        title: 'Başarılı',
        description: 'Bakım başlatıldı. Şimdi bakım bilgilerini doldurun.',
      })
    },
    onError: (error: any) => {
      console.error('❌ START MAINTENANCE ERROR:', error)
      toast({
        title: 'Hata',
        description: error.message || 'Bakım başlatılamadı',
        variant: 'destructive',
      })
    },
  })

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, plannedDate }: { id: number; plannedDate: string }) =>
      maintenancePlanService.reschedule(id, { plannedDate }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      setRescheduleDialogOpen(false)
      setRescheduleDate('')
      setSelectedPlan(null)
      toast({
        title: 'Başarılı',
        description: 'Bakım tarihi güncellendi',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım tarihi güncellenemedi',
        variant: 'destructive',
      })
    },
  })

  // Cancel mutation - Use DELETE endpoint
  const cancelMutation = useMutation({
    mutationFn: (id: number) => maintenancePlanService.delete(id),
    onSuccess: async () => {
      // Immediately refetch from backend - no optimistic updates
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      await queryClient.refetchQueries({ queryKey: ['maintenance-plans', 'all'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'counts'] })
      
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
        description: error.response?.data?.message || 'Bakım iptal edilemedi',
        variant: 'destructive',
      })
    },
  })

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async ({ id, qrCode }: { id: number; qrCode: string }) => {
      // TODO: Implement complete with maintenance form data
      // For now, use existing completeWithQR endpoint
      return maintenancePlanService.completeWithQR(id, qrCode)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      setCompleteDialogOpen(false)
      setCompleteNote('')
      setCompletePrice('')
      setCompletePhotos([])
      setSelectedPlan(null)
      toast({
        title: 'Başarılı',
        description: 'Bakım tamamlandı',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'Bakım tamamlanamadı',
        variant: 'destructive',
      })
    },
  })

  const handleStart = (plan: MaintenancePlan) => {
    setSelectedPlan(plan)
    setQrCode('')
    setQrDialogOpen(true)
  }

  const handleReschedule = (plan: MaintenancePlan) => {
    setSelectedPlan(plan)
    setRescheduleDate(plan.scheduledDate)
    setRescheduleDialogOpen(true)
  }

  const handleCancel = (plan: MaintenancePlan) => {
    setPlanToCancel(plan)
    setCancelConfirmOpen(true)
  }

  const handleCancelConfirm = () => {
    if (!planToCancel) return
    cancelMutation.mutate(planToCancel.id)
  }

  const handleComplete = (plan: MaintenancePlan) => {
    setSelectedPlan(plan)
    setCompleteNote('')
    setCompletePrice('')
    setCompletePhotos([])
    setCompleteDialogOpen(true)
  }

  const handleQRSubmit = () => {
    if (!selectedPlan || !qrCode.trim()) {
      toast({
        title: 'Hata',
        description: 'Lütfen QR kodunu girin',
        variant: 'destructive',
      })
      return
    }

    if (completeDialogOpen) {
      completeMutation.mutate({ id: selectedPlan.id, qrCode: qrCode.trim() })
    } else {
      startMaintenanceMutation.mutate({ planId: selectedPlan.id, qrCode: qrCode.trim() })
    }
  }

  const handleRescheduleSubmit = () => {
    if (!selectedPlan || !rescheduleDate) {
      toast({
        title: 'Hata',
        description: 'Lütfen tarih seçin',
        variant: 'destructive',
      })
      return
    }

    rescheduleMutation.mutate({ id: selectedPlan.id, plannedDate: rescheduleDate })
  }

  const getStatusBadge = (status: MaintenancePlan['status']) => {
    switch (status) {
      case 'PLANNED':
        return <Badge variant="planned" className="text-xs">Planlandı</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="inProgress" className="text-xs">Devam Ediyor</Badge>
      case 'COMPLETED':
        return <Badge variant="completed" className="text-xs">Tamamlandı</Badge>
      default:
        return null
    }
  }

  const getStatusCount = (status: StatusFilter) => {
    // Apply same filters as filteredPlans but only for status
    const baseFiltered = allPlans.filter((plan) => {
      if (plan.status === 'CANCELLED' || plan.status === 'NOT_PLANNED') return false
      
      // Elevator filter
      if (selectedElevatorId && plan.elevatorId !== selectedElevatorId) return false
      
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const elevator = elevators.find((e) => e.id === plan.elevatorId)
        const displayInfo = formatElevatorDisplayName(
          elevator || {
            kimlikNo: plan.elevatorCode || plan.elevatorName || '',
            bina: plan.buildingName || '',
            adres: undefined,
          }
        )
        
        const searchableText = [
          displayInfo.fullName,
          displayInfo.technicalCode,
          plan.buildingName,
          plan.elevatorCode,
          plan.elevatorName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        
        if (!searchableText.includes(searchLower)) return false
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        const planDate = new Date(plan.scheduledDate)
        planDate.setHours(0, 0, 0, 0)
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          if (planDate < fromDate) return false
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59, 999)
          if (planDate > toDate) return false
        }
      }
      
      return true
    })
    
    if (status === 'ALL') {
      return baseFiltered.length
    }
    return baseFiltered.filter((p) => p.status === status).length
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Corporate Page Header */}
      <div className="bg-gradient-to-b from-indigo-50/50 to-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#111827] mb-2">Bakım Yönetimi</h1>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                Tüm bakım planlarını görüntüleyin, yönetin ve takip edin.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Status Tabs */}
            <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as StatusFilter)}>
          <TabsList className="flex w-full max-w-2xl bg-[#F3F4F6] p-2 gap-3 rounded-xl shadow-sm">
            <TabsTrigger
              value="ALL"
              className={cn(
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'flex items-center justify-center gap-2 h-11 px-4 transition-all duration-200 flex-1'
              )}
            >
              <span className="text-sm font-medium">Tümü</span>
              <Badge 
                variant="outline" 
                className="ml-1 min-w-[28px] h-5 flex items-center justify-center px-2 rounded-full text-[11px] font-semibold transition-all duration-200"
              >
                {getStatusCount('ALL')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="PLANNED"
              className={cn(
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'flex items-center justify-center gap-2 h-11 px-4 transition-all duration-200 flex-1'
              )}
            >
              <span className="text-sm font-medium">Planlandı</span>
              <Badge 
                variant="outline" 
                className="ml-1 min-w-[28px] h-5 flex items-center justify-center px-2 rounded-full text-[11px] font-semibold transition-all duration-200"
              >
                {getStatusCount('PLANNED')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="IN_PROGRESS"
              className={cn(
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'flex items-center justify-center gap-2 h-11 px-4 transition-all duration-200 flex-1'
              )}
            >
              <span className="text-sm font-medium">Devam Ediyor</span>
              <Badge 
                variant="outline" 
                className="ml-1 min-w-[28px] h-5 flex items-center justify-center px-2 rounded-full text-[11px] font-semibold transition-all duration-200"
              >
                {getStatusCount('IN_PROGRESS')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="COMPLETED"
              className={cn(
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'flex items-center justify-center gap-2 h-11 px-4 transition-all duration-200 flex-1'
              )}
            >
              <span className="text-sm font-medium">Tamamlandı</span>
              <Badge 
                variant="outline" 
                className="ml-1 min-w-[28px] h-5 flex items-center justify-center px-2 rounded-full text-[11px] font-semibold transition-all duration-200"
              >
                {getStatusCount('COMPLETED')}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedStatus} className="mt-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-[#6B7280] text-sm font-medium">Yükleniyor...</div>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="p-5 bg-[#F3F4F6] rounded-full mb-5 shadow-sm">
                  <FileText className="h-10 w-10 text-[#9CA3AF]" />
                </div>
                <p className="text-lg font-semibold text-[#111827] mb-2">Sonuç bulunamadı</p>
                <p className="text-sm text-[#6B7280] max-w-md leading-relaxed">
                  {selectedStatus === 'ALL'
                    ? 'Bakım planı bulunmamaktadır.'
                    : `${selectedStatus === 'PLANNED' ? 'Planlanmış' : selectedStatus === 'IN_PROGRESS' ? 'Devam eden' : 'Tamamlanmış'} bakım planı bulunmamaktadır.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => {
                  const elevator = elevators.find((e) => e.id === plan.elevatorId)
                  const displayInfo = formatElevatorDisplayName(
                    elevator || {
                      kimlikNo: plan.elevatorCode || plan.elevatorName,
                      bina: plan.buildingName,
                      adres: undefined,
                    }
                  )

                  return (
                    <Card
                      key={plan.id}
                      className="bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-xl hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-200"
                    >
                      <CardHeader className="pb-4 bg-white border-b border-[#E5E7EB]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-bold text-[#111827] mb-1.5">
                              🛗 {displayInfo.fullName}
                            </CardTitle>
                            <p className="text-sm text-[#6B7280] truncate">{plan.buildingName || elevator?.bina || '-'}</p>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(plan.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-[#6B7280]">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Planlanan: {new Date(plan.scheduledDate).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          {plan.completedDate && (
                            <div className="flex items-center gap-2 text-[#16A34A]">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                Tamamlandı: {new Date(plan.completedDate).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          )}
                          {plan.note && (
                            <div className="text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
                              <p className="font-medium mb-1">Not:</p>
                              <p className="text-xs">{plan.note}</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E7EB]">
                          {plan.status === 'PLANNED' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReschedule(plan)}
                                className="flex-1 min-w-[100px]"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Tarih Değiştir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(plan)}
                                className="flex-1 min-w-[100px] text-[#DC2626] hover:text-[#DC2626]"
                              >
                                <X className="h-4 w-4 mr-1" />
                                İptal Et
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleStart(plan)}
                                className="flex-1 min-w-[100px] bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Başlat
                              </Button>
                            </>
                          )}
                          {plan.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              onClick={() => handleComplete(plan)}
                              className="w-full bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Bakımı Tamamla
                            </Button>
                          )}
                          {plan.status === 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                toast({
                                  title: 'Detay',
                                  description: `Bakım Planı ID: ${plan.id}`,
                                })
                              }}
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detayları Gör
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
          </div>

          {/* Filter Panel - Right Side */}
          <div className="lg:col-span-1">
            <Card className="bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)] rounded-xl sticky top-8">
              <CardHeader className="pb-4 bg-white border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-[#4F46E5]" />
                  <CardTitle className="text-lg font-bold text-[#111827]">Filtreler</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {/* Search Input */}
                <div className="space-y-2">
                  <Label htmlFor="search">Asansör Ara</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                    <Input
                      id="search"
                      placeholder="Asansör, bina veya kod ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Elevator Select */}
                <div className="space-y-2">
                  <Label htmlFor="elevator">Asansör Seç</Label>
                  <Select
                    value={selectedElevatorId ? String(selectedElevatorId) : 'all'}
                    onValueChange={(value) => setSelectedElevatorId(value === 'all' ? null : Number(value))}
                  >
                    <SelectTrigger className="h-[44px] bg-white border-[#D1D5DB] rounded-[8px]">
                      <SelectValue placeholder="Tüm asansörler" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm asansörler</SelectItem>
                      {elevators.map((elevator) => {
                        const displayInfo = formatElevatorDisplayName(elevator)
                        return (
                          <SelectItem key={elevator.id} value={String(elevator.id)}>
                            {displayInfo.fullName}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Başlangıç Tarihi</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label htmlFor="dateTo">Bitiş Tarihi</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                  />
                </div>

                {/* Clear Filters Button */}
                {(searchTerm || selectedElevatorId || dateFrom || dateTo) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedElevatorId(null)
                      setDateFrom('')
                      setDateTo('')
                    }}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Filtreleri Temizle
                  </Button>
                )}

                {/* Results Count */}
                <div className="pt-4 border-t border-[#E5E7EB]">
                  <p className="text-sm text-[#6B7280]">
                    <span className="font-semibold text-[#111827]">{filteredPlans.length}</span> sonuç bulundu
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal (for Start) */}
      <Dialog open={qrDialogOpen && !completeDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setQrDialogOpen(false)
          setQrCode('')
          setSelectedPlan(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Kod ile Bakım Başlat</DialogTitle>
            <DialogDescription>
              Bakımı başlatmak için QR kodunu girin veya tarayın
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                {(() => {
                  const elevator = elevators.find((e) => e.id === selectedPlan.elevatorId)
                  const displayInfo = formatElevatorDisplayName(
                    elevator || {
                      kimlikNo: selectedPlan.elevatorCode || selectedPlan.elevatorName,
                      bina: selectedPlan.buildingName,
                      adres: undefined,
                    }
                  )
                  return (
                    <>
                      <div className="text-[13px] font-semibold text-[#6B7280] mb-1">Asansör</div>
                      <div className="text-base font-bold text-[#111827] mb-2">
                        🛗 {displayInfo.fullName}
                      </div>
                      <div className="text-[13px] text-[#6B7280]">
                        <div>
                          <span className="font-semibold">Planlanan Tarih:</span>{' '}
                          {new Date(selectedPlan.scheduledDate).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </>
                  )
                })()}
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
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQrDialogOpen(false)
                setQrCode('')
                setSelectedPlan(null)
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleQRSubmit}
              disabled={!qrCode.trim() || startMaintenanceMutation.isPending}
            >
              {startMaintenanceMutation.isPending ? 'Başlatılıyor...' : 'Başlat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setRescheduleDialogOpen(false)
          setRescheduleDate('')
          setSelectedPlan(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bakım Tarihini Değiştir</DialogTitle>
            <DialogDescription>
              Yeni planlanan tarihi seçin
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                {(() => {
                  const elevator = elevators.find((e) => e.id === selectedPlan.elevatorId)
                  const displayInfo = formatElevatorDisplayName(
                    elevator || {
                      kimlikNo: selectedPlan.elevatorCode || selectedPlan.elevatorName,
                      bina: selectedPlan.buildingName,
                      adres: undefined,
                    }
                  )
                  return (
                    <div className="text-[13px] text-[#6B7280]">
                      <div className="font-semibold mb-1">Asansör:</div>
                      <div className="font-bold text-[#111827]">🛗 {displayInfo.fullName}</div>
                    </div>
                  )
                })()}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rescheduleDate">
                  Yeni Planlanan Tarih
                </Label>
                <Input
                  id="rescheduleDate"
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleDialogOpen(false)
                setRescheduleDate('')
                setSelectedPlan(null)
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleRescheduleSubmit}
              disabled={!rescheduleDate || rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? 'Güncelleniyor...' : 'Tarihi Güncelle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Maintenance Modal */}
      <Dialog open={completeDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCompleteDialogOpen(false)
          setCompleteNote('')
          setCompletePrice('')
          setCompletePhotos([])
          setQrCode('')
          setSelectedPlan(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bakımı Tamamla</DialogTitle>
            <DialogDescription>
              Bakım bilgilerini doldurun ve QR kodunu girin
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB]">
                {(() => {
                  const elevator = elevators.find((e) => e.id === selectedPlan.elevatorId)
                  const displayInfo = formatElevatorDisplayName(
                    elevator || {
                      kimlikNo: selectedPlan.elevatorCode || selectedPlan.elevatorName,
                      bina: selectedPlan.buildingName,
                      adres: undefined,
                    }
                  )
                  return (
                    <>
                      <div className="text-[13px] font-semibold text-[#6B7280] mb-1">Asansör</div>
                      <div className="text-base font-bold text-[#111827] mb-2">
                        🛗 {displayInfo.fullName}
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="completeNote">
                  Not
                </Label>
                <Textarea
                  id="completeNote"
                  value={completeNote}
                  onChange={(e) => setCompleteNote(e.target.value)}
                  placeholder="Bakım hakkında notlar..."
                  className="min-h-[100px] rounded-[8px] border-[#D1D5DB] focus:border-[#4F46E5] focus:ring-[3px] focus:ring-[#4F46E5]/15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completePrice">
                  Ücret (₺)
                </Label>
                <Input
                  id="completePrice"
                  type="number"
                  value={completePrice}
                  onChange={(e) => setCompletePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completePhotos">
                  Fotoğraflar * (Minimum 4 adet)
                </Label>
                <Input
                  id="completePhotos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setCompletePhotos(files)
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className={cn(
                    "text-[13px]",
                    completePhotos.length < 4 ? "text-[#DC2626]" : "text-[#16A34A]"
                  )}>
                    Seçilen: {completePhotos.length} / 4 (minimum)
                  </p>
                  {completePhotos.length < 4 && (
                    <span className="text-[12px] text-[#DC2626] font-medium">
                      En az 4 fotoğraf gerekli
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="completeQRCode">
                  QR Kod *
                </Label>
                <Input
                  id="completeQRCode"
                  placeholder="QR kodunu girin veya tarayın"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompleteDialogOpen(false)
                setCompleteNote('')
                setCompletePrice('')
                setCompletePhotos([])
                setQrCode('')
                setSelectedPlan(null)
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleQRSubmit}
              disabled={
                !qrCode.trim() ||
                completePhotos.length < 4 ||
                completeMutation.isPending
              }
              className="bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white hover:from-[#15803D] hover:to-[#166534]"
            >
              {completeMutation.isPending ? 'Tamamlanıyor...' : 'Tamamla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Bakım Planını İptal Et"
        message="Bu bakım planını iptal etmek istediğinize emin misiniz? İptal edilen planlar listeden kaldırılacaktır."
        confirmText="İptal Et"
        cancelText="Vazgeç"
        onConfirm={handleCancelConfirm}
        variant="destructive"
      />
    </div>
  )
}
