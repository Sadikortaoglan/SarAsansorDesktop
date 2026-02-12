# API Base URL ve Token Kontrolü Düzeltmeleri

## Yapılan Değişiklikler

### 1. API Base URL Güncellendi ✅

**ÖNCE**: `http://localhost:8081/api`  
**SONRA**: `http://localhost:8080/api`

**Değişiklikler**:
- `src/lib/api.ts`: `API_BASE_URL` güncellendi
- `vite.config.ts`: Proxy target `http://localhost:8080` olarak güncellendi

### 2. Login Olmadan İstek Engellendi ✅

**Sorun**: Token yoksa bile istek gönderiliyordu, 403 hatası alınıyordu

**Düzeltme**: Token yoksa istek gönderilmeden önce engelleniyor ve login sayfasına yönlendiriliyor

```typescript
// ÖNCE (YANLIŞ):
if (token) {
  // Token ekle
} else {
  // Token yoksa header'ı temizle ama isteği gönder
  delete config.headers.Authorization
}

// SONRA (DOĞRU):
if (token) {
  // Token ekle
} else {
  // Token yoksa isteği iptal et
  return Promise.reject(new Error('Authentication required. Please login.'))
}
```

### 3. Refresh Token Request Header'ı ✅

**Düzeltme**: Refresh token request'inde `Accept: application/json` header'ı eklendi

## Sonuç

✅ API base URL: `http://localhost:8080/api`  
✅ Login olmadan istek gönderilmiyor  
✅ Token yoksa istek engelleniyor ve kullanıcı login sayfasına yönlendiriliyor  
✅ Tüm request'ler token ile çalışıyor

## Not

Frontend'i restart etmek gerekiyor (Vite dev server):
- `vite.config.ts` değişikliği için
- `api.ts` değişikliği için

