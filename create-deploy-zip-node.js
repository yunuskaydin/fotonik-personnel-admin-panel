// Node.js ile Linux-compatible ZIP oluşturucu
// Kullanım: node create-deploy-zip-node.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Fotonik Backend Deployment ZIP Oluşturucu ===');
console.log('Linux-compatible ZIP oluşturuluyor...\n');

// Geçici klasör
const tempDir = 'deploy-temp';
const zipFile = 'fotonik-backend-deploy.zip';

// Eski dosyaları temizle
if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
    console.log('Eski ZIP dosyası silindi.');
}

if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// Geçici klasör oluştur
fs.mkdirSync(tempDir, { recursive: true });

console.log('Dosyalar kopyalanıyor...');

// Kopyalanacak dosya/klasörler
const itemsToCopy = [
    'server.js',
    'package.json',
    'package-lock.json',
    'controllers',
    'data',
    'middleware',
    'routes',
    'utils',
    'public',
    '.ebignore'
];

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Dosyaları kopyala
for (const item of itemsToCopy) {
    if (fs.existsSync(item)) {
        const srcPath = item;
        const destPath = path.join(tempDir, item);
        copyRecursive(srcPath, destPath);
        console.log(`✓ ${item}`);
    }
}

console.log('\nZIP dosyası oluşturuluyor...');

// ZIP oluştur (adm-zip veya yauzl kullanılabilir, ama en basiti: child_process ile)
try {
    // Windows'ta 7-Zip varsa kullan
    const sevenZipPath = 'C:\\Program Files\\7-Zip\\7z.exe';
    if (fs.existsSync(sevenZipPath)) {
        console.log('7-Zip kullanılıyor...');
        execSync(`"${sevenZipPath}" a -tzip -mx=9 "${zipFile}" "${tempDir}\\*"`, { stdio: 'inherit' });
    } else {
        // Node.js ile ZIP oluştur (adm-zip paketi gerekli)
        try {
            const AdmZip = require('adm-zip');
            const zip = new AdmZip();
            
            function addDirectoryToZip(dir, zipPath = '') {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const relativePath = path.join(zipPath, file).replace(/\\/g, '/');
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        addDirectoryToZip(fullPath, relativePath);
                    } else {
                        zip.addFile(relativePath, fs.readFileSync(fullPath));
                        console.log(`  Added: ${relativePath}`);
                    }
                }
            }
            
            addDirectoryToZip(tempDir);
            zip.writeZip(zipFile);
            console.log('✓ ZIP oluşturuldu (adm-zip ile)');
        } catch (err) {
            if (err.code === 'MODULE_NOT_FOUND') {
                console.error('\n!!! HATA: adm-zip paketi bulunamadı !!!');
                console.error('Lütfen şunu çalıştırın: npm install -g adm-zip');
                console.error('VEYA 7-Zip yükleyin: https://www.7-zip.org/');
                process.exit(1);
            } else {
                throw err;
            }
        }
    }
} catch (error) {
    console.error('\n!!! HATA: ZIP oluşturulamadı !!!');
    console.error(error.message);
    process.exit(1);
}

// Geçici klasörü temizle
fs.rmSync(tempDir, { recursive: true, force: true });

// ZIP boyutunu göster
const stats = fs.statSync(zipFile);
const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n=== ZIP Dosyası Başarıyla Oluşturuldu ===');
console.log(`Dosya: ${zipFile}`);
console.log(`Boyut: ${fileSizeInMB} MB`);
console.log('\nŞimdi AWS Console\'dan bu ZIP\'i yükleyebilirsiniz.');
console.log('AWS Console > Elastic Beanstalk > Upload and deploy');

