# 403 Forbidden Error Analysis: POST /elevators

## Problem Summary
- **Postman**: ✅ Works (200 OK)
- **Frontend**: ❌ 403 Forbidden

## Root Cause Analysis

### 1. Token Authentication Flow

**Current Implementation:**
- Token stored in `localStorage.getItem('accessToken')`
- Token added via Axios interceptor: `Authorization: Bearer ${token}`
- Token validated before each request

**Potential Issues:**
1. **Token Format**: Token might already have "Bearer " prefix → Double prefix
2. **Token Expiry**: Token might be expired (check `exp` claim)
3. **Token Role**: Token might have wrong role (PATRON vs PERSONEL)
4. **Token Storage**: Token might not be saved correctly after login

### 2. Request Comparison

#### Postman Request (Working):
```
POST http://localhost:8080/api/elevators
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "identityNumber": "ELEV-004",
  "buildingName": "New Business Center",
  "address": "456 Residential Avenue, Block B",
  "elevatorNumber": "A2",
  "floorCount": 4,
  "capacity": 450,
  "speed": 0.75,
  "technicalNotes": "New installation",
  "inspectionDate": "2024-01-01",
  "expiryDate": "2025-01-01"
}
```

#### Frontend Request (Current):
```javascript
// elevator.service.ts - create()
{
  identityNumber: elevator.kimlikNo,
  buildingName: elevator.bina,
  address: elevator.adres,
  elevatorNumber: elevator.durak,
  inspectionDate: elevator.maviEtiketTarihi,
}
// Missing: floorCount, capacity, speed, technicalNotes, expiryDate
```

**Note**: Missing fields shouldn't cause 403, but might cause validation errors.

### 3. Most Likely Causes

#### A. Token Issues (90% probability)
1. **Token not sent**: Check Network tab → Request Headers
2. **Token expired**: Check token `exp` claim vs current time
3. **Token format wrong**: Token might have "Bearer " prefix already
4. **Token corrupted**: Token might be malformed

#### B. Role/Permission Issues (5% probability)
1. **Wrong role**: Endpoint requires `PATRON` but user has `PERSONEL`
2. **No role in token**: Token payload missing `role` field
3. **Backend permission check**: Additional permission checks on backend

#### C. CORS/Network Issues (3% probability)
1. **CORS preflight fails**: OPTIONS request fails
2. **Proxy configuration**: Vite proxy might modify headers
3. **Network timing**: Request sent before token is ready

#### D. Request Body Issues (2% probability)
1. **Content-Type wrong**: Should be `application/json`
2. **Body format wrong**: JSON stringify issues
3. **Missing required fields**: Backend validation fails

## Debugging Steps

### Step 1: Check Browser Console
Open DevTools (F12) → Console tab. Look for:
```
✅ Authorization header added: { url: "/elevators", method: "post", ... }
🔵 Request: { url: "/elevators", method: "POST", headers: {...}, ... }
❌ 403 Forbidden Error: { ... }
```

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Try creating elevator
3. Find POST `/elevators` request
4. Click on it → Check:
   - **Request Headers** → `Authorization: Bearer <token>`
   - **Request Payload** → Compare with Postman
   - **Response** → Check error message

### Step 3: Run Debug Script
Copy `DEBUG_403_CONSOLE_SCRIPT.js` content into browser console after login.

### Step 4: Compare Tokens
1. Get token from Postman (from successful request)
2. Get token from browser: `localStorage.getItem('accessToken')`
3. Compare:
   - Are they the same?
   - Are both valid (not expired)?
   - Do both have same role?

### Step 5: Manual Test
```javascript
// In browser console
const token = localStorage.getItem('accessToken')
fetch('/api/elevators', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    identityNumber: "ELEV-004",
    buildingName: "New Business Center",
    address: "456 Residential Avenue, Block B",
    elevatorNumber: "A2",
    floorCount: 4,
    capacity: 450,
    speed: 0.75,
    technicalNotes: "New installation",
    inspectionDate: "2024-01-01",
    expiryDate: "2025-01-01"
  })
})
.then(r => r.json())
.then(d => console.log('Success:', d))
.catch(e => console.error('Error:', e))
```

## Expected Findings

### If Token is Missing:
```
❌ No token found - Request blocked
```
**Solution**: Log in again, check login flow

### If Token is Expired:
```
Token Payload: { exp: "2024-01-01T00:00:00Z", isExpired: true }
```
**Solution**: Log out and log in again

### If Role is Wrong:
```
Token Payload: { role: "PERSONEL" }
Backend requires: PATRON
```
**Solution**: Use PATRON account or check backend permissions

### If Token Format is Wrong:
```
Authorization: Bearer Bearer <token>  // Double prefix
```
**Solution**: Check token storage - should not have "Bearer " prefix

## Code Changes Made

1. ✅ Enhanced logging in `elevator.service.ts` create function
2. ✅ Created `debug-api.ts` utility for detailed request logging
3. ✅ Created `DEBUG_403_CONSOLE_SCRIPT.js` for browser console debugging
4. ✅ Created `DEBUG_403_GUIDE.md` with step-by-step instructions

## Next Steps

1. **Run the debug script** in browser console
2. **Check Network tab** for actual request sent
3. **Compare request headers** with Postman
4. **Check token payload** for role/expiry
5. **Check backend logs** for detailed error message

## Quick Fix Checklist

- [ ] Token exists: `localStorage.getItem('accessToken')`
- [ ] Token not expired: Check `exp` claim
- [ ] Token has correct role: Check `role` claim
- [ ] Authorization header sent: Check Network tab
- [ ] Authorization format correct: `Bearer <token>` (not `Bearer Bearer <token>`)
- [ ] Request body matches Postman
- [ ] Content-Type is `application/json`
- [ ] CORS configured correctly
- [ ] Backend receives request (check backend logs)

## Most Common Solution

**90% of 403 errors are caused by:**
1. Token expired → Log out and log in again
2. Token not sent → Check interceptor, check Network tab
3. Wrong role → Use correct user account (PATRON vs PERSONEL)
