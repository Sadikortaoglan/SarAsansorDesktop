import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function RevisionStandardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Revizyon Standartları</h1>
        <p className="text-muted-foreground">Revizyon tekliflerinde kullanılan standartlar ve kriterler</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Etiket Tipleri</CardTitle>
            <CardDescription>Asansör etiket tipleri ve anlamları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="success" className="w-20 justify-center">GREEN</Badge>
              <p className="text-sm">Yeşil Etiket - Uygun durumda</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-500 text-white hover:bg-blue-600 w-20 justify-center">BLUE</Badge>
              <p className="text-sm">Mavi Etiket - Kontrol gerekli</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="warning" className="w-20 justify-center">YELLOW</Badge>
              <p className="text-sm">Sarı Etiket - Dikkat gerekli</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="expired" className="w-20 justify-center">RED</Badge>
              <p className="text-sm">Kırmızı Etiket - Acil müdahale gerekli</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revizyon Kriterleri</CardTitle>
            <CardDescription>Revizyon tekliflerinde dikkate alınan kriterler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Asansör yaşı ve kullanım süresi</li>
              <li>Son bakım tarihi ve durumu</li>
              <li>Etiket tipi ve geçerlilik süresi</li>
              <li>Mevcut arıza ve sorunlar</li>
              <li>Parça değişim gereksinimleri</li>
              <li>İşçilik maliyetleri</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teklif Durumları</CardTitle>
            <CardDescription>Revizyon tekliflerinin durumları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Taslak</Badge>
              <p className="text-sm">Teklif henüz taslak halinde</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-500 text-white hover:bg-blue-600">Gönderildi</Badge>
              <p className="text-sm">Teklif müşteriye gönderildi</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="success">Kabul Edildi</Badge>
              <p className="text-sm">Teklif müşteri tarafından kabul edildi</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="expired">Reddedildi</Badge>
              <p className="text-sm">Teklif müşteri tarafından reddedildi</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default">Satışa Dönüştürüldü</Badge>
              <p className="text-sm">Teklif satışa dönüştürüldü</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fiyatlandırma</CardTitle>
            <CardDescription>Revizyon tekliflerinde fiyatlandırma kuralları</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Parça fiyatları stok birim fiyatlarından alınır</p>
            <p>• İşçilik maliyetleri işin karmaşıklığına göre belirlenir</p>
            <p>• Toplam tutar = Parça toplamı + İşçilik</p>
            <p>• Teklif PDF formatında oluşturulabilir</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
