# Frontend: Maintenance Creation QR Flow

## ✅ Tamamlandı

### 1. QR Validation Dialog Component
**Dosya:** `src/components/maintenance/ElevatorQRValidationDialog.tsx`

**Özellikler:**
- QR kod tarama/manuel giriş
- Mobile camera support
- ADMIN bypass (uzaktan başlatma)
- Elevator match validation

### 2. Maintenance Form Dialog Güncellemesi
**Dosya:** `src/components/MaintenanceFormDialog.tsx`

**Değişiklikler:**
- `qrToken` prop eklendi
- QR token validation (TECHNICIAN için zorunlu)
- ADMIN bypass desteği

### 3. Elevator Service QR Validation
**Dosya:** `src/services/elevator.service.ts`

**Yeni Method:**
```typescript
validateQRCode(elevatorCode: string, signature: string)
```

**Endpoint:** `GET /api/qr/validate?e={code}&s={signature}`

### 4. Maintenance Service QR Token Support
**Dosya:** `src/services/maintenance.service.ts`

**Değişiklikler:**
- `CreateMaintenanceRequest` interface'ine `qrToken` eklendi
- `create` method'u QR token'ı backend'e gönderiyor

### 5. Elevator Detail Page Integration
**Dosya:** `src/pages/ElevatorDetailPage.tsx`

**Flow:**
1. "Yeni Bakım Ekle" butonuna tıkla
2. QR Validation Dialog açılır
3. QR doğrulandıktan sonra Maintenance Form Dialog açılır
4. Form submit edilir (QR token ile)

## 🔄 User Flow

```
User clicks "Yeni Bakım Ekle"
         ↓
QR Validation Dialog opens
         ↓
User scans/enters QR code
         ↓
QR validated successfully
         ↓
Maintenance Form Dialog opens
         ↓
User fills form (date, description, price, photos)
         ↓
Form submitted with qrToken
         ↓
Backend validates QR (if TECHNICIAN)
         ↓
Maintenance created ✅
```

## 🔒 Role-Based Behavior

### TECHNICIAN (PERSONEL)
- ✅ QR validation **ZORUNLU**
- ❌ QR olmadan form açılmaz
- ✅ QR doğrulandıktan sonra form açılır

### ADMIN (PATRON)
- ✅ QR validation **OPSİYONEL**
- ✅ "Uzaktan Başlat" butonu ile QR olmadan açılabilir
- ✅ QR ile de açılabilir

## 📝 API Calls

### 1. QR Validation
```typescript
GET /api/qr/validate?e={elevatorCode}&s={signature}
Response: {
  valid: boolean,
  elevatorId?: number,
  elevatorCode?: string,
  buildingName?: string,
  error?: string
}
```

### 2. Maintenance Creation
```typescript
POST /api/maintenances
Body (FormData): {
  elevatorId: number,
  date: string,
  labelType: string,
  description: string,
  amount: number,
  technicianUserId?: number,
  qrToken?: string, // Required for TECHNICIAN
  photos?: File[]
}
```

## ⚠️ Important Notes

1. **Planning Endpoints Unchanged:**
   - Maintenance planning (`/api/maintenance-plans`) → QR GEREKMEZ
   - Only maintenance creation (`/api/maintenances`) → QR GEREKLİ

2. **QR Token Format:**
   - Full URL: `https://app.saraasansor.com/qr-start?e={code}&s={signature}`
   - Query string: `e={code}&s={signature}`
   - Admin bypass: `ADMIN_BYPASS`

3. **Error Handling:**
   - Invalid QR → Toast error message
   - Elevator mismatch → Toast error message
   - Missing QR (TECHNICIAN) → Frontend blocks form open

## 🧪 Testing

### Test Case 1: TECHNICIAN with QR
1. Login as TECHNICIAN
2. Go to Elevator Detail Page
3. Click "Yeni Bakım Ekle"
4. QR Dialog opens ✅
5. Enter valid QR code
6. QR validated ✅
7. Maintenance Form opens ✅
8. Fill form and submit
9. Maintenance created ✅

### Test Case 2: TECHNICIAN without QR
1. Login as TECHNICIAN
2. Go to Elevator Detail Page
3. Click "Yeni Bakım Ekle"
4. QR Dialog opens ✅
5. Close QR dialog without validation
6. Maintenance Form does NOT open ✅

### Test Case 3: ADMIN bypass
1. Login as ADMIN
2. Go to Elevator Detail Page
3. Click "Yeni Bakım Ekle"
4. QR Dialog opens
5. Click "Uzaktan Başlat" button
6. Maintenance Form opens without QR ✅
7. Fill form and submit
8. Maintenance created (qrToken = "ADMIN_BYPASS") ✅

## 📚 Related Files

- `src/components/maintenance/ElevatorQRValidationDialog.tsx` - QR validation UI
- `src/components/MaintenanceFormDialog.tsx` - Maintenance form with QR token
- `src/services/elevator.service.ts` - QR validation service
- `src/services/maintenance.service.ts` - Maintenance creation with QR token
- `src/pages/ElevatorDetailPage.tsx` - Integration point

## 🎯 Backend Requirements

Backend'de şunlar implement edilmeli:
1. `GET /api/qr/validate` endpoint
2. `POST /api/maintenances` endpoint'ine QR guard
3. Role-based validation logic

Detaylar: `BACKEND_MAINTENANCE_QR_GUARD.md`
