import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inspectionService } from '@/services/inspection.service'
import { elevatorService } from '@/services/elevator.service'
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

  const { data: inspections, isLoading } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => inspectionService.getAll(),
  })

  // Güvenli array kontrolü
  const inspectionsArray = Array.isArray(inspections) ? inspections : []
  const filteredInspections = inspectionsArray.filter(
    (inspection) =>
      inspection.elevator?.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inspection.elevator?.bina || inspection.elevator?.binaAdi)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.denetimYapan?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASS':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Geçti
          </Badge>
        )
      case 'FAIL':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Geçmedi
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Beklemede
          </Badge>
        )
      default:
        return <Badge>{result}</Badge>
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
            onSuccess={() => {
              setIsDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['inspections'] })
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asansör</TableHead>
                <TableHead>Bina</TableHead>
                <TableHead>Denetim Tarihi</TableHead>
                <TableHead>Denetim Yapan</TableHead>
                <TableHead>Sonuç</TableHead>
                <TableHead>Rapor No</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections && filteredInspections.length > 0 ? (
                filteredInspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">
                      {inspection.elevator?.kimlikNo || '-'}
                    </TableCell>
                    <TableCell>{inspection.elevator?.bina || inspection.elevator?.binaAdi || '-'}</TableCell>
                    <TableCell>{formatDateShort(inspection.denetimTarihi)}</TableCell>
                    <TableCell>{inspection.denetimYapan || '-'}</TableCell>
                    <TableCell>{getResultBadge(inspection.sonuc)}</TableCell>
                    <TableCell>{inspection.raporNo || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {inspection.aciklama || '-'}
                    </TableCell>
                    {/* İşlemler butonları kaldırıldı - Backend'de update/delete endpoint'leri yok */}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Denetim bulunamadı
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
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: elevators } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  // Güvenli array kontrolü
  const elevatorsArray = Array.isArray(elevators) ? elevators : []

  const createMutation = useMutation({
    mutationFn: (data: { elevatorId: number; denetimTarihi: string; sonuc: 'PASS' | 'FAIL' | 'PENDING'; aciklama?: string }) =>
      inspectionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      toast({
        title: 'Başarılı',
        description: 'Denetim başarıyla eklendi.',
        variant: 'success',
      })
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
    if (!formData.elevatorId) {
      toast({
        title: 'Hata',
        description: 'Lütfen bir asansör seçin.',
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
      // denetimYapan ve raporNo backend'de yok
    }
    // Backend'de update endpoint'i olmadığı için sadece create yapılıyor
    createMutation.mutate(submitData)
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Yeni Denetim Ekle</DialogTitle>
        <DialogDescription>Yeni denetim bilgilerini girin (Backend'de update endpoint'i yok, sadece ekleme yapılabilir)</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="elevatorId">Asansör *</Label>
            <Select
              value={formData.elevatorId}
              onValueChange={(value) => setFormData({ ...formData, elevatorId: value })}
            >
              <SelectTrigger>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="denetimTarihi">Denetim Tarihi *</Label>
              <Input
                id="denetimTarihi"
                type="date"
                value={formData.denetimTarihi}
                onChange={(e) => setFormData({ ...formData, denetimTarihi: e.target.value })}
                required
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
                <SelectTrigger>
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
          {/* denetimYapan ve raporNo backend'de yok, form'da gösterilmiyor */}
          {/* Ancak backend'den gelen verilerde varsa gösterilebilir */}
          <div className="space-y-2">
            <Label htmlFor="aciklama">Açıklama</Label>
            <Input
              id="aciklama"
              value={formData.aciklama}
              onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            Ekle
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

