# Backend Endpoint Fix

## ❌ Sorun

Frontend şu URL'yi çağırıyor:
```
POST http://localhost:5173/api/api/qr/remote-start
```

**Çift `/api/api/` var!**

## ✅ Çözüm (Frontend'de Düzeltildi)

Frontend'de endpoint'lerden `/api` prefix'i kaldırıldı çünkü `apiClient` zaten `/api` base URL'ine sahip.

**Önceki:**
```typescript
'/api/qr/validate'      // ❌ Çift /api/api/ oluşuyor
'/api/qr/remote-start'  // ❌ Çift /api/api/ oluşuyor
```

**Şimdi:**
```typescript
'/qr/validate'      // ✅ Doğru: /api + /qr/validate = /api/qr/validate
'/qr/remote-start'  // ✅ Doğru: /api + /qr/remote-start = /api/qr/remote-start
```

## ✅ Backend Endpoint'leri (Değişiklik Yok)

Backend'de endpoint'ler zaten doğru:

```java
@PostMapping("/qr/validate")
public ResponseEntity<QRValidateResponse> validateQR(@RequestBody QRValidateRequest request) {
    // ...
}

@PostMapping("/qr/remote-start")
public ResponseEntity<QRRemoteStartResponse> remoteStart(@RequestBody QRRemoteStartRequest request) {
    // ...
}
```

**Controller mapping:** `@RequestMapping("/api")` ile `/api/qr/validate` ve `/api/qr/remote-start` oluşur.

## ✅ Sonuç

Frontend düzeltildi. Backend'de değişiklik gerekmez.

**Test:**
- Frontend artık doğru URL'yi çağırıyor: `/api/qr/validate` ve `/api/qr/remote-start`
- Backend endpoint'leri zaten doğru implement edilmiş olmalı
