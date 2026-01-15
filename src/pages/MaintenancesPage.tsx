import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceService, type Maintenance } from '@/services/maintenance.service'
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

  const { data: summary } = useQuery({
    queryKey: ['maintenances', 'summary'],
    queryFn: () => maintenanceService.getSummary(),
    retry: false,
  })

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

  const maintenancesArray = Array.isArray(maintenances) ? maintenances : []
  const filteredMaintenances = maintenancesArray.filter(
    (maintenance) =>
      (maintenance.elevator?.bina || maintenance.elevator?.binaAdi)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.aciklama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.elevator?.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bakımlar</h1>
          <p className="text-muted-foreground">Tüm bakım kayıtlarının listesi ve özetleri</p>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Bakım</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ödenen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.paid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ödenmeyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.unpaid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ödenen Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.paidAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ödenmeyen Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.unpaidAmount)}
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Başlangıç Tarihi</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Bitiş Tarihi</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidFilter">Ödeme Durumu</Label>
              <Select value={paidFilter} onValueChange={(value: 'all' | 'paid' | 'unpaid') => setPaidFilter(value)}>
                <SelectTrigger>
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
                className="pl-9"
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asansör</TableHead>
                <TableHead>Bina</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Ücret</TableHead>
                <TableHead>Ödendi</TableHead>
                <TableHead>Ödeme Tarihi</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaintenances && filteredMaintenances.length > 0 ? (
                filteredMaintenances.map((maintenance: Maintenance) => (
                  <TableRow key={maintenance.id}>
                    <TableCell className="font-medium">
                      {maintenance.elevator?.kimlikNo || '-'}
                    </TableCell>
                    <TableCell>{maintenance.elevator?.bina || maintenance.elevator?.binaAdi || '-'}</TableCell>
                    <TableCell>{formatDateShort(maintenance.tarih)}</TableCell>
                    <TableCell>{maintenance.aciklama}</TableCell>
                    <TableCell>{formatCurrency(maintenance.ucret)}</TableCell>
                    <TableCell>
                      {maintenance.odendi ? (
                        <Badge variant="green">Ödendi</Badge>
                      ) : (
                        <Badge variant="destructive">Ödenmedi</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {maintenance.odemeTarihi ? formatDateShort(maintenance.odemeTarihi) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!maintenance.odendi && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markPaidMutation.mutate(maintenance.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(maintenance.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Bakım kaydı bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
    </div>
  )
}

