import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, AlertTriangle, FileText } from 'lucide-react'
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

export function MaintenanceUpcomingPage() {
  const { toast } = useToast()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: maintenances = [], isLoading, error } = useQuery({
    queryKey: ['maintenances', 'upcoming', dateFrom, dateTo],
    queryFn: async () => {
      const params: { paid?: boolean; dateFrom?: string; dateTo?: string } = {
        paid: false,
      }
      // DateRangeFilterBar already sends LocalDate format (YYYY-MM-DD)
      // But ensure it's clean - service layer will also validate
      if (dateFrom) {
        params.dateFrom = dateFrom.includes('T') ? dateFrom.split('T')[0] : dateFrom
      }
      if (dateTo) {
        params.dateTo = dateTo.includes('T') ? dateTo.split('T')[0] : dateTo
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

  const getStatusBadge = (tarih: string) => {
    const today = new Date()
    const maintenanceDate = new Date(tarih)
    const diffDays = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return (
        <Badge variant="expired" className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Gecikmiş
        </Badge>
      )
    } else if (diffDays <= 7) {
      return (
        <Badge variant="warning" className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Yaklaşıyor ({diffDays} gün)
        </Badge>
      )
    }
    return (
      <Badge variant="planned" className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        Planlandı
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
      render: (row: any) => getStatusBadge(row.tarih),
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
              <h1 className="text-2xl font-bold text-[#111827]">Tamamlanacak Bakımlar</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Planlanmış bakım kayıtlarını görüntüleyin ve yönetin
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
                  Seçilen tarih aralığında planlanmış bakım kaydı bulunmamaktadır.
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
