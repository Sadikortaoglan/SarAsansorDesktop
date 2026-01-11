import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { elevatorService, type Elevator } from '@/services/elevator.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, Edit, Trash2, Search } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export function ElevatorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedElevator, setSelectedElevator] = useState<Elevator | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: elevators, isLoading, error } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  console.log('🔵 ElevatorsPage - elevators:', elevators, 'isLoading:', isLoading, 'error:', error)

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

  // Güvenli array kontrolü
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
    if (window.confirm('Bu asansörü silmek istediğinize emin misiniz?')) {
      deleteMutation.mutate(id)
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kimlik No</TableHead>
                <TableHead>Bina</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead>Durak</TableHead>
                <TableHead>Mavi Etiket</TableHead>
                <TableHead>Bitiş Tarihi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredElevators && filteredElevators.length > 0 ? (
                filteredElevators.map((elevator) => {
                  // Durum yoksa hesapla
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
                  return (
                  <TableRow key={elevator.id}>
                    <TableCell className="font-medium">{elevator.kimlikNo}</TableCell>
                    <TableCell>{elevator.bina}</TableCell>
                    <TableCell>{elevator.adres}</TableCell>
                    <TableCell>{elevator.durak}</TableCell>
                    <TableCell>{elevator.maviEtiket}</TableCell>
                    <TableCell>{formatDateShort(elevator.bitisTarihi)}</TableCell>
                    <TableCell>{getStatusBadge(elevator.durum)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/elevators/${elevator.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedElevator(elevator)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(elevator.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Asansör bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
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
    kimlikNo: elevator?.kimlikNo || '',
    bina: elevator?.bina || '',
    adres: elevator?.adres || '',
    durak: elevator?.durak || '',
    maviEtiket: elevator?.maviEtiket || '',
    maviEtiketTarihi: elevator?.maviEtiketTarihi
      ? elevator.maviEtiketTarihi.split('T')[0]
      : '',
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => elevatorService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevators'] })
      toast({
        title: 'Başarılı',
        description: 'Asansör başarıyla eklendi.',
        variant: 'success',
      })
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
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{elevator ? 'Asansör Düzenle' : 'Yeni Asansör Ekle'}</DialogTitle>
        <DialogDescription>
          {elevator ? 'Asansör bilgilerini güncelleyin' : 'Yeni asansör bilgilerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kimlikNo">Kimlik No *</Label>
              <Input
                id="kimlikNo"
                value={formData.kimlikNo}
                onChange={(e) => setFormData({ ...formData, kimlikNo: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bina">Bina *</Label>
              <Input
                id="bina"
                value={formData.bina}
                onChange={(e) => setFormData({ ...formData, bina: e.target.value })}
                required
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
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durak">Durak</Label>
              <Input
                id="durak"
                value={formData.durak}
                onChange={(e) => setFormData({ ...formData, durak: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maviEtiket">Mavi Etiket</Label>
              <Input
                id="maviEtiket"
                value={formData.maviEtiket}
                onChange={(e) => setFormData({ ...formData, maviEtiket: e.target.value })}
              />
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {elevator ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

