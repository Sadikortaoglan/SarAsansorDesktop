# Maintenance Planning Page - Premium SaaS Redesign

## 🎯 Design Goals

- **Premium B2B SaaS Look** - $49/month subscription quality
- **Clean & Professional** - Trustworthy enterprise appearance
- **High Information Clarity** - Easy to scan and understand
- **Modern 2026 Design** - Latest SaaS design trends
- **Mobile Responsive** - Seamless mobile experience

---

## 🎨 COLOR SYSTEM

### Primary Colors
```css
--primary: #4F46E5;        /* Modern Indigo */
--primary-hover: #4338CA;
--primary-light: #EEF2FF;

--success: #16A34A;        /* Green */
--success-light: #DCFCE7;
--success-dark: #15803D;

--warning: #F59E0B;        /* Orange/Amber */
--warning-light: #FEF3C7;
--warning-dark: #D97706;

--error: #DC2626;          /* Red */
--error-light: #FEE2E2;
```

### Neutral Colors
```css
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;

--text-primary: #111827;    /* Almost black */
--text-secondary: #6B7280;  /* Medium grey */
--text-tertiary: #9CA3AF;  /* Light grey */

--border: #E5E7EB;
--border-light: #F3F4F6;
--shadow: rgba(0, 0, 0, 0.05);
--shadow-md: rgba(0, 0, 0, 0.1);
```

---

## 📐 LAYOUT STRUCTURE

### 1. Top Navigation Bar

**Design:**
- Height: 64px
- Background: `#FFFFFF`
- Border-bottom: `1px solid #E5E7EB`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.05)`
- Padding: `0 24px`

**Left Section:**
```
[Logo Icon] Sara Asansör  |  [Status Dot: Green] Sistem Aktif
```

**Right Section:**
```
[User Avatar] YE yeni_kullanici  [PATRON Badge]
```

**Status Indicator:**
- Green dot: `#16A34A` with pulse animation
- Text: "Sistem Aktif" in `#6B7280`

---

### 2. Left Sidebar (Redesigned)

**Container:**
- Width: 320px (desktop), 100% (mobile)
- Background: `#FFFFFF`
- Border-right: `1px solid #E5E7EB`
- Padding: `24px`
- Height: `calc(100vh - 64px)`
- Overflow-y: `auto`

**Section Title:**
```css
font-size: 18px;
font-weight: 600;
color: #111827;
margin-bottom: 20px;
```

**Building Filter:**
- Styled as modern dropdown
- Icon: Building2 (left)
- Background: `#F9FAFB`
- Border: `1px solid #E5E7EB`
- Border-radius: `8px`
- Height: `44px`
- Hover: `#F3F4F6`

**Template Selector:**
- Segmented control style
- Options: "Aylık Bakım", "Yıllık Bakım"
- Selected: Indigo background (`#4F46E5`) with white text
- Unselected: Grey background (`#F3F4F6`) with dark text
- Border-radius: `8px`
- Padding: `4px`
- Selected indicator: Soft green badge below

**Elevator List:**
- Max height: `500px`
- Overflow-y: `auto`
- Custom scrollbar (thin, grey)

**Elevator Card:**
```css
padding: 12px 16px;
border-radius: 8px;
border: 1px solid #E5E7EB;
background: #FFFFFF;
margin-bottom: 8px;
transition: all 200ms ease;
cursor: pointer;
```

**Card States:**
- **Default:** White background, grey border
- **Selected:** Indigo background (`#EEF2FF`), indigo border (`#4F46E5`)
- **Planned (disabled):** Grey background (`#F3F4F6`), opacity `0.6`
- **Hover:** Shadow `0 2px 4px rgba(0, 0, 0, 0.05)`, border color change

**Card Content:**
```
[Checkbox/Icon]  ELEV-015
                456 Residential Avenue, Block B
                [Badge: "Bu ay planlandı"] (if planned)
```

**Rules Box:**
- Background: `#EFF6FF` (light blue)
- Border-left: `4px solid #4F46E5`
- Border-radius: `8px`
- Padding: `16px`
- Icon: Info (blue)
- Text: Small, `#1E40AF`

---

### 3. Main Area - Calendar Redesign

**Container:**
- Background: `#FFFFFF`
- Border-radius: `12px`
- Padding: `24px`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.1)`
- Margin: `24px`

**Calendar Header:**
```
[← Önceki]  Şubat 2026  [Sonraki →]  [Bugün]
```

**Month Navigation:**
- Buttons: Ghost style, `#6B7280`
- Current month: `24px bold`, `#111827`
- Hover: `#F3F4F6` background

**Calendar Grid:**
- Grid: `7 columns`
- Gap: `8px`
- Cell padding: `12px`

**Day Cell:**
```css
aspect-ratio: 1;
border-radius: 12px;
border: 1px solid #E5E7EB;
background: #FFFFFF;
padding: 12px;
transition: all 200ms ease;
cursor: pointer;
```

**Cell States:**

**Default:**
- White background
- Grey border
- Day number: `14px`, `#111827`

**Today:**
- Background: Linear gradient `#EEF2FF` to `#E0E7FF`
- Border: `2px solid #4F46E5`
- Day number: Bold, `#4F46E5`

**Planned:**
- Background: `#FEF3C7` (light orange)
- Border: `1px solid #F59E0B`
- Badge: Top-right corner, orange, small number

**Completed:**
- Background: `#DCFCE7` (light green)
- Border: `1px solid #16A34A`
- Icon: Check circle, green

**Past:**
- Background: `#F9FAFB`
- Opacity: `0.5`
- Cursor: `not-allowed`

**Selected:**
- Background: `#EEF2FF`
- Border: `2px solid #4F46E5`
- Shadow: `0 4px 6px rgba(79, 70, 229, 0.1)`

**Hover (interactive cells):**
- Background: `#F9FAFB`
- Border: `1px solid #4F46E5`
- Transform: `scale(1.02)`

**Day Content:**
```
[Day Number]  [Badge: Count]
[List of elevators (max 2)]
[+X more] (if more than 2)
```

**Legend:**
```
[Color Box] Planlandı  [Color Box] Tamamlandı  [Color Box] Geçmiş
```

---

### 4. Monthly Summary Card

**Design:**
- Position: Above calendar
- Background: `#F9FAFB`
- Border-radius: `12px`
- Padding: `16px 20px`
- Border: `1px solid #E5E7EB`

**Content:**
```
Bu ay: 8 Planlandı | 3 Tamamlandı | 2 Gecikti
```

**Stats:**
- Each stat: Badge with color
- Planned: Orange badge
- Completed: Green badge
- Overdue: Red badge

---

### 5. Planned Maintenance List (Premium Cards)

**Container:**
- Background: `#FFFFFF`
- Border-radius: `16px`
- Padding: `24px`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.1)`
- Margin-top: `24px`

**Section Header:**
```
Planlanan Bakımlar
2026 Şubat ayı planları
```

**Card Design:**
```css
background: #FFFFFF;
border: 1px solid #E5E7EB;
border-radius: 12px;
padding: 20px;
margin-bottom: 12px;
transition: all 200ms ease;
```

**Card Hover:**
- Shadow: `0 4px 12px rgba(0, 0, 0, 0.1)`
- Transform: `translateY(-2px)`
- Border-color: `#4F46E5`

**Card Layout:**
```
┌─────────────────────────────────────────┐
│ ELEV-015                    [PLANNED]   │
│ Residential Complex Block B             │
│ 10 Şubat 2026                           │
│                                         │
│                    [QR ile Tamamla →]   │
└─────────────────────────────────────────┘
```

**Card Content:**

**Left Side:**
- Elevator Code: `18px bold`, `#111827`
- Building Name: `14px`, `#6B7280`
- Date: `14px`, `#6B7280`
- Status Badge: Top-right corner

**Right Side:**
- Action Button

**Button States:**

**Planned:**
```css
background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
color: #FFFFFF;
padding: 10px 20px;
border-radius: 8px;
font-weight: 500;
box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
```

**Completed:**
```css
background: #DCFCE7;
color: #16A34A;
padding: 10px 20px;
border-radius: 8px;
font-weight: 500;
cursor: not-allowed;
opacity: 0.7;
```

**Divider:**
- Between cards: `1px solid #F3F4F6`

---

## 📱 MOBILE RESPONSIVE DESIGN

### Mobile Breakpoint: < 768px

**Layout Changes:**
1. Sidebar → Collapsible drawer (slide from left)
2. Calendar → Swipeable horizontal scroll
3. Planned list → Full width, primary focus
4. QR button → Full-width, sticky bottom

**Mobile Sidebar:**
- Overlay: `rgba(0, 0, 0, 0.5)`
- Width: `280px`
- Slide animation: `300ms ease`
- Close button: Top-right X

**Mobile Calendar:**
- Horizontal scroll
- Day cells: `60px x 60px`
- Swipe gestures enabled
- Month navigation: Swipe left/right

**Mobile Card:**
- Full width
- Padding: `16px`
- Stacked layout (not side-by-side)
- Button: Full width below content

**Sticky Bottom Button:**
```css
position: fixed;
bottom: 0;
left: 0;
right: 0;
background: #4F46E5;
color: #FFFFFF;
padding: 16px;
text-align: center;
font-weight: 600;
z-index: 100;
box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
```

---

## 🎭 COMPONENT HIERARCHY

```
MaintenancePlanningPage
├── TopNavigationBar
│   ├── Logo + Title
│   ├── Status Indicator
│   └── User Avatar + Badge
│
├── LayoutContainer
│   ├── LeftSidebar
│   │   ├── SectionTitle
│   │   ├── BuildingFilter (Dropdown)
│   │   ├── TemplateSelector (Segmented)
│   │   ├── ElevatorList
│   │   │   └── ElevatorCard[] (Selectable)
│   │   └── RulesInfoCard
│   │
│   └── MainContent
│       ├── MonthlySummaryCard
│       ├── CalendarSection
│       │   ├── CalendarHeader (Navigation)
│       │   ├── CalendarGrid
│       │   │   └── DayCell[] (Interactive)
│       │   └── CalendarLegend
│       │
│       └── PlannedMaintenanceList
│           ├── SectionHeader
│           └── MaintenanceCard[]
│               ├── ElevatorInfo
│               ├── DateInfo
│               ├── StatusBadge
│               └── ActionButton
```

---

## ✨ UX IMPROVEMENTS

### 1. Loading States
- Skeleton loaders for calendar and list
- Shimmer effect
- Placeholder cards

### 2. Empty States
- Illustration or icon
- Friendly message
- CTA button

### 3. Micro-interactions
- Button hover: Scale `1.02`
- Card hover: Elevate `2px`
- Calendar cell click: Ripple effect
- Smooth transitions: `200ms ease`

### 4. Visual Feedback
- Success toast: Green, top-right
- Error toast: Red, top-right
- Loading spinner: Centered, overlay

### 5. Accessibility
- Focus states: `2px solid #4F46E5`
- Keyboard navigation
- ARIA labels
- Screen reader support

---

## 🎨 TYPOGRAPHY

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Font Sizes
```css
--text-xs: 12px;      /* Meta text, badges */
--text-sm: 14px;      /* Secondary text */
--text-base: 16px;    /* Body text */
--text-lg: 18px;      /* Section titles */
--text-xl: 20px;      /* Card titles */
--text-2xl: 24px;     /* Page title */
--text-3xl: 30px;     /* Hero text */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 🔄 ANIMATIONS

### Transitions
```css
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

### Keyframe Animations
- Pulse (status indicator)
- Fade in (cards)
- Slide in (sidebar)
- Ripple (button click)

---

## 📊 INFORMATION ARCHITECTURE

### Priority Order (Visual Hierarchy)
1. **Selected Elevators** - Most prominent
2. **Calendar** - Primary interaction
3. **Planned List** - Secondary information
4. **Filters** - Tertiary controls

### Visual Weight
- Primary actions: Bold, colored
- Secondary actions: Outlined, grey
- Information: Light, subtle

---

## 🎯 IMPLEMENTATION PRIORITIES

### Phase 1: Core Redesign
1. Color system implementation
2. Calendar redesign
3. Card layout
4. Typography updates

### Phase 2: Enhanced UX
1. Loading states
2. Empty states
3. Micro-interactions
4. Animations

### Phase 3: Mobile Optimization
1. Responsive layout
2. Touch gestures
3. Mobile navigation
4. Sticky actions

---

## 💰 PREMIUM FEATURES (Why $49/month)

1. **Professional Design** - Enterprise-grade UI
2. **Smooth Animations** - Polished interactions
3. **Mobile Optimized** - Works everywhere
4. **Fast Performance** - Optimized rendering
5. **Accessibility** - WCAG compliant
6. **Responsive** - All screen sizes
7. **Modern Stack** - Latest technologies

---

## 📝 IMPLEMENTATION NOTES

### CSS Variables
All colors and spacing should use CSS variables for easy theming.

### Component Reusability
- ElevatorCard component
- MaintenanceCard component
- CalendarDayCell component
- StatusBadge component

### State Management
- Selected elevators: Set<number>
- Selected template: number | null
- Current month: Date
- Planned maintenances: MaintenancePlan[]

### Performance
- Virtual scrolling for long lists
- Lazy loading for calendar
- Memoization for expensive calculations
- Debounced search

---

## ✅ CHECKLIST

- [ ] Color system implemented
- [ ] Typography updated
- [ ] Calendar redesigned
- [ ] Cards redesigned
- [ ] Mobile responsive
- [ ] Loading states
- [ ] Empty states
- [ ] Animations
- [ ] Accessibility
- [ ] Performance optimized

---

**This design creates a premium, trustworthy, and professional B2B SaaS experience that justifies a $49/month subscription price.**
