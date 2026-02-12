# Backend Maintenance Plan Update Fix

## Problem
When updating a maintenance plan with only one field (e.g., `technicianId` or `templateId`), other fields are being lost or set to null in the backend.

## Root Cause Analysis

### Frontend Issue (FIXED)
1. **Missing fields in MaintenancePlan interface**: `templateId` and `technicianId` were not mapped from backend
2. **State initialization**: Edit dialog was not loading existing values from plan
3. **Partial update**: Only changed fields were sent, without merging with original plan

### Backend Issue (TO FIX)
If using **PUT** method, backend should handle partial updates safely.

## Frontend Fix (COMPLETED)

### 1. Updated MaintenancePlan Interface
```typescript
export interface MaintenancePlan {
  // ... existing fields
  templateId?: number // Added
  technicianId?: number // Added
}
```

### 2. Updated mapPlanFromBackend
```typescript
function mapPlanFromBackend(backend: any): MaintenancePlan {
  return {
    // ... existing mappings
    templateId: backend.templateId || backend.template_id || undefined,
    technicianId: backend.technicianId || backend.technician_id || 
                  backend.assignedTechnicianId || undefined,
  }
}
```

### 3. Fixed openEditDialog
```typescript
const openEditDialog = (plan: MaintenancePlan) => {
  // Use plan values, not defaults
  setEditTemplateId(plan.templateId || null)
  setEditTechnicianId(plan.technicianId || null)
  // ...
}
```

### 4. Fixed updatePlanMutation
```typescript
const updateData = {
  plannedDate: plan.plannedDate || originalPlan.scheduledDate,
  templateId: plan.templateId !== undefined 
    ? plan.templateId 
    : originalPlan.templateId, // Preserve original if not changed
  technicianId: plan.technicianId !== undefined
    ? plan.technicianId
    : originalPlan.technicianId, // Preserve original if not changed
  note: plan.note !== undefined
    ? plan.note
    : originalPlan.note,
}
```

## Backend Fix Required

### Option 1: Use PATCH Instead of PUT (Recommended)
```java
@PatchMapping("/{id}")
public ResponseEntity<ApiResponse<MaintenancePlanDTO>> updatePlan(
    @PathVariable Long id,
    @RequestBody UpdateMaintenancePlanRequest request
) {
    MaintenancePlan plan = planService.findById(id);
    
    // Only update fields that are provided (not null)
    if (request.getPlannedDate() != null) {
        plan.setPlannedDate(request.getPlannedDate());
    }
    if (request.getTemplateId() != null) {
        plan.setTemplateId(request.getTemplateId());
    }
    if (request.getTechnicianId() != null) {
        plan.setTechnicianId(request.getTechnicianId());
    }
    if (request.getNote() != null) {
        plan.setNote(request.getNote());
    }
    
    MaintenancePlan updated = planService.save(plan);
    return ResponseEntity.ok(ApiResponse.success(mapToDTO(updated)));
}
```

### Option 2: Keep PUT but Merge with Existing Entity
```java
@PutMapping("/{id}")
public ResponseEntity<ApiResponse<MaintenancePlanDTO>> updatePlan(
    @PathVariable Long id,
    @RequestBody UpdateMaintenancePlanRequest request
) {
    MaintenancePlan existing = planService.findById(id);
    
    // Merge: use request value if provided, otherwise keep existing
    if (request.getPlannedDate() != null) {
        existing.setPlannedDate(request.getPlannedDate());
    } else {
        // Keep existing plannedDate
    }
    
    if (request.getTemplateId() != null) {
        existing.setTemplateId(request.getTemplateId());
    }
    // If null, keep existing templateId
    
    if (request.getTechnicianId() != null) {
        existing.setTechnicianId(request.getTechnicianId());
    }
    // If null, keep existing technicianId
    
    if (request.getNote() != null) {
        existing.setNote(request.getNote());
    }
    // If null, keep existing note
    
    MaintenancePlan updated = planService.save(existing);
    return ResponseEntity.ok(ApiResponse.success(mapToDTO(updated)));
}
```

### Option 3: Use @JsonMerge Annotation (Jackson)
```java
@PutMapping("/{id}")
public ResponseEntity<ApiResponse<MaintenancePlanDTO>> updatePlan(
    @PathVariable Long id,
    @RequestBody @JsonMerge UpdateMaintenancePlanRequest request
) {
    MaintenancePlan existing = planService.findById(id);
    // Jackson will merge request with existing entity
    BeanUtils.copyProperties(request, existing, 
        getNullPropertyNames(request)); // Ignore null properties
    
    MaintenancePlan updated = planService.save(existing);
    return ResponseEntity.ok(ApiResponse.success(mapToDTO(updated)));
}
```

## DTO Mapping Fix

Ensure DTO includes all fields when returning:

```java
public MaintenancePlanDTO mapToDTO(MaintenancePlan plan) {
    return MaintenancePlanDTO.builder()
        .id(plan.getId())
        .elevatorId(plan.getElevatorId())
        .plannedDate(plan.getPlannedDate())
        .templateId(plan.getTemplateId()) // Ensure this is included
        .technicianId(plan.getTechnicianId()) // Ensure this is included
        .note(plan.getNote())
        .status(plan.getStatus())
        .build();
}
```

## Request Logging

Add logging to see what backend receives:

```java
@PutMapping("/{id}")
public ResponseEntity<ApiResponse<MaintenancePlanDTO>> updatePlan(
    @PathVariable Long id,
    @RequestBody UpdateMaintenancePlanRequest request
) {
    log.info("UPDATE PLAN REQUEST - ID: {}, Request: {}", id, request);
    log.info("UPDATE PLAN REQUEST - PlannedDate: {}, TemplateId: {}, TechnicianId: {}, Note: {}", 
        request.getPlannedDate(), 
        request.getTemplateId(), 
        request.getTechnicianId(), 
        request.getNote());
    
    // ... rest of the code
}
```

## Best Practice Recommendation

**Use PATCH for partial updates, PUT for full replacement.**

- **PUT**: Replace entire resource (all fields required)
- **PATCH**: Partial update (only provided fields)

For maintenance plan updates, **PATCH is more appropriate** because:
1. Users often update only one field
2. Prevents accidental data loss
3. More RESTful for partial updates

## Testing Checklist

- [ ] Update only `templateId` → other fields preserved
- [ ] Update only `technicianId` → other fields preserved
- [ ] Update only `plannedDate` → other fields preserved
- [ ] Update only `note` → other fields preserved
- [ ] Update multiple fields → all changes applied
- [ ] Update with null values → handled correctly (keep existing or clear?)
