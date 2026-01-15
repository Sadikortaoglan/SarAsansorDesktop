# Backend Refresh Token Implementation Specification

## Overview
This document specifies how the backend should implement Refresh Token authentication flow to work with the frontend.

## Token Requirements

### Access Token
- **Type**: JWT (JSON Web Token)
- **Expiry**: 15 minutes (900 seconds)
- **Stored**: Client-side localStorage (frontend)
- **Usage**: Sent in `Authorization: Bearer <token>` header for all API requests
- **Claims**: `userId`, `username`, `role`, `exp`, `iat`

### Refresh Token
- **Type**: Opaque token (UUID or random string) - OR JWT with longer expiry
- **Expiry**: 7 days (604800 seconds)
- **Stored**: Database + Client-side localStorage (frontend)
- **Usage**: Sent to `/auth/refresh` endpoint to get new access token
- **One-time use**: Should be invalidated after use (optional, but recommended)

## Endpoints

### 1. POST /api/auth/login

**Request:**
```json
{
  "username": "user123",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": 1,
    "username": "user123",
    "role": "PATRON"
  }
}
```

**Token Generation:**
- Generate Access Token (JWT):
  - Expiry: `now + 15 minutes`
  - Claims: `userId`, `username`, `role`, `exp`, `iat`
  - Sign with secret key
  
- Generate Refresh Token:
  - UUID or random secure string (64+ chars)
  - Expiry: `now + 7 days`
  - Store in database with:
    - `userId`
    - `token` (hashed)
    - `expiresAt`
    - `createdAt`
    - `isRevoked` (default: false)

### 2. POST /api/auth/refresh

**Request:**
```json
{
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "new-refresh-token-uuid"  // Optional: rotate refresh token
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

**Validation Steps:**
1. Validate refresh token exists in request body
2. Hash the refresh token (if stored as hash in DB)
3. Find refresh token in database
4. Check if token exists
5. Check if token is not revoked (`isRevoked = false`)
6. Check if token is not expired (`expiresAt > now`)
7. Check if token belongs to active user
8. Generate new access token (15 min expiry)
9. (Optional) Generate new refresh token and revoke old one (rotation)
10. Return new tokens

### 3. POST /api/auth/logout (Optional)

**Request Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  // Optional
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Actions:**
- Revoke refresh token in database (`isRevoked = true`)
- Or delete refresh token from database

## Database Schema

### refresh_tokens Table

```sql
CREATE TABLE refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,  -- Hashed token
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Indexes for Performance
- Index on `user_id` for quick lookups
- Index on `token` for validation
- Index on `expires_at` for cleanup jobs

## Security Best Practices

### 1. Token Storage
- **Refresh Token in DB**: Store as hash (SHA-256 or bcrypt)
- **Never return raw refresh token**: Return only on initial generation
- **Secure random generation**: Use cryptographically secure random generator

### 2. Token Rotation (Recommended)
- Generate new refresh token on each refresh
- Revoke old refresh token immediately
- Prevents token reuse attacks

### 3. Token Expiry
- Access Token: 15 minutes (short-lived)
- Refresh Token: 7 days (long-lived)
- Auto-cleanup expired tokens (cron job)

### 4. Rate Limiting
- Limit refresh attempts: Max 5 attempts per minute per IP
- Lock account after repeated failures

### 5. Revocation
- Support token revocation on logout
- Support global revocation (change user password)
- Support admin revocation

## Cleanup Job (Cron)

Run daily to clean expired tokens:
```sql
DELETE FROM refresh_tokens 
WHERE expires_at < NOW() 
   OR is_revoked = TRUE 
   AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## Error Handling

### Invalid Refresh Token
- **Status**: 401 Unauthorized
- **Response**: `{ "success": false, "message": "Invalid or expired refresh token" }`
- **Action**: Frontend will redirect to login

### Expired Refresh Token
- **Status**: 401 Unauthorized
- **Response**: `{ "success": false, "message": "Refresh token expired" }`
- **Action**: Frontend will redirect to login

### Revoked Refresh Token
- **Status**: 401 Unauthorized
- **Response**: `{ "success": false, "message": "Refresh token has been revoked" }`
- **Action**: Frontend will redirect to login

## Example Implementation (Pseudo-code)

### Login Endpoint
```javascript
POST /api/auth/login
1. Validate username/password
2. Generate accessToken (JWT, 15 min)
3. Generate refreshToken (UUID)
4. Hash refreshToken
5. Store refreshToken in DB:
   - userId
   - hashedToken
   - expiresAt: now + 7 days
6. Return { accessToken, refreshToken, user }
```

### Refresh Endpoint
```javascript
POST /api/auth/refresh
1. Get refreshToken from request body
2. Hash refreshToken
3. Find in DB:
   SELECT * FROM refresh_tokens 
   WHERE token = hashedToken 
   AND is_revoked = FALSE 
   AND expires_at > NOW()
4. If not found: return 401
5. Get user from token.userId
6. Generate new accessToken (JWT, 15 min)
7. (Optional) Generate new refreshToken and revoke old
8. Return { accessToken, refreshToken? }
```

## Frontend Integration

The frontend expects:
- Login response with `accessToken` and `refreshToken`
- Refresh response with `accessToken` (and optionally new `refreshToken`)
- 401 status on invalid/expired refresh token
- Standard ApiResponse format: `{ success: true, data: {...} }`

## Testing Checklist

- [ ] Login returns access + refresh tokens
- [ ] Access token expires in 15 minutes
- [ ] Refresh token expires in 7 days
- [ ] Refresh endpoint returns new access token
- [ ] Refresh endpoint validates token in DB
- [ ] Refresh endpoint rejects expired tokens
- [ ] Refresh endpoint rejects revoked tokens
- [ ] Refresh endpoint rejects invalid tokens
- [ ] (Optional) Refresh endpoint rotates refresh token
- [ ] Cleanup job removes expired tokens
- [ ] Rate limiting works on refresh endpoint
