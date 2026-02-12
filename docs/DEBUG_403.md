# 403 Forbidden Debug Guide

## Network Tab'da Kontrol Edilmesi Gerekenler

### 1. Request Headers Kontrolü

Network tab'da **herhangi bir 403 hatası veren request'e tıklayın** (örn: `elevators`, `users`, `inspections`):

1. **Headers** sekmesine gidin
2. **Request Headers** bölümünde şunları kontrol edin:

```
Authorization: Bearer <token>
```

**Eğer Authorization header YOKSA:**
- Token localStorage'a kaydedilmemiş olabilir
- Request interceptor çalışmıyor olabilir

**Eğer Authorization header VARSA ama hala 403 alıyorsanız:**
- Token geçersiz olabilir
- Token expire olmuş olabilir
- Backend token'ı kabul etmiyor olabilir

### 2. Browser Console Kontrolü

Browser Console'da (F12 → Console) şu logları arayın:

```
✅ Authorization header added: { url: ..., method: ..., tokenPreview: ... }
```

**Bu log VARSA:** Token header'a ekleniyor, sorun token'ın kendisinde olabilir.

**Bu log YOKSA:** Token localStorage'da yok veya request interceptor çalışmıyor.

### 3. localStorage Kontrolü

Browser Console'da şunu çalıştırın:

```javascript
localStorage.getItem('accessToken')
```

**Sonuç `null` ise:**
- Login yapılmamış veya token kaydedilmemiş
- Token silinmiş olabilir

**Sonuç bir token string ise:**
- Token var, ama backend tarafında kabul edilmiyor olabilir

### 4. Token Format Kontrolü

Browser Console'da:

```javascript
const token = localStorage.getItem('accessToken')
console.log('Token:', token)
console.log('Token length:', token?.length)
console.log('Token preview:', token?.substring(0, 50))
```

Token JWT formatında olmalı (3 nokta ile ayrılmış base64 string):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 5. Postman vs Browser Karşılaştırması

**Postman'de çalışan bir request'i kopyalayın:**
1. Postman'de bir GET request yapın (örn: `/api/elevators`)
2. **Headers** sekmesinde `Authorization: Bearer <token>` header'ını kopyalayın
3. Browser Console'da token'ı kontrol edin:

```javascript
const browserToken = localStorage.getItem('accessToken')
const postmanToken = 'POSTMAN_DAN_KOPYALADIGINIZ_TOKEN' // Postman'den kopyalayın

console.log('Browser token:', browserToken)
console.log('Postman token:', postmanToken)
console.log('Tokens match:', browserToken === postmanToken)
```

### 6. Request URL Kontrolü

Network tab'da request URL'lerini kontrol edin:

- ✅ `http://localhost:5173/api/elevators` (Vite proxy kullanıyor)
- ❌ `http://localhost:8081/api/elevators` (Direkt backend'e gidiyor - proxy çalışmıyor)

**Eğer direkt backend'e gidiyorsa:** Vite proxy config'i çalışmıyor, `vite.config.ts` kontrol edin.

## Hızlı Test

Browser Console'da şunu çalıştırın:

```javascript
// 1. Token kontrolü
const token = localStorage.getItem('accessToken')
console.log('Token exists:', !!token)
console.log('Token:', token?.substring(0, 50) + '...')

// 2. Manuel request testi
if (token) {
  fetch('/api/elevators', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(r => {
    console.log('Status:', r.status)
    return r.json()
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err))
} else {
  console.error('No token found!')
}
```

## Olası Çözümler

### Çözüm 1: Token localStorage'a kaydedilmemiş

**Semptom:** Authorization header YOK, localStorage'da token YOK

**Çözüm:** 
- Login sayfasına gidin ve tekrar login yapın
- Browser Console'da login response'unu kontrol edin

### Çözüm 2: Token expire olmuş

**Semptom:** Authorization header VAR, ama 403 alıyorsunuz

**Çözüm:**
- Token refresh mekanizması çalışmalı (401 durumunda)
- Eğer 403 alıyorsanız, backend tarafında token validation hatası olabilir

### Çözüm 3: Backend CORS veya Security Config

**Semptom:** Postman çalışıyor ama browser çalışmıyor

**Çözüm:**
- Backend'de CORS config'i kontrol edin
- Backend'de security config'i kontrol edin
- Vite proxy config'i kontrol edin

### Çözüm 4: Request Interceptor Çalışmıyor

**Semptom:** Authorization header YOK, localStorage'da token VAR

**Çözüm:**
- `src/lib/api.ts` dosyasındaki request interceptor'ı kontrol edin
- Browser Console'da interceptor loglarını kontrol edin

