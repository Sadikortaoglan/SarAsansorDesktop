import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { paymentService } from '@/services/payment.service'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, FileSpreadsheet, Search } from 'lucide-react'
import { formatDateShort, formatCurrency } from '@/lib/utils'

export function PaymentsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', dateFrom, dateTo],
    queryFn: () =>
      paymentService.getAll({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  })

  const { data: summary } = useQuery({
    queryKey: ['payments', 'summary', dateFrom, dateTo],
    queryFn: () =>
      paymentService.getSummary({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    retry: false, // Endpoint yoksa tekrar deneme
  })

  // Güvenli array kontrolü
  const paymentsArray = Array.isArray(payments) ? payments : []
  const filteredPayments = paymentsArray.filter(
    (payment) =>
      payment.maintenance?.elevator?.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.maintenance?.elevator?.bina || payment.maintenance?.elevator?.binaAdi)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.fisNo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Badge variant="default">Nakit</Badge>
      case 'CREDIT_CARD':
        return <Badge variant="secondary">Kredi Kartı</Badge>
      case 'BANK_TRANSFER':
        return <Badge variant="default">Banka Havalesi</Badge>
      case 'CHECK':
        return <Badge variant="secondary">Çek</Badge>
      default:
        return <Badge>{method}</Badge>
    }
  }

  const handleExportPdf = async () => {
    try {
      const blob = await paymentService.exportPdf({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fileName = `tahsilat-fişleri-${dateFrom || 'tüm'}-${dateTo || 'tarihler'}.pdf`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Başarılı',
        description: 'PDF başarıyla indirildi.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'PDF indirilemedi.',
        variant: 'destructive',
      })
    }
  }

  const handleExportExcel = async () => {
    try {
      const blob = await paymentService.exportExcel({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fileName = `tahsilat-fişleri-${dateFrom || 'tüm'}-${dateTo || 'tarihler'}.xlsx`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Başarılı',
        description: 'Excel dosyası başarıyla indirildi.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Excel dosyası indirilemedi.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tahsilat Fişleri</h1>
          <p className="text-muted-foreground">Ödeme kayıtları ve fişler</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="mr-2 h-4 w-4" />
            PDF İndir
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel İndir
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Fiş</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ortalama Tutar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalCount > 0
                  ? formatCurrency(summary.totalAmount / summary.totalCount)
                  : '-'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>Tarih aralığı ve arama filtresi</CardDescription>
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
            <div className="relative space-y-2 md:col-span-2">
              <Label>Ara</Label>
              <Search className="absolute left-3 top-9 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Asansör, bina veya fiş no ile ara..."
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
                <TableHead>Fiş No</TableHead>
                <TableHead>Asansör</TableHead>
                <TableHead>Bina</TableHead>
                <TableHead>Bakım Açıklama</TableHead>
                <TableHead>Ödeme Tarihi</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Ödeme Yöntemi</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments && filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.fisNo || `#${payment.id}`}</TableCell>
                    <TableCell>
                      {payment.maintenance?.elevator?.kimlikNo || '-'}
                    </TableCell>
                    <TableCell>{payment.maintenance?.elevator?.bina || payment.maintenance?.elevator?.binaAdi || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {payment.maintenance?.aciklama || '-'}
                    </TableCell>
                    <TableCell>{payment.odemeTarihi ? formatDateShort(payment.odemeTarihi) : '-'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.tutar || 0)}</TableCell>
                    <TableCell>{getPaymentMethodBadge(payment.odemeYontemi || 'CASH')}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {payment.aciklama || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Fiş bulunamadı
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

