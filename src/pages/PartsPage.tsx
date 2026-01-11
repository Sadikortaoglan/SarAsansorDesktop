import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { partService, type Part } from '@/services/part.service'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function PartsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: parts, isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: () => partService.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => partService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast({
        title: 'Başarılı',
        description: 'Parça başarıyla silindi.',
        variant: 'success',
      })
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Parça silinirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  // Güvenli array kontrolü
  const partsArray = Array.isArray(parts) ? parts : []
  const filteredParts = partsArray.filter(
    (part) => part.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = (id: number) => {
    if (window.confirm('Bu parçayı silmek istediğinize emin misiniz?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stok / Parçalar</h1>
          <p className="text-muted-foreground">Tüm parçaların ve stok seviyelerinin listesi</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedPart(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Parça Ekle
            </Button>
          </DialogTrigger>
          <PartFormDialog
            part={selectedPart}
            onClose={() => setIsDialogOpen(false)}
            onSuccess={() => {
              setIsDialogOpen(false)
              queryClient.invalidateQueries({ queryKey: ['parts'] })
            }}
          />
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Parça adı ile ara..."
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
                <TableHead>Parça Adı</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Stok Seviyesi</TableHead>
                <TableHead>Birim Fiyat</TableHead>
                <TableHead>Toplam Değer</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts && filteredParts.length > 0 ? (
                filteredParts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell>{part.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={part.stockLevel < 10 ? 'destructive' : 'default'}>
                        {part.stockLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(part.unitPrice)}</TableCell>
                    <TableCell>{formatCurrency(part.stockLevel * part.unitPrice)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPart(part)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(part.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Parça bulunamadı
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

function PartFormDialog({
  part,
  onClose,
  onSuccess,
}: {
  part: Part | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: part?.name || '',
    description: part?.description || '',
    stockLevel: part?.stockLevel || 0,
    unitPrice: part?.unitPrice || 0,
  })
  const { toast } = useToast()

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => partService.create(data),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Parça başarıyla eklendi.',
        variant: 'success',
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Parça eklenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!part) throw new Error('Part ID required')
      return partService.update(part.id, data)
    },
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Parça başarıyla güncellendi.',
        variant: 'success',
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Parça güncellenirken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (part) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{part ? 'Parça Düzenle' : 'Yeni Parça Ekle'}</DialogTitle>
        <DialogDescription>
          {part ? 'Parça bilgilerini güncelleyin' : 'Yeni parça bilgilerini girin'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Parça Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stockLevel">Stok Seviyesi *</Label>
              <Input
                id="stockLevel"
                type="number"
                value={formData.stockLevel}
                onChange={(e) => setFormData({ ...formData, stockLevel: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Birim Fiyat *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                required
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {part ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

