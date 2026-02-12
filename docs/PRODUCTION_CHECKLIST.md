# Production Deployment Checklist

## ✅ Pre-Deployment

- [ ] Backend API çalışıyor (port 8080)
- [ ] Backend CORS ayarları yapıldı
- [ ] Environment variables hazır
- [ ] Domain name hazır (opsiyonel)
- [ ] SSL sertifikası hazır (opsiyonel)

## ✅ Build & Test

- [ ] `npm run build` başarılı
- [ ] `dist/` folder oluştu
- [ ] Build output kontrol edildi
- [ ] Local test yapıldı (`npx serve dist`)

## ✅ Server Setup

- [ ] EC2 instance hazır
- [ ] Node.js 18+ kurulu
- [ ] Nginx kurulu
- [ ] Git kurulu
- [ ] Firewall ayarlandı (port 80, 443)

## ✅ Deployment

- [ ] Proje klonlandı
- [ ] Dependencies kuruldu
- [ ] Production build yapıldı
- [ ] Environment variables ayarlandı
- [ ] Nginx config kopyalandı
- [ ] Nginx test edildi (`sudo nginx -t`)
- [ ] Nginx restart edildi

## ✅ Post-Deployment

- [ ] Website erişilebilir (http://your-ip)
- [ ] Login sayfası görünüyor
- [ ] API request'leri çalışıyor
- [ ] Console'da hata yok
- [ ] Network tab'da 200 OK response'ları var
- [ ] SSL/HTTPS çalışıyor (eğer kurulduysa)

## ✅ Monitoring

- [ ] Nginx logları kontrol edildi
- [ ] System resources kontrol edildi
- [ ] Error monitoring ayarlandı (opsiyonel)

## ✅ Security

- [ ] Firewall aktif
- [ ] SSH key authentication
- [ ] Nginx security headers aktif
- [ ] HTTPS/SSL aktif (production için zorunlu)
- [ ] Environment variables güvenli

---

**Not**: Tüm checklist item'ları tamamlandığında production'a hazırsınız!

