# Backend: Maintenance Creation QR Guard Implementation

## Overview

Maintenance creation endpoint (`POST /api/maintenances`) must validate QR code before allowing maintenance record creation.

**Important:** This does NOT affect maintenance planning endpoints (`/api/maintenance-plans`).

## Security Rules

1. **TECHNICIAN (PERSONEL):**
   - ✅ QR token **REQUIRED**
   - ❌ Cannot create maintenance without valid QR
   - ✅ QR must match elevator

2. **ADMIN (PATRON):**
   - ✅ Can bypass QR (if `qrToken` is `ADMIN_BYPASS` or missing)
   - ✅ Can also use QR if provided
   - ✅ Remote creation allowed

## Implementation

### 1. Update MaintenanceController.java

```java
package com.saraasansor.api.controller;

import com.saraasansor.api.dto.CreateMaintenanceRequest;
import com.saraasansor.api.model.Maintenance;
import com.saraasansor.api.model.User;
import com.saraasansor.api.service.MaintenanceService;
import com.saraasansor.api.service.ElevatorQRSignatureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/maintenances")
@CrossOrigin(origins = "*")
public class MaintenanceController {
    
    @Autowired
    private MaintenanceService maintenanceService;
    
    @Autowired
    private ElevatorQRSignatureService qrSignatureService;
    
    /**
     * Create maintenance record
     * POST /api/maintenances
     * 
     * QR Validation Rules:
     * - TECHNICIAN: QR token required
     * - ADMIN: QR token optional (can bypass)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
    public ResponseEntity<Maintenance> createMaintenance(
            @Valid @ModelAttribute CreateMaintenanceRequest request,
            Authentication authentication) {
        
        // Get current user
        User currentUser = (User) authentication.getPrincipal();
        String userRole = currentUser.getRole().name();
        
        // QR Validation Guard
        if ("PERSONEL".equals(userRole) || "TECHNICIAN".equals(userRole)) {
            // TECHNICIAN must provide valid QR token
            if (request.getQrToken() == null || request.getQrToken().trim().isEmpty()) {
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "QR token is required for TECHNICIAN role"
                );
            }
            
            // Validate QR token (not ADMIN_BYPASS)
            if (!"ADMIN_BYPASS".equals(request.getQrToken())) {
                // Parse QR token (format: "e={code}&s={signature}" or full URL)
                QRValidationResult validation = validateQRToken(request.getQrToken(), request.getElevatorId());
                
                if (!validation.isValid()) {
                    throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Invalid or expired QR token: " + validation.getError()
                    );
                }
                
                // Verify elevator match
                if (!validation.getElevatorId().equals(request.getElevatorId())) {
                    throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "QR token does not match elevator"
                    );
                }
            }
        } else if ("PATRON".equals(userRole) || "ADMIN".equals(userRole)) {
            // ADMIN can bypass QR or use QR if provided
            if (request.getQrToken() != null && 
                !request.getQrToken().trim().isEmpty() && 
                !"ADMIN_BYPASS".equals(request.getQrToken())) {
                
                // Validate QR if provided
                QRValidationResult validation = validateQRToken(request.getQrToken(), request.getElevatorId());
                
                if (!validation.isValid()) {
                    throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Invalid QR token: " + validation.getError()
                    );
                }
            }
            // If qrToken is null or ADMIN_BYPASS, allow creation
        }
        
        // Create maintenance record
        Maintenance maintenance = maintenanceService.create(request, currentUser);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(maintenance);
    }
    
    /**
     * Validate QR token
     * 
     * @param qrToken QR token string (can be URL or "e={code}&s={signature}")
     * @param expectedElevatorId Expected elevator ID
     * @return Validation result
     */
    private QRValidationResult validateQRToken(String qrToken, Long expectedElevatorId) {
        try {
            // Parse QR token
            String elevatorCode = null;
            String signature = null;
            
            // Try parsing as URL
            if (qrToken.contains("qr-start") || qrToken.contains("?")) {
                try {
                    String urlPart = qrToken.contains("qr-start") 
                        ? qrToken.substring(qrToken.indexOf("qr-start"))
                        : qrToken;
                    URL url = new URL("https://app.saraasansor.com/" + urlPart);
                    elevatorCode = url.getQuery().split("&")[0].split("=")[1];
                    signature = url.getQuery().split("&")[1].split("=")[1];
                } catch (Exception e) {
                    // Not a URL, try parsing as query string
                    String[] parts = qrToken.split("&");
                    for (String part : parts) {
                        if (part.startsWith("e=")) {
                            elevatorCode = part.substring(2);
                        } else if (part.startsWith("s=")) {
                            signature = part.substring(2);
                        }
                    }
                }
            } else {
                // Assume format: "e={code}&s={signature}"
                String[] parts = qrToken.split("&");
                for (String part : parts) {
                    if (part.startsWith("e=")) {
                        elevatorCode = part.substring(2);
                    } else if (part.startsWith("s=")) {
                        signature = part.substring(2);
                    }
                }
            }
            
            if (elevatorCode == null || signature == null) {
                return QRValidationResult.invalid("Invalid QR token format");
            }
            
            // Validate signature
            boolean isValid = qrSignatureService.validateSignature(
                Long.parseLong(elevatorCode), // If code is numeric ID
                signature
            );
            
            if (!isValid) {
                // Try with elevator code (string)
                isValid = qrSignatureService.validateSignatureByCode(elevatorCode, signature);
            }
            
            if (!isValid) {
                return QRValidationResult.invalid("Invalid QR signature");
            }
            
            // Get elevator ID from code
            Long elevatorId = getElevatorIdByCode(elevatorCode);
            if (elevatorId == null) {
                return QRValidationResult.invalid("Elevator not found");
            }
            
            return QRValidationResult.valid(elevatorId);
            
        } catch (Exception e) {
            return QRValidationResult.invalid("QR validation error: " + e.getMessage());
        }
    }
    
    private Long getElevatorIdByCode(String elevatorCode) {
        // Load elevator by code (kimlikNo or identityNumber)
        // Implementation depends on your ElevatorRepository
        return elevatorRepository.findByKimlikNo(elevatorCode)
            .map(Elevator::getId)
            .orElse(null);
    }
}

// Helper class for QR validation result
class QRValidationResult {
    private boolean valid;
    private Long elevatorId;
    private String error;
    
    private QRValidationResult(boolean valid, Long elevatorId, String error) {
        this.valid = valid;
        this.elevatorId = elevatorId;
        this.error = error;
    }
    
    public static QRValidationResult valid(Long elevatorId) {
        return new QRValidationResult(true, elevatorId, null);
    }
    
    public static QRValidationResult invalid(String error) {
        return new QRValidationResult(false, null, error);
    }
    
    public boolean isValid() { return valid; }
    public Long getElevatorId() { return elevatorId; }
    public String getError() { return error; }
}
```

### 2. Update ElevatorQRSignatureService.java

Add method to validate by code (not just ID):

```java
/**
 * Validate signature using elevator code (public identifier)
 * 
 * @param elevatorCode Elevator public code (kimlikNo)
 * @param signature Signature to validate
 * @return true if signature is valid
 */
public boolean validateSignatureByCode(String elevatorCode, String signature) {
    try {
        // Generate signature for code
        String message = "e=" + elevatorCode;
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        SecretKeySpec secretKeySpec = new SecretKeySpec(
            elevatorQRSecret.getBytes(StandardCharsets.UTF_8),
            HMAC_ALGORITHM
        );
        mac.init(secretKeySpec);
        byte[] hash = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        String expectedSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        
        return expectedSignature.equals(signature);
    } catch (Exception e) {
        return false;
    }
}
```

### 3. Update CreateMaintenanceRequest DTO

```java
package com.saraasansor.api.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;
import java.util.List;

@Data
public class CreateMaintenanceRequest {
    @NotNull(message = "Elevator ID is required")
    private Long elevatorId;
    
    @NotNull(message = "Date is required")
    private String date; // YYYY-MM-DD format
    
    @NotNull(message = "Label type is required")
    private String labelType; // GREEN, BLUE, YELLOW, RED
    
    @NotNull(message = "Description is required")
    private String description;
    
    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private Double amount;
    
    private Long technicianUserId; // Optional
    
    private List<MultipartFile> photos; // Optional
    
    private String qrToken; // Required for TECHNICIAN, optional for ADMIN
}
```

### 4. Update MaintenanceService.java

```java
@Service
public class MaintenanceService {
    
    public Maintenance create(CreateMaintenanceRequest request, User currentUser) {
        // QR validation is done in controller
        // Service just creates the record
        
        Elevator elevator = elevatorRepository.findById(request.getElevatorId())
            .orElseThrow(() -> new RuntimeException("Elevator not found"));
        
        Maintenance maintenance = new Maintenance();
        maintenance.setElevatorId(request.getElevatorId());
        maintenance.setDate(LocalDate.parse(request.getDate()));
        maintenance.setLabelType(request.getLabelType());
        maintenance.setDescription(request.getDescription());
        maintenance.setAmount(request.getAmount());
        maintenance.setTechnicianUserId(request.getTechnicianUserId());
        maintenance.setCreatedBy(currentUser.getId());
        maintenance.setCreatedAt(LocalDateTime.now());
        
        // Handle photos
        if (request.getPhotos() != null && !request.getPhotos().isEmpty()) {
            // Save photos and set file URLs
            // Implementation depends on your file storage
        }
        
        return maintenanceRepository.save(maintenance);
    }
}
```

## Security Flow

```
1. Frontend: User clicks "Yeni Bakım Ekle"
   ↓
2. Frontend: QR Validation Dialog opens
   ↓
3. User scans/enters QR code
   ↓
4. Frontend: Validates QR with /api/qr/validate
   ↓
5. Frontend: QR validated → Opens MaintenanceFormDialog
   ↓
6. User fills form and submits
   ↓
7. Frontend: POST /api/maintenances with qrToken
   ↓
8. Backend: Validates QR token based on role
   ↓
9. Backend: Creates maintenance record
   ↓
10. Frontend: Shows success message
```

## Role-Based Validation

### TECHNICIAN Flow:
```
Request: { elevatorId: 1, qrToken: "e=ELEV-001&s=abc123..." }
↓
Backend: Check role = TECHNICIAN
↓
Backend: Validate qrToken exists
↓
Backend: Parse QR (extract code + signature)
↓
Backend: Validate signature
↓
Backend: Verify elevator match
↓
Backend: Create maintenance ✅
```

### ADMIN Flow:
```
Request: { elevatorId: 1, qrToken: "ADMIN_BYPASS" } OR { elevatorId: 1 }
↓
Backend: Check role = ADMIN
↓
Backend: Allow creation (QR optional) ✅
```

## Error Responses

### 403 Forbidden (No QR Token):
```json
{
  "success": false,
  "message": "QR token is required for TECHNICIAN role",
  "data": null,
  "errors": null
}
```

### 403 Forbidden (Invalid QR):
```json
{
  "success": false,
  "message": "Invalid or expired QR token: Invalid QR signature",
  "data": null,
  "errors": null
}
```

### 403 Forbidden (Elevator Mismatch):
```json
{
  "success": false,
  "message": "QR token does not match elevator",
  "data": null,
  "errors": null
}
```

## Testing

### Test Case 1: TECHNICIAN with valid QR
```bash
POST /api/maintenances
Headers: Authorization: Bearer {technician_token}
Body: {
  "elevatorId": 1,
  "date": "2026-01-15",
  "labelType": "GREEN",
  "description": "Test maintenance",
  "amount": 1000,
  "qrToken": "e=ELEV-001&s=valid_signature"
}
Expected: 201 Created
```

### Test Case 2: TECHNICIAN without QR
```bash
POST /api/maintenances
Headers: Authorization: Bearer {technician_token}
Body: {
  "elevatorId": 1,
  "date": "2026-01-15",
  "labelType": "GREEN",
  "description": "Test maintenance",
  "amount": 1000
}
Expected: 403 Forbidden - "QR token is required for TECHNICIAN role"
```

### Test Case 3: ADMIN without QR
```bash
POST /api/maintenances
Headers: Authorization: Bearer {admin_token}
Body: {
  "elevatorId": 1,
  "date": "2026-01-15",
  "labelType": "GREEN",
  "description": "Test maintenance",
  "amount": 1000
}
Expected: 201 Created (QR not required)
```

### Test Case 4: ADMIN with QR
```bash
POST /api/maintenances
Headers: Authorization: Bearer {admin_token}
Body: {
  "elevatorId": 1,
  "date": "2026-01-15",
  "labelType": "GREEN",
  "description": "Test maintenance",
  "amount": 1000,
  "qrToken": "e=ELEV-001&s=valid_signature"
}
Expected: 201 Created (QR validated but not required)
```

## Important Notes

1. **Planning Endpoints Unchanged:**
   - `POST /api/maintenance-plans` → No QR required
   - `PUT /api/maintenance-plans/{id}` → No QR required
   - `PATCH /api/maintenance-plans/{id}/reschedule` → No QR required

2. **Only Maintenance Creation Requires QR:**
   - `POST /api/maintenances` → QR required for TECHNICIAN

3. **QR Token Format:**
   - Full URL: `https://app.saraasansor.com/qr-start?e={code}&s={signature}`
   - Query string: `e={code}&s={signature}`
   - Admin bypass: `ADMIN_BYPASS`

4. **Audit Logging:**
   - Log when maintenance is created with QR
   - Log when maintenance is created without QR (ADMIN only)
   - Log QR validation failures
