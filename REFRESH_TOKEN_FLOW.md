# Refresh Token Authentication Flow - Implementation Guide

## Overview
This document describes the complete Refresh Token authentication flow implemented in the frontend and how the backend should work with it.

## Flow Diagram

```
1. User Login
   ↓
   POST /api/auth/login
   ↓
   Backend returns: { accessToken (15min), refreshToken (7days) }
   ↓
   Frontend stores both in localStorage

2. User makes API request
   ↓
   Request interceptor adds: Authorization: Bearer <accessToken>
   ↓
   If accessToken expires soon (< 2 min): Log warning (continue request)
   ↓
   Request sent to backend

3. Access Token Expired (401 response)
   ↓
   Response interceptor catches 401
   ↓
   POST /api/auth/refresh with refreshToken
   ↓
   Backend validates refreshToken in DB
   ↓
   Backend returns: { accessToken (new 15min), refreshToken (optional new) }
   ↓
   Frontend updates tokens in localStorage
   ↓
   Original request retried with new accessToken
   ↓
   User continues without logout

4. Refresh Token Expired (401 on refresh)
   ↓
   Frontend clears tokens
   ↓
   Redirect to /login
```

## Frontend Implementation

### Token Storage
- **Location**: `localStorage`
- **Keys**: `accessToken`, `refreshToken`
- **Utilities**: `tokenStorage.getAccessToken()`, `tokenStorage.getRefreshToken()`

### Request Interceptor
- Automatically adds `Authorization: Bearer <token>` header
- Checks token expiry (warns if expires soon)
- Blocks request if no token

### Response Interceptor
- Catches 401 (Unauthorized) responses
- Automatically calls `/api/auth/refresh`
- Queues failed requests during refresh
- Retries all queued requests after refresh
- Redirects to login if refresh fails

### Token Utilities (`token-utils.ts`)
- `decodeToken()`: Decode JWT payload
- `isTokenExpired()`: Check if token expired
- `shouldRefreshToken()`: Check if should refresh (expires in < 2 min)
- `getTokenExpiryTime()`: Get seconds until expiry

## Backend Requirements

### 1. Login Endpoint: POST /api/auth/login

**Request:**
```json
{
  "username": "user123",
  "password": "password123"
}
```

**Response:**
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

**Implementation:**
1. Validate username/password
2. Generate JWT access token (15 min expiry):
   ```javascript
   {
     userId: 1,
     username: "user123",
     role: "PATRON",
     exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
     iat: Math.floor(Date.now() / 1000)
   }
   ```
3. Generate refresh token (UUID or secure random):
   - Length: 64+ characters
   - Cryptographically secure
4. Hash refresh token (SHA-256 or bcrypt)
5. Store in database:
   ```sql
   INSERT INTO refresh_tokens (user_id, token, expires_at)
   VALUES (1, '<hashed_token>', NOW() + INTERVAL 7 DAY);
   ```
6. Return both tokens

### 2. Refresh Endpoint: POST /api/auth/refresh

**Request:**
```json
{
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "new-refresh-token-uuid"  // Optional: if rotating
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

**Implementation Steps:**
1. Validate request body has `refreshToken`
2. Hash the received refresh token
3. Query database:
   ```sql
   SELECT rt.*, u.id, u.username, u.role 
   FROM refresh_tokens rt
   JOIN users u ON rt.user_id = u.id
   WHERE rt.token = '<hashed_token>'
     AND rt.is_revoked = FALSE
     AND rt.expires_at > NOW();
   ```
4. If not found: return 401
5. If found: 
   - Generate new access token (15 min)
   - (Optional) Generate new refresh token and revoke old one
   - Update database (revoke old token if rotating)
   - Return new tokens

### 3. Database Schema

```sql
CREATE TABLE refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL,  -- Hashed token
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

### 4. Token Cleanup Job

Run daily cron job:
```sql
DELETE FROM refresh_tokens 
WHERE expires_at < NOW() 
   OR (is_revoked = TRUE AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY));
```

## Security Considerations

### Token Generation
- **Access Token**: JWT signed with secret key
- **Refresh Token**: Cryptographically secure random (not JWT)
- **Storage**: Hash refresh tokens in DB (never store plain)

### Token Rotation (Recommended)
- Issue new refresh token on each refresh
- Immediately revoke old refresh token
- Prevents replay attacks

### Expiry Times
- **Access Token**: 15 minutes (short-lived for security)
- **Refresh Token**: 7 days (long-lived for UX)

### Revocation
- Support immediate revocation on logout
- Support global revocation (password change)
- Mark tokens as revoked, don't delete immediately (for audit)

## Error Handling

### 401 Unauthorized
- Frontend automatically attempts refresh
- If refresh succeeds: retry original request
- If refresh fails: redirect to login

### 403 Forbidden
- Token exists but insufficient permissions
- Frontend does NOT attempt refresh
- Shows error message

## Testing

### Manual Test
1. Login → Get tokens
2. Wait 16 minutes (access token expires)
3. Make API request → Should auto-refresh and succeed
4. Logout → Refresh token revoked
5. Try refresh → Should fail with 401

### Automated Test
```javascript
// Test token refresh flow
1. Login
2. Get accessToken expiry time
3. Mock 401 response
4. Verify refresh endpoint called
5. Verify new token stored
6. Verify original request retried
```

## Frontend Code Location

- **Token Storage**: `src/lib/api.ts` → `tokenStorage`
- **Request Interceptor**: `src/lib/api.ts` → Line 45-118
- **Response Interceptor**: `src/lib/api.ts` → Line 138-287
- **Token Utilities**: `src/lib/token-utils.ts`
- **Auth Service**: `src/services/auth.service.ts`

## Backend Code Location

See `BACKEND_REFRESH_TOKEN_SPEC.md` for detailed backend implementation specification.
