import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { edmService, type VknValidationResponse } from './edm.service'

export function EdmVknValidatePage() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<VknValidationResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleValidate = async () => {
    if (!value.trim()) return
    setLoading(true)
    try {
      const res = await edmService.validateVkn(value)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>VKN / TCKN Sorgula</CardTitle>
        <Button variant="outline" onClick={() => navigate('/edm/invoices/incoming')}>Listeye Dön</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="10 haneli VKN veya 11 haneli TCKN" />
          <Button onClick={handleValidate} disabled={loading}>{loading ? 'Sorgulanıyor...' : 'Sorgula'}</Button>
        </div>
        {result && (
          <div className="rounded border p-3 text-sm">
            <p><b>Geçerli:</b> {result.valid ? 'Evet' : 'Hayır'}</p>
            <p><b>Tip:</b> {result.type}</p>
            <p><b>Mesaj:</b> {result.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
