# Elastic Beanstalk Deployment ZIP Oluşturucu (Linux-Compatible)
# Bu script deployment için Linux-compatible ZIP dosyası oluşturur

Write-Host "=== Fotonik Backend Deployment ZIP Oluşturucu ===" -ForegroundColor Green
Write-Host "Linux-compatible ZIP oluşturuluyor..." -ForegroundColor Yellow

# Mevcut ZIP'i sil
if (Test-Path "fotonik-backend-deploy.zip") {
    Remove-Item "fotonik-backend-deploy.zip" -Force
    Write-Host "Eski ZIP dosyası silindi." -ForegroundColor Yellow
}

# Geçici klasör oluştur
$tempDir = "deploy-temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Dosyalar kopyalanıyor..." -ForegroundColor Cyan

# Gerekli dosya ve klasörleri kopyala
Copy-Item -Path "server.js" -Destination $tempDir -Force
Copy-Item -Path "package.json" -Destination $tempDir -Force
if (Test-Path "package-lock.json") {
    Copy-Item -Path "package-lock.json" -Destination $tempDir -Force
}
Copy-Item -Path "controllers" -Destination $tempDir -Recurse -Force
Copy-Item -Path "data" -Destination $tempDir -Recurse -Force
Copy-Item -Path "middleware" -Destination $tempDir -Recurse -Force
Copy-Item -Path "routes" -Destination $tempDir -Recurse -Force
Copy-Item -Path "utils" -Destination $tempDir -Recurse -Force
Copy-Item -Path "public" -Destination $tempDir -Recurse -Force

# .ebignore varsa kopyala
if (Test-Path ".ebignore") {
    Copy-Item -Path ".ebignore" -Destination $tempDir -Force
}

Write-Host "Linux-compatible ZIP oluşturuluyor..." -ForegroundColor Cyan

# 7-Zip varsa kullan (Linux-compatible ZIP için)
$7zipPath = "${env:ProgramFiles}\7-Zip\7z.exe"
if (Test-Path $7zipPath) {
    Write-Host "7-Zip kullanılıyor..." -ForegroundColor Green
    # tempDir içine girip dosyaları root'a ekle
    Push-Location $tempDir
    & $7zipPath a -tzip -mx=9 "..\fotonik-backend-deploy.zip" "*" | Out-Null
    Pop-Location
} else {
    # 7-Zip yoksa, Python kullan (eğer yüklüyse)
    $pythonPath = "python"
    try {
        $pythonVersion = & $pythonPath --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Python kullanılıyor..." -ForegroundColor Green
            $pythonScript = @"
import os
import zipfile
import sys

def create_zip(source_dir, zip_path):
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Use forward slashes for archive paths (Linux-compatible)
                arcname = os.path.relpath(file_path, source_dir).replace('\\', '/')
                zipf.write(file_path, arcname)
                print(f'Added: {arcname}')

if __name__ == '__main__':
    create_zip('$tempDir', 'fotonik-backend-deploy.zip')
    print('ZIP created successfully!')
"@
            $pythonScript | Out-File -FilePath "temp_zip_creator.py" -Encoding UTF8
            & $pythonPath "temp_zip_creator.py"
            Remove-Item "temp_zip_creator.py" -Force
        } else {
            throw "Python not found"
        }
    } catch {
        # Son çare: PowerShell Compress-Archive (ama path'leri düzelt)
        Write-Host "7-Zip ve Python bulunamadı. PowerShell Compress-Archive kullanılıyor..." -ForegroundColor Yellow
        Write-Host "UYARI: Bu yöntem bazı durumlarda sorun çıkarabilir." -ForegroundColor Red
        Write-Host "Öneri: 7-Zip yükleyin: https://www.7-zip.org/" -ForegroundColor Yellow
        
        # PowerShell ile ZIP oluştur
        Compress-Archive -Path "$tempDir\*" -DestinationPath "fotonik-backend-deploy.zip" -Force
        
        # ZIP içindeki backslash'leri düzeltmek için yeniden oluştur
        Write-Host "ZIP içeriği düzeltiliyor..." -ForegroundColor Yellow
        $zipTemp = "zip-temp-fix"
        if (Test-Path $zipTemp) {
            Remove-Item $zipTemp -Recurse -Force
        }
        Expand-Archive -Path "fotonik-backend-deploy.zip" -DestinationPath $zipTemp -Force
        Remove-Item "fotonik-backend-deploy.zip" -Force
        
        # Python script ile yeniden oluştur
        $pythonFixScript = @"
import zipfile
import os

def fix_zip(source_dir, zip_path):
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir).replace('\\', '/')
                zipf.write(file_path, arcname)

fix_zip('$zipTemp', 'fotonik-backend-deploy.zip')
"@
        try {
            $pythonFixScript | Out-File -FilePath "fix_zip.py" -Encoding UTF8
            & python "fix_zip.py" 2>&1 | Out-Null
            Remove-Item "fix_zip.py" -Force -ErrorAction SilentlyContinue
            Remove-Item $zipTemp -Recurse -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "Python ile düzeltme başarısız. Manuel kontrol gerekebilir." -ForegroundColor Red
        }
    }
}

# Geçici klasörü temizle
Remove-Item $tempDir -Recurse -Force

if (Test-Path "fotonik-backend-deploy.zip") {
    $zipSize = (Get-Item "fotonik-backend-deploy.zip").Length / 1MB
    Write-Host "`n=== ZIP Dosyası Başarıyla Oluşturuldu ===" -ForegroundColor Green
    Write-Host "Dosya: fotonik-backend-deploy.zip" -ForegroundColor White
    Write-Host "Boyut: $([math]::Round($zipSize, 2)) MB" -ForegroundColor White
    Write-Host "`nŞimdi AWS Console'dan bu ZIP'i yükleyebilirsiniz." -ForegroundColor Yellow
    Write-Host "AWS Console > Elastic Beanstalk > Upload and deploy" -ForegroundColor Yellow
} else {
    Write-Host "`n!!! HATA: ZIP dosyası oluşturulamadı !!!" -ForegroundColor Red
    Write-Host "Lütfen 7-Zip yükleyin: https://www.7-zip.org/" -ForegroundColor Yellow
    exit 1
}

