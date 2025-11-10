# Elastic Beanstalk Deployment Hatası Düzeltme

## Sorun
ZIP dosyası Windows path separator'ları (backslash `\`) kullanıyor ve Linux'ta unzip edilemiyor.

**Hata:**
```
warning: /opt/elasticbeanstalk/deployment/app_source_bundle appears to use backslashes as path separators
ERROR: Command /usr/bin/unzip failed with error exit status 1
```

## Çözüm

### Yöntem 1: PowerShell Script (Önerilen - 7-Zip ile)

1. **7-Zip yükleyin** (eğer yüklü değilse):
   - İndir: https://www.7-zip.org/
   - Varsayılan yola yükleyin: `C:\Program Files\7-Zip\`

2. **PowerShell script'i çalıştırın:**
   ```powershell
   .\create-deploy-zip.ps1
   ```

3. **AWS Console'dan deploy edin:**
   - `fotonik-backend-deploy.zip` dosyasını yükleyin
   - Version label: `v1.0.4`
   - Deploy

### Yöntem 2: Node.js Script

1. **adm-zip paketini yükleyin:**
   ```bash
   npm install -g adm-zip
   ```

2. **Script'i çalıştırın:**
   ```bash
   node create-deploy-zip-node.js
   ```

3. **AWS Console'dan deploy edin**

### Yöntem 3: Manuel (7-Zip GUI)

1. **7-Zip yükleyin** (yukarıdaki linkten)

2. **7-Zip File Manager'ı açın**

3. **Dosyaları seçin:**
   - `server.js`
   - `package.json`
   - `controllers/` klasörü
   - `data/` klasörü
   - `middleware/` klasörü
   - `routes/` klasörü
   - `utils/` klasörü
   - `public/` klasörü

4. **Sağ tıklayın → 7-Zip → Add to archive...**

5. **Ayarlar:**
   - Archive format: `zip`
   - Compression level: `Maximum`
   - **ÖNEMLİ:** Archive name: `fotonik-backend-deploy.zip`

6. **OK'a tıklayın**

7. **AWS Console'dan deploy edin**

## Kontrol Listesi

- [ ] ZIP dosyası Linux-compatible formatında oluşturuldu
- [ ] ZIP içinde `server.js` root'ta
- [ ] ZIP içinde `package.json` root'ta
- [ ] `node_modules/` ZIP'te YOK (EB otomatik yükler)
- [ ] `mobile/` klasörü ZIP'te YOK
- [ ] PORT ayarı: `process.env.PORT || 8080`
- [ ] JWT_SECRET environment variable AWS'de ayarlı

## Environment Variables (AWS Console)

**Configuration → Software → Environment properties:**
- `JWT_SECRET`: Güçlü bir secret key (örnek: `your-super-secret-jwt-key-12345`)
- `NODE_ENV`: `production`

## Test

Deploy sonrası:
1. Health durumunu kontrol edin (Ok olmalı)
2. URL'yi test edin: `http://fotonik-backend-env.eba-zqqvhjqa.eu-north-1.elasticbeanstalk.com/admin/login.html`
3. Logs sekmesinden hataları kontrol edin

## Sorun Devam Ederse

1. **Logs kontrolü:**
   - AWS Console → Elastic Beanstalk → Logs → Request logs
   - `eb-engine.log` dosyasını inceleyin

2. **ZIP içeriğini kontrol edin:**
   - ZIP'i açın ve dosya yollarının forward slash (`/`) kullandığından emin olun
   - Backslash (`\`) varsa, ZIP'i yeniden oluşturun

3. **7-Zip kullanın:**
   - PowerShell `Compress-Archive` yerine 7-Zip kullanın
   - 7-Zip Linux-compatible ZIP oluşturur

