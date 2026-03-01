import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { QrCode, Download, FileDown, Loader2 } from 'lucide-react'
import apiClient from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/api-endpoints'
import './ElevatorQRCode.css'

interface ElevatorQRCodeProps {
  elevatorId: number
  elevatorName?: string
}

export function ElevatorQRCode({ elevatorId, elevatorName }: ElevatorQRCodeProps) {
  const { toast } = useToast()
  const [isDownloadingPNG, setIsDownloadingPNG] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

  const escapeHtml = (value: string): string =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const extractErrorMessage = async (error: any): Promise<string> => {
    const responseData = error?.response?.data

    if (responseData instanceof Blob) {
      try {
        const text = await responseData.text()
        const parsed = JSON.parse(text) as { message?: string }
        if (parsed?.message) return parsed.message
      } catch {
        // Ignore parse issues and fall back to generic message below
      }
    }

    return error?.response?.data?.message || error?.message || 'Bilinmeyen hata'
  }

  const downloadQrPng = async () => {
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
  }

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
      await downloadQrPng()

      toast({
        title: 'Başarılı',
        description: 'QR kodu PNG olarak indirildi',
      })
    } catch (error: any) {
      console.error('Download PNG error:', error)
      const message = await extractErrorMessage(error)
      toast({
        title: 'Hata',
        description: message || 'QR kodu indirilemedi',
        variant: 'destructive',
      })
    } finally {
      setIsDownloadingPNG(false)
    }
  }

  // Open compact print popup
  const handleDownloadPDF = async () => {
    const popup = window.open('', '_blank')
    if (!popup) {
      const fallback = window.open(`/api${API_ENDPOINTS.ELEVATORS.QR_PDF(elevatorId)}`, '_blank')
      if (!fallback) {
        toast({
          title: 'Popup engellendi',
          description: 'PDF görüntülemek için popup izni verin.',
          variant: 'destructive',
        })
      }
      return
    }

    setIsDownloadingPDF(true)
    try {
      const safeName = escapeHtml((elevatorName || `Asansör ${elevatorId}`).trim())
      const safeCode = escapeHtml(String(elevatorId))
      const safeQrSrc = escapeHtml(qrImageUrl || `/api${API_ENDPOINTS.ELEVATORS.QR(elevatorId)}`)

      popup.document.write(`
        <!doctype html>
        <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Asansör QR</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111827; }
            body { background: #f7f8fa; }
            .toolbar {
              position: sticky; top: 0; z-index: 10; background: #fff;
              border-bottom: 1px solid #e5e7eb; padding: 10px 14px;
              display: flex; align-items: center; justify-content: space-between;
            }
            .toolbar-title { font-size: 14px; font-weight: 700; color: #374151; }
            .print-btn {
              border: 1px solid #d1d5db; background: #111827; color: #fff;
              border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer;
            }
            .sheet {
              max-width: 900px; margin: 14px auto; background: #fff;
              border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px;
            }
            .content {
              display: grid; grid-template-columns: 1.2fr 0.9fr; gap: 16px; align-items: start;
            }
            .title { margin: 0 0 8px; font-size: 30px; font-weight: 800; line-height: 1.1; }
            .meta { margin: 0 0 10px; display: grid; gap: 6px; }
            .meta p { margin: 0; font-size: 16px; line-height: 1.35; }
            .label { color: #4b5563; margin-right: 6px; }
            .instructions {
              margin-top: 4px; border: 1px solid #e5e7eb; border-radius: 8px;
              padding: 10px 12px; background: #f9fafb;
            }
            .instructions h3 { margin: 0 0 6px; font-size: 15px; }
            .instructions ol { margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.45; }
            .qr-wrap { display: flex; justify-content: flex-end; }
            .qr-box {
              width: 285px; border: 1px solid #e5e7eb; border-radius: 10px;
              padding: 10px; background: #fff;
            }
            .qr-box img { width: 100%; display: block; }
            @media (max-width: 760px) {
              .sheet { margin: 0; border: 0; border-radius: 0; padding: 12px; }
              .content { grid-template-columns: 1fr; gap: 10px; }
              .qr-wrap { justify-content: center; order: -1; }
              .qr-box { width: min(100%, 220px); }
              .title { font-size: 22px; margin-bottom: 6px; }
              .meta p { font-size: 15px; }
            }
            @media print {
              body { background: #fff; }
              .toolbar { display: none; }
              .sheet { max-width: none; margin: 0; border: 0; border-radius: 0; padding: 8mm; }
              .title { font-size: 22px; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <div class="toolbar-title">Asansör QR Etiketi</div>
            <button class="print-btn" onclick="window.print()">Yazdır</button>
          </div>
          <main class="sheet">
            <section class="content">
              <div>
                <h1 class="title">Asansör QR</h1>
                <div class="meta">
                  <p><span class="label">Asansör:</span>${safeName}</p>
                  <p><span class="label">Kod:</span>${safeCode}</p>
                </div>
                <div class="instructions">
                  <h3>Kullanım Talimatları</h3>
                  <ol>
                    <li>Etiketi asansör girişinde görünür alana yerleştirin.</li>
                    <li>Bakım başlatmak için mobil uygulama ile QR kodu tarayın.</li>
                    <li>Kod okunmazsa yeni etiket yazdırın.</li>
                  </ol>
                </div>
              </div>
              <div class="qr-wrap">
                <div class="qr-box">
                  <img src="${safeQrSrc}" alt="Asansör QR" />
                </div>
              </div>
            </section>
          </main>
        </body>
        </html>
      `)
      popup.document.close()
    } catch (error: any) {
      popup.close()
      toast({
        title: 'Hata',
        description: 'Yazdırma ekranı açılamadı',
        variant: 'destructive',
      })
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="elevator-qr-card">
        <CardHeader className="elevator-qr-card__header">
          <CardTitle className="elevator-qr-card__title">
            <QrCode className="elevator-qr-card__title-icon" />
            QR Kod
          </CardTitle>
        </CardHeader>
        <CardContent className="elevator-qr-card__content">
          <div className="elevator-qr-card__status">
            <Loader2 className="elevator-qr-card__loader" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (qrError) {
    return (
      <Card className="elevator-qr-card">
        <CardHeader className="elevator-qr-card__header">
          <CardTitle className="elevator-qr-card__title">
            <QrCode className="elevator-qr-card__title-icon" />
            QR Kod
          </CardTitle>
        </CardHeader>
        <CardContent className="elevator-qr-card__content">
          <div className="elevator-qr-card__status elevator-qr-card__status--error">
            <p className="elevator-qr-card__status-title">QR kod yüklenemedi</p>
            <p className="elevator-qr-card__status-text">
              {qrError instanceof Error ? qrError.message : 'Bilinmeyen bir hata oluştu'}
            </p>
            <p className="elevator-qr-card__status-meta">
              Backend endpoint: <code>/api/elevators/{elevatorId}/qr</code>
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!qrImageUrl) {
    return (
      <Card className="elevator-qr-card">
        <CardHeader className="elevator-qr-card__header">
          <CardTitle className="elevator-qr-card__title">
            <QrCode className="elevator-qr-card__title-icon" />
            QR Kod
          </CardTitle>
        </CardHeader>
        <CardContent className="elevator-qr-card__content">
          <div className="elevator-qr-card__status">
            <p className="elevator-qr-card__status-text">QR kod yüklenemedi</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="elevator-qr-card elevator-qr-card--ready">
      <CardHeader className="elevator-qr-card__header">
        <CardTitle className="elevator-qr-card__title">
          <QrCode className="elevator-qr-card__title-icon" />
          QR Kod
        </CardTitle>
      </CardHeader>
      <CardContent className="elevator-qr-card__content">
        <div className="elevator-qr-card__image-wrap">
          <img
            src={qrImageUrl}
            alt={`QR Code for Elevator ${elevatorId}`}
            className="elevator-qr-card__image"
          />
        </div>

        <div className="elevator-qr-card__description">
          <p>Bu QR kodu tarayarak bakım işlemlerini başlatabilirsiniz.</p>
          <p>QR kodunu mobil cihazınızın kamerası ile tarayın.</p>
        </div>

        <div className="elevator-qr-card__actions">
          <Button
            variant="outline"
            onClick={handleDownloadPNG}
            disabled={isDownloadingPNG}
            className="elevator-qr-card__button"
          >
            {isDownloadingPNG ? (
              <>
                <Loader2 className="elevator-qr-card__button-icon elevator-qr-card__button-icon--spin" />
                İndiriliyor...
              </>
            ) : (
              <>
                <Download className="elevator-qr-card__button-icon" />
                PNG İndir
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            className="elevator-qr-card__button"
          >
            {isDownloadingPDF ? (
              <>
                <Loader2 className="elevator-qr-card__button-icon elevator-qr-card__button-icon--spin" />
                İndiriliyor...
              </>
            ) : (
              <>
                <FileDown className="elevator-qr-card__button-icon" />
                Yazdır
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
