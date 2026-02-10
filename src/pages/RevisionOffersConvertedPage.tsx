import { RevisionOffersPage } from './RevisionOffersPage'
import { useQuery } from '@tanstack/react-query'
import { revisionOfferService } from '@/services/revision-offer.service'
import { useState } from 'react'
import { TableResponsive } from '@/components/ui/table-responsive'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, Edit, Trash2 } from 'lucide-react'
import { formatDateShort, formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export function RevisionOffersConvertedPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: offers, isLoading } = useQuery({
    queryKey: ['revision-offers', 'converted'],
    queryFn: () => revisionOfferService.getAll({ converted: true }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => revisionOfferService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revision-offers'] })
      toast({
        title: 'Başarılı',
        description: 'Revizyon teklifi başarıyla silindi.',
        variant: 'success',
      })
    },
  })

  const generatePDFMutation = useMutation({
    mutationFn: (id: number) => revisionOfferService.generatePDF(id),
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `revizyon-teklifi-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Başarılı',
        description: 'PDF başarıyla indirildi.',
        variant: 'success',
      })
    },
  })

  const offersArray = Array.isArray(offers) ? offers.filter((o) => o.status === 'CONVERTED') : []
  const filteredOffers = offersArray.filter(
    (offer) =>
      offer.offerNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.elevatorIdentityNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.elevatorBuildingName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.saleNo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Satışa Dönüştürülen Revizyon Teklifleri</h1>
        <p className="text-muted-foreground">Satışa dönüştürülmüş revizyon tekliflerinin listesi</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Teklif No, Asansör, Bina veya Satış No ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TableResponsive
          data={filteredOffers}
          columns={[
            {
              key: 'offerNo',
              header: 'Teklif No',
              mobileLabel: 'Teklif No',
              mobilePriority: 10,
              render: (offer) => <span className="font-medium">{offer.offerNo || `#${offer.id}`}</span>,
            },
            {
              key: 'saleNo',
              header: 'Satış No',
              mobileLabel: 'Satış No',
              mobilePriority: 9,
              render: (offer) => offer.saleNo || '—',
            },
            {
              key: 'elevatorIdentityNumber',
              header: 'Asansör',
              mobileLabel: 'Asansör',
              mobilePriority: 8,
            },
            {
              key: 'elevatorBuildingName',
              header: 'Bina',
              mobileLabel: 'Bina',
              mobilePriority: 7,
            },
            {
              key: 'totalPrice',
              header: 'Toplam Tutar',
              mobileLabel: 'Tutar',
              mobilePriority: 6,
              render: (offer) => formatCurrency(offer.totalPrice),
            },
            {
              key: 'createdAt',
              header: 'Oluşturma Tarihi',
              mobileLabel: 'Tarih',
              mobilePriority: 5,
              hideOnMobile: true,
              render: (offer) => formatDateShort(offer.createdAt),
            },
            {
              key: 'actions',
              header: 'İşlemler',
              mobileLabel: '',
              mobilePriority: 1,
              hideOnMobile: false,
              render: (offer) => (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => generatePDFMutation.mutate(offer.id)}
                    className="h-11 w-11 sm:h-10 sm:w-10"
                    title="PDF İndir"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ]}
          keyExtractor={(offer) => String(offer.id)}
          emptyMessage="Satışa dönüştürülmüş revizyon teklifi bulunamadı"
        />
      )}
    </div>
  )
}
