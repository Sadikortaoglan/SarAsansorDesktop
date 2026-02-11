import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, QrCode, CheckCircle2, Clock, X, Edit, Eye, Play, FileText } from 'lucide-react'
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
import { useToast } from '@/components/ui/use-toast'
import { formatElevatorDisplayName } from '@/lib/elevator-format'
import { formatDateForAPI } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  // Filter plans by selected status
  const filteredPlans = allPlans.filter((plan) => {
    if (selectedStatus === 'ALL') return plan.status !== 'CANCELLED'
    return plan.status === selectedStatus
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
      setQrDialogOpen(false)
      setQrCode('')
      setSelectedPlan(null)
      toast({
        title: 'Başarılı',
        description: 'Bakım başlatıldı',
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

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: number) => maintenancePlanService.update(id, { status: 'CANCELLED' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
      toast({
        title: 'Başarılı',
        description: 'Bakım iptal edildi',
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
    if (confirm('Bu bakımı iptal etmek istediğinize emin misiniz?')) {
      cancelMutation.mutate(plan.id)
    }
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
    if (status === 'ALL') {
      return allPlans.filter((p) => p.status !== 'CANCELLED').length
    }
    return allPlans.filter((p) => p.status === status).length
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Premium Page Header */}
      <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">Bakım Yönetimi</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Tüm bakım planlarını görüntüleyin ve yönetin
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Status Tabs */}
        <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as StatusFilter)}>
          <TabsList className="grid w-full max-w-md grid-cols-4 bg-[#F3F4F6] p-1 rounded-lg">
            <TabsTrigger
              value="ALL"
              className={cn(
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'flex items-center gap-2'
              )}
            >
              Tümü
              <Badge variant="outline" className="ml-1">
                {getStatusCount('ALL')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="PLANNED"
              className={cn(
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'flex items-center gap-2'
              )}
            >
              Planlandı
              <Badge variant="outline" className="ml-1">
                {getStatusCount('PLANNED')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="IN_PROGRESS"
              className={cn(
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'flex items-center gap-2'
              )}
            >
              Devam Ediyor
              <Badge variant="outline" className="ml-1">
                {getStatusCount('IN_PROGRESS')}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="COMPLETED"
              className={cn(
                'data-[state=active]:bg-white data-[state=active]:shadow-sm',
                'flex items-center gap-2'
              )}
            >
              Tamamlandı
              <Badge variant="outline" className="ml-1">
                {getStatusCount('COMPLETED')}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedStatus} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[#6B7280]">Yükleniyor...</div>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-[#F3F4F6] rounded-full mb-4">
                  <FileText className="h-8 w-8 text-[#9CA3AF]" />
                </div>
                <p className="text-lg font-semibold text-[#111827] mb-1">Sonuç bulunamadı</p>
                <p className="text-sm text-[#6B7280] max-w-md">
                  {selectedStatus === 'ALL'
                    ? 'Bakım planı bulunmamaktadır.'
                    : `${selectedStatus === 'PLANNED' ? 'Planlanmış' : selectedStatus === 'IN_PROGRESS' ? 'Devam eden' : 'Tamamlanmış'} bakım planı bulunmamaktadır.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-[#111827] mb-1">
                              🛗 {displayInfo.fullName}
                            </CardTitle>
                            <p className="text-sm text-[#6B7280]">{plan.buildingName || elevator?.bina || '-'}</p>
                          </div>
                          {getStatusBadge(plan.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
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

      {/* QR Scanner Modal (for Start) */}
      <Dialog open={qrDialogOpen && !completeDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl border border-[#E5E7EB] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827]">QR Kod ile Bakım Başlat</DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Bakımı başlatmak için QR kodunu girin veya tarayın
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
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
                      <div className="text-sm font-medium text-[#6B7280] mb-1">Asansör</div>
                      <div className="text-lg font-bold text-[#111827] mb-2">
                        🛗 {displayInfo.fullName}
                      </div>
                      <div className="text-sm text-[#6B7280]">
                        <div>
                          <span className="font-medium">Planlanan Tarih:</span>{' '}
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
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setQrDialogOpen(false)
                setQrCode('')
                setSelectedPlan(null)
              }}
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              İptal
            </Button>
            <Button
              onClick={handleQRSubmit}
              disabled={!qrCode.trim() || startMaintenanceMutation.isPending}
              className="bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white hover:from-[#4338CA] hover:to-[#3730A3] shadow-md"
            >
              {startMaintenanceMutation.isPending ? 'Başlatılıyor...' : 'Başlat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-xl border border-[#E5E7EB] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827]">Bakım Tarihini Değiştir</DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Yeni planlanan tarihi seçin
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
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
                    <div className="text-sm text-[#6B7280]">
                      <div className="font-medium mb-1">Asansör:</div>
                      <div className="font-bold text-[#111827]">🛗 {displayInfo.fullName}</div>
                    </div>
                  )
                })()}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rescheduleDate" className="text-sm font-medium text-[#111827]">
                  Yeni Planlanan Tarih
                </Label>
                <Input
                  id="rescheduleDate"
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="h-11 border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleDialogOpen(false)
                setRescheduleDate('')
                setSelectedPlan(null)
              }}
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
            >
              İptal
            </Button>
            <Button
              onClick={handleRescheduleSubmit}
              disabled={!rescheduleDate || rescheduleMutation.isPending}
              className="bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white hover:from-[#4338CA] hover:to-[#3730A3] shadow-md"
            >
              {rescheduleMutation.isPending ? 'Güncelleniyor...' : 'Tarihi Güncelle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Maintenance Modal */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-xl border border-[#E5E7EB] shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#111827]">Bakımı Tamamla</DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280]">
              Bakım bilgilerini doldurun ve QR kodunu girin
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
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
                      <div className="text-sm font-medium text-[#6B7280] mb-1">Asansör</div>
                      <div className="text-lg font-bold text-[#111827] mb-2">
                        🛗 {displayInfo.fullName}
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="completeNote" className="text-sm font-medium text-[#111827]">
                  Not
                </Label>
                <Textarea
                  id="completeNote"
                  value={completeNote}
                  onChange={(e) => setCompleteNote(e.target.value)}
                  placeholder="Bakım hakkında notlar..."
                  className="min-h-[100px] border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completePrice" className="text-sm font-medium text-[#111827]">
                  Ücret (₺)
                </Label>
                <Input
                  id="completePrice"
                  type="number"
                  value={completePrice}
                  onChange={(e) => setCompletePrice(e.target.value)}
                  placeholder="0.00"
                  className="h-11 border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="completePhotos" className="text-sm font-medium text-[#111827]">
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
                  className="h-11 border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
                {completePhotos.length > 0 && (
                  <p className="text-xs text-[#6B7280]">
                    Seçilen fotoğraf sayısı: {completePhotos.length} / 4 (minimum)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="completeQRCode" className="text-sm font-medium text-[#111827]">
                  QR Kod *
                </Label>
                <Input
                  id="completeQRCode"
                  placeholder="QR kodunu girin veya tarayın"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="h-11 border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
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
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
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
              className="bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white hover:from-[#15803D] hover:to-[#166534] shadow-md"
            >
              {completeMutation.isPending ? 'Tamamlanıyor...' : 'Tamamla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
