# Backend Implementation: Secure QR-Based Maintenance Start

## 1. QR Token Generation Service

```java
package com.saraasansor.api.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class QRTokenService {
    
    @Value("${app.qr.secret:your-secret-key-min-32-chars-change-in-production}")
    private String qrSecret;
    
    @Value("${app.qr.expiration-minutes:30}")
    private int expirationMinutes;
    
    /**
     * Generate secure QR token for maintenance plan
     * 
     * @param maintenancePlanId Maintenance plan ID
     * @param elevatorId Elevator ID
     * @return JWT token containing: elevatorId, maintenancePlanId, expirationTimestamp, signature
     */
    public String generateQRToken(Long maintenancePlanId, Long elevatorId) {
        SecretKey key = Keys.hmacShaKeyFor(qrSecret.getBytes(StandardCharsets.UTF_8));
        
        Instant now = Instant.now();
        Instant expiration = now.plus(expirationMinutes, ChronoUnit.MINUTES);
        
        Map<String, Object> claims = new HashMap<>();
        claims.put("maintenancePlanId", maintenancePlanId);
        claims.put("elevatorId", elevatorId);
        claims.put("expirationTimestamp", expiration.toEpochMilli());
        claims.put("type", "MAINTENANCE_START");
        
        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiration))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
    
    /**
     * Validate QR token and extract claims
     * 
     * @param token QR token string
     * @return Claims map if valid, null if invalid
     */
    public Map<String, Object> validateQRToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(qrSecret.getBytes(StandardCharsets.UTF_8));
            
            var claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            
            // Check expiration
            Date expiration = claims.getExpiration();
            if (expiration.before(new Date())) {
                return null; // Expired
            }
            
            // Extract claims
            Map<String, Object> result = new HashMap<>();
            result.put("maintenancePlanId", claims.get("maintenancePlanId"));
            result.put("elevatorId", claims.get("elevatorId"));
            result.put("expirationTimestamp", claims.get("expirationTimestamp"));
            result.put("type", claims.get("type"));
            
            return result;
        } catch (Exception e) {
            return null; // Invalid token
        }
    }
}
```

## 2. Maintenance Start Request DTO

```java
package com.saraasansor.api.dto;

import lombok.Data;
import javax.validation.constraints.NotNull;

@Data
public class StartMaintenanceRequest {
    @NotNull(message = "Maintenance plan ID is required")
    private Long maintenancePlanId;
    
    private String qrToken; // Optional for ADMIN role
    
    private Boolean remoteStart = false; // true if started by ADMIN without QR
}
```

## 3. Maintenance Start Response DTO

```java
package com.saraasansor.api.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class StartMaintenanceResponse {
    private Long executionId;
    private Long maintenancePlanId;
    private Long elevatorId;
    private LocalDateTime startedAt;
    private Boolean startedRemotely;
    private String startedByRole;
    private String message;
}
```

## 4. Maintenance Execution Entity (Add fields)

```java
// Add these fields to MaintenanceExecution entity:

@Column(name = "started_remotely")
private Boolean startedRemotely = false;

@Column(name = "started_by_role")
private String startedByRole;

@Column(name = "ip_address")
private String ipAddress;
```

## 5. Maintenance Start Service

```java
package com.saraasansor.api.service;

import com.saraasansor.api.dto.StartMaintenanceRequest;
import com.saraasansor.api.dto.StartMaintenanceResponse;
import com.saraasansor.api.model.MaintenanceExecution;
import com.saraasansor.api.model.MaintenancePlan;
import com.saraasansor.api.model.User;
import com.saraasansor.api.repository.MaintenanceExecutionRepository;
import com.saraasansor.api.repository.MaintenancePlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Map;

@Service
public class MaintenanceStartService {
    
    @Autowired
    private MaintenancePlanRepository maintenancePlanRepository;
    
    @Autowired
    private MaintenanceExecutionRepository executionRepository;
    
    @Autowired
    private QRTokenService qrTokenService;
    
    @Autowired
    private AuditLogService auditLogService;
    
    /**
     * Start maintenance execution with role-based validation
     */
    @Transactional
    public StartMaintenanceResponse startMaintenance(
            StartMaintenanceRequest request,
            HttpServletRequest httpRequest) {
        
        // Get current user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = (User) auth.getPrincipal();
        String userRole = currentUser.getRole().name();
        
        // Load maintenance plan
        MaintenancePlan plan = maintenancePlanRepository.findById(request.getMaintenancePlanId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Maintenance plan not found"));
        
        // Role-based validation
        if ("PERSONEL".equals(userRole) || "TECHNICIAN".equals(userRole)) {
            // TECHNICIAN must provide valid QR token
            if (request.getQrToken() == null || request.getQrToken().trim().isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "QR token is required for TECHNICIAN role");
            }
            
            // Validate QR token
            Map<String, Object> qrClaims = qrTokenService.validateQRToken(request.getQrToken());
            if (qrClaims == null) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Invalid or expired QR token");
            }
            
            // Verify elevator match
            Long qrElevatorId = ((Number) qrClaims.get("elevatorId")).longValue();
            Long qrPlanId = ((Number) qrClaims.get("maintenancePlanId")).longValue();
            
            if (!plan.getElevatorId().equals(qrElevatorId) || 
                !plan.getId().equals(qrPlanId)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "QR token does not match maintenance plan");
            }
        } else if ("PATRON".equals(userRole) || "ADMIN".equals(userRole)) {
            // ADMIN can start remotely without QR
            if (Boolean.TRUE.equals(request.getRemoteStart())) {
                // Remote start allowed
            } else if (request.getQrToken() != null && !request.getQrToken().trim().isEmpty()) {
                // Admin can also use QR if provided
                Map<String, Object> qrClaims = qrTokenService.validateQRToken(request.getQrToken());
                if (qrClaims == null) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Invalid or expired QR token");
                }
            } else {
                // Admin must explicitly set remoteStart=true
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Remote start must be enabled for ADMIN role without QR");
            }
        } else {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Insufficient permissions to start maintenance");
        }
        
        // Check if execution already exists
        if (executionRepository.existsByTaskId(plan.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Maintenance execution already started");
        }
        
        // Create execution
        MaintenanceExecution execution = new MaintenanceExecution();
        execution.setTaskId(plan.getId());
        execution.setStartedAt(LocalDateTime.now());
        execution.setStartedByUserId(currentUser.getId());
        execution.setStatus("IN_PROGRESS");
        execution.setStartedRemotely(
                Boolean.TRUE.equals(request.getRemoteStart()) && 
                ("PATRON".equals(userRole) || "ADMIN".equals(userRole)));
        execution.setStartedByRole(userRole);
        execution.setIpAddress(getClientIpAddress(httpRequest));
        
        execution = executionRepository.save(execution);
        
        // Update plan status
        plan.setStatus("IN_PROGRESS");
        maintenancePlanRepository.save(plan);
        
        // Audit log
        auditLogService.logMaintenanceStart(
                execution.getId(),
                currentUser.getId(),
                userRole,
                execution.getStartedRemotely(),
                execution.getIpAddress());
        
        // Build response
        StartMaintenanceResponse response = new StartMaintenanceResponse();
        response.setExecutionId(execution.getId());
        response.setMaintenancePlanId(plan.getId());
        response.setElevatorId(plan.getElevatorId());
        response.setStartedAt(execution.getStartedAt());
        response.setStartedRemotely(execution.getStartedRemotely());
        response.setStartedByRole(userRole);
        response.setMessage("Maintenance started successfully");
        
        return response;
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```

## 6. Maintenance Start Controller

```java
package com.saraasansor.api.controller;

import com.saraasansor.api.dto.StartMaintenanceRequest;
import com.saraasansor.api.dto.StartMaintenanceResponse;
import com.saraasansor.api.service.MaintenanceStartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;

@RestController
@RequestMapping("/api/maintenance")
@CrossOrigin(origins = "*")
public class MaintenanceStartController {
    
    @Autowired
    private MaintenanceStartService maintenanceStartService;
    
    /**
     * Start maintenance execution
     * 
     * TECHNICIAN: Requires valid QR token
     * ADMIN/PATRON: Can start remotely (remoteStart=true) or with QR
     */
    @PostMapping("/start")
    @PreAuthorize("hasAnyRole('PERSONEL', 'TECHNICIAN', 'PATRON', 'ADMIN')")
    public ResponseEntity<StartMaintenanceResponse> startMaintenance(
            @Valid @RequestBody StartMaintenanceRequest request,
            HttpServletRequest httpRequest) {
        
        StartMaintenanceResponse response = maintenanceStartService.startMaintenance(
                request, 
                httpRequest);
        
        return ResponseEntity.ok(response);
    }
}
```

## 7. QR Token Generation Endpoint (for generating QR codes)

```java
@GetMapping("/maintenance-plans/{planId}/qr-token")
@PreAuthorize("hasAnyRole('PATRON', 'ADMIN')")
public ResponseEntity<Map<String, String>> generateQRToken(
        @PathVariable Long planId) {
    
    MaintenancePlan plan = maintenancePlanRepository.findById(planId)
            .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Maintenance plan not found"));
    
    String qrToken = qrTokenService.generateQRToken(plan.getId(), plan.getElevatorId());
    
    return ResponseEntity.ok(Map.of("qrToken", qrToken));
}
```

## 8. Application Properties

```properties
# QR Token Configuration
app.qr.secret=your-very-secure-secret-key-minimum-32-characters-long-change-in-production
app.qr.expiration-minutes=30
```

## 9. Security Notes

1. **QR Token Secret**: Must be at least 32 characters. Store in environment variables or secrets manager.
2. **Expiration**: Default 30 minutes. Adjust based on business needs.
3. **IP Address Logging**: Logs client IP for audit trail.
4. **Role Validation**: Strict role-based access control.
5. **Token Validation**: JWT signature + expiration + elevator match validation.

## 10. Audit Log Service (Example)

```java
@Service
public class AuditLogService {
    
    @Autowired
    private AuditLogRepository auditLogRepository;
    
    public void logMaintenanceStart(
            Long executionId,
            Long userId,
            String role,
            Boolean remoteStart,
            String ipAddress) {
        
        AuditLog log = new AuditLog();
        log.setAction("MAINTENANCE_START");
        log.setEntityType("MAINTENANCE_EXECUTION");
        log.setEntityId(executionId);
        log.setUserId(userId);
        log.setUserRole(role);
        log.setMetadata(Map.of(
                "startedRemotely", remoteStart.toString(),
                "ipAddress", ipAddress
        ));
        log.setCreatedAt(LocalDateTime.now());
        
        auditLogRepository.save(log);
    }
}
```
