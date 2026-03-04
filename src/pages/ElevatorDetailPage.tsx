import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { elevatorService } from '@/services/elevator.service'
import { maintenanceService } from '@/services/maintenance.service'
import apiClient from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Trash2, User, CreditCard, Phone, Mail, Building2, Calendar, AlertTriangle, CheckCircle2, FileDown, Loader2 } from 'lucide-react'
import { formatDate, formatDateShort, formatCurrency, cn } from '@/lib/utils'
import { MaintenanceFormDialog } from '@/components/MaintenanceFormDialog'
import { ElevatorQRValidationDialog } from '@/components/maintenance/ElevatorQRValidationDialog'
import { inspectionService } from '@/services/inspection.service'
import { faultService } from '@/services/fault.service'
import { ElevatorQRCode } from '@/components/elevator/ElevatorQRCode'
import './ElevatorDetailPage.css'

export function ElevatorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<number | null>(null)
  // const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false) // Reserved for future use
  const [isQRValidationDialogOpen, setIsQRValidationDialogOpen] = useState(false)
  const [isMaintenanceFormDialogOpen, setIsMaintenanceFormDialogOpen] = useState(false)
  const [validatedQRSessionToken, setValidatedQRSessionToken] = useState<string | null>(null)
  const [isOpeningReport, setIsOpeningReport] = useState(false)

  const extractBlobErrorMessage = async (error: any): Promise<string | null> => {
    const responseData = error?.response?.data
    if (!(responseData instanceof Blob)) return null

    try {
      const text = await responseData.text()
      if (!text) return null

      const parsed = JSON.parse(text) as { message?: string; error?: string }
      return parsed?.message || parsed?.error || null
    } catch {
      return null
    }
  }

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

  const handleOpenReport = async () => {
    if (!id) return
    const popup = window.open('', '_blank')
    if (!popup) {
      const fallback = window.open(`/api/elevators/${encodeURIComponent(id)}/report`, '_blank')
      if (!fallback) {
        toast({
          title: 'Popup engellendi',
          description: 'Raporu görüntülemek için popup izni verin.',
          variant: 'destructive',
        })
      }
      return
    }

    setIsOpeningReport(true)
    try {
      const response = await apiClient.get(`/elevators/${encodeURIComponent(id)}/report`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const blobUrl = window.URL.createObjectURL(blob)
      popup.document.title = `elevator-${id}-report.pdf`
      popup.document.body.style.margin = '0'
      popup.document.body.innerHTML = `<iframe src="${blobUrl}" style="border:0;width:100vw;height:100vh;"></iframe>`
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000)
    } catch (error: any) {
      popup.close()
      const statusCode = error?.response?.status
      const parsedMessage = await extractBlobErrorMessage(error)
      const description =
        parsedMessage ||
        (statusCode === 404
          ? 'Asansör bulunamadı'
          : statusCode === 500
            ? 'PDF oluşturulamadı'
            : 'Rapor açılamadı')
      toast({
        title: 'Hata',
        description,
        variant: 'destructive',
      })
    } finally {
      setIsOpeningReport(false)
    }
  }

  if (isLoading) {
    return (
      <div className="elevator-detail">
        <Skeleton className="h-10 w-full" />
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
    <div className="elevator-detail">
      <div className="elevator-detail__header">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/elevators')}
          className="elevator-detail__back-button"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="elevator-detail__header-info">
          <h1 className="elevator-detail__title">Asansör Detayı</h1>
          <p className="elevator-detail__subtitle">{elevator.kimlikNo} - {elevator.bina}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenReport}
          disabled={isOpeningReport}
          className="elevator-detail__report-button"
        >
          {isOpeningReport ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rapor Açılıyor...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Rapor İndir/Görüntüle
            </>
          )}
        </Button>
      </div>

      <div className="elevator-detail__cards-grid">
        <Card className="elevator-detail__card border-l-4 border-l-indigo-500">
          <CardHeader className="elevator-detail__card-header">
            <CardTitle className="elevator-detail__card-title">Genel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="elevator-detail__card-content">
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Kimlik No</Label>
              <p className="elevator-detail__field-value">{elevator.kimlikNo}</p>
            </div>
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Bina</Label>
              <p className="elevator-detail__field-value">{elevator.bina}</p>
            </div>
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Adres</Label>
              <p className="elevator-detail__field-value">{elevator.adres}</p>
            </div>
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Durak</Label>
              <p className="elevator-detail__field-value">{elevator.durak || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'elevator-detail__card',
          elevator.labelType === 'GREEN' ? 'border-l-4 border-l-green-500' :
          elevator.labelType === 'BLUE' ? 'border-l-4 border-l-blue-500' :
          elevator.labelType === 'YELLOW' ? 'border-l-4 border-l-yellow-500' :
          elevator.labelType === 'RED' ? 'border-l-4 border-l-red-500' :
          elevator.labelType === 'ORANGE' ? 'border-l-4 border-l-orange-500' :
          'border-l-4 border-l-indigo-500'
        )}>
          <CardHeader className="elevator-detail__card-header">
            <CardTitle className="elevator-detail__card-title">Teknik Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="elevator-detail__card-content">
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Etiket Tipi</Label>
              <p className="elevator-detail__field-value">
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
                  <span className="elevator-detail__muted">—</span>
                )}
              </p>
            </div>
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Etiket Tarihi</Label>
              <p className="elevator-detail__field-value">
                {elevator.labelDate ? formatDate(elevator.labelDate) : formatDate(elevator.maviEtiketTarihi)}
              </p>
            </div>
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Bitiş Tarihi</Label>
              <p className="elevator-detail__field-value">{formatDate(elevator.bitisTarihi)}</p>
            </div>
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Durum</Label>
              <div className="elevator-detail__status-wrap">{getStatusBadge(elevator.durum || 'OK')}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="elevator-detail__card border-l-4 border-l-[#4F46E5] bg-[#F9FAFB]">
          <CardHeader className="elevator-detail__card-header">
            <CardTitle className="elevator-detail__card-title elevator-detail__title-with-icon">
              <Building2 className="h-5 w-5 text-[#4F46E5]" />
              Asansör Özeti
            </CardTitle>
          </CardHeader>
          <CardContent className="elevator-detail__card-content elevator-detail__summary">
            <div className="elevator-detail__summary-row">
              <span className="elevator-detail__summary-label">Etiket Tipi:</span>
              <span>
                {elevator.labelType === 'GREEN' ? (
                  <Badge variant="green">Yeşil</Badge>
                ) : elevator.labelType === 'YELLOW' ? (
                  <Badge variant="yellow">Sarı</Badge>
                ) : elevator.labelType === 'RED' ? (
                  <Badge variant="red">Kırmızı</Badge>
                ) : elevator.labelType === 'ORANGE' ? (
                  <Badge variant="orange">Turuncu</Badge>
                ) : elevator.labelType === 'BLUE' ? (
                  <Badge variant="blue">Mavi</Badge>
                ) : (
                  <span className="elevator-detail__muted">—</span>
                )}
              </span>
            </div>
            <div className="elevator-detail__summary-row">
              <span className="elevator-detail__summary-label elevator-detail__inline-icon">
                <Calendar className="h-3.5 w-3.5" />
                Son Denetim:
              </span>
              <span className="elevator-detail__summary-value">
                {lastInspection ? formatDateShort(lastInspection.denetimTarihi) : '—'}
              </span>
            </div>
            <div className="elevator-detail__summary-row">
              <span className="elevator-detail__summary-label elevator-detail__inline-icon">
                <Calendar className="h-3.5 w-3.5" />
                Bir Sonraki Denetim:
              </span>
              <span className="elevator-detail__summary-value">
                {elevator.bitisTarihi ? formatDateShort(elevator.bitisTarihi) : '—'}
              </span>
            </div>
            <div className="elevator-detail__summary-row">
              <span className="elevator-detail__summary-label">Toplam Arıza:</span>
              <span className="elevator-detail__summary-value">{totalFaults}</span>
            </div>
            <div className="elevator-detail__summary-row elevator-detail__summary-row--last">
              <span className="elevator-detail__summary-label elevator-detail__inline-icon">
                <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444]" />
                Açık Arıza:
              </span>
              <span className={cn('elevator-detail__summary-value', openFaults > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]')}>
                {openFaults}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="elevator-detail__card border-l-4 border-l-teal-500">
          <CardHeader className="elevator-detail__card-header">
            <CardTitle className="elevator-detail__card-title">Yönetici Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="elevator-detail__card-content">
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Yönetici Adı</Label>
              <p className="elevator-detail__field-value elevator-detail__inline-icon">
                <User className="h-4 w-4 text-muted-foreground" />
                {elevator.managerName || '-'}
              </p>
            </div>
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">TC Kimlik No</Label>
              <p className="elevator-detail__field-value elevator-detail__muted elevator-detail__inline-icon">
                <CreditCard className="h-4 w-4" />
                {elevator.managerTc || '-'}
              </p>
            </div>
            <div className="elevator-detail__field">
              <Label className="elevator-detail__field-label">Telefon</Label>
              <p className="elevator-detail__field-value elevator-detail__muted elevator-detail__inline-icon">
                <Phone className="h-4 w-4" />
                {elevator.managerPhone || '-'}
              </p>
            </div>
            {elevator.managerEmail && (
              <div className="elevator-detail__field">
                <Label className="elevator-detail__field-label">E-posta</Label>
                <p className="elevator-detail__field-value elevator-detail__inline-icon">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${elevator.managerEmail}`} className="elevator-detail__email-link">
                    {elevator.managerEmail}
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <div className="elevator-detail__qr-card">
          <ElevatorQRCode
            elevatorId={elevator.id}
            elevatorName={`${elevator.bina} - ${elevator.kimlikNo}`}
          />
        </div>

        {(elevator.currentAccountId || elevator.currentAccountName) && (
          <Card className="elevator-detail__card">
            <CardHeader className="elevator-detail__card-header">
              <CardTitle className="elevator-detail__card-title">Cari Hesap Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="elevator-detail__card-content">
              {elevator.currentAccountName && (
                <div className="elevator-detail__field">
                  <Label className="elevator-detail__field-label">Cari Hesap</Label>
                  <p className="elevator-detail__field-value">{elevator.currentAccountName}</p>
                </div>
              )}
              {elevator.currentAccountBalance !== undefined && (
                <div className="elevator-detail__field">
                  <Label className="elevator-detail__field-label">Bakiye</Label>
                  <p className={cn('elevator-detail__field-value', elevator.currentAccountBalance >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {formatCurrency(Math.abs(elevator.currentAccountBalance))}
                    {elevator.currentAccountBalance >= 0 ? ' (Alacak)' : ' (Borç)'}
                  </p>
                </div>
              )}
              {elevator.currentAccountDebt !== undefined && elevator.currentAccountDebt > 0 && (
                <div className="elevator-detail__field">
                  <Label className="elevator-detail__field-label">Toplam Borç</Label>
                  <p className="elevator-detail__field-value text-red-600">{formatCurrency(elevator.currentAccountDebt)}</p>
                </div>
              )}
              {elevator.currentAccountCredit !== undefined && elevator.currentAccountCredit > 0 && (
                <div className="elevator-detail__field">
                  <Label className="elevator-detail__field-label">Toplam Alacak</Label>
                  <p className="elevator-detail__field-value text-green-600">{formatCurrency(elevator.currentAccountCredit)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="elevator-detail__card">
        <CardHeader className="elevator-detail__card-header elevator-detail__maintenance-header">
          <div>
            <CardTitle className="elevator-detail__card-title">Bakım Geçmişi</CardTitle>
            <CardDescription>Bu asansörün bakım kayıtları</CardDescription>
          </div>
          {/* TODO: Sadık geçici olarak bakım ekleme butonlarını kapattı (QR flow revize ediliyor) */}
          {/* "Yeni Bakım Ekle" Button - Opens QR modal ONLY */}
          {/* <Button onClick={() => {
            // Clear any previous state
            setValidatedQRSessionToken(null)
            setIsMaintenanceFormDialogOpen(false) // Ensure maintenance modal is closed
            // Open QR modal ONLY
            setIsQRValidationDialogOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Bakım Ekle
          </Button> */}

          {/* QR Validation Dialog - Opens first */}
          <ElevatorQRValidationDialog
            open={isQRValidationDialogOpen}
            onOpenChange={(open) => {
              setIsQRValidationDialogOpen(open)
              if (!open) {
                // QR modal is closing
                // DO NOT clear token here - onValidationSuccess handles success case
                // Token will be cleared when maintenance modal closes or new flow starts
                // DO NOT open maintenance modal here
              }
            }}
            elevatorId={Number(id)}
            elevatorCode={elevator.kimlikNo}
            intent="START_MAINTENANCE"
            onValidationSuccess={(qrSessionToken) => {
              // QR validation succeeded (for both technician QR and admin remote start)
              // IMPORTANT: Set token FIRST, then close QR modal, then open maintenance modal
              setValidatedQRSessionToken(qrSessionToken)
              setIsQRValidationDialogOpen(false)
              // Open maintenance modal ONLY after token is set
              setIsMaintenanceFormDialogOpen(true)
            }}
          />

          {/* Maintenance Form Dialog - Opens ONLY after QR validation success OR admin remote start */}
          <Dialog open={isMaintenanceFormDialogOpen} onOpenChange={(open) => {
            setIsMaintenanceFormDialogOpen(open)
            if (!open) {
              setValidatedQRSessionToken(null)
            }
          }}>
            {validatedQRSessionToken && (
              <MaintenanceFormDialog
                elevatorId={Number(id)}
                elevatorName={`${elevator.kimlikNo} - ${elevator.bina}`}
                qrSessionToken={validatedQRSessionToken}
                onClose={() => {
                  setIsMaintenanceFormDialogOpen(false)
                  setValidatedQRSessionToken(null)
                }}
                onSuccess={() => {
                  setIsMaintenanceFormDialogOpen(false)
                  setValidatedQRSessionToken(null)
                  
                  // Invalidate elevator-specific maintenance queries
                  queryClient.invalidateQueries({ queryKey: ['maintenances', 'elevator', id] })
                  
                  // Invalidate all maintenance-related queries to refresh lists
                  queryClient.invalidateQueries({ queryKey: ['maintenances'] })
                  queryClient.invalidateQueries({ queryKey: ['maintenances', 'all'] })
                  queryClient.invalidateQueries({ queryKey: ['maintenances', 'summary'] })
                  
                  // Refetch maintenance list immediately
                  queryClient.refetchQueries({ queryKey: ['maintenances'] })
                }}
              />
            )}
          </Dialog>
        </CardHeader>
        <CardContent className="elevator-detail__card-content">
          {maintenancesLoading ? (
            <div className="elevator-detail__loading-list">
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
                        <div className="elevator-detail__maintenance-actions">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                          setMaintenanceToDelete(maintenance.id)
                          setConfirmDeleteOpen(true)
                            }}
                        className="elevator-detail__icon-button"
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
            <p className="elevator-detail__empty">Henüz bakım kaydı yok</p>
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
