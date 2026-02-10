import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { elevatorService, type Elevator, type LabelType as ElevatorLabelType } from '@/services/elevator.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, Edit, Trash2, Search, Wrench, X } from 'lucide-react'
import { formatDateShort, cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { maintenanceService, type LabelType } from '@/services/maintenance.service'
import { useAuth } from '@/contexts/AuthContext'

export function ElevatorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false)
  const [selectedElevator, setSelectedElevator] = useState<Elevator | null>(null)
  const [elevatorForMaintenance, setElevatorForMaintenance] = useState<Elevator | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [elevatorToDelete, setElevatorToDelete] = useState<number | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: elevators, isLoading } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => elevatorService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      toast({
        title: 'Başarılı',
        description: 'Asansör başarıyla silindi.',
        variant: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Asansör silinirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const elevatorsArray = Array.isArray(elevators) ? elevators : []
  const filteredElevators = elevatorsArray.filter((elevator) => {
    const matchesSearch =
      elevator.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.bina?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.adres?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && elevator.durum !== 'EXPIRED') ||
      (statusFilter === 'expired' && elevator.durum === 'EXPIRED')
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return <Badge variant="expired">Süresi Geçti</Badge>
      case 'WARNING':
        return <Badge variant="warning">Uyarı</Badge>
      case 'OK':
      case 'ACTIVE':
        return <Badge variant="success">Aktif</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getLabelTypeBadge = (labelType?: string) => {
    if (!labelType) return <Badge variant="secondary">—</Badge>
    switch (labelType.toUpperCase()) {
      case 'GREEN':
        return <Badge variant="success">Yeşil</Badge>
      case 'BLUE':
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">Mavi</Badge>
      case 'YELLOW':
        return <Badge variant="warning">Sarı</Badge>
      case 'RED':
        return <Badge variant="expired">Kırmızı</Badge>
      default:
        return <Badge variant="secondary">{labelType}</Badge>
    }
  }

  const handleDelete = (id: number) => {
    setElevatorToDelete(id)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (elevatorToDelete !== null) {
      deleteMutation.mutate(elevatorToDelete)
      setElevatorToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asansörler</h1>
          <p className="text-muted-foreground">Tüm asansörlerin listesi</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedElevator(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Asansör Ekle
            </Button>
          </DialogTrigger>
          <ElevatorFormDialog
            elevator={selectedElevator}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
            }}
          />
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kimlik No, Bina veya Adres ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Durum Filtresi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="expired">Süresi Geçmiş</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TableResponsive
          data={filteredElevators.map((elevator) => {
                  if (!elevator.durum) {
                    const today = new Date()
                    const bitisTarihi = new Date(elevator.bitisTarihi)
                    const daysUntilExpiry = Math.ceil((bitisTarihi.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    if (daysUntilExpiry < 0) {
                      elevator.durum = 'EXPIRED'
                    } else if (daysUntilExpiry <= 30) {
                      elevator.durum = 'WARNING'
                    } else {
                      elevator.durum = 'OK'
                    }
                  }
            return elevator
          })}
          columns={[
            {
              key: 'kimlikNo',
              header: 'Kimlik No',
              mobileLabel: 'Kimlik No',
              mobilePriority: 10,
              render: (elevator: Elevator) => <span className="font-medium">{elevator.kimlikNo}</span>,
            },
            {
              key: 'bina',
              header: 'Bina',
              mobileLabel: 'Bina',
              mobilePriority: 9,
            },
            {
              key: 'adres',
              header: 'Adres',
              mobileLabel: 'Adres',
              mobilePriority: 8,
              hideOnMobile: true,
            },
            {
              key: 'durak',
              header: 'Durak Sayısı',
              mobileLabel: 'Durak',
              mobilePriority: 7,
              hideOnMobile: true,
            },
            {
              key: 'labelType',
              header: 'Etiket Tipi',
              mobileLabel: 'Etiket',
              mobilePriority: 6,
              render: (elevator: Elevator) => getLabelTypeBadge(elevator.labelType),
            },
            {
              key: 'labelDate',
              header: 'Etiket Tarihi',
              mobileLabel: 'Etiket Tarihi',
              mobilePriority: 5,
              hideOnMobile: true,
              render: (elevator: Elevator) => elevator.labelDate ? formatDateShort(elevator.labelDate) : formatDateShort(elevator.maviEtiketTarihi),
            },
            {
              key: 'bitisTarihi',
              header: 'Bitiş Tarihi',
              mobileLabel: 'Bitiş Tarihi',
              mobilePriority: 4,
              render: (elevator: Elevator) => formatDateShort(elevator.bitisTarihi),
            },
            {
              key: 'durum',
              header: 'Durum',
              mobileLabel: 'Durum',
              mobilePriority: 4,
              render: (elevator: Elevator) => getStatusBadge(elevator.durum || 'OK'),
            },
            {
              key: 'actions',
              header: 'İşlemler',
              mobileLabel: '',
              mobilePriority: 1,
              hideOnMobile: false,
              render: (elevator: Elevator) => (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setElevatorForMaintenance(elevator)
                            setIsMaintenanceDialogOpen(true)
                          }}
                          className="h-11 w-11 sm:h-10 sm:w-10"
                          title="Bakım Ekle"
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/elevators/${elevator.id}`)}
                          className="h-11 w-11 sm:h-10 sm:w-10"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                    onClick={async () => {
                      try {
                        const freshElevator = await elevatorService.getById(elevator.id)
                        setSelectedElevator(freshElevator)
                            setIsDialogOpen(true)
                      } catch (error) {
                        toast({
                          title: 'Hata',
                          description: 'Asansör bilgileri yüklenirken bir hata oluştu.',
                          variant: 'destructive',
                        })
                      }
                    }}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(elevator.id)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
              ),
            },
          ]}
          keyExtractor={(elevator) => String(elevator.id)}
          emptyMessage="Asansör bulunamadı"
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Asansörü Sil"
        message="Bu asansörü silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <MaintenanceFormDialog
          elevator={elevatorForMaintenance}
          onClose={() => {
            setIsMaintenanceDialogOpen(false)
            setElevatorForMaintenance(null)
          }}
          onSuccess={() => {
            setIsMaintenanceDialogOpen(false)
            setElevatorForMaintenance(null)
            queryClient.invalidateQueries({ queryKey: ['elevators'] })
            queryClient.invalidateQueries({ queryKey: ['maintenances'] })
          }}
        />
      </Dialog>
    </div>
  )
}

function ElevatorFormDialog({
  elevator,
  onClose,
  onSuccess,
}: {
  elevator: Elevator | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    kimlikNo: '',
    bina: '',
    adres: '',
    durak: '',
    labelType: '' as ElevatorLabelType | '',
    labelDate: '',
    durationMonths: '' as string | '',
    endDate: '',
    useDuration: true,
    managerTcIdentityNumber: '',
    managerPhoneNumber: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Calculate end date based on label date and duration
  useEffect(() => {
    if (formData.useDuration && formData.labelDate && formData.durationMonths) {
      const labelDateObj = new Date(formData.labelDate)
      const months = parseInt(formData.durationMonths)
      if (!isNaN(months) && months > 0) {
        const endDateObj = new Date(labelDateObj)
        endDateObj.setMonth(endDateObj.getMonth() + months)
        setFormData((prev) => ({
          ...prev,
          endDate: endDateObj.toISOString().split('T')[0],
        }))
      }
    }
  }, [formData.labelDate, formData.durationMonths, formData.useDuration])

  useEffect(() => {
    if (elevator) {
      const labelDate = elevator.labelDate || elevator.maviEtiketTarihi || ''
      const endDate = elevator.bitisTarihi || ''
      
      setFormData({
        kimlikNo: elevator.kimlikNo || '',
        bina: elevator.bina || '',
        adres: elevator.adres || '',
        durak: elevator.durak || '',
        labelType: (elevator.labelType || '') as ElevatorLabelType | '',
        labelDate: labelDate ? labelDate.split('T')[0] : '',
        durationMonths: '',
        endDate: endDate ? endDate.split('T')[0] : '',
        useDuration: false,
        managerTcIdentityNumber: elevator.managerTc || '',
        managerPhoneNumber: elevator.managerPhone || '',
      })
    } else {
      setFormData({
        kimlikNo: '',
        bina: '',
        adres: '',
        durak: '',
        labelType: '' as ElevatorLabelType | '',
        labelDate: '',
        durationMonths: '',
        endDate: '',
        useDuration: true,
        managerTcIdentityNumber: '',
        managerPhoneNumber: '',
      })
    }
    setErrors({})
  }, [elevator])

  // Validation functions
  const validateTcIdentity = (tc: string): string => {
    if (!tc) return 'TC Kimlik No zorunludur'
    if (!/^\d+$/.test(tc)) return 'TC Kimlik No sadece rakam içermelidir'
    if (tc.length !== 11) return 'TC Kimlik No 11 haneli olmalıdır'
    return ''
  }

  const validatePhone = (phone: string): string => {
    if (!phone) return 'Telefon numarası zorunludur'
    if (!/^\d+$/.test(phone)) return 'Telefon numarası sadece rakam içermelidir'
    if (phone.length < 10) return 'Telefon numarası en az 10 haneli olmalıdır'
    return ''
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.labelType) {
      newErrors.labelType = 'Etiket tipi seçilmelidir'
    }
    
    if (!formData.labelDate) {
      newErrors.labelDate = 'Etiket tarihi zorunludur'
    }
    
    if (formData.useDuration && !formData.durationMonths) {
      newErrors.durationMonths = 'Süre seçilmelidir'
    }
    
    if (!formData.useDuration && !formData.endDate) {
      newErrors.endDate = 'Bitiş tarihi zorunludur'
    }
    
    const tcError = validateTcIdentity(formData.managerTcIdentityNumber)
    if (tcError) newErrors.managerTcIdentityNumber = tcError
    
    const phoneError = validatePhone(formData.managerPhoneNumber)
    if (phoneError) newErrors.managerPhoneNumber = phoneError
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      return elevatorService.create({
        kimlikNo: data.kimlikNo,
        bina: data.bina,
        adres: data.adres,
        durak: data.durak,
        labelType: data.labelType as ElevatorLabelType,
        labelDate: data.labelDate,
        endDate: data.endDate,
        managerTcIdentityNumber: data.managerTcIdentityNumber,
        managerPhoneNumber: data.managerPhoneNumber,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      toast({
        title: 'Başarılı',
        description: 'Asansör başarıyla eklendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Asansör eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!elevator) throw new Error('Elevator ID required')
      return elevatorService.update(elevator.id, {
        kimlikNo: data.kimlikNo,
        bina: data.bina,
        adres: data.adres,
        durak: data.durak,
        labelType: data.labelType as ElevatorLabelType,
        labelDate: data.labelDate,
        endDate: data.endDate,
        managerTcIdentityNumber: data.managerTcIdentityNumber,
        managerPhoneNumber: data.managerPhoneNumber,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      toast({
        title: 'Başarılı',
        description: 'Asansör başarıyla güncellendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Asansör güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast({
        title: 'Hata',
        description: 'Lütfen formdaki hataları düzeltin.',
        variant: 'destructive',
      })
      return
    }
    
    if (elevator) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const isFormValid = () => {
    return (
      formData.kimlikNo &&
      formData.bina &&
      formData.adres &&
      formData.labelType &&
      formData.labelDate &&
      (formData.useDuration ? formData.durationMonths : formData.endDate) &&
      !errors.managerTcIdentityNumber &&
      !errors.managerPhoneNumber &&
      formData.managerTcIdentityNumber &&
      formData.managerPhoneNumber
    )
  }

  return (
    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{elevator ? 'Asansör Düzenle' : 'Yeni Asansör Ekle'}</DialogTitle>
        <DialogDescription>
          {elevator ? 'Asansör bilgilerini güncelleyin' : 'Yeni asansör bilgilerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kimlikNo">Kimlik No *</Label>
              <Input
                id="kimlikNo"
                value={formData.kimlikNo}
                onChange={(e) => setFormData({ ...formData, kimlikNo: e.target.value })}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bina">Bina *</Label>
              <Input
                id="bina"
                value={formData.bina}
                onChange={(e) => setFormData({ ...formData, bina: e.target.value })}
                required
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adres">Adres *</Label>
            <Input
              id="adres"
              value={formData.adres}
              onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="durak">Durak</Label>
            <Input
              id="durak"
              value={formData.durak}
              onChange={(e) => setFormData({ ...formData, durak: e.target.value })}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="labelType">Etiket Tipi *</Label>
            <Select
              value={formData.labelType}
              onValueChange={(value) => {
                setFormData({ ...formData, labelType: value as ElevatorLabelType })
                setErrors({ ...errors, labelType: '' })
              }}
              required
            >
              <SelectTrigger className={cn('w-full', errors.labelType && 'border-destructive')}>
                <SelectValue placeholder="Etiket tipi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GREEN">Yeşil</SelectItem>
                <SelectItem value="YELLOW">Sarı</SelectItem>
                <SelectItem value="RED">Kırmızı</SelectItem>
                <SelectItem value="ORANGE">Turuncu</SelectItem>
              </SelectContent>
            </Select>
            {errors.labelType && (
              <p className="text-sm text-destructive">{errors.labelType}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="labelDate">Etiket Tarihi *</Label>
            <Input
              id="labelDate"
              type="date"
              value={formData.labelDate}
              onChange={(e) => {
                setFormData({ ...formData, labelDate: e.target.value })
                setErrors({ ...errors, labelDate: '' })
              }}
              required
              className={cn('w-full', errors.labelDate && 'border-destructive')}
            />
            {errors.labelDate && (
              <p className="text-sm text-destructive">{errors.labelDate}</p>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <input
                id="useDuration"
                type="radio"
                checked={formData.useDuration}
                onChange={() => setFormData({ ...formData, useDuration: true, endDate: '' })}
                className="h-4 w-4"
              />
              <Label htmlFor="useDuration" className="cursor-pointer">
                Süre Seç
              </Label>
            </div>
            {formData.useDuration && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="durationMonths">Süre *</Label>
                <Select
                  value={formData.durationMonths}
                  onValueChange={(value) => {
                    setFormData({ ...formData, durationMonths: value })
                    setErrors({ ...errors, durationMonths: '' })
                  }}
                  required
                >
                  <SelectTrigger className={cn('w-full', errors.durationMonths && 'border-destructive')}>
                    <SelectValue placeholder="Süre seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Ay</SelectItem>
                    <SelectItem value="6">6 Ay</SelectItem>
                    <SelectItem value="12">12 Ay</SelectItem>
                    <SelectItem value="24">24 Ay</SelectItem>
                  </SelectContent>
                </Select>
                {errors.durationMonths && (
                  <p className="text-sm text-destructive">{errors.durationMonths}</p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                id="useManualDate"
                type="radio"
                checked={!formData.useDuration}
                onChange={() => setFormData({ ...formData, useDuration: false, durationMonths: '' })}
                className="h-4 w-4"
              />
              <Label htmlFor="useManualDate" className="cursor-pointer">
                Bitiş Tarihi Manuel Seç
              </Label>
            </div>
            {!formData.useDuration && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="endDate">Bitiş Tarihi *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value })
                    setErrors({ ...errors, endDate: '' })
                  }}
                  required
                  className={cn('w-full', errors.endDate && 'border-destructive')}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">{errors.endDate}</p>
                )}
              </div>
            )}

            {formData.useDuration && formData.endDate && (
              <div className="pl-6">
                <p className="text-sm text-muted-foreground">
                  Hesaplanan Bitiş Tarihi: {new Date(formData.endDate).toLocaleDateString('tr-TR')}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Yönetici Bilgileri</h3>
            
            <div className="space-y-2">
              <Label htmlFor="managerTcIdentityNumber">Yönetici TC Kimlik No *</Label>
              <Input
                id="managerTcIdentityNumber"
                value={formData.managerTcIdentityNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setFormData({ ...formData, managerTcIdentityNumber: value })
                  const error = validateTcIdentity(value)
                  setErrors({ ...errors, managerTcIdentityNumber: error })
                }}
                maxLength={11}
                required
                className={cn('w-full', errors.managerTcIdentityNumber && 'border-destructive')}
                placeholder="11 haneli TC Kimlik No"
              />
              {errors.managerTcIdentityNumber && (
                <p className="text-sm text-destructive">{errors.managerTcIdentityNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="managerPhoneNumber">Yönetici Telefon No *</Label>
              <Input
                id="managerPhoneNumber"
                value={formData.managerPhoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setFormData({ ...formData, managerPhoneNumber: value })
                  const error = validatePhone(value)
                  setErrors({ ...errors, managerPhoneNumber: error })
                }}
                required
                className={cn('w-full', errors.managerPhoneNumber && 'border-destructive')}
                placeholder="Telefon numarası"
              />
              {errors.managerPhoneNumber && (
                <p className="text-sm text-destructive">{errors.managerPhoneNumber}</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending || !isFormValid()} 
            className="w-full sm:w-auto min-h-[44px]">
            {elevator ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function MaintenanceFormDialog({
  elevator,
  onClose,
  onSuccess,
}: {
  elevator: Elevator | null
  onClose: () => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    labelType: 'GREEN' as LabelType,
    aciklama: '',
    ucret: 0,
    teknisyenUserId: user?.id ? String(user.id) : '',
    photos: [] as File[],
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Auto-fill technician from logged-in user
  useEffect(() => {
    if (user?.id) {
      setFormData((prev) => ({ ...prev, teknisyenUserId: String(user.id) }))
    }
  }, [user])

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!elevator) throw new Error('Elevator ID required')
      return maintenanceService.create({
        elevatorId: elevator.id,
        tarih: data.tarih,
        labelType: data.labelType,
        aciklama: data.aciklama,
        ucret: data.ucret,
        teknisyenUserId: data.teknisyenUserId ? Number(data.teknisyenUserId) : undefined,
        photos: data.photos.length > 0 ? data.photos : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      toast({
        title: 'Başarılı',
        description: 'Bakım kaydı başarıyla eklendi.',
        variant: 'success',
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Bakım kaydı eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setFormData({ ...formData, photos: [...formData.photos, ...files] })
    }
  }

  const removePhoto = (index: number) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index),
    })
  }

  if (!elevator) return null

  return (
    <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Yeni Bakım Ekle</DialogTitle>
        <DialogDescription>
          {elevator.kimlikNo} - {elevator.bina}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tarih">Bakım Tarihi *</Label>
            <Input
              id="tarih"
              type="date"
              value={formData.tarih}
              onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labelType">Etiket Tipi *</Label>
            <Select
              value={formData.labelType}
              onValueChange={(value) => setFormData({ ...formData, labelType: value as LabelType })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GREEN">Yeşil</SelectItem>
                <SelectItem value="BLUE">Mavi</SelectItem>
                <SelectItem value="YELLOW">Sarı</SelectItem>
                <SelectItem value="RED">Kırmızı</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama *</Label>
            <Input
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ucret">Ücret *</Label>
            <Input
              id="ucret"
              type="number"
              step="0.01"
              value={formData.ucret}
              onChange={(e) => setFormData({ ...formData, ucret: Number(e.target.value) })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teknisyenUserId">Teknisyen</Label>
            <Input
              id="teknisyenUserId"
              value={user?.username || 'Otomatik doldurulacak (Giriş yapan kullanıcı)'}
              disabled
              className="w-full bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photos">Fotoğraflar (Opsiyonel)</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="w-full"
              />
              {formData.photos.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate flex-1">{photo.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePhoto(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto min-h-[44px]">
            {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
