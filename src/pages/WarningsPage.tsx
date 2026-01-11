import { useQuery } from '@tanstack/react-query'
import { warningService } from '@/services/warning.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Clock } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export function WarningsPage() {
  const { data: expiredWarnings, isLoading: expiredLoading } = useQuery({
    queryKey: ['warnings', 'EXPIRED'],
    queryFn: () => warningService.getExpired(),
  })

  const { data: warningWarnings, isLoading: warningLoading } = useQuery({
    queryKey: ['warnings', 'WARNING'],
    queryFn: () => warningService.getWarnings(),
  })

  // Güvenli array kontrolü
  const expiredWarningsArray = Array.isArray(expiredWarnings) ? expiredWarnings : []
  const warningWarningsArray = Array.isArray(warningWarnings) ? warningWarnings : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Uyarılar</h1>
        <p className="text-muted-foreground">Süresi geçen ve uyarı veren asansörler</p>
      </div>

      <Tabs defaultValue="expired" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Süresi Geçenler ({expiredWarningsArray.length})
          </TabsTrigger>
          <TabsTrigger value="warning" className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            30 Gün Kalanlar ({warningWarningsArray.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expired" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Süresi Geçen Asansörler</CardTitle>
              <CardDescription>Bakım süresi geçmiş asansörlerin listesi</CardDescription>
            </CardHeader>
            <CardContent>
              {expiredLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : expiredWarningsArray.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kimlik No</TableHead>
                        <TableHead>Bina</TableHead>
                        <TableHead>Adres</TableHead>
                        <TableHead>Bitiş Tarihi</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiredWarningsArray.map((warning) => (
                        <TableRow key={warning.id}>
                          <TableCell className="font-medium">
                            {warning.elevator?.kimlikNo || '-'}
                          </TableCell>
                          <TableCell>{warning.elevator?.bina || warning.elevator?.binaAdi || '-'}</TableCell>
                          <TableCell>{warning.elevator?.adres || '-'}</TableCell>
                          <TableCell>
                            {warning.elevator?.bitisTarihi 
                              ? formatDateShort(warning.elevator.bitisTarihi) 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="expired">Süresi Geçti</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  Süresi geçen asansör bulunmamaktadır.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>30 Gün Kalan Asansörler</CardTitle>
              <CardDescription>Bakım süresi yaklaşan asansörlerin listesi</CardDescription>
            </CardHeader>
            <CardContent>
              {warningLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : warningWarningsArray.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kimlik No</TableHead>
                        <TableHead>Bina</TableHead>
                        <TableHead>Adres</TableHead>
                        <TableHead>Bitiş Tarihi</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {warningWarningsArray.map((warning) => (
                        <TableRow key={warning.id}>
                          <TableCell className="font-medium">
                            {warning.elevator?.kimlikNo || '-'}
                          </TableCell>
                          <TableCell>{warning.elevator?.bina || warning.elevator?.binaAdi || '-'}</TableCell>
                          <TableCell>{warning.elevator?.adres || '-'}</TableCell>
                          <TableCell>
                            {warning.elevator?.bitisTarihi 
                              ? formatDateShort(warning.elevator.bitisTarihi) 
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="warning">Uyarı</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  30 gün içinde süresi dolacak asansör bulunmamaktadır.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

