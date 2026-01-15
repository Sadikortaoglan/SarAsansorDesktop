# 403 Forbidden Debug Guide

## Problem
POST `/elevators` request returns 403 Forbidden from frontend, but works in Postman.

## Quick Debug Steps

### 1. Check Browser Console
Open browser DevTools (F12) → Console tab. Look for:
- `✅ Authorization header added:` - Token is being sent
- `❌ 403 Forbidden Error` - Full error details
- Token payload information

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Try creating an elevator
3. Find the POST `/elevators` request
4. Click on it and check:
   - **Request Headers** → Look for `Authorization: Bearer <token>`
   - **Request Payload** → Compare with Postman
   - **Response** → Check error message from backend

### 3. Compare with Postman

#### Postman Request (Working):
```
POST http://localhost:8080/api/elevators
Headers:
  Content-Type: application/json
  Authorization: Bearer <your-token>
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

#### Frontend Request (Check in Network Tab):
- Should have same headers
- Should have same body structure
- Authorization header should match

### 4. Use Debug Script

Add this to your browser console (after logging in):

```javascript
// Import debug function (if using module)
import { debugCreateElevator } from './lib/debug-api'

// Or use directly in console:
const testData = {
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
}

// Check token first
const token = localStorage.getItem('accessToken')
console.log('Token:', token ? token.substring(0, 50) + '...' : 'MISSING')

// Decode token to check role
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    console.log('Token Payload:', {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      exp: new Date(payload.exp * 1000),
      isExpired: Date.now() / 1000 > payload.exp
    })
  } catch (e) {
    console.error('Token parse error:', e)
  }
}
```

### 5. Common Causes of 403

#### A. Token Issues
- ❌ **No token**: Check `localStorage.getItem('accessToken')`
- ❌ **Expired token**: Check token `exp` claim
- ❌ **Invalid token format**: Should be JWT (3 parts separated by `.`)
- ❌ **Token not sent**: Check Network tab → Request Headers

#### B. Authorization Header Issues
- ❌ **Missing Bearer prefix**: Frontend adds it automatically (check interceptor)
- ❌ **Double Bearer prefix**: Token already has "Bearer " prefix
- ❌ **Wrong header name**: Should be `Authorization`, not `authorization`

#### C. Role/Permission Issues
- ❌ **Wrong role**: Endpoint might require `PATRON` role, but user has `PERSONEL`
- ❌ **No role in token**: Token payload missing `role` field
- ❌ **Backend permission check**: Backend might have additional permission checks

#### D. CORS Issues
- ❌ **CORS preflight fails**: Check Network tab for OPTIONS request
- ❌ **Credentials not sent**: Check `withCredentials` setting (currently `false`)

#### E. Request Body Issues
- ❌ **Missing required fields**: Backend might require specific fields
- ❌ **Wrong field names**: Compare with Postman request
- ❌ **Content-Type wrong**: Should be `application/json`

### 6. Manual Test in Console

```javascript
// Get token
const token = localStorage.getItem('accessToken')

// Make request manually
fetch('http://localhost:8080/api/elevators', {
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

### 7. Check Backend Logs
- Check backend console/logs for:
  - Token validation errors
  - Role/permission errors
  - Request body validation errors

## Expected Output

When you check the browser console, you should see:

```
✅ Authorization header added: {
  url: "/elevators",
  method: "post",
  tokenPreview: "eyJhbGciOiJIUzI1NiIs..."
}
🔵 Request: {
  url: "/elevators",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ***"
  },
  hasToken: true,
  data: "{...}"
}
```

If you see `❌ 403 Forbidden Error`, check the detailed error object for:
- `requestHeaders` - What headers were sent
- `responseData` - Backend error message
- `hasToken` - Whether token exists

## Solution Checklist

- [ ] Token exists in localStorage
- [ ] Token is not expired
- [ ] Token has correct role (PATRON or PERSONEL)
- [ ] Authorization header is sent (check Network tab)
- [ ] Authorization header format: `Bearer <token>` (not `Bearer Bearer <token>`)
- [ ] Request body matches Postman request
- [ ] Content-Type is `application/json`
- [ ] CORS is configured correctly
- [ ] Backend logs show the request is received

## Next Steps

1. Run the debug script in browser console
2. Compare Network tab request with Postman
3. Check token payload for role/permissions
4. Verify backend endpoint requirements
5. Check backend logs for detailed error
