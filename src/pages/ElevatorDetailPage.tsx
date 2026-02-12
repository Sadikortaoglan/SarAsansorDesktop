import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { elevatorService } from '@/services/elevator.service'
import { maintenanceService } from '@/services/maintenance.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Plus, Trash2, User, CreditCard, Phone, Mail, Building2, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatDate, formatDateShort, formatCurrency, cn } from '@/lib/utils'
import { MaintenanceFormDialog } from '@/components/MaintenanceFormDialog'
import { inspectionService } from '@/services/inspection.service'
import { faultService } from '@/services/fault.service'

export function ElevatorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<number | null>(null)
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false)

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

  const { data: inspections } = useQuery({
    queryKey: ['inspections', 'elevator', id],
    queryFn: () => inspectionService.getByElevatorId(Number(id)),
    enabled: !!id,
  })

  const { data: faults } = useQuery({
    queryKey: ['faults', 'elevator', id],
    queryFn: async () => {
      const allFaults = await faultService.getAll()
      return allFaults.filter((f) => f.elevatorId === Number(id))
    },
    enabled: !!id,
  })

  // Calculate summary metrics
  const lastInspection = inspections && inspections.length > 0 
    ? inspections.sort((a, b) => new Date(b.denetimTarihi).getTime() - new Date(a.denetimTarihi).getTime())[0]
    : null
  const totalFaults = faults?.length || 0
  const openFaults = faults?.filter((f) => f.durum === 'OPEN').length || 0

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
        return (
          <Badge variant="expired" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Süresi Geçti
          </Badge>
        )
      case 'WARNING':
        return (
          <Badge variant="warning" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Uyarı
          </Badge>
        )
      case 'OK':
      case 'ACTIVE':
        return (
          <Badge variant="active" className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aktif
          </Badge>
        )
      default:
        return <Badge variant="default">{status}</Badge>
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="border-l-4 border-l-indigo-500">
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

        <Card className={cn(
          elevator.labelType === 'GREEN' ? 'border-l-4 border-l-green-500' :
          elevator.labelType === 'BLUE' ? 'border-l-4 border-l-blue-500' :
          elevator.labelType === 'YELLOW' ? 'border-l-4 border-l-yellow-500' :
          elevator.labelType === 'RED' ? 'border-l-4 border-l-red-500' :
          elevator.labelType === 'ORANGE' ? 'border-l-4 border-l-orange-500' :
          'border-l-4 border-l-indigo-500'
        )}>
          <CardHeader>
            <CardTitle>Teknik Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Etiket Tipi</Label>
              <p className="text-lg font-medium">
                {elevator.labelType ? (
                  elevator.labelType === 'GREEN' ? (
                    <Badge variant="green">Yeşil</Badge>
                  ) : elevator.labelType === 'BLUE' ? (
                    <Badge variant="blue">Mavi</Badge>
                  ) : elevator.labelType === 'YELLOW' ? (
                    <Badge variant="yellow">Sarı</Badge>
                  ) : elevator.labelType === 'RED' ? (
                    <Badge variant="red">Kırmızı</Badge>
                  ) : elevator.labelType === 'ORANGE' ? (
                    <Badge variant="orange">Turuncu</Badge>
                  ) : (
                    <Badge variant="default">—</Badge>
                  )
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Etiket Tarihi</Label>
              <p className="text-lg font-medium">
                {elevator.labelDate ? formatDate(elevator.labelDate) : formatDate(elevator.maviEtiketTarihi)}
              </p>
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Technical Summary */}
        <Card className="border-l-4 border-l-[#4F46E5] bg-[#F9FAFB]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#4F46E5]" />
              Asansör Özeti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Etiket Tipi:</span>
              <span>
                {elevator.labelType === 'GREEN' ? (
                  <Badge variant="green">🟢 Yeşil</Badge>
                ) : elevator.labelType === 'YELLOW' ? (
                  <Badge variant="yellow">🟡 Sarı</Badge>
                ) : elevator.labelType === 'RED' ? (
                  <Badge variant="red">🔴 Kırmızı</Badge>
                ) : elevator.labelType === 'ORANGE' ? (
                  <Badge variant="orange">🟠 Turuncu</Badge>
                ) : elevator.labelType === 'BLUE' ? (
                  <Badge variant="blue">🔵 Mavi</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Son Denetim:
              </span>
              <span className="text-sm font-medium">
                {lastInspection ? formatDateShort(lastInspection.denetimTarihi) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Bir Sonraki Denetim:
              </span>
              <span className="text-sm font-medium">
                {elevator.bitisTarihi ? formatDateShort(elevator.bitisTarihi) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Toplam Arıza:</span>
              <span className="text-sm font-medium">{totalFaults}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444]" />
                Açık Arıza:
              </span>
              <span className={cn('text-sm font-medium', openFaults > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]')}>
                {openFaults}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardHeader>
            <CardTitle>Yönetici Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Yönetici Adı</Label>
              <p className="text-lg font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {elevator.managerName || '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">TC Kimlik No</Label>
              <p className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {elevator.managerTc || '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Telefon</Label>
              <p className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {elevator.managerPhone || '-'}
              </p>
            </div>
            {elevator.managerEmail && (
              <div>
                <Label className="text-muted-foreground">E-posta</Label>
                <p className="text-lg font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${elevator.managerEmail}`} className="text-[#4F46E5] hover:underline">
                    {elevator.managerEmail}
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {(elevator.currentAccountId || elevator.currentAccountName) && (
          <Card>
            <CardHeader>
              <CardTitle>Cari Hesap Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {elevator.currentAccountName && (
                <div>
                  <Label className="text-muted-foreground">Cari Hesap</Label>
                  <p className="text-lg font-medium">{elevator.currentAccountName}</p>
                </div>
              )}
              {elevator.currentAccountBalance !== undefined && (
                <div>
                  <Label className="text-muted-foreground">Bakiye</Label>
                  <p className={`text-lg font-medium ${elevator.currentAccountBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(elevator.currentAccountBalance))}
                    {elevator.currentAccountBalance >= 0 ? ' (Alacak)' : ' (Borç)'}
                  </p>
                </div>
              )}
              {elevator.currentAccountDebt !== undefined && elevator.currentAccountDebt > 0 && (
                <div>
                  <Label className="text-muted-foreground">Toplam Borç</Label>
                  <p className="text-lg font-medium text-red-600">{formatCurrency(elevator.currentAccountDebt)}</p>
                </div>
              )}
              {elevator.currentAccountCredit !== undefined && elevator.currentAccountCredit > 0 && (
                <div>
                  <Label className="text-muted-foreground">Toplam Alacak</Label>
                  <p className="text-lg font-medium text-green-600">{formatCurrency(elevator.currentAccountCredit)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bakım Geçmişi</CardTitle>
            <CardDescription>Bu asansörün bakım kayıtları</CardDescription>
          </div>
          <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsMaintenanceDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Bakım Ekle
              </Button>
            </DialogTrigger>
            <MaintenanceFormDialog
              elevatorId={Number(id)}
              elevatorName={`${elevator.kimlikNo} - ${elevator.bina}`}
              onClose={() => setIsMaintenanceDialogOpen(false)}
              onSuccess={() => {
                setIsMaintenanceDialogOpen(false)
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
            <TableResponsive
              data={maintenances}
              columns={[
                {
                  key: 'tarih',
                  header: 'Tarih',
                  mobileLabel: 'Tarih',
                  mobilePriority: 10,
                  render: (maintenance) => formatDateShort(maintenance.tarih),
                },
                {
                  key: 'aciklama',
                  header: 'Açıklama',
                  mobileLabel: 'Açıklama',
                  mobilePriority: 9,
                },
                {
                  key: 'ucret',
                  header: 'Ücret',
                  mobileLabel: 'Ücret',
                  mobilePriority: 8,
                  render: (maintenance) => formatCurrency(maintenance.ucret),
                },
                {
                  key: 'odendi',
                  header: 'Ödendi',
                  mobileLabel: 'Ödendi',
                  mobilePriority: 7,
                  render: (maintenance) =>
                    maintenance.odendi ? (
                          <Badge variant="success">Ödendi</Badge>
                        ) : (
                          <Badge variant="destructive">Ödenmedi</Badge>
                    ),
                },
                {
                  key: 'odemeTarihi',
                  header: 'Ödeme Tarihi',
                  mobileLabel: 'Ödeme Tarihi',
                  mobilePriority: 6,
                  hideOnMobile: true,
                  render: (maintenance) =>
                    maintenance.odemeTarihi ? formatDateShort(maintenance.odemeTarihi || '') : '-',
                },
                {
                  key: 'actions',
                  header: 'İşlemler',
                  mobileLabel: '',
                  mobilePriority: 1,
                  hideOnMobile: false,
                  render: (maintenance) => (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                          setMaintenanceToDelete(maintenance.id)
                          setConfirmDeleteOpen(true)
                            }}
                        className="h-11 w-11 sm:h-10 sm:w-10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                  ),
                },
              ]}
              keyExtractor={(maintenance) => maintenance.id.toString()}
              emptyMessage="Henüz bakım kaydı yok"
            />
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


