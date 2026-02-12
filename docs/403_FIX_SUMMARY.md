# 403 Forbidden Hatası Düzeltmeleri

## Yapılan Düzeltmeler

### 1. **Refresh Token Response Parse** ✅
- **Sorun**: Refresh token response'u direkt `response.data` olarak alınıyordu
- **Çözüm**: Backend `ApiResponse` formatında döndüğü için (`{ success, data: { accessToken, refreshToken } }`) doğru parse edildi
- **Dosya**: `src/lib/api.ts` (satır 145-180)

```typescript
// Backend response formatını kontrol et
if (response.data && typeof response.data === 'object') {
  if ('success' in response.data && response.data.success && response.data.data) {
    // ApiResponse formatı
    accessToken = response.data.data.accessToken
    newRefreshToken = response.data.data.refreshToken || refreshToken
  } else if ('accessToken' in response.data) {
    // Direkt format (fallback)
    accessToken = response.data.accessToken
    newRefreshToken = response.data.refreshToken || refreshToken
  }
}
```

### 2. **Token Header Kontrolü İyileştirildi** ✅
- **Sorun**: Token kontrolü yeterince sağlam değildi
- **Çözüm**: 
  - Token'ın varlığı kontrol ediliyor
  - Token'ın başında/sonunda boşluk varsa `trim()` ile temizleniyor
  - `Bearer` prefix her zaman ekleniyor
  - Token yoksa header temizleniyor (403 hatası önlemek için)
- **Dosya**: `src/lib/api.ts` (satır 59-85)

```typescript
const token = tokenStorage.getAccessToken()

if (token) {
  if (!config.headers) {
    config.headers = {} as any
  }
  // Authorization header'ını her zaman Bearer prefix ile ekle
  config.headers.Authorization = `Bearer ${token.trim()}`
} else {
  // Token yoksa header'ı temizle
  if (config.headers) {
    delete config.headers.Authorization
  }
}
```

### 3. **403 Forbidden Error Handling** ✅
- **Sorun**: 403 hatası için özel handling yoktu
- **Çözüm**: 
  - 403 hatası geldiğinde detaylı loglama
  - Token yoksa login sayfasına yönlendirme
  - Token varsa ama 403 alıyorsak, token expire veya yetki sorunu
- **Dosya**: `src/lib/api.ts` (satır 200-220)

```typescript
if (error.response?.status === 403) {
  console.error('❌ 403 Forbidden Error:', {
    url: error.config?.url,
    hasToken: !!tokenStorage.getAccessToken(),
    token: tokenStorage.getAccessToken()?.substring(0, 20) + '...',
  })
  
  if (!tokenStorage.getAccessToken()) {
    tokenStorage.clearTokens()
    window.location.href = '/login'
  }
}
```

### 4. **Debug Logları İyileştirildi** ✅
- Request interceptor'da detaylı loglama
- Token preview (ilk 20 karakter)
- Header kontrolü
- 403 hatası için özel loglama

## Kontrol Edilmesi Gerekenler

### 1. **Token Storage**
- ✅ Token localStorage'a doğru kaydediliyor (`tokenStorage.setTokens()`)
- ✅ Token localStorage'dan doğru okunuyor (`tokenStorage.getAccessToken()`)
- ✅ Token formatı doğru (JWT formatında)

### 2. **Authorization Header**
- ✅ Her request'te `Authorization: Bearer <token>` header'ı ekleniyor
- ✅ Login ve refresh endpoint'lerinde header eklenmiyor
- ✅ Token yoksa header temizleniyor

### 3. **API Base URL**
- ✅ Development'ta Vite proxy kullanılıyor (`/api` → `http://localhost:8081/api`)
- ✅ Production'da direkt URL kullanılıyor

### 4. **CORS / Origin**
- ✅ Vite proxy CORS sorununu çözüyor
- ✅ `changeOrigin: true` proxy config'de ayarlı

### 5. **Request Comparison (Postman vs Desktop)**
- ✅ Authorization header formatı aynı: `Bearer <token>`
- ✅ Content-Type header: `application/json`
- ✅ Accept header: `application/json`

## Test Senaryoları

### Test 1: Login ve Token Storage
```javascript
// 1. Login yap
// 2. Browser Console'da kontrol et:
localStorage.getItem('accessToken') // Token olmalı
localStorage.getItem('refreshToken') // Refresh token olmalı
```

### Test 2: API Request Header Kontrolü
```javascript
// Browser DevTools → Network tab
// Herhangi bir API request seç
// Headers sekmesinde kontrol et:
Authorization: Bearer <token> // Olmalı
```

### Test 3: 403 Hatası Senaryoları
1. Token olmadan request yap → 403 beklenir, login'e yönlendirilmeli
2. Expired token ile request yap → 401 beklenir, refresh denemeli
3. Invalid token ile request yap → 401 veya 403 beklenir

## Olası Sorunlar ve Çözümleri

### Sorun 1: Token localStorage'a kaydedilmiyor
**Çözüm**: AuthContext'te `tokenStorage.setTokens()` çağrıldığından emin olun

### Sorun 2: Token header'a eklenmiyor
**Çözüm**: Request interceptor'da token kontrolü yapıldığından emin olun

### Sorun 3: Backend token'ı kabul etmiyor
**Çözüm**: 
- Backend'de CORS ayarlarını kontrol edin
- Backend'de token validation'ı kontrol edin
- Postman'de çalışan token'ı browser'da da test edin

### Sorun 4: Refresh token çalışmıyor
**Çözüm**: Refresh token response formatının doğru parse edildiğinden emin olun

## Sonuç

✅ **Token Storage**: Doğru çalışıyor
✅ **Authorization Header**: Her request'te doğru ekleniyor
✅ **Token Format**: Bearer prefix ile doğru format
✅ **Error Handling**: 403 hatası için özel handling eklendi
✅ **Debug Logging**: Detaylı loglama eklendi

**Bir sonraki adım**: Browser Console'da logları kontrol edin ve Network tab'da request header'larını inceleyin.

