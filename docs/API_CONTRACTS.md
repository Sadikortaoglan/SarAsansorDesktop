# API Contracts & Frontend Implementation Guide

## Overview
This document describes the frontend API contract implementation, date formatting, authentication, and error handling patterns.

## 1. Date Formatting

### Problem
Backend expects `LocalDate` format (YYYY-MM-DD), but frontend was sending datetime strings (YYYY-MM-DDTHH:mm:ss).

### Solution
Centralized date utilities in `src/lib/date-utils.ts`:

```typescript
// Convert any date to LocalDate format
formatDateForAPI(date: Date | string): string
// Returns: "2026-01-15"

// Convert datetime string to LocalDate
convertDateTimeToLocalDate(datetime: string): string
// "2026-01-15T14:30:00" → "2026-01-15"
```

### Usage in Services
All services now use `formatDateForAPI()` before sending dates:

```typescript
// ✅ Correct
const dateStr = formatDateForAPI(elevator.labelDate)
backendRequest.labelDate = dateStr // "2026-01-15"

// ❌ Wrong
backendRequest.labelDate = elevator.labelDate // May contain time
```

### Services Updated
- ✅ `maintenance.service.ts` - date field
- ✅ `maintenance-plan.service.ts` - scheduledDate
- ✅ `elevator.service.ts` - labelDate, expiryDate
- ✅ `inspection.service.ts` - denetimTarihi
- ✅ `payment.service.ts` - date
- ✅ `offer.service.ts` - date
- ✅ `DateRangeFilterBar.tsx` - Converts datetime inputs to LocalDate

## 2. Authentication

### Implementation
All protected requests automatically include `Authorization: Bearer <token>` header via axios interceptor.

### Token Management
- **Storage**: `localStorage` (accessToken, refreshToken)
- **Auto-refresh**: 401 errors trigger token refresh
- **Fallback**: If refresh fails, redirects to `/login`

### Request Interceptor
```typescript
// src/lib/api.ts
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${cleanToken}`
  }
  return config
})
```

### Response Interceptor
- Handles 401/403 errors
- Attempts token refresh
- Queues failed requests during refresh
- Redirects to login if refresh fails

## 3. API Endpoints

### Centralized Definition
All endpoints defined in `src/lib/api-endpoints.ts`:

```typescript
export const API_ENDPOINTS = {
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
    COUNTS: '/dashboard/counts', // ⚠️ Verify backend implementation
  },
  ELEVATORS: {
    BASE: '/elevators',
    BY_ID: (id: number) => `/elevators/${id}`,
  },
  // ... more endpoints
}
```

### Usage
```typescript
// ✅ Correct
apiClient.get(API_ENDPOINTS.ELEVATORS.BASE)

// ❌ Wrong
apiClient.get('/elevators') // Hardcoded
```

### Endpoint Validation
`validateEndpoint()` function warns about potentially missing endpoints:
- `/dashboard/counts` - May not exist in backend

## 4. Error Handling

### Centralized Handler
`src/lib/api-error-handler.ts` provides structured error handling:

```typescript
export enum ApiErrorType {
  VALIDATION = 'VALIDATION',      // 400
  AUTHENTICATION = 'AUTHENTICATION', // 401
  AUTHORIZATION = 'AUTHORIZATION',   // 403
  NOT_FOUND = 'NOT_FOUND',        // 404
  SERVER_ERROR = 'SERVER_ERROR',  // 500+
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}
```

### User-Friendly Messages
```typescript
getUserFriendlyErrorMessage(error: unknown): string
// Returns Turkish error messages for display
```

### Error Flow
1. API interceptor catches errors
2. `handleApiError()` categorizes error
3. User-friendly message extracted
4. Toast notification shown (in components)

### Example Usage
```typescript
try {
  await maintenanceService.create(data)
} catch (error) {
  toast({
    title: 'Hata',
    description: getUserFriendlyErrorMessage(error),
    variant: 'destructive',
  })
}
```

## 5. Request Payload Examples

### Maintenance Create
```typescript
// ✅ Correct
{
  elevatorId: 1,
  date: "2026-01-15",        // LocalDate format
  labelType: "GREEN",
  description: "Bakım açıklaması",
  amount: 1500.0,
  technicianUserId: 3
}

// ❌ Wrong
{
  date: "2026-01-15T14:30:00" // Contains time
}
```

### Elevator Create
```typescript
// ✅ Correct
{
  identityNumber: "ASN-2024-001",
  buildingName: "Residential Complex",
  address: "Atatürk Caddesi No:123",
  labelType: "GREEN",
  labelDate: "2026-01-15",    // LocalDate
  expiryDate: "2027-01-15",   // LocalDate
  managerName: "Ahmet Yılmaz",
  managerTcIdentityNo: "12345678901",
  managerPhone: "05551234567"
}
```

### Maintenance Plan Create
```typescript
// ✅ Correct
{
  elevatorId: 1,
  scheduledDate: "2026-02-15"  // LocalDate format
}
```

## 6. Date Range Filtering

### DateRangeFilterBar Component
- **Input**: `datetime-local` (for UX)
- **Output**: LocalDate format (YYYY-MM-DD)
- **Conversion**: Automatic via `convertDateTimeToLocalDate()`

```typescript
// User selects: "2026-01-15T00:00"
// Sent to API: "2026-01-15"
```

## 7. Best Practices

### ✅ DO
- Always use `formatDateForAPI()` for date fields
- Use `API_ENDPOINTS` constants for URLs
- Handle errors with `getUserFriendlyErrorMessage()`
- Validate dates before sending
- Use TypeScript interfaces for request/response types

### ❌ DON'T
- Send datetime strings when LocalDate expected
- Hardcode API endpoints
- Ignore error responses
- Assume backend tolerance for date formats
- Send ambiguous or incomplete data

## 8. Testing Checklist

- [ ] All date fields use LocalDate format (YYYY-MM-DD)
- [ ] Authorization header included in protected requests
- [ ] Token refresh works on 401 errors
- [ ] Error messages are user-friendly
- [ ] Endpoints use centralized constants
- [ ] DateRangeFilterBar converts datetime to LocalDate
- [ ] No hardcoded endpoint URLs
- [ ] FormData requests don't set Content-Type header (browser handles it)

## 9. Migration Notes

### Before
```typescript
// ❌ Old way
const response = await apiClient.post('/maintenances', {
  date: new Date().toISOString() // "2026-01-15T14:30:00.000Z"
})
```

### After
```typescript
// ✅ New way
import { formatDateForAPI } from '@/lib/date-utils'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

const response = await apiClient.post(API_ENDPOINTS.MAINTENANCES.BASE, {
  date: formatDateForAPI(new Date()) // "2026-01-15"
})
```

## 10. Files Modified

### New Files
- `src/lib/date-utils.ts` - Date formatting utilities
- `src/lib/api-endpoints.ts` - Centralized endpoint definitions
- `src/lib/api-error-handler.ts` - Error handling utilities
- `API_CONTRACTS.md` - This documentation

### Updated Files
- `src/lib/api.ts` - Enhanced error handling
- `src/services/*.service.ts` - Date formatting + endpoint constants
- `src/components/maintenance/DateRangeFilterBar.tsx` - Date conversion
- `src/pages/maintenance/*.tsx` - Error handling

## 11. Backend Contract Compliance

### Date Fields (LocalDate)
- ✅ `labelDate` → "YYYY-MM-DD"
- ✅ `expiryDate` → "YYYY-MM-DD"
- ✅ `scheduledDate` → "YYYY-MM-DD"
- ✅ `date` (maintenance/inspection/payment) → "YYYY-MM-DD"

### Authentication
- ✅ `Authorization: Bearer <token>` header
- ✅ Token refresh on 401
- ✅ Automatic redirect on auth failure

### Error Responses
- ✅ 400 → Validation error (user-friendly message)
- ✅ 401 → Authentication error (redirect to login)
- ✅ 403 → Authorization error (permission denied)
- ✅ 404 → Not found (graceful handling)
- ✅ 500+ → Server error (retry message)

---

**Last Updated**: 2026-01-XX
**Maintained By**: Frontend Team
