# Backend Implementation Notes - Maintenance QR Guard

## 🎯 Özet

Maintenance creation (gerçek bakım kaydı oluşturma) için QR validation zorunlu hale getirildi.

**ÖNEMLİ:** Maintenance planning (bakım planlama) endpoint'leri **DEĞİŞMEDİ**. QR gerektirmiyor.

## 📋 Yapılacaklar

### 1. Controller Güncellemesi

**Dosya:** `MaintenanceController.java`

**Endpoint:** `POST /api/maintenances`

**Değişiklikler:**
- QR token validation guard ekle
- Role-based validation (TECHNICIAN vs ADMIN)
- QR token parse ve validate logic

**Kod:** `BACKEND_MAINTENANCE_QR_GUARD.md` dosyasında tam implementasyon var.

### 2. Service Güncellemesi

**Dosya:** `ElevatorQRSignatureService.java`

**Yeni Method:**
```java
public boolean validateSignatureByCode(String elevatorCode, String signature)
```

**Amaç:** Elevator code (kimlikNo) ile signature validation

### 3. DTO Güncellemesi

**Dosya:** `CreateMaintenanceRequest.java`

**Yeni Field:**
```java
private String qrToken; // Required for TECHNICIAN, optional for ADMIN
```

### 4. QR Validation Endpoint

**Endpoint:** `GET /api/qr/validate?e={elevatorCode}&s={signature}`

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "elevatorId": 123,
    "elevatorCode": "ELEV-001",
    "buildingName": "Example Building"
  }
}
```

**Implementasyon:** `BACKEND_ELEVATOR_QR.md` dosyasında var.

## 🔒 Security Rules

### TECHNICIAN (PERSONEL)
- ✅ QR token **ZORUNLU**
- ❌ QR olmadan maintenance oluşturamaz
- ✅ QR elevator ile eşleşmeli

### ADMIN (PATRON)
- ✅ QR token **OPSİYONEL**
- ✅ QR olmadan oluşturabilir (`ADMIN_BYPASS`)
- ✅ QR ile de oluşturabilir (validate edilir)

## 🚫 Etkilenmeyen Endpoint'ler

Bu değişiklikler **SADECE** maintenance creation'ı etkiler:

- ✅ `POST /api/maintenance-plans` → QR GEREKMEZ (planning)
- ✅ `PUT /api/maintenance-plans/{id}` → QR GEREKMEZ
- ✅ `PATCH /api/maintenance-plans/{id}/reschedule` → QR GEREKMEZ
- ✅ `DELETE /api/maintenance-plans/{id}` → QR GEREKMEZ

## 📝 Test Senaryoları

### Senaryo 1: TECHNICIAN + Valid QR
```
Request: POST /api/maintenances
Headers: Authorization: Bearer {technician_token}
Body: { elevatorId: 1, qrToken: "e=ELEV-001&s=abc123...", ... }
Expected: 201 Created ✅
```

### Senaryo 2: TECHNICIAN + No QR
```
Request: POST /api/maintenances
Headers: Authorization: Bearer {technician_token}
Body: { elevatorId: 1, ... } // No qrToken
Expected: 403 Forbidden ❌
Message: "QR token is required for TECHNICIAN role"
```

### Senaryo 3: ADMIN + No QR
```
Request: POST /api/maintenances
Headers: Authorization: Bearer {admin_token}
Body: { elevatorId: 1, ... } // No qrToken
Expected: 201 Created ✅ (QR not required)
```

### Senaryo 4: ADMIN + Valid QR
```
Request: POST /api/maintenances
Headers: Authorization: Bearer {admin_token}
Body: { elevatorId: 1, qrToken: "e=ELEV-001&s=abc123...", ... }
Expected: 201 Created ✅ (QR validated)
```

### Senaryo 5: TECHNICIAN + Invalid QR
```
Request: POST /api/maintenances
Headers: Authorization: Bearer {technician_token}
Body: { elevatorId: 1, qrToken: "invalid", ... }
Expected: 403 Forbidden ❌
Message: "Invalid or expired QR token"
```

## 🔍 Implementation Checklist

- [ ] `MaintenanceController.createMaintenance()` method'una QR guard ekle
- [ ] `ElevatorQRSignatureService.validateSignatureByCode()` method'unu ekle
- [ ] `CreateMaintenanceRequest` DTO'suna `qrToken` field'ı ekle
- [ ] `GET /api/qr/validate` endpoint'ini implement et
- [ ] QR token parse logic'i ekle (URL ve query string formatları)
- [ ] Role-based validation logic'i ekle
- [ ] Error handling ve mesajları ekle
- [ ] Test senaryolarını çalıştır

## 📚 Referans Dosyalar

1. **BACKEND_MAINTENANCE_QR_GUARD.md** - Tam controller implementasyonu
2. **BACKEND_ELEVATOR_QR.md** - QR signature service ve validation endpoint
3. **ELEVATOR_QR_IMPLEMENTATION.md** - Genel QR implementasyon özeti

## ⚠️ Dikkat Edilmesi Gerekenler

1. **QR Token Format:**
   - Full URL: `https://app.saraasansor.com/qr-start?e={code}&s={signature}`
   - Query string: `e={code}&s={signature}`
   - Admin bypass: `ADMIN_BYPASS`

2. **Elevator Code vs ID:**
   - QR URL'de `elevatorCode` (public identifier) kullanılıyor
   - Backend'de `elevatorId` (numeric ID) ile eşleştirme yapılmalı

3. **Planning Endpoints:**
   - Maintenance planning endpoint'lerine **DOKUNMAYIN**
   - Sadece maintenance creation endpoint'ini güncelleyin

4. **Audit Logging:**
   - QR ile oluşturulan maintenance'ları loglayın
   - QR olmadan oluşturulan maintenance'ları (ADMIN) loglayın
   - QR validation hatalarını loglayın

## 🎯 Sonuç

Frontend hazır. Backend'de sadece:
1. QR validation guard ekleyin
2. QR validation endpoint'ini implement edin
3. Test edin

Tam kod: `BACKEND_MAINTENANCE_QR_GUARD.md`
