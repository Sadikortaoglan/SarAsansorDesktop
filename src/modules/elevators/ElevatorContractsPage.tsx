import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { PaginatedTable } from '@/modules/shared/components/PaginatedTable'
import { elevatorDocumentsService } from './elevator-documents.service'

export function ElevatorContractsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [elevatorIdFilter, setElevatorIdFilter] = useState('')

  const query = useQuery({
    queryKey: ['elevator-contracts', page, size, elevatorIdFilter],
    queryFn: () =>
      elevatorDocumentsService.getContracts(page, size, elevatorIdFilter ? Number(elevatorIdFilter) : undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => elevatorDocumentsService.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elevator-contracts'] })
      toast({ title: 'Başarılı', description: 'Sözleşme silindi', variant: 'success' })
    },
    onError: (error: any) => {
      toast({ title: 'Hata', description: error.message || 'Silme başarısız', variant: 'destructive' })
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Asansör Sözleşmeleri</CardTitle>
        <Button onClick={() => navigate('/elevator-contracts/new')}>Yeni Sözleşme</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Elevator ID filtre" value={elevatorIdFilter} onChange={(e) => setElevatorIdFilter(e.target.value)} />
          <Button variant="outline" onClick={() => setPage(0)}>Filtrele</Button>
        </div>

        <PaginatedTable
          pageData={query.data}
          loading={query.isLoading}
          onPageChange={setPage}
          columns={[
            { key: 'id', header: 'ID', render: (r) => r.id },
            { key: 'elevatorId', header: 'Asansör', render: (r) => `${r.elevatorId} ${r.elevatorName ?? ''}` },
            { key: 'contractDate', header: 'Sözleşme Tarihi', render: (r) => r.contractDate },
            { key: 'filePath', header: 'Dosya', render: (r) => r.filePath || '-' },
            {
              key: 'actions',
              header: 'İşlem',
              render: (r) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/elevator-contracts/${r.id}/edit`, { state: { record: r } })}>Düzenle</Button>
                  <Button size="sm" variant="destructive" onClick={() => r.id && deleteMutation.mutate(r.id)}>Sil</Button>
                </div>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}
