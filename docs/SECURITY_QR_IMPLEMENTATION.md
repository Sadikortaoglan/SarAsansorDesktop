# Security Implementation: QR-Based Maintenance Start

## Overview

This document explains the security architecture of the QR-based maintenance start system.

## Security Requirements

### 1. QR Token Structure

QR tokens are JWT (JSON Web Tokens) containing:

```json
{
  "maintenancePlanId": 123,
  "elevatorId": 456,
  "expirationTimestamp": 1704067200000,
  "type": "MAINTENANCE_START",
  "iat": 1704065400000,
  "exp": 1704067200000
}
```

### 2. Token Generation

- **Algorithm**: HS256 (HMAC SHA-256)
- **Secret Key**: Minimum 32 characters, stored in environment variables
- **Expiration**: Configurable (default: 30 minutes)
- **Signature**: HMAC ensures token cannot be tampered with

### 3. Token Validation

Backend validates:
1. **Signature**: Verifies token was signed with correct secret
2. **Expiration**: Checks if token is still valid
3. **Elevator Match**: Verifies QR token matches the maintenance plan's elevator
4. **Plan Match**: Verifies QR token matches the maintenance plan ID

### 4. Role-Based Access Control

#### TECHNICIAN (PERSONEL)
- **Required**: Valid QR token
- **Validation**: QR token must match elevator and plan
- **Cannot**: Start without QR or remotely

#### ADMIN (PATRON)
- **Option 1**: Start with valid QR token (same validation as TECHNICIAN)
- **Option 2**: Start remotely without QR (`remoteStart: true`)
- **Audit**: All remote starts are logged with `startedRemotely: true`

### 5. Security Measures

1. **No Static QR Codes**: QR tokens are generated per maintenance plan with expiration
2. **HMAC Signature**: Prevents token tampering
3. **Expiration**: Tokens expire after 30 minutes (configurable)
4. **IP Logging**: Client IP address logged for audit trail
5. **Role Validation**: Strict role-based access control
6. **Elevator Verification**: QR token must match elevator ID

### 6. Attack Prevention

#### Replay Attack
- **Prevention**: Token expiration (30 minutes)
- **Additional**: Execution already exists check

#### Token Tampering
- **Prevention**: HMAC signature validation
- **Result**: Invalid signature → 403 Forbidden

#### Unauthorized Access
- **Prevention**: Role-based validation
- **Result**: Wrong role → 403 Forbidden

#### Wrong Elevator
- **Prevention**: Elevator ID match validation
- **Result**: Mismatch → 403 Forbidden

### 7. Audit Trail

Every maintenance start logs:
- `startedByUserId`: User who started
- `startedByRole`: User role (TECHNICIAN/ADMIN)
- `startedRemotely`: Boolean (true if admin started without QR)
- `startedAt`: Timestamp
- `ipAddress`: Client IP address

### 8. Frontend Security

1. **QR Input Validation**: Client-side validation before API call
2. **Role Detection**: Frontend checks user role to show/hide remote start button
3. **Token Handling**: QR token never stored, only used for validation
4. **Error Messages**: Generic error messages to prevent information leakage

### 9. Backend Security

1. **Secret Management**: QR secret stored in environment variables
2. **Input Validation**: DTO validation with `@NotNull`, `@Valid`
3. **Exception Handling**: Generic error messages for security
4. **Transaction Safety**: `@Transactional` ensures data consistency

### 10. Best Practices

1. **Never Log Tokens**: QR tokens should never appear in logs
2. **HTTPS Only**: All API calls must use HTTPS in production
3. **Secret Rotation**: QR secret should be rotated periodically
4. **Token Expiration**: Keep expiration times short (30 minutes)
5. **IP Whitelisting**: Optional: Whitelist IPs for admin remote start

## Implementation Checklist

- [x] JWT token generation with HMAC
- [x] Token expiration validation
- [x] Elevator ID match validation
- [x] Role-based access control
- [x] Remote start for ADMIN
- [x] IP address logging
- [x] Audit trail
- [x] Frontend role detection
- [x] Mobile camera support
- [x] Desktop manual input

## Testing

### Test Cases

1. **Valid QR Token (TECHNICIAN)**: Should start successfully
2. **Invalid QR Token**: Should return 403
3. **Expired QR Token**: Should return 403
4. **Wrong Elevator QR**: Should return 403
5. **ADMIN Remote Start**: Should start without QR
6. **ADMIN with QR**: Should start with QR validation
7. **TECHNICIAN without QR**: Should return 403
8. **Duplicate Start**: Should return 409 Conflict
