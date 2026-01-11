import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { offerService, type Offer } from '@/services/offer.service'
import { partService } from '@/services/part.service'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, Trash2, Download } from 'lucide-react'
import { formatDateShort, formatCurrency } from '@/lib/utils'

export function OffersPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: offers, isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: () => offerService.getAll(),
  })

  // Güvenli array kontrolü
  const offersArray = Array.isArray(offers) ? offers : []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => offerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      toast({
        title: 'Başarılı',
        description: 'Teklif başarıyla silindi.',
        variant: 'success',
      })
    },
  })

  const handleDelete = (id: number) => {
    if (window.confirm('Bu teklifi silmek istediğinize emin misiniz?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleExportPdf = async (id: number) => {
    try {
      const blob = await offerService.exportPdf(id)
      if (!blob) {
        toast({
          title: 'Hata',
          description: 'PDF export endpoint mevcut değil.',
          variant: 'destructive',
        })
        return
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `teklif-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Başarılı',
        description: 'PDF başarıyla indirildi.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'PDF indirilemedi.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teklifler</h1>
          <p className="text-muted-foreground">Tüm tekliflerin listesi</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Teklif Oluştur
            </Button>
          </DialogTrigger>
          <OfferFormDialog
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['offers'] })
            }}
          />
        </Dialog>
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
                <TableHead>Teklif No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Teklif Tarihi</TableHead>
                <TableHead>Geçerlilik</TableHead>
                <TableHead>Toplam Tutar</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offersArray.length > 0 ? (
                offersArray.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">#{offer.id}</TableCell>
                    <TableCell>{offer.customerName}</TableCell>
                    <TableCell>{formatDateShort(offer.offerDate)}</TableCell>
                    <TableCell>{formatDateShort(offer.validUntil)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(offer.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <OfferDetailDialog offer={offer} />
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExportPdf(offer.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(offer.id)}
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
                    Teklif bulunamadı
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

function OfferFormDialog({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [] as Array<{ partId: number; quantity: number; unitPrice: number }>,
  })
  const [selectedPartId, setSelectedPartId] = useState<string>('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const { toast } = useToast()

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: () => partService.getAll(),
  })

  // Güvenli array kontrolü
  const partsArray = Array.isArray(parts) ? parts : []

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => offerService.create(data),
    onSuccess: () => {
      toast({
        title: 'Başarılı',
        description: 'Teklif başarıyla oluşturuldu.',
        variant: 'success',
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Teklif oluşturulurken bir hata oluştu.',
        variant: 'destructive',
      })
    },
  })

  const handleAddItem = () => {
    const part = partsArray.find((p) => p.id === Number(selectedPartId))
    if (part && selectedPartId && itemQuantity > 0) {
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          { partId: Number(selectedPartId), quantity: itemQuantity, unitPrice: part.unitPrice },
        ],
      })
      setSelectedPartId('')
      setItemQuantity(1)
    }
  }

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.items.length === 0) {
      toast({
        title: 'Hata',
        description: 'En az bir kalem eklemelisiniz.',
        variant: 'destructive',
      })
      return
    }
    createMutation.mutate(formData)
  }

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  )

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Yeni Teklif Oluştur</DialogTitle>
        <DialogDescription>Teklif bilgilerini ve kalemlerini girin</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Müşteri Adı *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Telefon</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerAddress">Adres</Label>
            <Input
              id="customerAddress"
              value={formData.customerAddress}
              onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Geçerlilik Tarihi *</Label>
            <Input
              id="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              required
            />
          </div>

          <div className="border-t pt-4">
            <Label className="text-lg font-semibold">Kalemler</Label>
            <div className="mt-2 flex gap-2">
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Parça seçin" />
                </SelectTrigger>
                <SelectContent>
                  {partsArray.map((part) => (
                    <SelectItem key={part.id} value={part.id.toString()}>
                      {part.name} - {formatCurrency(part.unitPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Miktar"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(Number(e.target.value))}
                className="w-24"
                min="1"
              />
              <Button type="button" onClick={handleAddItem}>
                Ekle
              </Button>
            </div>

            {formData.items.length > 0 && (
              <div className="mt-4 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parça</TableHead>
                      <TableHead>Miktar</TableHead>
                      <TableHead>Birim Fiyat</TableHead>
                      <TableHead>Toplam</TableHead>
                      <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => {
                      const part = partsArray.find((p) => p.id === item.partId)
                      return (
                        <TableRow key={index}>
                          <TableCell>{part?.name || '-'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell>{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <div className="p-4 border-t">
                  <div className="flex justify-end">
                    <div className="text-lg font-bold">
                      Toplam: {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={createMutation.isPending}>
            Oluştur
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function OfferDetailDialog({ offer }: { offer: Offer }) {
  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Teklif Detayı #{offer.id}</DialogTitle>
        <DialogDescription>{offer.customerName}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Müşteri</Label>
            <p className="font-medium">{offer.customerName}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Telefon</Label>
            <p className="font-medium">{offer.customerPhone || '-'}</p>
          </div>
        </div>
        {offer.customerAddress && (
          <div>
            <Label className="text-muted-foreground">Adres</Label>
            <p className="font-medium">{offer.customerAddress}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Teklif Tarihi</Label>
            <p className="font-medium">{formatDateShort(offer.offerDate)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Geçerlilik</Label>
            <p className="font-medium">{formatDateShort(offer.validUntil)}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <Label className="text-lg font-semibold">Kalemler</Label>
          <div className="mt-2 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parça</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Birim Fiyat</TableHead>
                  <TableHead>Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offer.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.part?.name || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell>{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t">
              <div className="flex justify-end">
                <div className="text-xl font-bold">
                  Toplam: {formatCurrency(offer.totalAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}

