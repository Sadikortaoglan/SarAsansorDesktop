import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { elevatorService, type Elevator } from '@/services/elevator.service'
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
import { Plus, Eye, Edit, Trash2, Search } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export function ElevatorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedElevator, setSelectedElevator] = useState<Elevator | null>(null)
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
  const filteredElevators = elevatorsArray.filter(
    (elevator) =>
      elevator.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.bina?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.adres?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return <Badge variant="expired">Süresi Geçti</Badge>
      case 'WARNING':
        return <Badge variant="warning">Uyarı</Badge>
      case 'OK':
        return <Badge variant="success">Tamam</Badge>
      default:
        return <Badge>{status}</Badge>
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kimlik No, Bina veya Adres ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
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
              header: 'Durak',
              mobileLabel: 'Durak',
              mobilePriority: 7,
              hideOnMobile: true,
            },
            {
              key: 'blueLabel',
              header: 'Blue Label',
              mobileLabel: 'Blue Label',
              mobilePriority: 6,
              render: (elevator: Elevator) =>
                elevator.blueLabel ? (
                  <Badge variant="default">Yes</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                ),
            },
            {
              key: 'bitisTarihi',
              header: 'Bitiş Tarihi',
              mobileLabel: 'Bitiş Tarihi',
              mobilePriority: 5,
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
                    onClick={() => navigate(`/elevators/${elevator.id}`)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
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
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(elevator.id)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
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
    blueLabel: false,
    maviEtiketTarihi: '',
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (elevator) {
      setFormData({
        kimlikNo: elevator.kimlikNo || '',
        bina: elevator.bina || '',
        adres: elevator.adres || '',
        durak: elevator.durak || '',
        blueLabel: elevator.blueLabel ?? false,
        maviEtiketTarihi: elevator.maviEtiketTarihi
          ? elevator.maviEtiketTarihi.split('T')[0]
          : '',
      })
    } else {
      setFormData({
        kimlikNo: '',
        bina: '',
        adres: '',
        durak: '',
        blueLabel: false,
        maviEtiketTarihi: '',
      })
    }
  }, [elevator])

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => elevatorService.create(data),
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
      return elevatorService.update(elevator.id, data)
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
    if (elevator) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label htmlFor="blueLabel">Blue Label</Label>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  id="blueLabel"
                  type="checkbox"
                  checked={formData.blueLabel}
                  onChange={(e) => setFormData({ ...formData, blueLabel: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="blueLabel" className="cursor-pointer text-sm">
                  Blue Label
                </Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maviEtiketTarihi">Mavi Etiket Tarihi *</Label>
            <Input
              id="maviEtiketTarihi"
              type="date"
              value={formData.maviEtiketTarihi}
              onChange={(e) => setFormData({ ...formData, maviEtiketTarihi: e.target.value })}
              required
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full sm:w-auto min-h-[44px]">
            {elevator ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

