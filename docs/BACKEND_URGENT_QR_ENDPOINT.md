# ⚠️ URGENT: Backend QR Endpoint Implementation

## Problem
Frontend is calling `/api/elevators/{id}/qr` but backend returns:
```
"No static resource elevators/1/qr"
Status: 500 Internal Server Error
```

## Root Cause
The endpoint `/api/elevators/{id}/qr` is **NOT implemented** in the backend.

## Immediate Solution

### Step 1: Create ElevatorQRController.java

Create this file in your backend:
```
src/main/java/com/saraasansor/api/controller/ElevatorQRController.java
```

**Full code:** See `BACKEND_ELEVATOR_QR.md` section "5. Elevator QR Controller"

### Step 2: Implement Required Services

You need these services (see `BACKEND_ELEVATOR_QR.md`):
1. `ElevatorQRSignatureService` - For HMAC signature
2. `ElevatorQRGeneratorService` - For QR image generation

### Step 3: Add Dependencies

Add to `pom.xml`:
```xml
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>core</artifactId>
    <version>3.5.2</version>
</dependency>
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>javase</artifactId>
    <version>3.5.2</version>
</dependency>
```

### Step 4: Configuration

Add to `application.yml`:
```yaml
app:
  qr:
    elevator-secret: ${QR_ELEVATOR_SECRET:change-this-secret-key-min-32-chars}
    base-url: ${QR_BASE_URL:https://app.saraasansor.com}
```

## Minimal Working Endpoint (Quick Fix)

If you need a quick working version first:

```java
@RestController
@RequestMapping("/api/elevators")
public class ElevatorQRController {
    
    @GetMapping("/{id}/qr")
    @PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
    public ResponseEntity<byte[]> getElevatorQRCode(@PathVariable Long id) {
        // TODO: Implement full QR generation
        // For now, return a placeholder or throw NOT_IMPLEMENTED
        
        throw new ResponseStatusException(
            HttpStatus.NOT_IMPLEMENTED,
            "QR endpoint not yet implemented. See BACKEND_ELEVATOR_QR.md"
        );
    }
}
```

## Testing After Implementation

1. **Test endpoint exists:**
```bash
curl -X GET "http://localhost:8080/api/elevators/1/qr" \
  -H "Authorization: Bearer {token}"
```

2. **Expected response:**
- Status: 200 OK
- Content-Type: image/png
- Body: PNG image bytes

## Files to Create/Update

1. ✅ `ElevatorQRController.java` - **CREATE**
2. ✅ `ElevatorQRSignatureService.java` - **CREATE** (see BACKEND_ELEVATOR_QR.md)
3. ✅ `ElevatorQRGeneratorService.java` - **CREATE** (see BACKEND_ELEVATOR_QR.md)
4. ✅ `pom.xml` - **UPDATE** (add ZXing dependencies)
5. ✅ `application.yml` - **UPDATE** (add QR config)

## Reference

Full implementation details: `BACKEND_ELEVATOR_QR.md`
