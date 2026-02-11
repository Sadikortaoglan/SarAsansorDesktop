import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convertDateTimeToLocalDate } from '@/lib/date-utils'
import { FileText } from 'lucide-react'
import { maintenanceService } from '@/services/maintenance.service'
import { DateRangeFilterBar } from '@/components/maintenance/DateRangeFilterBar'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateShort } from '@/lib/utils'
import { ActionButtons } from '@/components/ui/action-buttons'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { formatElevatorDisplayName } from '@/lib/elevator-format'

export function MaintenanceCompletedPage() {
  const { toast } = useToast()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: maintenances = [], isLoading, error } = useQuery({
    queryKey: ['maintenances', 'completed', dateFrom, dateTo],
    queryFn: async () => {
      const params: { paid?: boolean; dateFrom?: string; dateTo?: string } = {
        paid: true,
      }
      // DateRangeFilterBar sends LocalDate format, but ensure it's clean
      if (dateFrom) {
        params.dateFrom = convertDateTimeToLocalDate(dateFrom)
      }
      if (dateTo) {
        params.dateTo = convertDateTimeToLocalDate(dateTo)
      }
      return maintenanceService.getAll(params)
    },
    enabled: true,
  })

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Hata',
        description: getUserFriendlyErrorMessage(error),
        variant: 'destructive',
      })
    }
  }, [error, toast])

  const handleFilter = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
  }

  const getStatusBadge = (isPaid: boolean) => {
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
      render: (row: any) => {
        const displayInfo = formatElevatorDisplayName(row.elevator || {
          kimlikNo: row.elevator?.kimlikNo,
          bina: row.elevatorBuildingName || row.elevator?.bina,
          adres: row.elevator?.adres,
        })
        return (
          <div>
            <div className="font-semibold text-[#111827]">
              🛗 {displayInfo.fullName}
            </div>
            <div className="text-sm text-[#6B7280] mt-1">
              {row.elevatorBuildingName || row.elevator?.bina || '-'}
              {row.elevator?.adres && ` • ${row.elevator.adres}`}
            </div>
            <div className="mt-1">
              <Badge variant="outline" className="text-xs text-[#9CA3AF] border-[#E5E7EB]">
                ({displayInfo.technicalCode})
              </Badge>
            </div>
          </div>
        )
      },
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
      render: (row: any) => getStatusBadge(row.odendi),
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
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Premium Page Header */}
      <div className="bg-white border-b border-[#E5E7EB] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#111827]">Tamamlanan Bakımlar</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Tamamlanmış bakım kayıtlarını görüntüleyin ve filtreleyin
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <DateRangeFilterBar onFilter={handleFilter} isLoading={isLoading} />

        <Card className="bg-white border border-[#E5E7EB] shadow-sm rounded-xl overflow-hidden mt-6">
          <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-teal-50/50 border-b border-[#E5E7EB]">
            <CardTitle className="text-lg font-semibold text-[#111827]">Bakım Listesi</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[#6B7280]">Yükleniyor...</div>
              </div>
            ) : maintenances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-[#F3F4F6] rounded-full mb-4">
                  <FileText className="h-8 w-8 text-[#9CA3AF]" />
                </div>
                <p className="text-lg font-semibold text-[#111827] mb-1">Sonuç bulunamadı</p>
                <p className="text-sm text-[#6B7280] max-w-md">
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
    </div>
  )
}
