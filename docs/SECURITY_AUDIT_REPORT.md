# Security Audit Report: Maintenance Creation QR Validation

**Date:** 2026-01-XX  
**Auditor:** Senior Full-Stack Auditor  
**Scope:** QR validation enforcement for maintenance creation

---

## 🔍 EXECUTIVE SUMMARY

| Component | Status | Security Level |
|-----------|--------|----------------|
| **Frontend Enforcement** | ✅ **YES** | **STRONG** |
| **Backend Enforcement** | ❌ **NO** | **CRITICAL VULNERABILITY** |
| **Overall Security** | ⚠️ **WEAK** | **BYPASSABLE** |

**CRITICAL FINDING:** Backend guard is **NOT implemented**. System can be bypassed via direct API calls.

---

## 1️⃣ FRONTEND CHECK

### ✅ 1.1 "Yeni Bakım Ekle" Button Behavior

**Location:** `src/pages/ElevatorDetailPage.tsx:389-395`

**Status:** ✅ **YES - PROPERLY ENFORCED**

**Code:**
```typescript
<DialogTrigger asChild>
  <Button onClick={() => setIsQRValidationDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Yeni Bakım Ekle
  </Button>
</DialogTrigger>
```

**Analysis:**
- Button directly opens QR validation dialog (`setIsQRValidationDialogOpen(true)`)
- Does NOT open MaintenanceFormDialog directly
- ✅ **ENFORCED**

---

### ✅ 1.2 QR Modal Opens First

**Location:** `src/pages/ElevatorDetailPage.tsx:372-387`

**Status:** ✅ **YES - PROPERLY ENFORCED**

**Code:**
```typescript
<ElevatorQRValidationDialog
  open={isQRValidationDialogOpen}
  onOpenChange={(open) => {
    setIsQRValidationDialogOpen(open)
    if (!open) {
      setValidatedQRToken(null)
    }
  }}
  elevatorId={Number(id)}
  elevatorCode={elevator.kimlikNo}
  onValidationSuccess={(qrToken) => {
    setValidatedQRToken(qrToken)
    setIsQRValidationDialogOpen(false)
    setIsMaintenanceFormDialogOpen(true) // Opens AFTER validation
  }}
/>
```

**Analysis:**
- QR dialog is separate component
- Opens before maintenance form
- ✅ **ENFORCED**

---

### ✅ 1.3 MaintenanceFormDialog Opens Only After QR Validation

**Location:** `src/pages/ElevatorDetailPage.tsx:389-410`

**Status:** ✅ **YES - PROPERLY ENFORCED**

**Code:**
```typescript
<Dialog open={isMaintenanceFormDialogOpen} onOpenChange={setIsMaintenanceFormDialogOpen}>
  <MaintenanceFormDialog
    elevatorId={Number(id)}
    elevatorName={`${elevator.kimlikNo} - ${elevator.bina}`}
    qrToken={validatedQRToken || undefined} // Token from QR validation
    onClose={() => {
      setIsMaintenanceFormDialogOpen(false)
      setValidatedQRToken(null)
    }}
    onSuccess={() => {
      setIsMaintenanceFormDialogOpen(false)
      setValidatedQRToken(null)
      queryClient.invalidateQueries({ queryKey: ['maintenances', 'elevator', id] })
    }}
  />
</Dialog>
```

**Analysis:**
- `isMaintenanceFormDialogOpen` is set to `true` ONLY in `onValidationSuccess` callback
- QR token is passed as prop (`validatedQRToken`)
- Form cannot open without QR validation
- ✅ **ENFORCED**

---

### ✅ 1.4 QR Token Required Before Form Render

**Location:** `src/components/MaintenanceFormDialog.tsx:72-77`

**Status:** ✅ **YES - PROPERLY ENFORCED**

**Code:**
```typescript
const createMutation = useMutation({
  mutationFn: (data: typeof formData) => {
    // Validate QR token for TECHNICIAN
    if (!isAdmin && !qrToken) {
      throw new Error('QR token is required for maintenance creation')
    }
    // ...
  },
})
```

**Analysis:**
- Client-side validation checks `qrToken` before API call
- TECHNICIAN role requires QR token
- ADMIN can bypass (by design)
- ✅ **ENFORCED** (client-side only)

---

## 2️⃣ BACKEND CHECK

### ❌ 2.1 POST /api/maintenances Endpoint QR Validation

**Status:** ❌ **NO - NOT IMPLEMENTED**

**Evidence:**
- `BACKEND_MAINTENANCE_QR_GUARD.md` exists but is **documentation only**
- No actual backend code implementation found
- Backend controller does not validate QR token

**Expected Implementation:**
```java
@PostMapping
public ResponseEntity<Maintenance> createMaintenance(
        @Valid @ModelAttribute CreateMaintenanceRequest request,
        Authentication authentication) {
    
    // ❌ MISSING: QR validation guard
    // ❌ MISSING: Role-based validation
    // ❌ MISSING: QR token parsing and validation
    
    // Current code likely just creates maintenance without validation
    Maintenance maintenance = maintenanceService.create(request, currentUser);
    return ResponseEntity.ok(maintenance);
}
```

**Vulnerability:** Backend accepts requests without QR validation.

---

### ❌ 2.2 Server-Side Validation Guard

**Status:** ❌ **NO - NOT IMPLEMENTED**

**Missing Components:**
1. QR token validation logic in controller
2. Role-based validation (TECHNICIAN vs ADMIN)
3. QR signature verification
4. Elevator match verification

**Required Implementation:**
See `BACKEND_MAINTENANCE_QR_GUARD.md` for full code.

---

### ❌ 2.3 Direct API Call Protection

**Status:** ❌ **NO - NOT PROTECTED**

**Vulnerability Test:**
```bash
# This request will SUCCEED without QR token (if backend not implemented)
curl -X POST http://localhost:8080/api/maintenances \
  -H "Authorization: Bearer {technician_token}" \
  -F "elevatorId=1" \
  -F "date=2026-01-15" \
  -F "labelType=GREEN" \
  -F "description=Test" \
  -F "amount=1000"
  # ❌ NO qrToken field - should be REJECTED but will be ACCEPTED
```

**Expected Behavior:** 403 Forbidden  
**Actual Behavior:** 201 Created (if backend not implemented)

---

## 3️⃣ SECURITY CHECK

### ❌ 3.1 Server-Side QR Token Validation

**Status:** ❌ **NO - NOT IMPLEMENTED**

**Risk Level:** 🔴 **CRITICAL**

**Impact:**
- Attacker can bypass frontend restrictions
- Direct API calls can create maintenance without QR
- No server-side enforcement

---

### ⚠️ 3.2 Postman/API Client Bypass

**Status:** ⚠️ **YES - BYPASSABLE**

**Vulnerability:**
```bash
# Attacker can create maintenance without QR:
POST /api/maintenances
Headers: Authorization: Bearer {stolen_token}
Body: {
  "elevatorId": 1,
  "date": "2026-01-15",
  "labelType": "GREEN",
  "description": "Bypassed",
  "amount": 1000
  // No qrToken - will be accepted if backend not implemented
}
```

**Mitigation Required:**
- Implement backend QR guard
- Reject requests without valid QR token (for TECHNICIAN)
- Validate QR signature server-side

---

### ❌ 3.3 Direct API Call Protection

**Status:** ❌ **NO - NOT PROTECTED**

**Attack Vector:**
1. Attacker obtains valid JWT token (via XSS, token leak, etc.)
2. Attacker calls API directly (Postman, curl, script)
3. Request succeeds without QR validation
4. Maintenance created without physical presence

**Severity:** 🔴 **CRITICAL**

---

## 📊 FINAL VERDICT

### Frontend Enforcement: ✅ **YES**
- ✅ Button opens QR dialog first
- ✅ Form opens only after QR validation
- ✅ QR token required before API call
- ✅ Client-side validation in place

**Score: 10/10** - Properly implemented

---

### Backend Enforcement: ❌ **NO**
- ❌ No QR validation guard in controller
- ❌ No server-side token validation
- ❌ No role-based enforcement
- ❌ Direct API calls can bypass

**Score: 0/10** - Not implemented

---

### Overall Security: ⚠️ **WEAK**

**Current State:**
- Frontend: ✅ Strong enforcement
- Backend: ❌ No enforcement
- **Result:** System is bypassable via direct API calls

**Risk Assessment:**
- **Likelihood:** High (easy to bypass)
- **Impact:** High (unauthorized maintenance creation)
- **Severity:** 🔴 **CRITICAL**

---

## 🔧 REQUIRED FIXES

### Priority 1: Backend QR Guard Implementation

**File:** `MaintenanceController.java`

**Required Changes:**
1. Add QR validation guard in `createMaintenance()` method
2. Implement role-based validation (TECHNICIAN vs ADMIN)
3. Add QR token parsing and signature validation
4. Reject requests without valid QR token (for TECHNICIAN)

**Implementation Guide:** See `BACKEND_MAINTENANCE_QR_GUARD.md`

**Code Location:**
```java
@PostMapping
@PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
public ResponseEntity<Maintenance> createMaintenance(
        @Valid @ModelAttribute CreateMaintenanceRequest request,
        Authentication authentication) {
    
    // ✅ ADD THIS:
    User currentUser = (User) authentication.getPrincipal();
    String userRole = currentUser.getRole().name();
    
    // ✅ ADD THIS: QR Validation Guard
    if ("PERSONEL".equals(userRole) || "TECHNICIAN".equals(userRole)) {
        if (request.getQrToken() == null || request.getQrToken().trim().isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "QR token is required for TECHNICIAN role"
            );
        }
        
        // Validate QR token
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
    
    // Continue with maintenance creation
    Maintenance maintenance = maintenanceService.create(request, currentUser);
    return ResponseEntity.status(HttpStatus.CREATED).body(maintenance);
}
```

---

### Priority 2: QR Validation Service

**File:** `ElevatorQRSignatureService.java`

**Required Method:**
```java
public boolean validateSignatureByCode(String elevatorCode, String signature)
```

**Purpose:** Validate QR signature using elevator code (not just ID)

---

### Priority 3: QR Validation Endpoint

**Endpoint:** `GET /api/qr/validate?e={elevatorCode}&s={signature}`

**Purpose:** Frontend QR validation (already called, but backend must implement)

---

## ✅ TESTING CHECKLIST

After backend implementation:

- [ ] Test TECHNICIAN with valid QR → Should succeed
- [ ] Test TECHNICIAN without QR → Should return 403 Forbidden
- [ ] Test TECHNICIAN with invalid QR → Should return 403 Forbidden
- [ ] Test ADMIN without QR → Should succeed (bypass allowed)
- [ ] Test ADMIN with valid QR → Should succeed
- [ ] Test direct API call (Postman) without QR → Should return 403 (TECHNICIAN)
- [ ] Test direct API call (Postman) with invalid QR → Should return 403
- [ ] Test QR token with wrong elevator → Should return 403

---

## 📝 SUMMARY

| Question | Answer | Evidence |
|----------|--------|----------|
| Frontend blocks form without QR? | ✅ **YES** | ElevatorDetailPage.tsx:389-410 |
| QR modal opens first? | ✅ **YES** | ElevatorDetailPage.tsx:372-387 |
| Form opens only after QR validation? | ✅ **YES** | onValidationSuccess callback |
| Backend validates QR token? | ❌ **NO** | No implementation found |
| Backend rejects requests without QR? | ❌ **NO** | No guard in controller |
| Can bypass via Postman? | ⚠️ **YES** | Backend guard missing |
| Server-side validation exists? | ❌ **NO** | Not implemented |

---

## 🎯 RECOMMENDATION

**IMMEDIATE ACTION REQUIRED:**

1. ✅ Frontend is secure (no changes needed)
2. ❌ **Backend must implement QR guard immediately**
3. ❌ **System is currently vulnerable to API bypass**

**Implementation Priority:** 🔴 **CRITICAL**

**Estimated Fix Time:** 2-4 hours

**Reference:** `BACKEND_MAINTENANCE_QR_GUARD.md` contains full implementation code.

---

**Report Generated:** 2026-01-XX  
**Next Review:** After backend implementation
