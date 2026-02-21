import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { QrCode, Download, FileDown, Loader2 } from 'lucide-react'
import apiClient from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

interface ElevatorQRCodeProps {
  elevatorId: number
  elevatorName?: string // Reserved for future use
}

export function ElevatorQRCode({ elevatorId }: ElevatorQRCodeProps) {
  const { toast } = useToast()
  const [isDownloadingPNG, setIsDownloadingPNG] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

  // Fetch QR code image URL
  const { data: qrImageUrl, isLoading, error: qrError } = useQuery({
    queryKey: ['elevator-qr', elevatorId],
    queryFn: async () => {
      try {
        // Generate data URL from backend QR image
        const response = await apiClient.get(
          `${API_ENDPOINTS.ELEVATORS.QR(elevatorId)}`,
          {
            responseType: 'blob',
          }
        )
        
        const blob = new Blob([response.data], { type: 'image/png' })
        return URL.createObjectURL(blob)
      } catch (error: any) {
        console.error('Failed to load QR code:', error)
        const errorMessage = error.response?.data?.message || 
          error.message || 
          'QR kodu yüklenemedi'
        
        // Check if endpoint doesn't exist
        if (error.response?.status === 404 || 
            error.response?.status === 500 && 
            errorMessage.includes('No static resource')) {
          throw new Error('QR kod endpoint\'i backend\'de implement edilmemiş. Lütfen backend geliştiricisine bildirin.')
        }
        
        throw new Error(errorMessage)
      }
    },
    enabled: !!elevatorId,
    staleTime: Infinity, // QR code is static, never refetch
    retry: false, // Don't retry if endpoint doesn't exist
  })

  // Download PNG
  const handleDownloadPNG = async () => {
    setIsDownloadingPNG(true)
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.ELEVATORS.QR(elevatorId)}`,
        {
          responseType: 'blob',
        }
      )

      const blob = new Blob([response.data], { type: 'image/png' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `elevator-${elevatorId}-qr.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Başarılı',
        description: 'QR kodu PNG olarak indirildi',
      })
    } catch (error: any) {
      console.error('Download PNG error:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'QR kodu indirilemedi',
        variant: 'destructive',
      })
    } finally {
      setIsDownloadingPNG(false)
    }
  }

  // Download PDF
  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true)
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.ELEVATORS.BY_ID(elevatorId)}/qr/pdf`,
        {
          responseType: 'blob',
        }
      )

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `elevator-${elevatorId}-qr.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Başarılı',
        description: 'QR kodu PDF olarak indirildi',
      })
    } catch (error: any) {
      console.error('Download PDF error:', error)
      toast({
        title: 'Hata',
        description: error.response?.data?.message || 'PDF indirilemedi',
        variant: 'destructive',
      })
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Kod
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (qrError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Kod
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 space-y-2">
            <p className="text-destructive font-medium">QR kod yüklenemedi</p>
            <p className="text-sm text-muted-foreground text-center px-4">
              {qrError instanceof Error ? qrError.message : 'Bilinmeyen bir hata oluştu'}
            </p>
            <p className="text-xs text-muted-foreground text-center px-4 mt-2">
              Backend endpoint: <code className="bg-muted px-1 rounded">/api/elevators/{elevatorId}/qr</code>
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!qrImageUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Kod
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">QR kod yüklenemedi</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Kod
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Image */}
        <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
          <img
            src={qrImageUrl}
            alt={`QR Code for Elevator ${elevatorId}`}
            className="w-64 h-64 object-contain"
          />
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground text-center">
          <p>Bu QR kodu tarayarak bakım işlemlerini başlatabilirsiniz.</p>
          <p className="mt-1">QR kodunu mobil cihazınızın kamerası ile tarayın.</p>
        </div>

        {/* Download Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPNG}
            disabled={isDownloadingPNG}
            className="flex-1"
          >
            {isDownloadingPNG ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                İndiriliyor...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                PNG İndir
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            className="flex-1"
          >
            {isDownloadingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                İndiriliyor...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                PDF İndir
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
