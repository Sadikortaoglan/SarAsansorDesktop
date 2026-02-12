# Vite Proxy Connection Fix

## Sorun

```
ECONNREFUSED - Backend'e bağlanılamıyor
http proxy error: /api/elevators
http proxy error: /api/auth/login
```

## Yapılan Düzeltmeler

### 1. Vite Config Proxy ✅

**Dosya**: `vite.config.ts`

**ÖNCE**:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/api/, '/api'),  // Gereksiz rewrite
  },
}
```

**SONRA**:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false,
  },
}
```

**Değişiklik**: Gereksiz `rewrite` kaldırıldı (path zaten `/api` ile başlıyor, rewrite'a gerek yok).

### 2. Vite Cache Temizlendi ✅

```bash
rm -rf node_modules/.vite
```

### 3. Backend Port Kontrolü

**Beklenen**: Backend `http://localhost:8080/api` adresinde çalışmalı

**Kontrol**:
```bash
curl http://localhost:8080/api/auth/login
# veya
lsof -i :8080
```

## Sonraki Adımlar

1. **Backend'i başlatın** (eğer çalışmıyorsa):
   ```bash
   cd /Users/sadikortaoglan/Desktop/SaraAsansor/backend
   mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8080
   ```

2. **Vite dev server'ı restart edin**:
   ```bash
   cd /Users/sadikortaoglan/Desktop/SaraAsansor_WEB
   npm run dev
   ```

3. **Test edin**:
   - Browser'da `http://localhost:5173` açın
   - DevTools → Network tab'ı açın
   - Login yapın
   - `/api/elevators` request'ini kontrol edin

## Beklenen Sonuç

✅ `ECONNREFUSED` hatası olmamalı  
✅ Backend'e bağlantı kurulmalı  
✅ API response'ları görünmeli  
✅ Login çalışmalı  
✅ Data yüklenmeli

## Not

Eğer hala `ECONNREFUSED` hatası alıyorsanız:
1. Backend'in çalıştığından emin olun (`lsof -i :8080`)
2. Backend'in `http://localhost:8080/api` adresinde olduğunu kontrol edin
3. Firewall veya başka bir process'in 8080 portunu bloklamadığını kontrol edin

