# Secure QR-Based Maintenance Start System - Implementation Summary

## Overview

This document provides a complete implementation guide for a secure QR-based maintenance start system with role-based access control.

## Architecture

### Backend (Spring Boot)
- **QR Token Service**: JWT-based token generation and validation
- **Maintenance Start Service**: Role-based business logic
- **Controller**: REST API endpoint `/api/maintenance/start`
- **Security**: HMAC signature, expiration, elevator verification

### Frontend (React/TypeScript)
- **QRStartDialog Component**: Role-aware QR scanning modal
- **MaintenanceFormDialog**: Pre-filled maintenance creation form
- **Role Detection**: Uses `useAuth` hook for role-based UI
- **Mobile Support**: Camera integration for QR scanning

## Files Created/Modified

### Backend Files (Java)
1. `QRTokenService.java` - JWT token generation/validation
2. `MaintenanceStartService.java` - Business logic
3. `MaintenanceStartController.java` - REST endpoint
4. `StartMaintenanceRequest.java` - DTO
5. `StartMaintenanceResponse.java` - DTO
6. `AuditLogService.java` - Audit logging

### Frontend Files (TypeScript/React)
1. `src/components/maintenance/QRStartDialog.tsx` - **NEW** QR scanning component
2. `src/services/maintenance-execution.service.ts` - **MODIFIED** Updated start method
3. `src/lib/api-endpoints.ts` - **MODIFIED** Added MAINTENANCE_START endpoint
4. `src/pages/maintenance/MaintenancePage.tsx` - **TO BE UPDATED** Integration needed

### Documentation Files
1. `BACKEND_QR_MAINTENANCE_START.md` - Backend implementation guide
2. `SECURITY_QR_IMPLEMENTATION.md` - Security architecture
3. `FRONTEND_QR_INTEGRATION.md` - Frontend integration guide
4. `QR_MAINTENANCE_START_IMPLEMENTATION.md` - This file

## Quick Start

### Backend Setup

1. **Add Dependencies** (if not already present):
```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.11.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.11.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.11.5</version>
</dependency>
```

2. **Configure Application Properties**:
```properties
app.qr.secret=your-very-secure-secret-key-minimum-32-characters-long
app.qr.expiration-minutes=30
```

3. **Implement Services**: See `BACKEND_QR_MAINTENANCE_START.md`

### Frontend Setup

1. **Import Component**:
```typescript
import { QRStartDialog } from '@/components/maintenance/QRStartDialog'
```

2. **Use in MaintenancePage**:
```typescript
<QRStartDialog
  open={qrStartDialogOpen}
  onOpenChange={setQrStartDialogOpen}
  maintenancePlanId={plan.id}
  elevatorId={plan.elevatorId}
  onSuccess={(executionId) => console.log('Started:', executionId)}
  onOpenMaintenanceForm={(elevatorId, date) => {
    // Open maintenance form
  }}
/>
```

## API Endpoints

### POST `/api/maintenance/start`
Start maintenance execution with QR validation.

**Request Body**:
```json
{
  "maintenancePlanId": 123,
  "qrToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Optional
  "remoteStart": false // Optional, for ADMIN only
}
```

**Response**:
```json
{
  "executionId": 456,
  "maintenancePlanId": 123,
  "elevatorId": 789,
  "startedAt": "2026-01-15T10:30:00",
  "startedRemotely": false,
  "startedByRole": "TECHNICIAN",
  "message": "Maintenance started successfully"
}
```

### GET `/api/maintenance-plans/{planId}/qr-token`
Generate QR token for a maintenance plan (ADMIN only).

**Response**:
```json
{
  "qrToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Role Behavior

### TECHNICIAN (PERSONEL)
- ✅ Must provide valid QR token
- ❌ Cannot start remotely
- ✅ QR must match elevator and plan

### ADMIN (PATRON)
- ✅ Can start with QR token
- ✅ Can start remotely (`remoteStart: true`)
- ✅ Remote starts logged with `startedRemotely: true`

## Security Features

1. **JWT Tokens**: HMAC SHA-256 signature
2. **Expiration**: 30 minutes (configurable)
3. **Elevator Verification**: QR must match elevator ID
4. **Plan Verification**: QR must match maintenance plan ID
5. **Role Validation**: Strict role-based access
6. **IP Logging**: Client IP logged for audit
7. **Audit Trail**: All starts logged with metadata

## Testing Checklist

- [ ] TECHNICIAN with valid QR → Success
- [ ] TECHNICIAN with invalid QR → 403
- [ ] TECHNICIAN without QR → 403
- [ ] ADMIN with QR → Success
- [ ] ADMIN remote start → Success
- [ ] Expired QR token → 403
- [ ] Wrong elevator QR → 403
- [ ] Duplicate start → 409 Conflict
- [ ] Mobile camera → Opens camera
- [ ] Desktop manual input → Works

## Next Steps

1. **Backend**: Implement services from `BACKEND_QR_MAINTENANCE_START.md`
2. **Frontend**: Integrate `QRStartDialog` into `MaintenancePage`
3. **Testing**: Test all role-based scenarios
4. **Security**: Review and update QR secret in production
5. **Documentation**: Update API documentation

## Support

For questions or issues:
- Backend: See `BACKEND_QR_MAINTENANCE_START.md`
- Frontend: See `FRONTEND_QR_INTEGRATION.md`
- Security: See `SECURITY_QR_IMPLEMENTATION.md`
