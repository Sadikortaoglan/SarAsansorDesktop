# BACKEND PROMPT - Maintenance Plan Creation API

## 🎯 SORUN
Frontend'den `POST /api/maintenance-plans` endpoint'ine istek gönderildiğinde backend **"Elevator ID is required"** hatası döndürüyor, ancak frontend doğru payload gönderiyor.

---

## 📤 FRONTEND'DEN GÖNDERİLEN REQUEST

### HTTP Method & Endpoint
```
POST http://localhost:5173/api/maintenance-plans
```

### Headers
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

### Request Body (JSON)
```json
{
  "elevatorId": 15,
  "templateId": 1,
  "plannedDate": "2026-02-10"
}
```

### Frontend Log'ları (Console)
```
🚀 FINAL REQUEST - Payload (exact JSON): {
  "elevatorId": 15,
  "templateId": 1,
  "plannedDate": "2026-02-10"
}
📤 Payload elevatorId type: number value: 15
📤 Payload templateId type: number value: 1
📤 Payload plannedDate: 2026-02-10
```

---

## ✅ BACKEND'DEN BEKLENEN DAVRANIŞ

### 1. Request Alındığında
Backend loglarında şunu görmeliyiz:
```
DEBUG: Received DTO - elevatorId: 15, templateId: 1, plannedDate: 2026-02-10
```

### 2. DTO Validation
Backend DTO şu field'ları beklemeli:
```java
public class CreateMaintenancePlanRequest {
    @NotNull(message = "Elevator ID is required")
    private Long elevatorId;
    
    @NotNull(message = "Template ID is required")
    private Long templateId;
    
    @NotNull(message = "Planned date is required")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate plannedDate;
    
    // Optional fields
    private Long assignedTechnicianId;
    private Integer dateWindowDays; // default: 7
}
```

### 3. Response Format
Başarılı response:
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
    "templateName": "Template Adı",
    "plannedDate": "2026-02-10",
    "assignedTechnicianId": 5,
    "assignedTechnicianName": "teknisyen",
    "status": "PLANNED",
    ...
  }
}
```

---

## 🔍 KONTROL EDİLMESİ GEREKENLER

### 1. Jackson Deserialization
- Request body JSON'dan DTO'ya doğru map ediliyor mu?
- Field name'ler case-sensitive mi? (`elevatorId` vs `elevator_id`)
- `@RequestBody` annotation doğru mu?

### 2. DTO Validation
- `@NotNull` annotation'ları doğru mu?
- Validation message'ları doğru mu?
- `@Valid` annotation controller'da var mı?

### 3. Controller Method
```java
@PostMapping("/maintenance-plans")
public ResponseEntity<ApiResponse<MaintenancePlanDTO>> createPlan(
    @Valid @RequestBody CreateMaintenancePlanRequest request
) {
    // DEBUG log ekleyin
    log.debug("Received DTO - elevatorId: {}, templateId: {}, plannedDate: {}", 
        request.getElevatorId(), 
        request.getTemplateId(), 
        request.getPlannedDate());
    
    // ...
}
```

### 4. Global Exception Handler
- `@ExceptionHandler(MethodArgumentNotValidException.class)` var mı?
- Validation error'ları doğru handle ediliyor mu?

### 5. Request Logging
Backend'de request interceptor veya filter ile gelen request'i loglayın:
```java
log.info("Incoming request - Method: {}, URL: {}, Body: {}", 
    request.getMethod(), 
    request.getRequestURI(), 
    requestBody);
```

---

## 🐛 DEBUG ADIMLARI

### Adım 1: Request Body Kontrolü
Backend'de gelen request body'yi loglayın:
```java
@PostMapping("/maintenance-plans")
public ResponseEntity<?> createPlan(HttpServletRequest httpRequest) {
    // Request body'yi okuyun ve loglayın
    String body = IOUtils.toString(httpRequest.getInputStream(), StandardCharsets.UTF_8);
    log.info("Raw request body: {}", body);
    // ...
}
```

### Adım 2: DTO Mapping Kontrolü
DTO'ya map edildikten sonra değerleri loglayın:
```java
log.debug("DTO after mapping - elevatorId: {}, templateId: {}, plannedDate: {}", 
    request.getElevatorId(), 
    request.getTemplateId(), 
    request.getPlannedDate());
```

### Adım 3: Validation Error Detayları
Validation error'ları detaylı loglayın:
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<?> handleValidationErrors(MethodArgumentNotValidException ex) {
    ex.getBindingResult().getFieldErrors().forEach(error -> {
        log.error("Validation error - Field: {}, Message: {}, RejectedValue: {}", 
            error.getField(), 
            error.getDefaultMessage(), 
            error.getRejectedValue());
    });
    // ...
}
```

---

## 📋 TEST SENARYOSU

### Frontend'den Gönderilecek Test Data
```json
{
  "elevatorId": 15,
  "templateId": 1,
  "plannedDate": "2026-02-10"
}
```

### Beklenen Backend Log'ları
```
INFO  - Incoming request - Method: POST, URL: /api/maintenance-plans
INFO  - Raw request body: {"elevatorId":15,"templateId":1,"plannedDate":"2026-02-10"}
DEBUG - Received DTO - elevatorId: 15, templateId: 1, plannedDate: 2026-02-10
DEBUG - DTO after mapping - elevatorId: 15, templateId: 1, plannedDate: 2026-02-10
```

### Eğer Hata Alınıyorsa
```
ERROR - Validation error - Field: elevatorId, Message: Elevator ID is required, RejectedValue: null
```

---

## ✅ ÇÖZÜM KONTROL LİSTESİ

- [ ] Request body backend'e ulaşıyor mu? (Raw body log'u kontrol edin)
- [ ] Jackson DTO'ya map ediyor mu? (DTO field'ları null mu?)
- [ ] Field name'ler doğru mu? (`elevatorId` vs `elevator_id`)
- [ ] `@NotNull` validation çalışıyor mu?
- [ ] `@Valid` annotation controller'da var mı?
- [ ] GlobalExceptionHandler validation error'ları yakalıyor mu?
- [ ] Response format frontend'in beklediği gibi mi?

---

## 🚨 YENİ HATA: "No static resource maintenance-plans"

### Hata Mesajı
```json
{
  "success": false,
  "message": "An error occurred: No static resource maintenance-plans.",
  "data": null,
  "errors": null
}
```

### Sorun
Backend endpoint'i bulamıyor. Endpoint path'i yanlış olabilir.

### Frontend'den Gönderilen Endpoint
```
POST /api/maintenance-plans
```

### Backend'den İstenen Bilgiler

#### 1. Doğru Endpoint Path'i Nedir?
- `/api/maintenance-plans` mi?
- `/api/maintenance-plans/` (trailing slash) mi?
- `/api/maintenancePlans` (camelCase) mi?
- `/api/maintenance_plans` (snake_case) mi?
- Farklı bir path mi? (örn: `/api/plans`, `/api/maintenance/plans`)

#### 2. Controller Mapping
Backend controller'da endpoint nasıl tanımlı?
```java
@PostMapping("/maintenance-plans")  // Bu mu?
@PostMapping("/maintenancePlans")   // Yoksa bu mu?
@PostMapping("/plans")              // Yoksa bu mu?
```

#### 3. Base Path
- Controller'da `@RequestMapping` var mı?
- Base path nedir? (örn: `/api/v1/maintenance-plans`)

#### 4. CORS / Security
- CORS ayarları bu endpoint'i kapsıyor mu?
- Security config'de bu endpoint allow edilmiş mi?

---

## 📞 İLETİŞİM

Frontend doğru JSON gönderiyor. Sorun backend'de:
- Endpoint path'i yanlış
- Controller mapping eksik/yanlış
- CORS/Security ayarları

**Backend'den şu bilgileri paylaşın:**
1. Doğru endpoint path'i
2. Controller method signature
3. Base path (varsa)
4. CORS/Security ayarları

Buna göre frontend'i güncelleyeceğiz.
