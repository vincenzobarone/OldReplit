import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory di input e output
const distDir = path.join(__dirname, 'dist', 'public');
const assetsDir = path.join(distDir, 'assets');

// Funzione per correggere i riferimenti alle immagini nel file JS
function fixJsAssetReferences() {
  console.log('Fixing asset references in JS file...');
  
  // Trova il file JS
  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find(file => file.startsWith('index-') && file.endsWith('.js'));
  
  if (!jsFile) {
    console.error('JS file not found in assets directory');
    return;
  }
  
  const jsFilePath = path.join(assetsDir, jsFile);
  let jsContent = fs.readFileSync(jsFilePath, 'utf8');
  
  // 1. Correggi i riferimenti alle immagini che iniziano con /assets/
  const assetsRegex = /(["'])(\/assets\/[A-Za-z0-9_.-]+\.[a-z]+)\1/g;
  jsContent = jsContent.replace(assetsRegex, (match, quote, imgPath) => {
    const correctedPath = `${quote}/applications/notificationapp${imgPath}${quote}`;
    console.log(`Replacing asset path: ${match} with ${correctedPath}`);
    return correctedPath;
  });
  
  // 2. Correggi i riferimenti ai file nell'URL root principale (favicon.ico, manifest.json, ecc.)
  const rootFileRegex = /(["'])(\/(?:favicon\.ico|manifest\.json|icon(?:-\d+x\d+)?\.png|service-worker\.js))\1/g;
  jsContent = jsContent.replace(rootFileRegex, (match, quote, filePath) => {
    const correctedPath = `${quote}/applications/notificationapp${filePath}${quote}`;
    console.log(`Replacing root file path: ${match} with ${correctedPath}`);
    return correctedPath;
  });
  
  // 3. Correggi anche i percorsi iniziano con un solo slash come /icon.svg
  const singleSlashRegex = /(['"])(\/[a-zA-Z0-9_.-]+\.[a-z]{2,4})\1/g;
  jsContent = jsContent.replace(singleSlashRegex, (match, quote, filePath) => {
    // Verifica se il percorso è già stato corretto (contiene già /applications/notificationapp)
    if (filePath.includes('/applications/notificationapp')) {
      return match;
    }
    const correctedPath = `${quote}/applications/notificationapp${filePath}${quote}`;
    console.log(`Replacing single slash path: ${match} with ${correctedPath}`);
    return correctedPath;
  });
  
  // 4. Correggi i percorsi di navigazione dell'app (senza estensione)
  // Ma preserva esplicitamente i path che utilizzano hash routing (#notifications)
  
  // CORREZIONE 14.2: Migliora gestione percorsi di navigazione
  // Prima controlliamo e preserviamo i percorsi con hash
  const hashRoutingRegex = /['"]([^'"]*#notifications)["']/g;
  // Quando troviamo un percorso hash, lo marchiamo come già processato
  const processedHashPaths = new Set();
  
  jsContent = jsContent.replace(hashRoutingRegex, (match, path) => {
    console.log(`Preserving hash routing path: ${match}`);
    // Aggiungiamo alla lista dei percorsi già processati
    processedHashPaths.add(match);
    return match; // Manteniamo invariato
  });
  
  // Ora gestiamo normalmente i percorsi tradizionali preservando quelli hash
  const navigationPathRegex = /(['"])(\/(?:login|notifications|settings|install)(?:\/|\1))/g;
  jsContent = jsContent.replace(navigationPathRegex, (match, quote, path) => {
    // Non correggiamo i percorsi già corretti o i percorsi hash
    if (path.includes('/applications/notificationapp') || processedHashPaths.has(match)) {
      return match;
    }
    
    const correctedPath = `${quote}/applications/notificationapp${path}`;
    console.log(`Replacing navigation path: ${match} with ${correctedPath}`);
    return correctedPath;
  });
  
  // 5. Correggi esplicitamente i redirect alla root
  const rootPathRegex = /window\.location\.href\s*=\s*(['"])\/\1/g;
  jsContent = jsContent.replace(rootPathRegex, (match, quote) => {
    const correctedPath = `window.location.href = ${quote}/applications/notificationapp/${quote}`;
    console.log(`Replacing root redirect: ${match} with ${correctedPath}`);
    return correctedPath;
  });
  
  // 6. CORREZIONE 14.2: Modifica del comportamento di setLocation
  // Aggiorna il comportamento di setLocation preservando l'hash routing
  // IMPORTANTE: NON modificare i percorsi per preservare l'hash routing
  
  // Invece di sostituire direttamente setLocation('/notifications'),
  // verifichiamo se non è stato già corretto o se fa parte dei percorsi hash
  console.log("Preserving setLocation for hash routing (notifications)");
  
  // Salva il file modificato
  fs.writeFileSync(jsFilePath, jsContent, 'utf8');
  console.log(`JS file ${jsFile} updated with corrected asset references`);
  
  return jsFile;
}

// Funzione per leggere e modificare il contenuto dell'index.html
function updateIndexHtml() {
  console.log('Updating index.html with correct paths...');
  
  const indexPath = path.join(distDir, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error(`File not found: ${indexPath}`);
    return;
  }
  
  // Leggi il file HTML esistente
  let htmlContent = fs.readFileSync(indexPath, 'utf8');
  
  // 1. Trova i file CSS e JS nell'HTML e correggi i percorsi
  htmlContent = htmlContent.replace(
    /<script type="module" crossorigin src="\/assets\/([^"]+)"><\/script>/g, 
    '<script type="module" crossorigin src="/applications/notificationapp/assets/$1"></script>'
  );
  
  htmlContent = htmlContent.replace(
    /<link rel="stylesheet" crossorigin href="\/assets\/([^"]+)">/g, 
    '<link rel="stylesheet" crossorigin href="/applications/notificationapp/assets/$1">'
  );
  
  // 2. Correggi il riferimento al manifest.json
  htmlContent = htmlContent.replace(
    /<link rel="manifest" href="\/manifest.json">/g,
    '<link rel="manifest" href="/applications/notificationapp/manifest.json">'
  );
  
  // 3. Correggi i riferimenti alle icone
  htmlContent = htmlContent.replace(
    /<link rel="icon" href="\/favicon.ico">/g,
    '<link rel="icon" href="/applications/notificationapp/favicon.ico">'
  );
  
  htmlContent = htmlContent.replace(
    /<link rel="apple-touch-icon" href="\/[^"]+\.png">/g,
    '<link rel="apple-touch-icon" href="/applications/notificationapp/apple-touch-icon.png">'
  );
  
  // 4. Aggiungi tag base per forzare il percorso base dell'applicazione
  // Verifica se il tag base è già presente
  if (!htmlContent.includes('<base href=')) {
    // Inietta il tag base subito dopo l'apertura del tag head
    htmlContent = htmlContent.replace(
      /<head>/,
      '<head>\n  <base href="/applications/notificationapp/">'
    );
    console.log('Added base tag to set application base path');
  }
  
  // 5. Aggiorna meta tag e canonical link
  if (!htmlContent.includes('<link rel="canonical"')) {
    // Aggiungi il canonical link
    htmlContent = htmlContent.replace(
      /<\/head>/,
      '  <link rel="canonical" href="https://serviceapi.markeplay.com/applications/notificationapp/" />\n</head>'
    );
    console.log('Added canonical link for SEO');
  }
  
  console.log('Fixed all asset references in index.html');
  
  // Salva il file modificato
  fs.writeFileSync(indexPath, htmlContent, 'utf8');
  console.log('index.html updated successfully!');
  
  // Verifica il contenuto aggiornato
  const updatedContent = fs.readFileSync(indexPath, 'utf8');
  const jsMatch = updatedContent.match(/src="\/applications\/notificationapp\/assets\/[^"]+\.js"/);
  const cssMatch = updatedContent.match(/href="\/applications\/notificationapp\/assets\/[^"]+\.css"/);
  const baseMatch = updatedContent.match(/<base href="\/applications\/notificationapp\/">/);
  
  if (jsMatch) {
    console.log('JS path correctly updated:', jsMatch[0]);
  } else {
    console.error('JS path update verification failed!');
  }
  
  if (cssMatch) {
    console.log('CSS path correctly updated:', cssMatch[0]);
  } else {
    console.error('CSS path update verification failed!');
  }
  
  if (baseMatch) {
    console.log('Base tag correctly added:', baseMatch[0]);
  } else {
    console.error('Base tag verification failed!');
  }
}

// Funzione per copiare i file immagine nella directory di output
function copyAssets() {
  console.log('Copying required assets to output directory...');
  
  // Copia MarkeplayLogoDark.png
  const sourcePath = path.join(__dirname, 'client', 'src', 'assets', 'MarkeplayLogoDark.png');
  const destPath = path.join(distDir, 'MarkeplayLogoDark.png');
  
  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${sourcePath} to ${destPath}`);
  } catch (error) {
    console.error(`Error copying ${sourcePath}:`, error);
  }
  
  // Copia anche LogoMarkeplay.png
  const logoSourcePath = path.join(__dirname, 'attached_assets', 'LogoMarkeplay.png');
  const logoDestPath = path.join(distDir, 'LogoMarkeplay.png');
  
  try {
    fs.copyFileSync(logoSourcePath, logoDestPath);
    console.log(`Copied ${logoSourcePath} to ${logoDestPath}`);
  } catch (error) {
    console.error(`Error copying ${logoSourcePath}:`, error);
  }
}

// Funzione principale
function main() {
  // Correggi i riferimenti alle immagini nel file JS
  fixJsAssetReferences();
  
  // Aggiorna l'HTML con i percorsi corretti
  updateIndexHtml();
  
  // Copia gli asset aggiuntivi
  copyAssets();
  
  console.log('All paths fixed successfully!');
}

main();