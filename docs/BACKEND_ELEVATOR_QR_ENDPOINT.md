# Backend: Elevator QR Endpoint Implementation (URGENT)

## Problem
Frontend is calling `/api/elevators/{id}/qr` but backend returns:
```
"No static resource elevators/1/qr"
```

This means the endpoint is not implemented in the backend.

## Quick Fix: Add Controller Endpoint

### 1. Create/Update ElevatorQRController.java

```java
package com.saraasansor.api.controller;

import com.saraasansor.api.model.Elevator;
import com.saraasansor.api.repository.ElevatorRepository;
import com.saraasansor.api.service.ElevatorQRGeneratorService;
import com.saraasansor.api.service.ElevatorQRSignatureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import com.google.zxing.WriterException;

@RestController
@RequestMapping("/api/elevators")
@CrossOrigin(origins = "*")
public class ElevatorQRController {
    
    @Autowired
    private ElevatorRepository elevatorRepository;
    
    @Autowired
    private ElevatorQRGeneratorService qrGeneratorService;
    
    @Autowired
    private ElevatorQRSignatureService signatureService;
    
    /**
     * Get QR code image as PNG
     * GET /api/elevators/{id}/qr
     */
    @GetMapping("/{id}/qr")
    @PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
    public ResponseEntity<byte[]> getElevatorQRCode(@PathVariable Long id) {
        Elevator elevator = elevatorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Elevator not found"
            ));
        
        try {
            byte[] qrImage = qrGeneratorService.generateQRCodeImage(id);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentDispositionFormData("inline", 
                "elevator-" + id + "-qr.png");
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(qrImage);
        } catch (WriterException | IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to generate QR code: " + e.getMessage()
            );
        }
    }
    
    /**
     * Get QR code as PDF
     * GET /api/elevators/{id}/qr/pdf
     */
    @GetMapping("/{id}/qr/pdf")
    @PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
    public ResponseEntity<byte[]> getElevatorQRCodePDF(
            @PathVariable Long id,
            @RequestParam(required = false) String logoPath) {
        
        Elevator elevator = elevatorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Elevator not found"
            ));
        
        try {
            // If ElevatorQRPDFService exists, use it
            // Otherwise, return error or implement basic PDF
            throw new ResponseStatusException(
                HttpStatus.NOT_IMPLEMENTED,
                "PDF generation not yet implemented"
            );
        } catch (Exception e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to generate QR PDF: " + e.getMessage()
            );
        }
    }
    
    /**
     * Get QR URL (for frontend display)
     * GET /api/elevators/{id}/qr-url
     */
    @GetMapping("/{id}/qr-url")
    @PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
    public ResponseEntity<Map<String, String>> getElevatorQRURL(@PathVariable Long id) {
        Elevator elevator = elevatorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Elevator not found"
            ));
        
        String qrURL = signatureService.generateQRURL(id);
        
        return ResponseEntity.ok(Map.of("qrURL", qrURL));
    }
}
```

### 2. Ensure Services Exist

Make sure these services are implemented (see `BACKEND_ELEVATOR_QR.md`):
- `ElevatorQRGeneratorService`
- `ElevatorQRSignatureService`

### 3. Add Dependencies (if not already added)

```xml
<!-- pom.xml -->
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

### 4. Configuration

```yaml
# application.yml
app:
  qr:
    elevator-secret: ${QR_ELEVATOR_SECRET:your-secret-key-min-32-chars}
    base-url: ${QR_BASE_URL:https://app.saraasansor.com}
```

## Testing

After implementing:

1. **Test PNG endpoint:**
```bash
curl -X GET "http://localhost:8080/api/elevators/1/qr" \
  -H "Authorization: Bearer {token}" \
  --output test-qr.png
```

2. **Test QR URL endpoint:**
```bash
curl -X GET "http://localhost:8080/api/elevators/1/qr-url" \
  -H "Authorization: Bearer {token}"
```

## Common Issues

### Issue 1: "No static resource"
**Cause:** Controller endpoint not mapped correctly
**Fix:** Ensure `@GetMapping("/{id}/qr")` is correct and controller is in component scan path

### Issue 2: Service not found
**Cause:** Services not implemented or not autowired
**Fix:** Implement services from `BACKEND_ELEVATOR_QR.md`

### Issue 3: ZXing dependency missing
**Cause:** Dependencies not added to pom.xml
**Fix:** Add ZXing dependencies

### Issue 4: 403 Forbidden
**Cause:** Security configuration blocking endpoint
**Fix:** Check `@PreAuthorize` annotation and security config

## Quick Implementation Checklist

- [ ] Create `ElevatorQRController.java`
- [ ] Implement `ElevatorQRGeneratorService`
- [ ] Implement `ElevatorQRSignatureService`
- [ ] Add ZXing dependencies
- [ ] Configure application.yml
- [ ] Test endpoint: `GET /api/elevators/1/qr`
- [ ] Verify response is PNG image

## Minimal Working Example

If you need a minimal working version first:

```java
@GetMapping("/{id}/qr")
public ResponseEntity<byte[]> getElevatorQRCode(@PathVariable Long id) {
    // Minimal implementation - just return a placeholder
    // Replace with actual QR generation later
    
    try {
        // For now, return a simple 1x1 PNG
        byte[] placeholder = new byte[]{
            (byte)0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            // ... minimal PNG bytes
        };
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        return ResponseEntity.ok().headers(headers).body(placeholder);
    } catch (Exception e) {
        throw new ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "QR generation not implemented yet"
        );
    }
}
```

**But this is just for testing. Full implementation is in `BACKEND_ELEVATOR_QR.md`.**
