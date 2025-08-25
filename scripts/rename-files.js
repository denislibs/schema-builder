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

function updateImports(dir, isESM = false) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      updateImports(fullPath, isESM);
    } else if (file.name.endsWith(isESM ? '.mjs' : '.cjs')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let updated = false;
      
      if (isESM) {
        // Обновляем импорты для ESM (.mjs)
        // Заменяем относительные импорты с .js на .mjs
        content = content.replace(/from ['"](\..+?)\.js['"]/g, (match, modulePath) => {
          updated = true;
          return `from '${modulePath}.mjs'`;
        });
        
        // Заменяем относительные импорты без расширения на .mjs
        content = content.replace(/from ['"](\.[^'"]+)(?<!\.mjs)['"]/g, (match, modulePath) => {
          if (!modulePath.endsWith('.mjs') && !modulePath.endsWith('.js')) {
            updated = true;
            return `from '${modulePath}.mjs'`;
          }
          return match;
        });
        
        // Обновляем dynamic imports
        content = content.replace(/import\(['"](\..+?)\.js['"]\)/g, (match, modulePath) => {
          updated = true;
          return `import('${modulePath}.mjs')`;
        });
      } else {
        // Обновляем require для CommonJS (.cjs)
        // Заменяем относительные require с .js на .cjs
        content = content.replace(/require\(['"](\..+?)\.js['"]\)/g, (match, modulePath) => {
          updated = true;
          return `require('${modulePath}.cjs')`;
        });
        
        // Заменяем относительные require без расширения на .cjs
        content = content.replace(/require\(['"](\.[^'"]+)(?<!\.cjs)['"]\)/g, (match, modulePath) => {
          if (!modulePath.endsWith('.cjs') && !modulePath.endsWith('.js')) {
            updated = true;
            return `require('${modulePath}.cjs')`;
          }
          return match;
        });
        
        // Обновляем ES6 импорты в CommonJS файлах (если есть)
        content = content.replace(/from ['"](\..+?)\.js['"]/g, (match, modulePath) => {
          updated = true;
          return `from '${modulePath}.cjs'`;
        });
        
        content = content.replace(/from ['"](\.[^'"]+)(?<!\.cjs)['"]/g, (match, modulePath) => {
          if (!modulePath.endsWith('.cjs') && !modulePath.endsWith('.js')) {
            updated = true;
            return `from '${modulePath}.cjs'`;
          }
          return match;
        });
      }
      
      if (updated) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in: ${file.name}`);
      }
    }
  }
}

// Переименовываем ESM файлы
console.log('Renaming ESM files (.js -> .mjs)...');
renameFiles('dist/esm', '.js', '.mjs');

// Переименовываем CJS файлы
console.log('Renaming CJS files (.js -> .cjs)...');
renameFiles('dist/cjs', '.js', '.cjs');

// Обновляем импорты в ESM файлах
console.log('Updating imports in ESM files...');
updateImports('dist/esm', true);

// Обновляем импорты в CJS файлах
console.log('Updating imports in CJS files...');
updateImports('dist/cjs', false);

console.log('File renaming and import updating completed!');