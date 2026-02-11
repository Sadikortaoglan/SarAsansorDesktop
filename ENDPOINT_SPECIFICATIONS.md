# Maintenance Plans API - Frontend Specifications

## 📋 GENEL BİLGİLER

Frontend'den backend'e gönderilen ve backend'den beklenen tüm request/response formatları.

---

## 🔄 ENDPOINT 1: `/api/maintenance-plans` (kebab-case)

### ✅ CREATE - Plan Oluşturma

#### Frontend'den Gönderilen Request
```http
POST /api/maintenance-plans
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

#### Request Body
```json
{
  "elevatorId": 15,
  "templateId": 1,
  "plannedDate": "2026-02-10",
  "assignedTechnicianId": 5,        // Optional
  "dateWindowDays": 7                // Optional, default: 7
}
```

#### Backend'den Beklenen Response (Success)
```json
{
  "success": true,
  "message": "Plan created successfully",
  "data": {
    "id": 1,
    "elevatorId": 15,
    "elevatorCode": "ELEV-015",
    "elevatorBuildingName": "Bina Adı",
    "elevatorAddress": "Adres",
    "templateId": 1,
    "templateName": "Aylık Bakım",
    "plannedDate": "2026-02-10",
    "assignedTechnicianId": 5,
    "assignedTechnicianName": "teknisyen",
    "status": "PLANNED",
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-01-15T10:30:00"
  },
  "errors": null
}
```

#### Backend'den Beklenen Response (Error)
```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "errors": [
    "Elevator ID is required",
    "Template ID is required"
  ]
}
```

---

### 📋 GET ALL - Planları Listeleme

#### Frontend'den Gönderilen Request
```http
GET /api/maintenance-plans?month=2026-02&elevatorId=15&status=PLANNED
Accept: application/json
Authorization: Bearer <token>
```

#### Query Parameters
- `month` (optional): `YYYY-MM` formatında (örn: `2026-02`)
- `year` (optional): Yıl (örn: `2026`)
- `elevatorId` (optional): Asansör ID (örn: `15`)
- `status` (optional): `PLANNED` | `COMPLETED` | `CANCELLED`

#### Backend'den Beklenen Response (Success)
```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": [
    {
      "id": 1,
      "elevatorId": 15,
      "elevatorCode": "ELEV-015",
      "elevatorBuildingName": "Bina Adı",
      "elevatorAddress": "Adres",
      "templateId": 1,
      "templateName": "Aylık Bakım",
      "plannedDate": "2026-02-10",
      "assignedTechnicianId": 5,
      "assignedTechnicianName": "teknisyen",
      "status": "PLANNED",
      "completedDate": null,
      "qrCode": "QR123456",
      "createdAt": "2026-01-15T10:30:00",
      "updatedAt": "2026-01-15T10:30:00"
    },
    {
      "id": 2,
      "elevatorId": 16,
      "elevatorCode": "ELEV-016",
      "elevatorBuildingName": "Başka Bina",
      "elevatorAddress": "Başka Adres",
      "templateId": 2,
      "templateName": "Yıllık Bakım",
      "plannedDate": "2026-02-15",
      "assignedTechnicianId": null,
      "assignedTechnicianName": null,
      "status": "COMPLETED",
      "completedDate": "2026-02-15T14:30:00",
      "qrCode": "QR789012",
      "createdAt": "2026-01-20T09:00:00",
      "updatedAt": "2026-02-15T14:30:00"
    }
  ],
  "errors": null
}
```

---

### 🔍 GET BY ID - Tek Plan Detayı

#### Frontend'den Gönderilen Request
```http
GET /api/maintenance-plans/1
Accept: application/json
Authorization: Bearer <token>
```

#### Backend'den Beklenen Response (Success)
```json
{
  "success": true,
  "message": "Plan retrieved successfully",
  "data": {
    "id": 1,
    "elevatorId": 15,
    "elevatorCode": "ELEV-015",
    "elevatorBuildingName": "Bina Adı",
    "elevatorAddress": "Adres",
    "templateId": 1,
    "templateName": "Aylık Bakım",
    "plannedDate": "2026-02-10",
    "assignedTechnicianId": 5,
    "assignedTechnicianName": "teknisyen",
    "status": "PLANNED",
    "completedDate": null,
    "qrCode": "QR123456",
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-01-15T10:30:00"
  },
  "errors": null
}
```

---

### ✏️ UPDATE - Plan Güncelleme

#### Frontend'den Gönderilen Request
```http
PUT /api/maintenance-plans/1
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

#### Request Body
```json
{
  "plannedDate": "2026-02-12",     // Optional
  "status": "COMPLETED"             // Optional: PLANNED | COMPLETED | CANCELLED
}
```

#### Backend'den Beklenen Response (Success)
```json
{
  "success": true,
  "message": "Plan updated successfully",
  "data": {
    "id": 1,
    "elevatorId": 15,
    "elevatorCode": "ELEV-015",
    "elevatorBuildingName": "Bina Adı",
    "elevatorAddress": "Adres",
    "templateId": 1,
    "templateName": "Aylık Bakım",
    "plannedDate": "2026-02-12",
    "assignedTechnicianId": 5,
    "assignedTechnicianName": "teknisyen",
    "status": "COMPLETED",
    "completedDate": "2026-02-12T10:30:00",
    "qrCode": "QR123456",
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-02-12T10:30:00"
  },
  "errors": null
}
```

---

### 🗑️ DELETE - Plan Silme

#### Frontend'den Gönderilen Request
```http
DELETE /api/maintenance-plans/1
Accept: application/json
Authorization: Bearer <token>
```

#### Backend'den Beklenen Response (Success)
```json
{
  "success": true,
  "message": "Plan deleted successfully",
  "data": null,
  "errors": null
}
```

---

### ✅ COMPLETE WITH QR - QR Kod ile Tamamlama

#### Frontend'den Gönderilen Request
```http
POST /api/maintenance-plans/1/complete
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

#### Request Body
```json
{
  "qrCode": "QR123456"
}
```

#### Backend'den Beklenen Response (Success)
```json
{
  "success": true,
  "message": "Plan completed successfully",
  "data": {
    "id": 1,
    "elevatorId": 15,
    "elevatorCode": "ELEV-015",
    "elevatorBuildingName": "Bina Adı",
    "elevatorAddress": "Adres",
    "templateId": 1,
    "templateName": "Aylık Bakım",
    "plannedDate": "2026-02-10",
    "assignedTechnicianId": 5,
    "assignedTechnicianName": "teknisyen",
    "status": "COMPLETED",
    "completedDate": "2026-02-10T14:30:00",
    "qrCode": "QR123456",
    "createdAt": "2026-01-15T10:30:00",
    "updatedAt": "2026-02-10T14:30:00"
  },
  "errors": null
}
```

---

## 🔄 ENDPOINT 2: `/api/maintenancePlans` (camelCase)

**NOT:** Eğer backend camelCase kullanıyorsa, tüm endpoint'ler şu şekilde olmalı:

### ✅ CREATE
```http
POST /api/maintenancePlans
```

### 📋 GET ALL
```http
GET /api/maintenancePlans?month=2026-02&elevatorId=15&status=PLANNED
```

### 🔍 GET BY ID
```http
GET /api/maintenancePlans/1
```

### ✏️ UPDATE
```http
PUT /api/maintenancePlans/1
```

### 🗑️ DELETE
```http
DELETE /api/maintenancePlans/1
```

### ✅ COMPLETE WITH QR
```http
POST /api/maintenancePlans/1/complete
```

**Request/Response formatları aynı! Sadece path değişiyor.**

---

## 🔄 ENDPOINT 3: `/api/plans` (kısa path)

**NOT:** Eğer backend kısa path kullanıyorsa, tüm endpoint'ler şu şekilde olmalı:

### ✅ CREATE
```http
POST /api/plans
```

### 📋 GET ALL
```http
GET /api/plans?month=2026-02&elevatorId=15&status=PLANNED
```

### 🔍 GET BY ID
```http
GET /api/plans/1
```

### ✏️ UPDATE
```http
PUT /api/plans/1
```

### 🗑️ DELETE
```http
DELETE /api/plans/1
```

### ✅ COMPLETE WITH QR
```http
POST /api/plans/1/complete
```

**Request/Response formatları aynı! Sadece path değişiyor.**

---

## 📊 ÖZET TABLO

| İşlem | Method | Endpoint (kebab-case) | Endpoint (camelCase) | Endpoint (kısa) |
|-------|--------|----------------------|---------------------|-----------------|
| **Create** | POST | `/api/maintenance-plans` | `/api/maintenancePlans` | `/api/plans` |
| **Get All** | GET | `/api/maintenance-plans` | `/api/maintenancePlans` | `/api/plans` |
| **Get By ID** | GET | `/api/maintenance-plans/{id}` | `/api/maintenancePlans/{id}` | `/api/plans/{id}` |
| **Update** | PUT | `/api/maintenance-plans/{id}` | `/api/maintenancePlans/{id}` | `/api/plans/{id}` |
| **Delete** | DELETE | `/api/maintenance-plans/{id}` | `/api/maintenancePlans/{id}` | `/api/plans/{id}` |
| **Complete** | POST | `/api/maintenance-plans/{id}/complete` | `/api/maintenancePlans/{id}/complete` | `/api/plans/{id}/complete` |

---

## 🔑 ÖNEMLİ NOTLAR

### 1. Date Format
- **Request'te:** `"plannedDate": "2026-02-10"` (YYYY-MM-DD, LocalDate)
- **Response'da:** `"plannedDate": "2026-02-10"` (YYYY-MM-DD) veya `"2026-02-10T10:30:00"` (DateTime)

### 2. Status Values
- `PLANNED` - Planlandı
- `COMPLETED` - Tamamlandı
- `CANCELLED` - İptal edildi

### 3. Required Fields (Create)
- `elevatorId` (number) - **ZORUNLU**
- `templateId` (number) - **ZORUNLU**
- `plannedDate` (string, YYYY-MM-DD) - **ZORUNLU**

### 4. Optional Fields (Create)
- `assignedTechnicianId` (number) - Opsiyonel
- `dateWindowDays` (number) - Opsiyonel, default: 7

### 5. Error Response Format
```json
{
  "success": false,
  "message": "Error message here",
  "data": null,
  "errors": [
    "Error detail 1",
    "Error detail 2"
  ]
}
```

---

## 🚀 FRONTEND KOD ÖRNEKLERİ

### Create Plan
```typescript
const payload = {
  elevatorId: 15,
  templateId: 1,
  plannedDate: "2026-02-10"
}

await apiClient.post('/api/maintenance-plans', payload)
```

### Get All Plans
```typescript
const params = {
  month: "2026-02",
  elevatorId: 15,
  status: "PLANNED"
}

await apiClient.get('/api/maintenance-plans', { params })
```

### Update Plan
```typescript
const payload = {
  plannedDate: "2026-02-12",
  status: "COMPLETED"
}

await apiClient.put('/api/maintenance-plans/1', payload)
```

### Complete with QR
```typescript
const payload = {
  qrCode: "QR123456"
}

await apiClient.post('/api/maintenance-plans/1/complete', payload)
```

---

## ✅ BACKEND'E SORULACAK SORULAR

1. **Hangi endpoint path'i kullanılıyor?**
   - `/api/maintenance-plans` (kebab-case) ✅ Şu an frontend bunu kullanıyor
   - `/api/maintenancePlans` (camelCase)
   - `/api/plans` (kısa)

2. **Base path var mı?**
   - Controller'da `@RequestMapping("/api")` var mı?
   - Veya `@RequestMapping("/api/v1")` gibi bir versioning var mı?

3. **Tüm CRUD operasyonları implement edilmiş mi?**
   - Create ✅
   - Get All ✅
   - Get By ID ✅
   - Update ✅
   - Delete ✅
   - Complete with QR ✅

4. **Response formatı doğru mu?**
   - `ApiResponse<T>` wrapper kullanılıyor mu?
   - Field name'ler camelCase mi? (elevatorId, templateId, plannedDate)

5. **Validation mesajları Türkçe mi İngilizce mi?**
   - Frontend şu an İngilizce mesajları handle ediyor

---

## 📝 SONUÇ

Frontend **tüm CRUD operasyonları** için hazır. Sadece backend'den **doğru endpoint path'i** öğrenmemiz gerekiyor. Path öğrenildikten sonra frontend'de tek satır değişiklik yeterli:

```typescript
// src/lib/api-endpoints.ts
MAINTENANCE_PLANS: {
  BASE: '/maintenance-plans',  // Backend'den öğrenilen path
  // ...
}
```
