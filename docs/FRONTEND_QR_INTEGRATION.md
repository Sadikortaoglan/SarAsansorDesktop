# Frontend Integration Guide: QR-Based Maintenance Start

## Component Usage

### 1. Import QRStartDialog

```typescript
import { QRStartDialog } from '@/components/maintenance/QRStartDialog'
import { MaintenanceFormDialog } from '@/components/MaintenanceFormDialog'
```

### 2. State Management

```typescript
const [qrStartDialogOpen, setQrStartDialogOpen] = useState(false)
const [maintenanceFormDialogOpen, setMaintenanceFormDialogOpen] = useState(false)
const [selectedPlanForStart, setSelectedPlanForStart] = useState<MaintenancePlan | null>(null)
const [prefilledElevatorId, setPrefilledElevatorId] = useState<number | null>(null)
const [prefilledDate, setPrefilledDate] = useState<string>('')
```

### 3. Handle Start Button Click

```typescript
const handleStartMaintenance = (plan: MaintenancePlan) => {
  setSelectedPlanForStart(plan)
  setQrStartDialogOpen(true)
}

const handleOpenMaintenanceForm = (elevatorId: number, date: string) => {
  setPrefilledElevatorId(elevatorId)
  setPrefilledDate(date)
  setQrStartDialogOpen(false)
  setMaintenanceFormDialogOpen(true)
}

const handleMaintenanceFormSuccess = () => {
  setMaintenanceFormDialogOpen(false)
  setPrefilledElevatorId(null)
  setPrefilledDate('')
  // Refresh maintenance plans list
  queryClient.invalidateQueries({ queryKey: ['maintenance-plans'] })
}
```

### 4. Render Components

```tsx
{/* QR Start Dialog */}
{selectedPlanForStart && (
  <QRStartDialog
    open={qrStartDialogOpen}
    onOpenChange={setQrStartDialogOpen}
    maintenancePlanId={selectedPlanForStart.id}
    elevatorId={selectedPlanForStart.elevatorId}
    onSuccess={(executionId) => {
      console.log('Maintenance started:', executionId)
      // Optionally handle success
    }}
    onOpenMaintenanceForm={handleOpenMaintenanceForm}
  />
)}

{/* Maintenance Form Dialog */}
{prefilledElevatorId && (
  <MaintenanceFormDialog
    elevatorId={prefilledElevatorId}
    elevatorName={/* Get from elevators list */}
    onClose={() => {
      setMaintenanceFormDialogOpen(false)
      setPrefilledElevatorId(null)
      setPrefilledDate('')
    }}
    onSuccess={handleMaintenanceFormSuccess}
  />
)}
```

## Complete Example: MaintenancePage Integration

See `src/pages/maintenance/MaintenancePage.tsx` for full implementation.

## Flow Diagram

```
User clicks "Başlat" button
    ↓
QRStartDialog opens
    ↓
[TECHNICIAN] Must scan/enter QR code
[ADMIN] Can use QR or click "Uzaktan Başlat"
    ↓
QR validation (if QR provided)
    ↓
Success → Close QR dialog
    ↓
Open MaintenanceFormDialog
    ↓
Pre-fill elevatorId and date
    ↓
User fills form and submits
    ↓
Maintenance created
    ↓
Refresh list
```

## Role-Based UI

### TECHNICIAN (PERSONEL)
- Shows: QR input field + Camera button (mobile)
- Hides: "Uzaktan Başlat" button
- Requires: Valid QR token

### ADMIN (PATRON)
- Shows: QR input field + "Uzaktan Başlat" button
- Allows: Start with QR or without QR
- Logs: `startedRemotely: true` when remote start

## Mobile vs Desktop

### Mobile
- Camera button visible
- Auto-opens camera on button click
- QR scanning via camera

### Desktop
- Camera button hidden
- Manual QR input only
- QR code can be pasted
