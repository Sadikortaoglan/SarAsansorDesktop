import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { maintenancePlanService, type MaintenancePlan } from '@/services/maintenance-plan.service'
import { DateRangeFilterBar } from '@/components/maintenance/DateRangeFilterBar'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateShort } from '@/lib/utils'
import { ActionButtons } from '@/components/ui/action-buttons'
import { useToast } from '@/components/ui/use-toast'
import { getUserFriendlyErrorMessage } from '@/lib/api-error-handler'
import { formatElevatorDisplayName } from '@/lib/elevator-format'
import { elevatorService } from '@/services/elevator.service'

export function MaintenanceCompletedPage() {
  const { toast } = useToast()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hasFilterApplied, setHasFilterApplied] = useState(false)

  // Fetch elevators for display
  const { data: elevators = [] } = useQuery({
    queryKey: ['elevators', 'for-completed'],
    queryFn: () => elevatorService.getAll(),
  })

  // Fetch completed maintenance plans - NO date filters on first load
  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['maintenance-plans', 'completed', dateFrom, dateTo],
    queryFn: async () => {
      console.log('🔍 COMPLETED PAGE - Fetching plans with filters:', { dateFrom, dateTo, hasFilterApplied })
      
      // Always use getAll with status=COMPLETED
      console.log('📡 COMPLETED PAGE - Using /maintenance-plans?status=COMPLETED endpoint')
      const params: { status: 'COMPLETED' } = {
        status: 'COMPLETED',
      }
      
      const result = await maintenancePlanService.getAll(params)
      console.log('📥 COMPLETED PAGE - Raw response (all completed):', result)
      
      // Filter by date range if provided (client-side)
      let filtered = result
      if (hasFilterApplied && (dateFrom || dateTo)) {
        if (dateFrom) {
          const fromDate = new Date(dateFrom.includes('T') ? dateFrom.split('T')[0] : dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter((plan) => {
            const planDate = new Date(plan.completedDate || plan.scheduledDate)
            planDate.setHours(0, 0, 0, 0)
            return planDate >= fromDate
          })
        }
        if (dateTo) {
          const toDate = new Date(dateTo.includes('T') ? dateTo.split('T')[0] : dateTo)
          toDate.setHours(23, 59, 59, 999)
          filtered = filtered.filter((plan) => {
            const planDate = new Date(plan.completedDate || plan.scheduledDate)
            planDate.setHours(0, 0, 0, 0)
            return planDate <= toDate
          })
        }
        console.log('📥 COMPLETED PAGE - Filtered result:', filtered)
      }
      
      return filtered
    },
    enabled: true,
  })

  // Log state after query
  useEffect(() => {
    console.log('📊 COMPLETED PAGE - State after query:', {
      plansCount: plans.length,
      plans,
      dateFrom,
      dateTo,
      hasFilterApplied,
      isLoading,
    })
  }, [plans, dateFrom, dateTo, hasFilterApplied, isLoading])

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
    console.log('🔍 COMPLETED PAGE - Filter applied:', { from, to })
    setDateFrom(from)
    setDateTo(to)
    setHasFilterApplied(true)
  }

  // Status badge is always completed for completed plans
  const getStatusBadge = () => {
    return (
      <Badge variant="completed" className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Tamamlandı
      </Badge>
    )
  }

  const columns = [
    {
      key: 'completedDate',
      header: 'Tamamlanma Tarihi',
      mobileLabel: 'Tarih',
      mobilePriority: 1,
      render: (row: MaintenancePlan) => (
        <span className="font-medium">
          {row.completedDate ? formatDateShort(row.completedDate) : formatDateShort(row.scheduledDate)}
        </span>
      ),
    },
    {
      key: 'scheduledDate',
      header: 'Planlanan Tarih',
      mobileLabel: 'Planlanan',
      mobilePriority: 2,
      render: (row: MaintenancePlan) => (
        <span className="text-sm text-[#6B7280]">{formatDateShort(row.scheduledDate)}</span>
      ),
    },
    {
      key: 'elevator',
      header: 'Asansör',
      mobileLabel: 'Asansör',
      mobilePriority: 3,
      render: (row: MaintenancePlan) => {
        const elevator = elevators.find((e) => e.id === row.elevatorId)
        const displayInfo = formatElevatorDisplayName(
          elevator || {
            kimlikNo: row.elevatorCode || row.elevatorName,
            bina: row.buildingName,
            adres: undefined,
          }
        )
        return (
          <div>
            <div className="font-semibold text-[#111827]">
              🛗 {displayInfo.fullName}
            </div>
            <div className="text-sm text-[#6B7280] mt-1">
              {row.buildingName || elevator?.bina || '-'}
              {elevator?.adres && ` • ${elevator.adres}`}
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
      key: 'note',
      header: 'Not',
      mobileLabel: 'Not',
      mobilePriority: 4,
      render: (row: MaintenancePlan) => (
        <span className="text-sm">{row.note || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      mobileLabel: 'Durum',
      mobilePriority: 5,
      render: (row: MaintenancePlan) => getStatusBadge(),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      mobileLabel: '',
      mobilePriority: 1,
      hideOnMobile: false,
      render: (row: MaintenancePlan) => (
        <ActionButtons
          onView={() => {
            toast({
              title: 'Detay',
              description: `Bakım Planı ID: ${row.id}`,
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
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-[#F3F4F6] rounded-full mb-4">
                  <FileText className="h-8 w-8 text-[#9CA3AF]" />
                </div>
                <p className="text-lg font-semibold text-[#111827] mb-1">Sonuç bulunamadı</p>
                <p className="text-sm text-[#6B7280] max-w-md">
                  {hasFilterApplied
                    ? 'Seçilen tarih aralığında tamamlanmış bakım kaydı bulunmamaktadır.'
                    : 'Tamamlanmış bakım planı bulunmamaktadır.'}
                </p>
              </div>
            ) : (
              <TableResponsive
                data={plans}
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
