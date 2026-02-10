import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionService } from '@/services/inspection.service'
import { elevatorService } from '@/services/elevator.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Plus, Search, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export function InspectionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: inspections, isLoading, refetch } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => inspectionService.getAll(),
  })

  // Güvenli array kontrolü
  const inspectionsArray = Array.isArray(inspections) ? inspections : []
  
  // Debug: Log inspections data - MANDATORY DEBUG STEP
  console.log('Inspections array:', inspectionsArray)
  inspectionsArray.forEach((inspection, index) => {
    console.log(`Inspection row ${index}:`, {
      id: inspection.id,
      inspectionColor: inspection.inspectionColor,
      contactedPersonName: inspection.contactedPersonName,
      sonuc: inspection.sonuc,
      denetimTarihi: inspection.denetimTarihi,
      elevatorBuildingName: inspection.elevatorBuildingName,
      elevatorIdentityNumber: inspection.elevatorIdentityNumber,
    })
  })
  
  // Sort by inspectionDate DESC (newest first)
  const sortedInspections = [...inspectionsArray].sort((a, b) => {
    const dateA = new Date(a.denetimTarihi || '').getTime()
    const dateB = new Date(b.denetimTarihi || '').getTime()
    return dateB - dateA // DESC order
  })
  
  const filteredInspections = sortedInspections.filter(
    (inspection) =>
      inspection.elevatorIdentityNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.elevatorBuildingName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.denetimYapan?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getResultBadge = (result: string) => {
    // Normalize result to handle both PASS/PASSED and FAIL/FAILED
    const normalizedResult = result?.toUpperCase() || 'PENDING'
    
    if (normalizedResult === 'PASS' || normalizedResult === 'PASSED') {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Geçti
        </Badge>
      )
    }
    if (normalizedResult === 'FAIL' || normalizedResult === 'FAILED') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Geçmedi
        </Badge>
      )
    }
    if (normalizedResult === 'PENDING') {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Beklemede
        </Badge>
      )
    }
    return <Badge>{result}</Badge>
  }

  // Inspection color badge - Elevator list'teki gibi
  const getInspectionColorBadge = (color?: string) => {
    // Defensive: Check if color exists and is not empty
    if (!color || !color.trim()) {
      return <Badge variant="secondary">—</Badge>
    }
    
    const normalizedColor = color.toUpperCase().trim()
    
    switch (normalizedColor) {
      case 'GREEN':
        return <Badge variant="success">Yeşil</Badge>
      case 'YELLOW':
        return <Badge variant="warning">Sarı</Badge>
      case 'RED':
        return <Badge variant="expired">Kırmızı</Badge>
      case 'ORANGE':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600">Turuncu</Badge>
      default:
        return <Badge variant="secondary">{color}</Badge>
    }
  }

  // Not: Backend'de delete ve update endpoint'leri yok, bu yüzden bu özellikler kaldırıldı

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Denetimler</h1>
          <p className="text-muted-foreground">Asansör denetim kayıtları</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Denetim Ekle
            </Button>
          </DialogTrigger>
          <InspectionFormDialog
            onClose={() => setIsDialogOpen(false)}
            onSuccess={async () => {
              setIsDialogOpen(false)
              // Force refetch to ensure fresh data
              await queryClient.invalidateQueries({ queryKey: ['inspections'] })
              await refetch()
            }}
          />
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Asansör, bina veya denetim yapan ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TableResponsive
          data={filteredInspections}
          columns={[
            {
              key: 'elevatorIdentityNumber',
              header: 'Asansör',
              mobileLabel: 'Asansör',
              mobilePriority: 10,
              render: (inspection) => <span className="font-medium">{inspection.elevatorIdentityNumber || '-'}</span>,
            },
            {
              key: 'elevatorBuildingName',
              header: 'Bina',
              mobileLabel: 'Bina',
              mobilePriority: 9,
              render: (inspection) => inspection.elevatorBuildingName || '-',
            },
            {
              key: 'denetimTarihi',
              header: 'Denetim Tarihi',
              mobileLabel: 'Denetim Tarihi',
              mobilePriority: 8,
              render: (inspection) => {
                // Debug: Log row data
                console.log('Inspection row:', inspection)
                console.log('inspectionColor:', inspection.inspectionColor)
                console.log('result/sonuc:', inspection.sonuc)
                console.log('contactedPersonName:', inspection.contactedPersonName)
                // Use inspectionDate from backend (mapped to denetimTarihi)
                return formatDateShort(inspection.denetimTarihi || '')
              },
            },
            {
              key: 'inspectionColor',
              header: 'Asansör Rengi',
              mobileLabel: 'Renk',
              mobilePriority: 7,
              render: (inspection) => {
                // Use inspectionColor from backend response
                const color = inspection.inspectionColor
                console.log('Rendering inspectionColor:', color, 'for inspection ID:', inspection.id)
                return getInspectionColorBadge(color)
              },
            },
            {
              key: 'sonuc',
              header: 'Sonuç',
              mobileLabel: 'Sonuç',
              mobilePriority: 6,
              render: (inspection) => {
                // Use result from backend (mapped to sonuc)
                // Backend returns: PASSED, FAILED, PENDING
                // Frontend uses: PASS, FAIL, PENDING (mapped in service)
                const result = inspection.sonuc || 'PENDING'
                console.log('Rendering result:', result, 'for inspection ID:', inspection.id)
                return getResultBadge(result)
              },
            },
            {
              key: 'denetimYapan',
              header: 'Denetim Yapan',
              mobileLabel: 'Denetim Yapan',
              mobilePriority: 5,
              hideOnMobile: true,
              render: (inspection) => inspection.denetimYapan || '-',
            },
            {
              key: 'contactedPersonName',
              header: 'Görüşülen Kişi',
              mobileLabel: 'Görüşülen',
              mobilePriority: 4,
              hideOnMobile: true,
              render: (inspection) => {
                // Use contactedPersonName from backend response
                const name = inspection.contactedPersonName
                console.log('Rendering contactedPersonName:', name, 'for inspection ID:', inspection.id)
                // Show "-" only if truly null/empty
                return name && name.trim() ? name : '-'
              },
            },
            {
              key: 'raporNo',
              header: 'Rapor No',
              mobileLabel: 'Rapor No',
              mobilePriority: 3,
              hideOnMobile: true,
              render: (inspection) => inspection.raporNo || '-',
            },
            {
              key: 'aciklama',
              header: 'Açıklama',
              mobileLabel: 'Açıklama',
              mobilePriority: 2,
              render: (inspection) => <span className="max-w-xs truncate block">{inspection.aciklama || '-'}</span>,
            },
          ]}
          keyExtractor={(inspection) => inspection.id.toString()}
          emptyMessage="Denetim bulunamadı"
        />
      )}
    </div>
  )
}

function InspectionFormDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  // Backend'de update endpoint'i yok, bu yüzden sadece yeni denetim eklenebilir
  const [formData, setFormData] = useState({
    elevatorId: '',
    denetimTarihi: new Date().toISOString().split('T')[0],
    sonuc: 'PENDING' as 'PASS' | 'FAIL' | 'PENDING',
    aciklama: '',
    inspectionColor: '' as 'GREEN' | 'YELLOW' | 'RED' | 'ORANGE' | '',
    contactedPersonName: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: elevators } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  // Güvenli array kontrolü
  const elevatorsArray = Array.isArray(elevators) ? elevators : []

  const createMutation = useMutation({
    mutationFn: (data: { elevatorId: number; denetimTarihi: string; sonuc: 'PASS' | 'FAIL' | 'PENDING'; aciklama?: string; inspectionColor: 'GREEN' | 'YELLOW' | 'RED' | 'ORANGE'; contactedPersonName?: string }) =>
      inspectionService.create(data),
    onSuccess: async (savedInspection) => {
      // Debug: Log saved inspection response
      console.log('Saved inspection response:', savedInspection)
      console.log('Inspection color:', savedInspection.inspectionColor)
      console.log('Contacted person:', savedInspection.contactedPersonName)
      console.log('Result:', savedInspection.sonuc)
      console.log('Full saved inspection object:', JSON.stringify(savedInspection, null, 2))
      
      // Reset form first
      setFormData({
        elevatorId: '',
        denetimTarihi: new Date().toISOString().split('T')[0],
        sonuc: 'PENDING' as 'PASS' | 'FAIL' | 'PENDING',
        aciklama: '',
        inspectionColor: '' as 'GREEN' | 'YELLOW' | 'RED' | 'ORANGE' | '',
        contactedPersonName: '',
      })
      setErrors({})
      
      // Invalidate and refetch inspections list
      await queryClient.invalidateQueries({ queryKey: ['inspections'] })
      await queryClient.refetchQueries({ queryKey: ['inspections'] })
      
      toast({
        title: 'Başarılı',
        description: 'Denetim başarıyla eklendi.',
        variant: 'success',
      })
      onClose()
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Denetim eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.elevatorId) {
      newErrors.elevatorId = 'Lütfen bir asansör seçin.'
    }
    if (!formData.inspectionColor) {
      newErrors.inspectionColor = 'Asansör rengi seçilmelidir.'
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen zorunlu alanları doldurun.',
        variant: 'destructive',
      })
      return
    }
    
    // Backend'de sadece: elevatorId, tarih (denetimTarihi), sonuc, aciklama var
    // denetimYapan ve raporNo backend'de yok, gönderilmiyor
    // Not: Backend'de update endpoint'i yok, bu yüzden sadece create yapılabilir
    const submitData = {
      elevatorId: Number(formData.elevatorId),
      denetimTarihi: formData.denetimTarihi,
      sonuc: formData.sonuc,
      aciklama: formData.aciklama || undefined,
      inspectionColor: formData.inspectionColor as 'GREEN' | 'YELLOW' | 'RED' | 'ORANGE',
      contactedPersonName: formData.contactedPersonName || undefined,
      // denetimYapan ve raporNo backend'de yok
    }
    // Backend'de update endpoint'i olmadığı için sadece create yapılıyor
    createMutation.mutate(submitData)
  }

  return (
    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Yeni Denetim Ekle</DialogTitle>
        <DialogDescription>Yeni denetim bilgilerini girin</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="elevatorId">Asansör *</Label>
            <Select
              value={formData.elevatorId}
              onValueChange={(value) => setFormData({ ...formData, elevatorId: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Asansör seçin" />
              </SelectTrigger>
              <SelectContent>
                {elevatorsArray.map((elevator) => (
                  <SelectItem key={elevator.id} value={elevator.id.toString()}>
                    {elevator.kimlikNo} - {elevator.bina}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="denetimTarihi">Denetim Tarihi *</Label>
              <Input
                id="denetimTarihi"
                type="date"
                value={formData.denetimTarihi}
                onChange={(e) => setFormData({ ...formData, denetimTarihi: e.target.value })}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sonuc">Sonuç *</Label>
              <Select
                value={formData.sonuc}
                onValueChange={(value: 'PASS' | 'FAIL' | 'PENDING') =>
                  setFormData({ ...formData, sonuc: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">Geçti</SelectItem>
                  <SelectItem value="FAIL">Geçmedi</SelectItem>
                  <SelectItem value="PENDING">Beklemede</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspectionColor">Asansör Rengi *</Label>
            <Select
              value={formData.inspectionColor}
              onValueChange={(value) => {
                setFormData({ ...formData, inspectionColor: value as 'GREEN' | 'YELLOW' | 'RED' | 'ORANGE' })
                setErrors((prev) => ({ ...prev, inspectionColor: '' }))
              }}
              required
            >
              <SelectTrigger className={`w-full ${errors.inspectionColor ? 'border-destructive' : ''}`}>
                <SelectValue placeholder="Asansör rengi seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GREEN">Yeşil</SelectItem>
                <SelectItem value="YELLOW">Sarı</SelectItem>
                <SelectItem value="RED">Kırmızı</SelectItem>
                <SelectItem value="ORANGE">Turuncu</SelectItem>
              </SelectContent>
            </Select>
            {errors.inspectionColor && (
              <p className="text-sm text-destructive">{errors.inspectionColor}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactedPersonName">Görüşülen Kişi</Label>
            <Input
              id="contactedPersonName"
              type="text"
              placeholder="Görüşülen kişi adı (opsiyonel)"
              value={formData.contactedPersonName}
              onChange={(e) => setFormData({ ...formData, contactedPersonName: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama</Label>
            <Input
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px]">
            İptal
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || !formData.elevatorId || !formData.inspectionColor} 
            className="w-full sm:w-auto min-h-[44px]"
          >
            Ekle
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

