# Elevator QR Documentation Review & Improvements

## ✅ Dokümantasyon Genel Değerlendirme

**Güçlü Yönler:**
- ✅ Kapsamlı backend implementasyon detayları
- ✅ Frontend component örnekleri
- ✅ Security best practices
- ✅ API endpoint dokümantasyonu
- ✅ Testing checklist
- ✅ Deployment notes

## ⚠️ Tespit Edilen Uyumsuzluklar

### 1. API Endpoint Path'leri

**Dokümantasyonda:**
- `GET /api/elevators/{id}/qr/download?format=png|pdf`

**Mevcut Implementasyonda:**
- `GET /api/elevators/{id}/qr` (PNG)
- `GET /api/elevators/{id}/qr/pdf` (PDF)

**Öneri:** Mevcut implementasyon daha RESTful. Dokümantasyonu güncelleyin veya backend'i dokümantasyona göre değiştirin.

### 2. QR Validation Endpoint

**Dokümantasyonda:**
- `GET /api/qr/validate?e={code}&s={signature}`

**Mevcut Implementasyonda:**
- `GET /maintenance-executions/validate-qr?token={token}` (farklı format)

**Öneri:** Elevator QR için yeni endpoint ekleyin: `/api/qr/validate`

### 3. QR URL Format

**Dokümantasyonda:**
- `https://app.saraasansor.com/qr-start?e={elevatorCode}&s={signature}`
- `e` = Elevator public code (identityNumber)

**Mevcut Implementasyonda:**
- `https://app.saraasansor.com/qr-start?e={elevatorId}&s={signature}`
- `e` = Elevator ID (numeric)

**Öneri:** Dokümantasyon daha güvenli (public code kullanımı). Backend'i güncelleyin.

### 4. Frontend Hook

**Dokümantasyonda:**
- `useElevatorQr` custom hook öneriliyor

**Mevcut Implementasyonda:**
- Direkt `useQuery` component içinde kullanılıyor

**Öneri:** Hook pattern daha temiz. İsteğe bağlı refactor.

## 🔧 Önerilen Düzeltmeler

### 1. Backend: Elevator Code Kullanımı

```java
// ElevatorQRSignatureService.java
public String generateQRURL(Long elevatorId) {
    Elevator elevator = elevatorRepository.findById(elevatorId)
        .orElseThrow(() -> new RuntimeException("Elevator not found"));
    
    // Use public code instead of ID
    String elevatorCode = elevator.getKimlikNo(); // or getIdentityNumber()
    String signature = generateSignature(elevatorCode);
    
    return String.format("%s/qr-start?e=%s&s=%s", 
        baseUrl, elevatorCode, signature);
}
```

### 2. Backend: Unified Download Endpoint (Optional)

```java
@GetMapping("/{id}/qr/download")
public ResponseEntity<byte[]> downloadQR(
        @PathVariable Long id,
        @RequestParam(defaultValue = "png") String format) {
    
    if ("pdf".equalsIgnoreCase(format)) {
        return getElevatorQRCodePDF(id, null);
    } else {
        return getElevatorQRCode(id);
    }
}
```

### 3. Frontend: useElevatorQr Hook (Optional Refactor)

```typescript
// hooks/useElevatorQr.ts
export function useElevatorQr(elevatorId: number) {
  // Mevcut ElevatorQRCode component'teki logic'i buraya taşıyın
  // Daha reusable ve testable olur
}
```

### 4. QR Validation Service

```typescript
// services/elevator.service.ts
export const elevatorService = {
  // ... existing methods ...
  
  validateQRCode: async (elevatorCode: string, signature: string) => {
    const { data } = await apiClient.get('/api/qr/validate', {
      params: { e: elevatorCode, s: signature }
    })
    return unwrapResponse(data)
  }
}
```

## 📝 Güncellenmiş Dokümantasyon Önerileri

### 1. Endpoint Uyumluluğu

Dokümantasyonda şu şekilde belirtin:

```markdown
### API Endpoints

**Option A (Current Implementation):**
- `GET /api/elevators/{id}/qr` - PNG image
- `GET /api/elevators/{id}/qr/pdf` - PDF document

**Option B (Unified Download):**
- `GET /api/elevators/{id}/qr/download?format=png|pdf`
```

### 2. QR Code vs ID

Açıkça belirtin:

```markdown
**Important:** QR URL uses `elevatorCode` (public identifier like `ELEV-002`) 
instead of `elevatorId` (numeric ID) for security reasons.
```

### 3. Validation Endpoint

```markdown
**Note:** Elevator QR validation uses different endpoint than maintenance QR:
- Elevator QR: `/api/qr/validate?e={code}&s={signature}`
- Maintenance QR: `/maintenance-executions/validate-qr?token={token}`
```

## ✅ Sonuç

**Dokümantasyon Kalitesi:** ⭐⭐⭐⭐ (4/5)

**Eksikler:**
1. Mevcut implementasyonla endpoint path uyumsuzluğu
2. Elevator code vs ID kullanımı net değil
3. Validation endpoint detayları eksik

**Öneri:**
1. Backend'i dokümantasyona göre güncelleyin (elevatorCode kullanımı)
2. Veya dokümantasyonu mevcut implementasyona göre güncelleyin
3. QR validation endpoint'ini ekleyin
4. Frontend hook'u optional olarak refactor edin

**Genel Değerlendirme:** Dokümantasyon iyi ama mevcut kodla uyumlu hale getirilmeli.
