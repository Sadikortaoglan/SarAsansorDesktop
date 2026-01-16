import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceService, type Maintenance } from '@/services/maintenance.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Check, Search } from 'lucide-react'
import { formatDateShort, formatCurrency } from '@/lib/utils'

export function MaintenancesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<number | null>(null)
  const [confirmMarkPaidOpen, setConfirmMarkPaidOpen] = useState(false)
  const [maintenanceToMarkPaid, setMaintenanceToMarkPaid] = useState<Maintenance | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenances', dateFrom, dateTo, paidFilter],
    queryFn: () =>
      maintenanceService.getAll({
        paid: paidFilter === 'all' ? undefined : paidFilter === 'paid',
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  })

  // Summary için tüm bakımları getir (filtre olmadan)
  const { data: allMaintenances } = useQuery({
    queryKey: ['maintenances', 'all'],
    queryFn: () => maintenanceService.getAll(),
  })

  const { data: summary } = useQuery({
    queryKey: ['maintenances', 'summary'],
    queryFn: () => maintenanceService.getSummary(),
    retry: false,
  })

  const maintenancesArray = Array.isArray(maintenances) ? maintenances : []
  const allMaintenancesArray = Array.isArray(allMaintenances) ? allMaintenances : []

  // Eğer summary'de sayılar yoksa, tüm bakımlar listesinden hesapla (filtrelenmiş değil)
  const calculatedSummary = summary ? {
    ...summary,
    total: summary.total ?? allMaintenancesArray.length,
    paid: summary.paid ?? allMaintenancesArray.filter(m => m.odendi).length,
    unpaid: summary.unpaid ?? allMaintenancesArray.filter(m => !m.odendi).length,
    totalAmount: summary.totalAmount ?? allMaintenancesArray.reduce((sum, m) => sum + (m.ucret || 0), 0),
    paidAmount: summary.paidAmount ?? allMaintenancesArray.filter(m => m.odendi).reduce((sum, m) => sum + (m.ucret || 0), 0),
    unpaidAmount: summary.unpaidAmount ?? allMaintenancesArray.filter(m => !m.odendi).reduce((sum, m) => sum + (m.ucret || 0), 0),
  } : (allMaintenancesArray.length > 0 ? {
    total: allMaintenancesArray.length,
    paid: allMaintenancesArray.filter(m => m.odendi).length,
    unpaid: allMaintenancesArray.filter(m => !m.odendi).length,
    totalAmount: allMaintenancesArray.reduce((sum, m) => sum + (m.ucret || 0), 0),
    paidAmount: allMaintenancesArray.filter(m => m.odendi).reduce((sum, m) => sum + (m.ucret || 0), 0),
    unpaidAmount: allMaintenancesArray.filter(m => !m.odendi).reduce((sum, m) => sum + (m.ucret || 0), 0),
    monthlyData: [],
  } : null)

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => maintenanceService.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      toast({
        title: 'Başarılı',
        description: 'Bakım ödendi olarak işaretlendi.',
        variant: 'success',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => maintenanceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      toast({
        title: 'Başarılı',
        description: 'Bakım kaydı başarıyla silindi.',
        variant: 'success',
      })
    },
  })

  const filteredMaintenances = maintenancesArray.filter(
    (maintenance) =>
      maintenance.elevatorBuildingName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.aciklama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `ELEV-${maintenance.elevatorId}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = (id: number) => {
    setMaintenanceToDelete(id)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (maintenanceToDelete !== null) {
      deleteMutation.mutate(maintenanceToDelete)
      setMaintenanceToDelete(null)
    }
  }

  const handleMarkPaid = (maintenance: Maintenance) => {
    setMaintenanceToMarkPaid(maintenance)
    setConfirmMarkPaidOpen(true)
  }

  const confirmMarkPaid = () => {
    if (maintenanceToMarkPaid !== null) {
      markPaidMutation.mutate(maintenanceToMarkPaid.id)
      setMaintenanceToMarkPaid(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bakımlar</h1>
          <p className="text-muted-foreground">Tüm bakım kayıtlarının listesi ve özetleri</p>
        </div>
      </div>

      {calculatedSummary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Bakım</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculatedSummary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ödenen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{calculatedSummary.paid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ödenmeyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{calculatedSummary.unpaid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(calculatedSummary.totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ödenen Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(calculatedSummary.paidAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ödenmeyen Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(calculatedSummary.unpaidAmount)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>Tarih aralığı ve ödeme durumu filtresi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Başlangıç Tarihi</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Bitiş Tarihi</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidFilter">Ödeme Durumu</Label>
              <Select value={paidFilter} onValueChange={(value: 'all' | 'paid' | 'unpaid') => setPaidFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="paid">Ödenen</SelectItem>
                  <SelectItem value="unpaid">Ödenmeyen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative space-y-2">
              <Label>Ara</Label>
              <Search className="absolute left-3 top-9 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Bina, asansör veya açıklama ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TableResponsive
          data={filteredMaintenances}
          columns={[
            {
              key: 'elevatorId',
              header: 'Asansör',
              mobileLabel: 'Asansör',
              mobilePriority: 10,
              render: (maintenance: Maintenance) => (
                <span className="font-medium">ELEV-{maintenance.elevatorId}</span>
              ),
            },
            {
              key: 'elevatorBuildingName',
              header: 'Bina',
              mobileLabel: 'Bina',
              mobilePriority: 9,
            },
            {
              key: 'tarih',
              header: 'Tarih',
              mobileLabel: 'Tarih',
              mobilePriority: 8,
              render: (maintenance: Maintenance) => formatDateShort(maintenance.tarih),
            },
            {
              key: 'aciklama',
              header: 'Açıklama',
              mobileLabel: 'Açıklama',
              mobilePriority: 7,
              hideOnMobile: true,
            },
            {
              key: 'ucret',
              header: 'Ücret',
              mobileLabel: 'Ücret',
              mobilePriority: 6,
              render: (maintenance: Maintenance) => formatCurrency(maintenance.ucret),
            },
            {
              key: 'odendi',
              header: 'Ödendi',
              mobileLabel: 'Ödendi',
              mobilePriority: 5,
              render: (maintenance: Maintenance) =>
                maintenance.odendi ? (
                  <Badge variant="green">Ödendi</Badge>
                ) : (
                  <Badge variant="destructive">Ödenmedi</Badge>
                ),
            },
            {
              key: 'odemeTarihi',
              header: 'Ödeme Tarihi',
              mobileLabel: 'Ödeme Tarihi',
              mobilePriority: 4,
              hideOnMobile: true,
              render: (maintenance: Maintenance) =>
                maintenance.odemeTarihi ? formatDateShort(maintenance.odemeTarihi) : '-',
            },
            {
              key: 'actions',
              header: 'İşlemler',
              mobileLabel: '',
              mobilePriority: 1,
              hideOnMobile: false,
              render: (maintenance: Maintenance) => (
                <div className="flex items-center justify-end gap-2">
                  {!maintenance.odendi && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMarkPaid(maintenance)}
                      className="h-11 w-11 sm:h-10 sm:w-10"
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(maintenance.id)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ),
            },
          ]}
          keyExtractor={(maintenance) => maintenance.id.toString()}
          emptyMessage="Bakım kaydı bulunamadı"
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Bakım Kaydını Sil"
        message="Bu bakım kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmMarkPaidOpen}
        onOpenChange={setConfirmMarkPaidOpen}
        title="Ödeme Onayı"
        message="Bu tahsilat işlemi onaylanacaktır."
        amount={maintenanceToMarkPaid ? formatCurrency(maintenanceToMarkPaid.ucret) : undefined}
        transactionContext={
          maintenanceToMarkPaid
            ? {
                service: maintenanceToMarkPaid.aciklama || 'Asansör bakım bedeli',
                customer: maintenanceToMarkPaid.elevatorBuildingName || undefined,
                date: maintenanceToMarkPaid.tarih ? formatDateShort(maintenanceToMarkPaid.tarih) : undefined,
              }
            : undefined
        }
        confirmText="Tahsilatı Onayla"
        cancelText="İptal"
        onConfirm={confirmMarkPaid}
        variant="success"
      />
    </div>
  )
}

