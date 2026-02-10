import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { maintenanceService } from '@/services/maintenance.service'
import { DateRangeFilterBar } from '@/components/maintenance/DateRangeFilterBar'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateShort } from '@/lib/utils'
import { ActionButtons } from '@/components/ui/action-buttons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'

export function MaintenanceCompletedPage() {
  const { toast } = useToast()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: maintenances = [], isLoading } = useQuery({
    queryKey: ['maintenances', 'completed', dateFrom, dateTo],
    queryFn: async () => {
      const params: { paid?: boolean; dateFrom?: string; dateTo?: string } = {
        paid: true,
      }
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      return maintenanceService.getAll(params)
    },
    enabled: true,
  })

  const handleFilter = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
  }

  const getStatusBadge = (isPaid: boolean, paymentDate?: string) => {
    if (isPaid) {
      return (
        <Badge variant="completed" className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Tamamlandı
        </Badge>
      )
    }
    return (
      <Badge variant="pending" className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        Beklemede
      </Badge>
    )
  }

  const columns = [
    {
      key: 'tarih',
      header: 'Tarih',
      mobileLabel: 'Tarih',
      mobilePriority: 1,
      render: (row: any) => (
        <span className="font-medium">{formatDateShort(row.tarih)}</span>
      ),
    },
    {
      key: 'elevator',
      header: 'Asansör',
      mobileLabel: 'Asansör',
      mobilePriority: 2,
      render: (row: any) => (
        <div>
          <div className="font-medium">
            {row.elevator?.kimlikNo || `ELEV-${row.elevatorId}`}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.elevatorBuildingName || row.elevator?.bina || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'aciklama',
      header: 'Açıklama',
      mobileLabel: 'Açıklama',
      mobilePriority: 3,
      render: (row: any) => (
        <span className="text-sm">{row.aciklama || '-'}</span>
      ),
    },
    {
      key: 'ucret',
      header: 'Ücret',
      mobileLabel: 'Ücret',
      mobilePriority: 4,
      render: (row: any) => (
        <span className="font-semibold">{row.ucret?.toLocaleString('tr-TR')} ₺</span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      mobileLabel: 'Durum',
      mobilePriority: 5,
      render: (row: any) => getStatusBadge(row.odendi, row.odemeTarihi),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      mobileLabel: '',
      mobilePriority: 1,
      hideOnMobile: false,
      render: (row: any) => (
        <ActionButtons
          onView={() => {
            toast({
              title: 'Detay',
              description: `Bakım ID: ${row.id}`,
            })
          }}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tamamlanan Bakımlar</h1>
          <p className="text-muted-foreground mt-1">
            Tamamlanmış bakım kayıtlarını görüntüleyin ve filtreleyin
          </p>
        </div>
      </div>

      <DateRangeFilterBar onFilter={handleFilter} isLoading={isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Bakım Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Yükleniyor...</div>
            </div>
          ) : maintenances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-1">Sonuç bulunamadı</p>
              <p className="text-sm text-muted-foreground">
                Seçilen tarih aralığında tamamlanmış bakım kaydı bulunmamaktadır.
              </p>
            </div>
          ) : (
            <TableResponsive
              data={maintenances}
              columns={columns}
              keyExtractor={(item) => String(item.id)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
