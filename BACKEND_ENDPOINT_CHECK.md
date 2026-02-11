# Backend Endpoint Kontrol Listesi

## 🚨 SORUN: "No static resource maintenance-plans"

### Frontend'den Gönderilen Request
```
GET http://localhost:5173/api/maintenance-plans?month=2026-02
POST http://localhost:5173/api/maintenance-plans
```

### Vite Proxy (Frontend → Backend)
Frontend'den gelen istekler Vite tarafından şu şekilde proxy ediliyor:
```
http://localhost:5173/api/maintenance-plans 
  → http://localhost:8080/api/maintenance-plans
```

---

## ✅ FRONTEND TARAFI KONTROL EDİLDİ

### 1. Vite Proxy Config ✅
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      secure: false,
    },
  },
}
```
**Durum:** ✅ Doğru - `/api` istekleri `http://localhost:8080`'e proxy ediliyor

### 2. API Base URL ✅
```typescript
// src/lib/api.ts
const API_BASE_URL = isDevelopment 
  ? '/api'  // Development: Vite proxy kullanılıyor
  : 'http://localhost:8080/api'  // Production: Direkt backend
```
**Durum:** ✅ Doğru - Development'ta `/api` kullanılıyor (Vite proxy üzerinden)

### 3. Endpoint Path ✅
```typescript
// src/lib/api-endpoints.ts
MAINTENANCE_PLANS: {
  BASE: '/maintenance-plans',  // ✅ Doğru
  BY_ID: (id: number) => `/maintenance-plans/${id}`,
  COMPLETE: (id: number) => `/maintenance-plans/${id}/complete`,
}
```
**Durum:** ✅ Doğru - Endpoint path'i `/maintenance-plans`

### 4. Request Format ✅
```json
// POST Request Body
{
  "elevatorId": 15,
  "templateId": 1,
  "plannedDate": "2026-02-10"
}
```
**Durum:** ✅ Doğru - Backend'in beklediği format

---

## ❓ BACKEND'E SORULACAK SORULAR

### 1. Endpoint Gerçekten Var mı?
Backend'de şu endpoint'ler tanımlı mı?
- ✅ `POST /api/maintenance-plans` - Create
- ✅ `GET /api/maintenance-plans` - Get All
- ✅ `GET /api/maintenance-plans/{id}` - Get By ID
- ✅ `PUT /api/maintenance-plans/{id}` - Update
- ✅ `DELETE /api/maintenance-plans/{id}` - Delete
- ✅ `POST /api/maintenance-plans/{id}/complete` - Complete with QR

**Kontrol Komutu:**
```bash
# Backend'de controller'ı kontrol edin
grep -r "@PostMapping\|@GetMapping\|@PutMapping\|@DeleteMapping" --include="*Controller.java" | grep -i "maintenance.*plan"
```

### 2. Controller Base Path Nedir?
Controller'da `@RequestMapping` var mı?
```java
@RestController
@RequestMapping("/api")  // ← Bu var mı?
public class MaintenancePlanController {
    
    @PostMapping("/maintenance-plans")  // ← Bu var mı?
    public ResponseEntity<?> createPlan(...) {
        // ...
    }
}
```

### 3. Spring Boot Application Context Path Var mı?
`application.properties` veya `application.yml`'de:
```properties
server.servlet.context-path=/api  # ← Bu var mı?
```
Eğer varsa, endpoint'ler `/api/api/maintenance-plans` olabilir (yanlış!)

### 4. Security Config Endpoint'i Allow Ediyor mu?
Security config'de `/api/maintenance-plans` endpoint'i allow edilmiş mi?
```java
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/maintenance-plans/**").permitAll()  // ← Bu var mı?
            // ...
        );
    }
}
```

### 5. CORS Ayarları Doğru mu?
CORS config'de `/api/maintenance-plans` endpoint'i allow edilmiş mi?
```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.addAllowedOrigin("http://localhost:5173");  // ← Frontend URL
        configuration.addAllowedMethod("*");
        configuration.addAllowedHeader("*");
        configuration.setAllowedPaths(Arrays.asList("/api/**"));  // ← Bu var mı?
        // ...
    }
}
```

---

## 🔍 BACKEND'DE KONTROL EDİLMESİ GEREKENLER

### 1. Controller Dosyası
```java
// MaintenancePlanController.java dosyasını kontrol edin
@RestController
@RequestMapping("/api")  // ← Base path doğru mu?
public class MaintenancePlanController {
    
    @PostMapping("/maintenance-plans")  // ← Path doğru mu?
    public ResponseEntity<ApiResponse<MaintenancePlanResponseDto>> createPlan(
        @Valid @RequestBody CreateMaintenancePlanRequest request
    ) {
        // ...
    }
    
    @GetMapping("/maintenance-plans")  // ← Path doğru mu?
    public ResponseEntity<ApiResponse<List<MaintenancePlanResponseDto>>> getAllPlans(
        @RequestParam(required = false) String month,
        @RequestParam(required = false) Integer year,
        @RequestParam(required = false) Long elevatorId,
        @RequestParam(required = false) String status
    ) {
        // ...
    }
}
```

### 2. Application Properties
```properties
# application.properties
server.port=8080
server.servlet.context-path=  # ← Boş olmalı (veya yok)
spring.web.servlet.path=/api  # ← Bu var mı? Varsa sorun olabilir
```

### 3. Log Kontrolü
Backend loglarında şunu görmelisiniz:
```
Mapped "{[/api/maintenance-plans],methods=[POST]}" onto createPlan(...)
Mapped "{[/api/maintenance-plans],methods=[GET]}" onto getAllPlans(...)
```

Eğer bu log'lar yoksa, endpoint register edilmemiş demektir.

---

## 🧪 TEST KOMUTLARI

### 1. Backend Endpoint'ini Direkt Test Et
```bash
# GET Request
curl -X GET "http://localhost:8080/api/maintenance-plans?month=2026-02" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"

# POST Request
curl -X POST "http://localhost:8080/api/maintenance-plans" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "elevatorId": 15,
    "templateId": 1,
    "plannedDate": "2026-02-10"
  }'
```

### 2. Backend Port Kontrolü
```bash
# Backend çalışıyor mu?
lsof -i :8080

# veya
curl http://localhost:8080/actuator/health
```

### 3. Spring Boot Actuator (Eğer varsa)
```bash
# Tüm endpoint'leri listele
curl http://localhost:8080/actuator/mappings
```

---

## 📋 SONUÇ

### Frontend Tarafı ✅
- Vite proxy config doğru
- API base URL doğru
- Endpoint path doğru
- Request format doğru

### Backend Tarafı ❓
- Endpoint tanımlı mı? (Kontrol edilmeli)
- Controller base path doğru mu? (Kontrol edilmeli)
- Security config endpoint'i allow ediyor mu? (Kontrol edilmeli)
- CORS ayarları doğru mu? (Kontrol edilmeli)

---

## 🚀 ÇÖZÜM ADIMLARI

1. **Backend loglarını kontrol edin:**
   - Spring Boot başlangıç log'larında endpoint mapping'leri görünüyor mu?
   - `Mapped "{[/api/maintenance-plans]..."` log'u var mı?

2. **Backend controller'ı kontrol edin:**
   - `MaintenancePlanController.java` dosyası var mı?
   - `@RequestMapping("/api")` base path doğru mu?
   - `@PostMapping("/maintenance-plans")` path doğru mu?

3. **Backend'i restart edin:**
   - Controller değişiklikleri sonrası restart gerekebilir

4. **Test edin:**
   - `curl` komutu ile direkt backend'i test edin
   - Frontend'den tekrar deneyin

---

## 📞 BACKEND'E İLETİLECEK MESAJ

**Frontend hazır ve doğru request gönderiyor. Sorun backend tarafında:**

1. ✅ Frontend endpoint: `/api/maintenance-plans`
2. ✅ Frontend request format: `{ elevatorId, templateId, plannedDate }`
3. ✅ Vite proxy: `localhost:5173/api` → `localhost:8080/api`
4. ❓ Backend endpoint tanımlı mı? (Kontrol edilmeli)
5. ❓ Controller base path doğru mu? (Kontrol edilmeli)
6. ❓ Security/CORS ayarları doğru mu? (Kontrol edilmeli)

**Backend'den beklenen:**
- Controller'da `@PostMapping("/maintenance-plans")` var mı?
- `@RequestMapping("/api")` base path doğru mu?
- Spring Boot log'larında endpoint mapping görünüyor mu?
