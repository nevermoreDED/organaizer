const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Собираем приложение
console.log('Сборка React приложения...');
execSync('npm run build', { stdio: 'inherit' });

// Копируем файлы в CRM
const crmPath = 'C:/OSPanel/home/progressiya.local/public/local/components/transfer/organizer/assets';
const distPath = path.join(__dirname, 'dist');

if (!fs.existsSync(crmPath)) {
  fs.mkdirSync(crmPath, { recursive: true });
}

// Копируем JS и CSS
fs.copyFileSync(
  path.join(distPath, 'index.js'),
  path.join(crmPath, 'index.js')
);

fs.copyFileSync(
  path.join(distPath, 'index.css'),
  path.join(crmPath, 'index.css')
);

console.log('Файлы скопированы в CRM:', crmPath);
console.log('Готово!');