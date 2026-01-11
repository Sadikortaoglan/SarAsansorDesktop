import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { faultService, type Fault } from '@/services/fault.service'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export function FaultsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: openFaults, isLoading: openLoading } = useQuery({
    queryKey: ['faults', 'open'],
    queryFn: () => faultService.getOpen(),
  })

  const { data: completedFaults, isLoading: completedLoading } = useQuery({
    queryKey: ['faults', 'completed'],
    queryFn: () => faultService.getCompleted(),
  })

  // Güvenli array kontrolü
  const openFaultsArray = Array.isArray(openFaults) ? openFaults : []
  const completedFaultsArray = Array.isArray(completedFaults) ? completedFaults : []
  
  const filteredOpenFaults = openFaultsArray.filter(
    (fault) =>
      fault.elevator?.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fault.elevator?.bina || fault.elevator?.binaAdi)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fault.arizaKonusu?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCompletedFaults = completedFaultsArray.filter(
    (fault) =>
      fault.elevator?.kimlikNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fault.elevator?.bina || fault.elevator?.binaAdi)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fault.arizaKonusu?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Arıza İşlemleri</h1>
          <p className="text-muted-foreground">Açık ve tamamlanan arızaların yönetimi</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Arıza Ekle
            </Button>
          </DialogTrigger>
          <FaultFormDialog
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['faults'] })
            }}
          />
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Asansör, bina veya arıza konusu ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Açık Arızalar ({openFaults?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Tamamlanan Arızalar ({completedFaults?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          {openLoading ? (
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
                    <TableHead>Görüşülen Kişi</TableHead>
                    <TableHead>Arıza Konusu</TableHead>
                    <TableHead>Mesaj</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOpenFaults && filteredOpenFaults.length > 0 ? (
                    filteredOpenFaults.map((fault) => (
                      <FaultTableRow key={fault.id} fault={fault} />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Açık arıza bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedLoading ? (
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
                    <TableHead>Görüşülen Kişi</TableHead>
                    <TableHead>Arıza Konusu</TableHead>
                    <TableHead>Mesaj</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompletedFaults && filteredCompletedFaults.length > 0 ? (
                    filteredCompletedFaults.map((fault) => (
                      <FaultTableRow key={fault.id} fault={fault} />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Tamamlanan arıza bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FaultTableRow({ fault }: { fault: Fault }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const updateStatusMutation = useMutation({
    mutationFn: (status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED') =>
      faultService.updateStatus(fault.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faults'] })
      toast({
        title: 'Başarılı',
        description: 'Arıza durumu güncellendi.',
        variant: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Durum güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="expired">Açık</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="warning">Devam Ediyor</Badge>
      case 'COMPLETED':
        return <Badge variant="success">Tamamlandı</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {fault.elevator?.kimlikNo || '-'}
      </TableCell>
      <TableCell>{fault.elevator?.bina || fault.elevator?.binaAdi || '-'}</TableCell>
      <TableCell>{fault.gorusulenKisi}</TableCell>
      <TableCell>{fault.arizaKonusu}</TableCell>
      <TableCell className="max-w-xs truncate">{fault.mesaj}</TableCell>
      <TableCell>{getStatusBadge(fault.durum)}</TableCell>
      <TableCell>{formatDateShort(fault.olusturmaTarihi)}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {fault.durum !== 'COMPLETED' && (
            <Select
              value={fault.durum}
              onValueChange={(value: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED') => {
                if (window.confirm('Durumu güncellemek istediğinize emin misiniz?')) {
                  updateStatusMutation.mutate(value)
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Açık</SelectItem>
                <SelectItem value="IN_PROGRESS">Devam Ediyor</SelectItem>
                <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function FaultFormDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    elevatorId: '',
    gorusulenKisi: '',
    arizaKonusu: '',
    mesaj: '',
    aciklama: '',
  })
  const { toast } = useToast()

  const { data: elevators } = useQuery({
    queryKey: ['elevators'],
    queryFn: () => elevatorService.getAll(),
  })

  // Güvenli array kontrolü
  const elevatorsArray = Array.isArray(elevators) ? elevators : []

  const createMutation = useMutation({
    mutationFn: (data: { elevatorId: number; gorusulenKisi: string; arizaKonusu: string; mesaj: string; aciklama?: string }) =>
      faultService.create(data),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Arıza başarıyla eklendi.',
        variant: 'success',
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Arıza eklenirken bir hata oluştu.',
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
    createMutation.mutate({
      elevatorId: Number(formData.elevatorId),
      gorusulenKisi: formData.gorusulenKisi,
      arizaKonusu: formData.arizaKonusu,
      mesaj: formData.mesaj,
      aciklama: formData.aciklama || undefined,
    })
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Yeni Arıza Ekle</DialogTitle>
        <DialogDescription>Arıza bilgilerini girin</DialogDescription>
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
          <div className="space-y-2">
            <Label htmlFor="gorusulenKisi">Görüşülen Kişi *</Label>
            <Input
              id="gorusulenKisi"
              value={formData.gorusulenKisi}
              onChange={(e) => setFormData({ ...formData, gorusulenKisi: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="arizaKonusu">Arıza Konusu *</Label>
            <Input
              id="arizaKonusu"
              value={formData.arizaKonusu}
              onChange={(e) => setFormData({ ...formData, arizaKonusu: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mesaj">Mesaj *</Label>
            <Input
              id="mesaj"
              value={formData.mesaj}
              onChange={(e) => setFormData({ ...formData, mesaj: e.target.value })}
              required
            />
          </div>
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

