const fs = require('fs');
const path = require('path');

function renameFiles(dir, fromExt, toExt) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping...`);
    return;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      renameFiles(fullPath, fromExt, toExt);
    } else if (file.name.endsWith(fromExt)) {
      const newName = file.name.replace(new RegExp(`${fromExt.replace('.', '\\.')}$`), toExt);
      const newPath = path.join(dir, newName);
      fs.renameSync(fullPath, newPath);
      console.log(`Renamed: ${file.name} -> ${newName}`);
    }
  }
}

// Переименовываем ESM файлы
console.log('Renaming ESM files (.js -> .mjs)...');
renameFiles('dist/esm', '.js', '.mjs');

// Переименовываем CJS файлы
console.log('Renaming CJS files (.js -> .cjs)...');
renameFiles('dist/cjs', '.js', '.cjs');

console.log('File renaming completed!');