import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { elevatorService } from '@/services/elevator.service'
import { maintenanceService } from '@/services/maintenance.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { formatDate, formatDateShort, formatCurrency } from '@/lib/utils'

export function ElevatorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<number | null>(null)

  const { data: elevator, isLoading } = useQuery({
    queryKey: ['elevator', id],
    queryFn: () => elevatorService.getById(Number(id)),
    enabled: !!id,
  })

  const { data: maintenances, isLoading: maintenancesLoading } = useQuery({
    queryKey: ['maintenances', 'elevator', id],
    queryFn: () => maintenanceService.getByElevatorId(Number(id)),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: (maintenanceId: number) => maintenanceService.delete(maintenanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'elevator', id] })
      toast({
        title: 'Başarılı',
        description: 'Bakım kaydı başarıyla silindi.',
        variant: 'success',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!elevator) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-destructive">Asansör bulunamadı</p>
      </div>
    )
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/elevators')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Asansör Detayı</h1>
          <p className="text-muted-foreground">{elevator.kimlikNo} - {elevator.bina}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Genel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Kimlik No</Label>
              <p className="text-lg font-medium">{elevator.kimlikNo}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Bina</Label>
              <p className="text-lg font-medium">{elevator.bina}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Adres</Label>
              <p className="text-lg font-medium">{elevator.adres}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Durak</Label>
              <p className="text-lg font-medium">{elevator.durak || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teknik Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Mavi Etiket</Label>
              <p className="text-lg font-medium">{elevator.maviEtiket || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Mavi Etiket Tarihi</Label>
              <p className="text-lg font-medium">{formatDate(elevator.maviEtiketTarihi)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Bitiş Tarihi</Label>
              <p className="text-lg font-medium">{formatDate(elevator.bitisTarihi)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Durum</Label>
              <div className="mt-2">{getStatusBadge(elevator.durum || 'OK')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bakım Geçmişi</CardTitle>
            <CardDescription>Bu asansörün bakım kayıtları</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Bakım Ekle
              </Button>
            </DialogTrigger>
            <MaintenanceFormDialog
              elevatorId={Number(id)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['maintenances', 'elevator', id] })
              }}
            />
          </Dialog>
        </CardHeader>
        <CardContent>
          {maintenancesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : maintenances && maintenances.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Ücret</TableHead>
                    <TableHead>Ödendi</TableHead>
                    <TableHead>Ödeme Tarihi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenances.map((maintenance) => (
                    <TableRow key={maintenance.id}>
                      <TableCell>{formatDateShort(maintenance.tarih)}</TableCell>
                      <TableCell>{maintenance.aciklama}</TableCell>
                      <TableCell>{formatCurrency(maintenance.ucret)}</TableCell>
                      <TableCell>
                        {maintenance.odendi ? (
                          <Badge variant="success">Ödendi</Badge>
                        ) : (
                          <Badge variant="destructive">Ödenmedi</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {maintenance.odemeTarihi ? formatDateShort(maintenance.odemeTarihi || '') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setMaintenanceToDelete(maintenance.id)
                              setConfirmDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Henüz bakım kaydı yok</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Bakım Kaydını Sil"
        message="Bu bakım kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={() => {
          if (maintenanceToDelete !== null) {
            deleteMutation.mutate(maintenanceToDelete)
            setMaintenanceToDelete(null)
          }
        }}
        variant="destructive"
      />
    </div>
  )
}

function MaintenanceFormDialog({
  elevatorId,
  onSuccess,
}: {
  elevatorId: number
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    aciklama: '',
    ucret: 0,
  })
  const { toast } = useToast()

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      maintenanceService.create({ ...data, elevatorId }),
    onSuccess: () => {
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

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Yeni Bakım Ekle</DialogTitle>
        <DialogDescription>Bakım bilgilerini girin</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tarih">Tarih *</Label>
            <Input
              id="tarih"
              type="date"
              value={formData.tarih}
              onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama *</Label>
            <Input
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
              required
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending}>
            Ekle
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

