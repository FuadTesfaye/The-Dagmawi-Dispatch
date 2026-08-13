const fs = require('fs');
const path = require('path');

function copyDir(src, dest, transform) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, transform);
    } else {
      let content = fs.readFileSync(srcPath, 'utf8');
      if (transform) content = transform(content, srcPath);
      fs.writeFileSync(destPath, content);
    }
  }
}

function transformContent(content, srcPath) {
  // Update imports
  content = content.replace(/@\/components\//g, '@/components/search-engine/');
  content = content.replace(/@\/lib\//g, '@/lib/search-engine/');
  // Update api fetch calls
  content = content.replace(/\/api\/(search|stats|categories|channel|graph|stars)/g, '/api/search-engine/$1');
  return content;
}

// Copy components
copyDir('search-engine/web/src/components', 'src/components/search-engine', transformContent);
// Copy lib
copyDir('search-engine/web/src/lib', 'src/lib/search-engine', transformContent);

// Copy API routes
copyDir('search-engine/web/src/app/api', 'src/app/api/search-engine', transformContent);

// Copy App pages (skip layout.tsx, globals.css, api)
const appDir = 'search-engine/web/src/app';
for (const entry of fs.readdirSync(appDir, { withFileTypes: true })) {
  if (entry.name === 'api' || entry.name === 'globals.css') continue;
  
  const srcPath = path.join(appDir, entry.name);
  const destPath = path.join('src/app/explorer', entry.name);
  
  if (entry.isDirectory()) {
    copyDir(srcPath, destPath, transformContent);
  } else {
    // If we copy layout.tsx to explorer/layout.tsx, we should remove the global layout wrapper 
    // because Next.js will nest it inside the root layout.tsx.
    let content = fs.readFileSync(srcPath, 'utf8');
    content = transformContent(content, srcPath);
    
    if (entry.name === 'layout.tsx') {
        // Strip out the html and body tags since it will be nested
        content = content.replace(/<html lang="en">[\s\S]*?<body[^>]*>/, '<div className="min-h-screen bg-[#0a0c10] text-[#d7dde6] search-engine-theme">');
        content = content.replace(/<\/body>[\s\S]*?<\/html>/, '</div>');
    }
    
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content);
  }
}

console.log("Migration complete.");
