import { useState } from 'react'
import { Calendar, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDateForAPI, convertDateTimeToLocalDate } from '@/lib/date-utils'

interface DateRangeFilterBarProps {
  onFilter: (dateFrom: string, dateTo: string) => void
  isLoading?: boolean
  className?: string
}

export function DateRangeFilterBar({ onFilter, isLoading = false, className }: DateRangeFilterBarProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date()
    let from = new Date()
    let to = new Date()

    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        const dayOfWeek = now.getDay()
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 6)
        break
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1)
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'year':
        from = new Date(now.getFullYear(), 0, 1)
        to = new Date(now.getFullYear(), 11, 31)
        break
    }

    // Format as LocalDate (YYYY-MM-DD) for API
    const fromStr = formatDateForAPI(from)
    const toStr = formatDateForAPI(to)

    // For datetime-local input, we need to show time but send only date
    // Set to start of day for display
    const fromDisplay = `${fromStr}T00:00`
    const toDisplay = `${toStr}T23:59`

    setDateFrom(fromDisplay)
    setDateTo(toDisplay)
    // Send only LocalDate to backend
    onFilter(fromStr, toStr)
  }

  const handleFilter = () => {
    if (dateFrom && dateTo) {
      try {
        // Convert datetime inputs to LocalDate format (YYYY-MM-DD only)
        const fromLocalDate = convertDateTimeToLocalDate(dateFrom)
        const toLocalDate = convertDateTimeToLocalDate(dateTo)
        // Send only LocalDate format to parent
        onFilter(fromLocalDate, toLocalDate)
      } catch (error) {
        console.error('Date conversion error:', error)
        // Fallback: try to extract date part manually
        const fromFallback = dateFrom.includes('T') ? dateFrom.split('T')[0] : dateFrom
        const toFallback = dateTo.includes('T') ? dateTo.split('T')[0] : dateTo
        onFilter(fromFallback, toFallback)
      }
    }
  }

  return (
    <Card className={cn('mb-6', className)}>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Icon Tile */}
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md flex-shrink-0">
            <Calendar className="h-6 w-6" />
          </div>

          {/* Date Inputs */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="space-y-2">
              <Label htmlFor="dateFrom" className="text-sm font-medium">
                Başlangıç Tarihi
              </Label>
              <Input
                id="dateFrom"
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo" className="text-sm font-medium">
                Bitiş Tarihi
              </Label>
              <Input
                id="dateTo"
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Filter Button */}
          <Button
            onClick={handleFilter}
            disabled={!dateFrom || !dateTo || isLoading}
            className="w-full lg:w-auto min-w-[120px] bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtrele
          </Button>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('today')}
              disabled={isLoading}
              className="text-xs"
            >
              Bugün
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('week')}
              disabled={isLoading}
              className="text-xs"
            >
              Bu Hafta
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('month')}
              disabled={isLoading}
              className="text-xs"
            >
              Bu Ay
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('year')}
              disabled={isLoading}
              className="text-xs"
            >
              Bu Yıl
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
