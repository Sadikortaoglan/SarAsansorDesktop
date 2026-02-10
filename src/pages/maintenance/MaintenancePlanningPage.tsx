import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Building2, CheckSquare, Square, Info, Calendar as CalendarIcon } from 'lucide-react'
import { elevatorService } from '@/services/elevator.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface PlannedMaintenance {
  date: string
  elevatorIds: number[]
}

export function MaintenancePlanningPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all')
  const [selectedElevators, setSelectedElevators] = useState<Set<number>>(new Set())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [plannedMaintenances, setPlannedMaintenances] = useState<PlannedMaintenance[]>([])

  const { data: elevators = [], isLoading } = useQuery({
    queryKey: ['elevators', 'for-planning'],
    queryFn: () => elevatorService.getAll(),
  })

  const toggleElevatorSelection = (elevatorId: number) => {
    const newSelected = new Set(selectedElevators)
    if (newSelected.has(elevatorId)) {
      newSelected.delete(elevatorId)
    } else {
      newSelected.add(elevatorId)
    }
    setSelectedElevators(newSelected)
  }

  const filteredElevators = elevators.filter((elevator) => {
    const matchesSearch =
      searchTerm === '' ||
      elevator.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.bina?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      elevator.adres?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const groupedElevators = filteredElevators.reduce((acc, elevator) => {
    const building = elevator.bina || 'Diğer'
    if (!acc[building]) {
      acc[building] = []
    }
    acc[building].push(elevator)
    return acc
  }, {} as Record<string, typeof elevators>)

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const handleDayClick = (date: Date) => {
    if (selectedElevators.size === 0) {
      toast({
        title: 'Uyarı',
        description: 'Lütfen önce asansör seçin',
        variant: 'destructive',
      })
      return
    }

    const dateStr = date.toISOString().split('T')[0]
    const existing = plannedMaintenances.find((p) => p.date === dateStr)

    if (existing) {
      // Check for conflicts
      const conflicts = Array.from(selectedElevators).filter((id) =>
        existing.elevatorIds.includes(id)
      )
      if (conflicts.length > 0) {
        toast({
          title: 'Çakışma',
          description: `${conflicts.length} asansör bu tarihe zaten planlanmış`,
          variant: 'destructive',
        })
        return
      }
      // Add to existing
      existing.elevatorIds.push(...Array.from(selectedElevators))
    } else {
      // Create new
      plannedMaintenances.push({
        date: dateStr,
        elevatorIds: Array.from(selectedElevators),
      })
    }

    setPlannedMaintenances([...plannedMaintenances])
    toast({
      title: 'Başarılı',
      description: `${selectedElevators.size} asansör ${dateStr} tarihine planlandı`,
    })
  }

  const getPlannedCount = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const planned = plannedMaintenances.find((p) => p.date === dateStr)
    return planned ? planned.elevatorIds.length : 0
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const monthNames = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bakım Planla</h1>
          <p className="text-muted-foreground mt-1">
            Asansörleri seçin ve takvime sürükleyerek bakım planlayın
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Elevator Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asansör Seçimi</CardTitle>
              <CardDescription>
                {selectedElevators.size > 0 && (
                  <Badge variant="active" className="mt-2">
                    {selectedElevators.size} asansör seçildi
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Asansör ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bölge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Bölgeler</SelectItem>
                    {/* Add regions from data */}
                  </SelectContent>
                </Select>
                <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Binalar</SelectItem>
                    {Object.keys(groupedElevators).map((building) => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Elevator List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {Object.entries(groupedElevators).map(([building, buildingElevators]) => (
                  <div key={building} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Building2 className="h-4 w-4" />
                      {building}
                    </div>
                    {buildingElevators.map((elevator) => (
                      <div
                        key={elevator.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          selectedElevators.has(elevator.id)
                            ? 'bg-indigo-50 border-indigo-500'
                            : 'bg-white border-gray-200 hover:border-indigo-300'
                        )}
                        onClick={() => toggleElevatorSelection(elevator.id)}
                      >
                        {selectedElevators.has(elevator.id) ? (
                          <CheckSquare className="h-5 w-5 text-indigo-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {elevator.kimlikNo || `ELEV-${elevator.id}`}
                          </div>
                          <div className="text-xs text-muted-foreground">{elevator.adres}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Nasıl Kullanılır?</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Sol panelden asansörleri seçin</li>
                    <li>Takvimde bir güne tıklayın</li>
                    <li>Seçili asansörler o tarihe planlanır</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </CardTitle>
                  <CardDescription>Bakım planlaması takvimi</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    ← Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Bugün
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    Sonraki →
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-gray-600 py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {getDaysInMonth().map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-20" />
                  }

                  const isToday =
                    date.toDateString() === new Date().toDateString()
                  const plannedCount = getPlannedCount(date)
                  const isPast = date < new Date() && !isToday

                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        'h-20 border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md',
                        isPast && 'bg-gray-50 opacity-50',
                        isToday && 'border-indigo-500 border-2',
                        plannedCount > 0 && 'bg-indigo-50 border-indigo-300'
                      )}
                      onClick={() => !isPast && handleDayClick(date)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isToday && 'text-indigo-600 font-bold'
                          )}
                        >
                          {date.getDate()}
                        </span>
                        {plannedCount > 0 && (
                          <Badge
                            variant="active"
                            className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                          >
                            {plannedCount}
                          </Badge>
                        )}
                      </div>
                      {plannedCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {plannedCount} bakım
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
