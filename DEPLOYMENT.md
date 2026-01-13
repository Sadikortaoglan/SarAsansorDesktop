# Production Deployment Guide - AWS EC2

Bu dokümantasyon, Sara Asansör Web Admin Panel'inin AWS EC2'de production'a deploy edilmesi için adım adım rehberdir.

## 📋 Ön Gereksinimler

- AWS EC2 instance (Ubuntu 20.04+ önerilir)
- Domain name (opsiyonel)
- Backend API çalışıyor olmalı (port 8080)
- SSH erişimi

---

## 🚀 Deployment Yöntemleri

### Yöntem 1: Nginx ile Manuel Deploy (Önerilen)

#### 1. EC2 Instance Hazırlığı

```bash
# EC2'ye SSH ile bağlan
ssh -i your-key.pem ubuntu@your-ec2-ip

# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Node.js ve NPM kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx kurulumu
sudo apt install -y nginx

# Git kurulumu (eğer yoksa)
sudo apt install -y git
```

#### 2. Proje Klonlama ve Build

```bash
# Proje klasörü oluştur
sudo mkdir -p /var/www/sara-asansor-web
sudo chown -R $USER:$USER /var/www/sara-asansor-web

# Projeyi klonla
cd /var/www/sara-asansor-web
git clone https://github.com/Sadikortaoglan/SarAsansorDesktop.git .

# Dependencies kur
npm install

# Production build
npm run build
```

#### 3. Environment Variables

```bash
# Production environment dosyası oluştur
nano .env.production

# İçeriği (backend URL'inizi yazın):
VITE_API_BASE_URL=http://your-backend-ip:8080/api
# veya domain kullanıyorsanız:
VITE_API_BASE_URL=https://api.yourdomain.com/api

# Build'i tekrar yap (env değiştiyse)
npm run build
```

#### 4. Nginx Configuration

```bash
# Nginx config dosyasını kopyala
sudo cp nginx.conf /etc/nginx/sites-available/sara-asansor-web

# Symbolic link oluştur
sudo ln -s /etc/nginx/sites-available/sara-asansor-web /etc/nginx/sites-enabled/

# Default config'i devre dışı bırak (opsiyonel)
sudo rm /etc/nginx/sites-enabled/default

# Nginx config test et
sudo nginx -t

# Nginx'i restart et
sudo systemctl restart nginx

# Nginx'in otomatik başlamasını sağla
sudo systemctl enable nginx
```

#### 5. Firewall Ayarları

```bash
# UFW firewall kurulumu
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS (SSL için)
sudo ufw enable
```

#### 6. SSL/HTTPS (Opsiyonel - Let's Encrypt)

```bash
# Certbot kurulumu
sudo apt install -y certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Otomatik yenileme test et
sudo certbot renew --dry-run
```

---

### Yöntem 2: Docker ile Deploy

#### 1. Docker Kurulumu

```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu
sudo apt install -y docker-compose

# Kullanıcıyı docker grubuna ekle
sudo usermod -aG docker $USER
```

#### 2. Proje Deploy

```bash
# Projeyi klonla
git clone https://github.com/Sadikortaoglan/SarAsansorDesktop.git
cd SarAsansorDesktop

# Environment dosyası oluştur
echo "VITE_API_BASE_URL=http://your-backend-ip:8080/api" > .env.production

# Docker build ve run
docker-compose up -d --build

# Logları kontrol et
docker-compose logs -f
```

---

## 📁 Folder Structure

```
/var/www/sara-asansor-web/
├── dist/                    # Build output (Nginx buraya bakar)
├── node_modules/
├── src/
├── public/
├── nginx.conf              # Nginx config
├── Dockerfile              # Docker image
├── docker-compose.yml      # Docker compose
├── package.json
├── vite.config.ts
└── .env.production         # Production env variables
```

---

## 🔧 Configuration Files

### Nginx Config (`nginx.conf`)

- **Port**: 80 (HTTP)
- **Root**: `/var/www/sara-asansor-web/dist`
- **API Proxy**: `/api` → `http://localhost:8080`
- **SPA Routing**: Tüm route'lar `index.html`'e yönlendirilir

### Environment Variables

**Development**:
```bash
# Vite proxy kullanır (/api)
# .env.local gerekmez
```

**Production**:
```bash
# .env.production
VITE_API_BASE_URL=http://your-backend-ip:8080/api
```

---

## 🔄 Update/Deploy Process

### Manuel Update

```bash
cd /var/www/sara-asansor-web

# Pull latest changes
git pull origin main

# Install dependencies (eğer package.json değiştiyse)
npm install

# Build
npm run build

# Nginx restart (gerekirse)
sudo systemctl restart nginx
```

### Docker Update

```bash
cd /var/www/sara-asansor-web

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

---

## 🧪 Testing

### 1. Build Test (Local)

```bash
# Production build test
npm run build

# Build output kontrolü
ls -la dist/

# Local serve test (opsiyonel)
npx serve dist
```

### 2. Nginx Test

```bash
# Config syntax kontrolü
sudo nginx -t

# Nginx status
sudo systemctl status nginx

# Log kontrolü
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 3. Browser Test

1. EC2 public IP'yi browser'da aç: `http://your-ec2-ip`
2. Login sayfası görünmeli
3. Network tab'da API request'leri kontrol et
4. Console'da hata olmamalı

---

## 🔒 Security Checklist

- [ ] Firewall aktif (UFW)
- [ ] SSH key authentication
- [ ] Nginx security headers
- [ ] HTTPS/SSL (production için zorunlu)
- [ ] Environment variables güvenli
- [ ] Backend API CORS ayarları
- [ ] Rate limiting (opsiyonel)

---

## 🐛 Troubleshooting

### Problem: 502 Bad Gateway

**Çözüm**:
```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:8080/api/health

# Nginx proxy ayarlarını kontrol et
sudo nginx -t
sudo systemctl restart nginx
```

### Problem: 404 Not Found (SPA routing)

**Çözüm**:
- Nginx config'de `try_files $uri $uri/ /index.html;` olduğundan emin ol

### Problem: CORS Error

**Çözüm**:
- Backend'de CORS ayarlarını kontrol et
- Nginx config'de CORS header'ları var (gerekirse backend'den kaldır)

### Problem: API Request Failed

**Çözüm**:
```bash
# Environment variable kontrolü
cat .env.production

# Build'i tekrar yap
npm run build

# Nginx log kontrolü
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 Monitoring

### Nginx Logs

```bash
# Access log
sudo tail -f /var/log/nginx/access.log

# Error log
sudo tail -f /var/log/nginx/error.log
```

### System Resources

```bash
# CPU ve Memory
htop

# Disk usage
df -h

# Nginx status
sudo systemctl status nginx
```

---

## 🚀 Quick Deploy Script

```bash
#!/bin/bash
# deploy.sh

cd /var/www/sara-asansor-web
git pull origin main
npm install
npm run build
sudo systemctl restart nginx
echo "Deployment completed!"
```

Kullanım:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📝 Notes

- **Port 80**: HTTP için standart port
- **Port 443**: HTTPS için standart port
- **Backend URL**: Production'da backend'in public IP veya domain'i kullanılmalı
- **CORS**: Backend'de CORS ayarları yapılmış olmalı
- **Token Storage**: localStorage kullanılıyor (güvenli)

---

## ✅ Deployment Checklist

- [ ] EC2 instance hazır
- [ ] Node.js ve NPM kurulu
- [ ] Nginx kurulu ve çalışıyor
- [ ] Proje klonlandı
- [ ] Dependencies kuruldu
- [ ] Production build yapıldı
- [ ] Environment variables ayarlandı
- [ ] Nginx config ayarlandı
- [ ] Firewall ayarlandı
- [ ] SSL/HTTPS kuruldu (opsiyonel)
- [ ] Test edildi
- [ ] Monitoring ayarlandı

---

**Son Güncelleme**: 2026-01-12

