# Frontend Implementation: QR Session Token System

## 📋 Overview

Implement QR session token system for maintenance creation. Backend will provide:
- `POST /api/qr/validate` - Returns `qrSessionToken`
- `POST /api/qr/remote-start` - Returns `qrSessionToken` (ADMIN only)
- `POST /api/maintenances` - Requires `X-QR-SESSION-TOKEN` header

## 🎯 Entry Points to Update

1. ✅ **ElevatorDetailPage** (`/elevators/:id`) - Already has QR flow, needs session token update
2. ❌ **ElevatorsPage** (`/elevators`) - Directly opens MaintenanceFormDialog, needs QR flow
3. ❓ **MaintenancePage** (`/maintenances/list`) - Check if has "Yeni Bakım Ekle"

---

## 📁 Files to Create/Modify

### 1. New Service: QR Session Token Service

**File:** `src/services/qr-session.service.ts` (NEW)

```typescript
import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

export interface QRValidateRequest {
  qrCode: string
  elevatorId?: number // Optional, if already known
}

export interface QRValidateResponse {
  success: boolean
  qrSessionToken: string
  elevatorId: number
  expiresAt: string // ISO 8601
}

export interface QRRemoteStartRequest {
  elevatorId: number
}

export interface QRRemoteStartResponse {
  success: boolean
  qrSessionToken: string
  elevatorId: number
  expiresAt: string
  startedRemotely: boolean
}

export const qrSessionService = {
  /**
   * Validate QR code and get session token
   * POST /api/qr/validate
   */
  validate: async (request: QRValidateRequest): Promise<QRValidateResponse> => {
    const { data } = await apiClient.post<ApiResponse<QRValidateResponse>>(
      '/api/qr/validate',
      request
    )
    return unwrapResponse(data)
  },

  /**
   * Remote start (ADMIN only)
   * POST /api/qr/remote-start
   */
  remoteStart: async (request: QRRemoteStartRequest): Promise<QRRemoteStartResponse> => {
    const { data } = await apiClient.post<ApiResponse<QRRemoteStartResponse>>(
      '/api/qr/remote-start',
      request
    )
    return unwrapResponse(data)
  },
}
```

---

### 2. Update API Endpoints

**File:** `src/lib/api-endpoints.ts`

**Add:**
```typescript
// QR Session
QR_SESSION: {
  VALIDATE: '/api/qr/validate',
  REMOTE_START: '/api/qr/remote-start',
},
```

---

### 3. Update ElevatorQRValidationDialog

**File:** `src/components/maintenance/ElevatorQRValidationDialog.tsx`

**Key Changes:**
1. Replace `elevatorService.validateQRCode` with `qrSessionService.validate`
2. Return `qrSessionToken` instead of raw QR string
3. Add mobile camera scanning with QR library
4. Update remote start to use `qrSessionService.remoteStart`

**Updated Interface:**
```typescript
interface ElevatorQRValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  elevatorId: number
  elevatorCode?: string
  onValidationSuccess: (qrSessionToken: string) => void // Changed: now returns session token
}
```

**Updated handleQRSubmit:**
```typescript
const handleQRSubmit = async () => {
  if (!qrCode.trim()) {
    toast({
      title: 'Hata',
      description: 'Lütfen QR kodunu girin veya tarayın',
      variant: 'destructive',
    })
    return
  }

  setIsValidating(true)

  try {
    // Call new session token API
    const response = await qrSessionService.validate({
      qrCode: qrCode.trim(),
      elevatorId: elevatorId, // Optional but helps backend
    })

    // Verify elevator match
    if (response.elevatorId !== elevatorId) {
      toast({
        title: 'Hata',
        description: 'QR kodu bu asansör için geçerli değil',
        variant: 'destructive',
      })
      setIsValidating(false)
      return
    }

    // Success: Pass session token to parent
    toast({
      title: 'Başarılı',
      description: 'QR kodu doğrulandı',
    })

    onValidationSuccess(response.qrSessionToken)
    onOpenChange(false)

  } catch (error: any) {
    console.error('QR validation error:', error)
    toast({
      title: 'Hata',
      description: error.response?.data?.message || 'QR kodu doğrulanamadı',
      variant: 'destructive',
    })
  } finally {
    setIsValidating(false)
  }
}
```

**Updated handleRemoteStart:**
```typescript
const handleRemoteStart = async () => {
  setIsValidating(true)
  
  try {
    const response = await qrSessionService.remoteStart({
      elevatorId: elevatorId,
    })

    toast({
      title: 'Uzaktan Başlatıldı',
      description: 'Bakım uzaktan başlatıldı',
    })

    onValidationSuccess(response.qrSessionToken)
    onOpenChange(false)
  } catch (error: any) {
    toast({
      title: 'Hata',
      description: error.response?.data?.message || 'Uzaktan başlatma başarısız',
      variant: 'destructive',
    })
  } finally {
    setIsValidating(false)
  }
}
```

**Add Mobile Camera Scanning:**
```typescript
// Install: npm install html5-qrcode
import { Html5Qrcode } from 'html5-qrcode'

const [isScanning, setIsScanning] = useState(false)
const [scanner, setScanner] = useState<Html5Qrcode | null>(null)
const scannerRef = useRef<HTMLDivElement>(null)

// Start camera scanning (mobile only)
const startCameraScan = async () => {
  if (!isMobile || !scannerRef.current) return

  try {
    const html5QrCode = new Html5Qrcode('qr-scanner-container')
    
    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        // QR code scanned
        setQrCode(decodedText)
        html5QrCode.stop()
        setIsScanning(false)
        setScanner(null)
        // Auto-validate
        handleQRSubmit()
      },
      (errorMessage) => {
        // Ignore scan errors (keep scanning)
      }
    )
    
    setScanner(html5QrCode)
    setIsScanning(true)
  } catch (error) {
    toast({
      title: 'Hata',
      description: 'Kamera açılamadı. Lütfen manuel girin.',
      variant: 'destructive',
    })
  }
}

// Stop camera scanning
const stopCameraScan = () => {
  if (scanner) {
    scanner.stop().catch(() => {})
    scanner.clear()
    setScanner(null)
    setIsScanning(false)
  }
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    stopCameraScan()
  }
}, [])
```

**Add Camera UI (Mobile):**
```typescript
{/* Mobile Camera Scanner */}
{isMobile && (
  <div className="space-y-2">
    {!isScanning ? (
      <Button
        type="button"
        variant="outline"
        onClick={startCameraScan}
        className="w-full"
      >
        <Camera className="h-4 w-4 mr-2" />
        Kamerayla Tara
      </Button>
    ) : (
      <>
        <div id="qr-scanner-container" ref={scannerRef} className="w-full h-64 border rounded" />
        <Button
          type="button"
          variant="outline"
          onClick={stopCameraScan}
          className="w-full"
        >
          Taramayı Durdur
        </Button>
      </>
    )}
  </div>
)}
```

---

### 4. Update MaintenanceFormDialog

**File:** `src/components/MaintenanceFormDialog.tsx`

**Key Changes:**
1. Rename `qrToken` prop to `qrSessionToken`
2. Send `X-QR-SESSION-TOKEN` header in API call
3. Clear token after success/close

**Updated Interface:**
```typescript
interface MaintenanceFormDialogProps {
  elevatorId: number
  elevatorName?: string
  qrSessionToken?: string // Changed: now session token
  onClose?: () => void
  onSuccess: () => void
}
```

**Updated createMutation:**
```typescript
const createMutation = useMutation({
  mutationFn: (data: typeof formData) => {
    // Validate QR session token for TECHNICIAN
    if (!isAdmin && !qrSessionToken) {
      throw new Error('QR session token is required for maintenance creation')
    }

    return maintenanceService.create({
      elevatorId: elevatorId,
      tarih: data.tarih,
      labelType: 'GREEN' as LabelType,
      aciklama: data.aciklama,
      ucret: data.ucret,
      teknisyenUserId: user?.id ? user.id : undefined,
      photos: data.photos.length > 0 ? data.photos : undefined,
      qrSessionToken: qrSessionToken, // Pass session token
    })
  },
  // ... rest unchanged
})
```

---

### 5. Update Maintenance Service

**File:** `src/services/maintenance.service.ts`

**Key Changes:**
1. Add `qrSessionToken` to `CreateMaintenanceRequest`
2. Send `X-QR-SESSION-TOKEN` header in API call

**Updated Interface:**
```typescript
export interface CreateMaintenanceRequest {
  elevatorId: number
  tarih: string
  labelType: LabelType
  aciklama: string
  ucret: number
  teknisyenUserId?: number
  photos?: File[]
  qrSessionToken?: string // Changed: now session token
}
```

**Updated create method:**
```typescript
create: async (maintenance: CreateMaintenanceRequest): Promise<Maintenance> => {
  const dateStr = formatDateForAPI(maintenance.tarih)
  
  const formData = new FormData()
  formData.append('elevatorId', String(maintenance.elevatorId))
  formData.append('date', dateStr)
  formData.append('labelType', maintenance.labelType)
  formData.append('description', maintenance.aciklama)
  formData.append('amount', String(maintenance.ucret))
  
  if (maintenance.teknisyenUserId) {
    formData.append('technicianUserId', String(maintenance.teknisyenUserId))
  }
  
  // QR Session Token - send as header, NOT in form data
  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data',
  }
  
  if (maintenance.qrSessionToken) {
    headers['X-QR-SESSION-TOKEN'] = maintenance.qrSessionToken
  }
  
  // Photos
  if (maintenance.photos && maintenance.photos.length > 0) {
    maintenance.photos.forEach((photo) => {
      formData.append(`photos`, photo)
    })
  }
  
  const { data } = await apiClient.post<ApiResponse<any>>(
    API_ENDPOINTS.MAINTENANCES.BASE,
    formData,
    { headers }
  )
  
  const unwrapped = unwrapResponse(data)
  return mapMaintenanceFromBackend(unwrapped)
},
```

---

### 6. Update ElevatorDetailPage

**File:** `src/pages/ElevatorDetailPage.tsx`

**Key Changes:**
1. Rename `validatedQRToken` to `validatedQRSessionToken`
2. Update callback to receive session token

**Updated State:**
```typescript
const [validatedQRSessionToken, setValidatedQRSessionToken] = useState<string | null>(null)
```

**Updated QR Dialog:**
```typescript
<ElevatorQRValidationDialog
  open={isQRValidationDialogOpen}
  onOpenChange={(open) => {
    setIsQRValidationDialogOpen(open)
    if (!open) {
      setValidatedQRSessionToken(null) // Clear token on close
    }
  }}
  elevatorId={Number(id)}
  elevatorCode={elevator.kimlikNo}
  onValidationSuccess={(qrSessionToken) => {
    setValidatedQRSessionToken(qrSessionToken)
    setIsQRValidationDialogOpen(false)
    setIsMaintenanceFormDialogOpen(true)
  }}
/>
```

**Updated Maintenance Form:**
```typescript
<MaintenanceFormDialog
  elevatorId={Number(id)}
  elevatorName={`${elevator.kimlikNo} - ${elevator.bina}`}
  qrSessionToken={validatedQRSessionToken || undefined}
  onClose={() => {
    setIsMaintenanceFormDialogOpen(false)
    setValidatedQRSessionToken(null) // Clear token
  }}
  onSuccess={() => {
    setIsMaintenanceFormDialogOpen(false)
    setValidatedQRSessionToken(null) // Clear token
    queryClient.invalidateQueries({ queryKey: ['maintenances', 'elevator', id] })
  }}
/>
```

---

### 7. Update ElevatorsPage

**File:** `src/pages/ElevatorsPage.tsx`

**Key Changes:**
1. Add QR validation flow before opening MaintenanceFormDialog
2. Add state for QR dialog and session token

**Add Imports:**
```typescript
import { ElevatorQRValidationDialog } from '@/components/maintenance/ElevatorQRValidationDialog'
```

**Add State:**
```typescript
const [isQRValidationDialogOpen, setIsQRValidationDialogOpen] = useState(false)
const [elevatorForQR, setElevatorForQR] = useState<Elevator | null>(null)
const [validatedQRSessionToken, setValidatedQRSessionToken] = useState<string | null>(null)
```

**Update "Yeni Bakım Ekle" Button Handler:**
```typescript
// Find where MaintenanceFormDialog is opened and replace with QR flow
// Current code (around line 327):
// <MaintenanceFormDialog ... />

// Replace with:
const handleAddMaintenance = (elevator: Elevator) => {
  setElevatorForMaintenance(elevator)
  setElevatorForQR(elevator) // Set for QR dialog
  setIsQRValidationDialogOpen(true) // Open QR dialog first
}

// In JSX, replace button onClick:
<Button onClick={() => handleAddMaintenance(elevator)}>
  Yeni Bakım Ekle
</Button>
```

**Add QR Dialog:**
```typescript
{/* QR Validation Dialog */}
{elevatorForQR && (
  <ElevatorQRValidationDialog
    open={isQRValidationDialogOpen}
    onOpenChange={(open) => {
      setIsQRValidationDialogOpen(open)
      if (!open) {
        setElevatorForQR(null)
        setValidatedQRSessionToken(null)
      }
    }}
    elevatorId={elevatorForQR.id}
    elevatorCode={elevatorForQR.kimlikNo}
    onValidationSuccess={(qrSessionToken) => {
      setValidatedQRSessionToken(qrSessionToken)
      setIsQRValidationDialogOpen(false)
      setIsMaintenanceDialogOpen(true) // Open maintenance form
    }}
  />
)}

{/* Maintenance Form Dialog */}
<Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
  {elevatorForMaintenance && (
    <MaintenanceFormDialog
      elevatorId={elevatorForMaintenance.id}
      elevatorName={`${elevatorForMaintenance.kimlikNo} - ${elevatorForMaintenance.bina}`}
      qrSessionToken={validatedQRSessionToken || undefined}
      onClose={() => {
        setIsMaintenanceDialogOpen(false)
        setElevatorForMaintenance(null)
        setValidatedQRSessionToken(null)
      }}
      onSuccess={() => {
        setIsMaintenanceDialogOpen(false)
        setElevatorForMaintenance(null)
        setValidatedQRSessionToken(null)
        queryClient.invalidateQueries({ queryKey: ['elevators'] })
        queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      }}
    />
  )}
</Dialog>
```

---

### 8. Check MaintenancePage

**File:** `src/pages/maintenance/MaintenancePage.tsx`

**Action:** Search for "Yeni Bakım Ekle" or MaintenanceFormDialog usage.

**If found:** Apply same QR flow pattern as ElevatorsPage.

---

## 📦 Dependencies

**Install QR Scanning Library:**
```bash
npm install html5-qrcode
```

**Type definitions (if needed):**
```bash
npm install --save-dev @types/html5-qrcode
```

---

## ✅ Testing Checklist

### Mobile Testing:
- [ ] Open ElevatorDetailPage on mobile
- [ ] Click "Yeni Bakım Ekle"
- [ ] QR dialog opens
- [ ] "Kamerayla Tara" button visible
- [ ] Camera permission requested
- [ ] Camera starts scanning
- [ ] QR code scanned successfully
- [ ] Session token received
- [ ] Maintenance form opens
- [ ] Form submit includes X-QR-SESSION-TOKEN header
- [ ] Maintenance created successfully

### Desktop Testing:
- [ ] Open ElevatorDetailPage on desktop
- [ ] Click "Yeni Bakım Ekle"
- [ ] QR dialog opens
- [ ] Manual QR input field visible
- [ ] No auto-camera (correct)
- [ ] Enter QR code manually
- [ ] Click "Doğrula"
- [ ] Session token received
- [ ] Maintenance form opens
- [ ] Form submit includes header
- [ ] Maintenance created successfully

### ADMIN Testing:
- [ ] Login as ADMIN
- [ ] Open ElevatorDetailPage
- [ ] Click "Yeni Bakım Ekle"
- [ ] QR dialog opens
- [ ] "Uzaktan Başlat" button visible
- [ ] Click "Uzaktan Başlat"
- [ ] Session token received (with startedRemotely=true)
- [ ] Maintenance form opens
- [ ] Form submit includes header
- [ ] Maintenance created successfully

### TECHNICIAN Testing:
- [ ] Login as TECHNICIAN
- [ ] Open ElevatorDetailPage
- [ ] Click "Yeni Bakım Ekle"
- [ ] QR dialog opens
- [ ] "Uzaktan Başlat" button NOT visible
- [ ] Must scan/enter QR code
- [ ] Without QR: Cannot proceed
- [ ] With valid QR: Session token received
- [ ] Maintenance form opens
- [ ] Form submit includes header
- [ ] Maintenance created successfully

### Edge Cases:
- [ ] Cancel QR dialog → Maintenance form does NOT open
- [ ] Invalid QR code → Error shown, form does NOT open
- [ ] QR for wrong elevator → Error shown, form does NOT open
- [ ] Session token expired → Backend rejects (403)
- [ ] Missing header → Backend rejects (403)

---

## 🔒 Security Notes

1. **Session Token Storage:**
   - Store in component state only (NOT localStorage)
   - Clear on modal close
   - Clear on success
   - Clear on error

2. **Header Security:**
   - Always send `X-QR-SESSION-TOKEN` header
   - Backend validates token server-side
   - Token expires in 5 minutes (backend enforced)

3. **No Client-Side Bypass:**
   - All validation happens server-side
   - Frontend only provides UX flow
   - Backend rejects invalid/missing tokens

---

## 📝 Summary

**Files Created:**
1. `src/services/qr-session.service.ts` (NEW)

**Files Modified:**
1. `src/lib/api-endpoints.ts` - Add QR session endpoints
2. `src/components/maintenance/ElevatorQRValidationDialog.tsx` - Use session token API
3. `src/components/MaintenanceFormDialog.tsx` - Accept and send session token
4. `src/services/maintenance.service.ts` - Send header
5. `src/pages/ElevatorDetailPage.tsx` - Update state names
6. `src/pages/ElevatorsPage.tsx` - Add QR flow
7. `src/pages/maintenance/MaintenancePage.tsx` - Check and update if needed

**Key Changes:**
- QR validation returns session token (not raw QR string)
- Maintenance creation requires `X-QR-SESSION-TOKEN` header
- Mobile camera scanning with html5-qrcode
- ADMIN remote start uses separate endpoint
- All entry points route through QR flow

**No Changes:**
- Maintenance planning screen (`/maintenances/plan`)
- Maintenance planning endpoints
- Existing maintenance templates
- Elevator CRUD
