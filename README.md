# Sara Asansör Yönetim Sistemi - Web Admin Panel

Modern, profesyonel ve kurumsal bir web admin paneli. React + TypeScript + Vite + Tailwind CSS ile geliştirilmiştir.

## Özellikler

- ✅ Modern ve responsive tasarım (Desktop, Tablet, Mobile)
- ✅ JWT Authentication (Access Token + Refresh Token)
- ✅ Role-based access control (PATRON / PERSONEL)
- ✅ Asansör yönetimi (CRUD işlemleri)
- ✅ Bakım yönetimi ve takibi
- ✅ Uyarı sistemi (Süresi geçenler ve 30 gün kalanlar)
- ✅ Stok/Parça yönetimi
- ✅ Teklif oluşturma ve yönetimi
- ✅ Kullanıcı yönetimi (PATRON only)
- ✅ Dashboard ile özet istatistikler
- ✅ Gerçek zamanlı veri güncellemeleri (React Query)

## Teknoloji Stack

- **Frontend Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/UI (Radix UI tabanlı)
- **State Management:** React Query (TanStack Query)
- **HTTP Client:** Axios
- **Routing:** React Router v7
- **Charts:** Recharts
- **Icons:** Lucide React
- **Form Management:** React Hook Form + Zod (ready)

## Kurulum

### Gereksinimler

- Node.js 18+ 
- npm veya yarn

### Adımlar

1. **Bağımlılıkları yükleyin:**

```bash
npm install
```

2. **Geliştirme sunucusunu başlatın:**

```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

3. **Production build:**

```bash
npm run build
```

Build çıktısı `dist` klasöründe olacaktır.

4. **Production preview:**

```bash
npm run preview
```

## Yapılandırma

### Backend API URL

Backend API URL'i `src/lib/api.ts` dosyasında tanımlanmıştır:

```typescript
const API_BASE_URL = 'http://localhost:8081/api'
```

Production ortamı için environment variable kullanabilirsiniz:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'
```

`.env` dosyası oluşturun:

```
VITE_API_BASE_URL=http://localhost:8081/api
```

## Proje Yapısı

```
src/
├── components/          # React componentleri
│   ├── layout/         # Layout componentleri (Sidebar, TopBar, MainLayout)
│   ├── ui/             # Shadcn/UI componentleri (Button, Card, Dialog, vb.)
│   └── ProtectedRoute.tsx
├── contexts/           # React Context'ler
│   └── AuthContext.tsx # Authentication context
├── lib/                # Utility fonksiyonlar
│   ├── api.ts          # Axios instance ve token management
│   └── utils.ts        # Helper fonksiyonlar
├── pages/              # Sayfa componentleri
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ElevatorsPage.tsx
│   ├── ElevatorDetailPage.tsx
│   ├── MaintenancesPage.tsx
│   ├── WarningsPage.tsx
│   ├── PartsPage.tsx
│   ├── OffersPage.tsx
│   └── UsersPage.tsx
├── services/           # API servis katmanı
│   ├── auth.service.ts
│   ├── elevator.service.ts
│   ├── maintenance.service.ts
│   ├── dashboard.service.ts
│   ├── warning.service.ts
│   ├── part.service.ts
│   ├── offer.service.ts
│   └── user.service.ts
├── App.tsx             # Ana uygulama componenti ve routing
├── main.tsx            # Giriş noktası
└── index.css           # Global stiller
```

## API Endpoints

Backend API'den beklenen endpoint'ler:

### Authentication
- `POST /auth/login` - Kullanıcı girişi
- `POST /auth/refresh` - Token yenileme

### Dashboard
- `GET /dashboard/summary` - Dashboard özet verileri

### Elevators
- `GET /elevators` - Tüm asansörler
- `GET /elevators/{id}` - Asansör detayı
- `POST /elevators` - Yeni asansör
- `PUT /elevators/{id}` - Asansör güncelle
- `DELETE /elevators/{id}` - Asansör sil

### Maintenances
- `GET /maintenances` - Tüm bakımlar
- `GET /maintenances/elevator/{id}` - Asansöre ait bakımlar
- `POST /maintenances` - Yeni bakım
- `PUT /maintenances/{id}` - Bakım güncelle
- `DELETE /maintenances/{id}` - Bakım sil
- `POST /maintenances/{id}/mark-paid` - Bakımı ödendi olarak işaretle

### Warnings
- `GET /warnings?type=EXPIRED` - Süresi geçenler
- `GET /warnings?type=WARNING` - 30 gün kalanlar

### Parts
- `GET /parts` - Tüm parçalar
- `POST /parts` - Yeni parça
- `PUT /parts/{id}` - Parça güncelle
- `DELETE /parts/{id}` - Parça sil

### Offers
- `GET /offers` - Tüm teklifler
- `GET /offers/{id}` - Teklif detayı
- `POST /offers` - Yeni teklif
- `PUT /offers/{id}` - Teklif güncelle
- `DELETE /offers/{id}` - Teklif sil
- `GET /offers/{id}/export` - PDF export (optional)

### Users (PATRON only)
- `GET /users` - Tüm kullanıcılar
- `POST /users` - Yeni kullanıcı
- `PUT /users/{id}` - Kullanıcı güncelle
- `DELETE /users/{id}` - Kullanıcı sil

## Authentication Flow

1. Kullanıcı giriş yapar (`/login`)
2. Backend'den `accessToken` ve `refreshToken` alınır
3. Token'lar localStorage'a kaydedilir
4. Her API isteğinde `Authorization: Bearer {accessToken}` header'ı eklenir
5. Token süresi dolduğunda otomatik olarak refresh edilir
6. Refresh başarısız olursa kullanıcı login sayfasına yönlendirilir

## Role-based Access Control

- **PATRON:** Tüm sayfalara erişim
- **PERSONEL:** Users sayfasına erişim yok

## Sayfalar

### 1. Login Page (`/login`)
- Kullanıcı adı ve şifre ile giriş
- Hata yönetimi ve loading state

### 2. Dashboard (`/dashboard`)
- Toplam asansör sayısı
- Toplam bakım sayısı
- Toplam gelir ve borç
- Süresi geçen ve uyarı veren asansörler
- Grafikler ve istatistikler

### 3. Elevators (`/elevators`)
- Asansör listesi (tablo)
- Arama ve filtreleme
- Yeni asansör ekleme
- Düzenleme ve silme
- Detay sayfasına yönlendirme

### 4. Elevator Detail (`/elevators/:id`)
- Asansör detay bilgileri
- Bakım geçmişi
- Yeni bakım ekleme

### 5. Maintenances (`/maintenances`)
- Bakım listesi
- Arama ve filtreleme
- Ödendi/Ödenmedi işaretleme
- Silme işlemi

### 6. Warnings (`/warnings`)
- İki tab: Süresi Geçenler ve 30 Gün Kalanlar
- Asansör listesi ve durum bilgileri

### 7. Parts/Stock (`/parts`)
- Parça listesi
- Stok seviyeleri
- CRUD işlemleri

### 8. Offers (`/offers`)
- Teklif listesi
- Teklif oluşturma (kalemler ile)
- Teklif detay görüntüleme
- PDF export (backend endpoint varsa)

### 9. Users (`/users`) - PATRON Only
- Kullanıcı listesi
- Yeni kullanıcı ekleme
- Kullanıcı düzenleme ve silme

## Geliştirme

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run build
```

## Notlar

- Backend API'nin çalışır durumda olması gerekmektedir
- CORS ayarlarının yapılmış olması gerekmektedir
- JWT token formatı backend'den dönen şekilde parse edilmektedir
- Tüm tarih formatları Türkçe olarak gösterilmektedir
- Para birimi TRY olarak formatlanmaktadır

## Lisans

Bu proje özel bir projedir.

