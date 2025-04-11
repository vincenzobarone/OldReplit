import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Funzione per aggiornare la versione del service worker
function updateServiceWorkerVersion() {
  console.log("Aggiornamento versione del Service Worker...");
  
  // Ottieni data e ora attuali in UTC per garantire coerenza
  const now = new Date();
  // Formato UTC per uso interno in file di build
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  
  // Crea il nuovo numero di versione in formato UTC
  const versionDate = `${year}.${month}.${day}`;
  const versionTime = `${hours}${minutes}${seconds}`;
  
  // Crea versione in formato italiano (CET/CEST)
  // Crea una nuova data a partire dall'UTC
  const italianDate = new Date(now.getTime());
  
  // Determina se siamo in ora legale in Italia
  // L'Italia utilizza CET (UTC+1) durante l'inverno e CEST (UTC+2) durante l'estate
  // L'ora legale inizia l'ultima domenica di marzo e termina l'ultima domenica di ottobre
  const isItalianDST = () => {
    const year = now.getUTCFullYear();
    // Calcola inizio ora legale (ultima domenica di marzo)
    let dstStart = new Date(Date.UTC(year, 2, 31)); // Inizia dal 31 marzo
    dstStart.setUTCDate(31 - (dstStart.getUTCDay() || 7) + 1); // Torna indietro all'ultima domenica
    dstStart.setUTCHours(1, 0, 0, 0); // L'ora legale inizia alle 1:00 UTC
    
    // Calcola fine ora legale (ultima domenica di ottobre)
    let dstEnd = new Date(Date.UTC(year, 9, 31)); // Inizia dal 31 ottobre
    dstEnd.setUTCDate(31 - (dstEnd.getUTCDay() || 7) + 1); // Torna indietro all'ultima domenica
    dstEnd.setUTCHours(1, 0, 0, 0); // L'ora legale finisce alle 1:00 UTC
    
    return now >= dstStart && now < dstEnd;
  };
  
  // Aggiunge l'offset corretto per l'Italia: UTC+1 (CET) o UTC+2 (CEST)
  const italianOffset = isItalianDST() ? 2 : 1; // Ore da aggiungere a UTC
  
  // Applica l'offset all'ora UTC per ottenere l'ora italiana
  italianDate.setUTCHours(now.getUTCHours() + italianOffset);
  
  // Formato italiano per visualizzazione
  const italianYear = italianDate.getUTCFullYear();
  const italianMonth = String(italianDate.getUTCMonth() + 1).padStart(2, '0');
  const italianDay = String(italianDate.getUTCDate()).padStart(2, '0');
  const italianHours = String(italianDate.getUTCHours()).padStart(2, '0');
  const italianMinutes = String(italianDate.getUTCMinutes()).padStart(2, '0');
  const italianSeconds = String(italianDate.getUTCSeconds()).padStart(2, '0');
  const italianVersionString = `${italianYear}.${italianMonth}.${italianDay}.${italianHours}${italianMinutes}${italianSeconds}`;
  
  console.log(`Generata nuova versione UTC: ${versionDate}.${versionTime}`);
  console.log(`Versione convertita in formato italiano: ${italianVersionString}`);
  
  // Usiamo il timestamp in formato italiano per tutto ciò che è visibile all'utente
  const versionString = italianVersionString;
  
  // Aggiorniamo anche la costante BUILD_DATE nel file constants.ts
  const constantsPath = path.join(__dirname, 'client', 'src', 'lib', 'constants.ts');
  if (fs.existsSync(constantsPath)) {
    let constantsContent = fs.readFileSync(constantsPath, 'utf8');
    const buildDateRegex = /export const BUILD_DATE = ["'][\d\.]+["'];/;
    
    if (buildDateRegex.test(constantsContent)) {
      constantsContent = constantsContent.replace(
        buildDateRegex, 
        `export const BUILD_DATE = "${versionString}";`
      );
      fs.writeFileSync(constantsPath, constantsContent, 'utf8');
      console.log(`Aggiornata costante BUILD_DATE in constants.ts a ${versionString}`);
    } else {
      console.log('Attenzione: Pattern per BUILD_DATE non trovato in constants.ts');
    }
  } else {
    console.log(`Il file constants.ts non è stato trovato in: ${constantsPath}`);
  }
  
  // Percorso del service worker
  const serviceWorkerPath = path.join(__dirname, 'client', 'public', 'service-worker.js');
  
  if (!fs.existsSync(serviceWorkerPath)) {
    console.error(`Service worker non trovato in: ${serviceWorkerPath}`);
    return false;
  }
  
  // Leggi il contenuto del service worker
  let content = fs.readFileSync(serviceWorkerPath, 'utf8');
  
  // Sostituisci le linee di versione con pattern più precisi
  // Gestisci i vari formati possibili della versione per sicurezza

  // 1. Aggiorna il commento di versione nella prima parte del file
  // Pattern è: // Versione: 2025.04.08.144500 - Rimosso parametro 'esit' in favore del solo 'success' standardizzato per tutte le API
  let versionHeaderRegex = /\/\/ Versione: [\d\.]+/;
  if (versionHeaderRegex.test(content)) {
    content = content.replace(versionHeaderRegex, `// Versione: ${versionString}`);
    console.log(`Aggiornato header di versione a ${versionString}`);
  } else {
    console.log('Attenzione: Pattern per il commento di versione non trovato');
  }
  
  // 2. Aggiorna il nome della cache
  // Pattern è: const CACHE_NAME = 'markeplay-notifier-v2025-04-08-144500';
  const cacheNameRegex = /const CACHE_NAME = ['"]markeplay-notifier-v[\d\-]+['"]/;
  
  // Formatta la data italiana per il nome della cache
  const italianFormattedDate = `${italianYear}-${italianMonth}-${italianDay}`;
  const italianFormattedTime = `${italianHours}${italianMinutes}${italianSeconds}`;
  const cacheNameString = `const CACHE_NAME = 'markeplay-notifier-v${italianFormattedDate}-${italianFormattedTime}'`;
  
  if (cacheNameRegex.test(content)) {
    content = content.replace(cacheNameRegex, cacheNameString);
    console.log(`Aggiornato CACHE_NAME a ${cacheNameString}`);
  } else {
    console.log('Attenzione: Pattern per CACHE_NAME non trovato');
  }
  
  // 3. Aggiorna la linea di log nell'evento di attivazione
  // Pattern completo è: console.log('[ServiceWorker] Activate event - versione 2025.04.08.144500 - Rimosso parametro esit in favore del solo success standardizzato');
  const activateLogRegex = /\[ServiceWorker\] Activate event - versione [\d\.]+/;
  if (activateLogRegex.test(content)) {
    content = content.replace(activateLogRegex, `[ServiceWorker] Activate event - versione ${versionString}`);
    console.log(`Aggiornato log di attivazione a versione ${versionString}`);
  } else {
    console.log('Attenzione: Pattern per il log di attivazione non trovato')
  }
  
  // Scrivi il contenuto aggiornato nel file
  fs.writeFileSync(serviceWorkerPath, content, 'utf8');
  
  console.log(`Service worker aggiornato con versione: ${versionString}`);
  return true;
}

// Directory di input e output
const distDir = path.join(__dirname, 'dist', 'public');
const outputDir = path.join(__dirname);

console.log("Script avviato per creare public.zip con la struttura corretta");

// Funzione per testare che l'aggiornamento della versione funzioni correttamente
function testVersionUpdate() {
  const testResult = updateServiceWorkerVersion();
  if (testResult) {
    console.log("Test aggiornamento versione service worker: SUCCESSO");
    
    // Leggi il file aggiornato per verificare i cambiamenti
    const serviceWorkerPath = path.join(__dirname, 'client', 'public', 'service-worker.js');
    const content = fs.readFileSync(serviceWorkerPath, 'utf8');
    
    // Estrai e mostra la versione aggiornata per conferma visiva
    // Utilizziamo pattern che corrispondono al formato preciso del file
    const versionMatch = content.match(/\/\/ Versione: ([\d\.]+)/);
    const cacheNameMatch = content.match(/const CACHE_NAME = ['"]markeplay-notifier-v([\d\-]+)['"]/);
    const activateLogMatch = content.match(/\[ServiceWorker\] Activate event - versione ([\d\.]+)/);
    
    console.log("Versioni aggiornate:");
    console.log(`- Header: ${versionMatch ? versionMatch[1] : 'Non trovato'}`);
    console.log(`- Cache: ${cacheNameMatch ? cacheNameMatch[1] : 'Non trovato'}`);
    console.log(`- Log: ${activateLogMatch ? activateLogMatch[1] : 'Non trovato'}`);
    
    // Verifica che il valore di BUILD_DATE sia stato aggiornato
    const constantsPath = path.join(__dirname, 'client', 'src', 'lib', 'constants.ts');
    let buildDateMatch = null;
    
    if (fs.existsSync(constantsPath)) {
      const constantsContent = fs.readFileSync(constantsPath, 'utf8');
      const buildDateLine = constantsContent.split('\n').find(line => line.includes('BUILD_DATE ='));
      
      if (buildDateLine) {
        buildDateMatch = buildDateLine.match(/["']([\d\.]+)["']/);
        console.log(`- BUILD_DATE: ${buildDateMatch ? buildDateMatch[1] : 'Non trovato'}`);
      }
    }
    
    // Verifica che tutte le versioni siano state trovate
    if (!versionMatch || !cacheNameMatch || !activateLogMatch || !buildDateMatch) {
      console.warn('ATTENZIONE: Alcuni pattern di versione non sono stati trovati o aggiornati!');
    }
    
    // Tutte le versioni dovrebbero corrispondere nei loro formati
    return true;
  } else {
    console.error("Test aggiornamento versione service worker: FALLITO");
    return false;
  }
}

// Aggiorna la versione del service worker prima del build
try {
  testVersionUpdate();
} catch (error) {
  console.error("Errore durante l'aggiornamento della versione del service worker:", error);
  // Continuiamo comunque con il build
}

// Esegui la build dell'applicazione
try {
  console.log("Esecuzione del build dell'applicazione...");
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error("Errore durante il build dell'applicazione:", error);
  process.exit(1);
}

// Correggi i percorsi dei file
try {
  console.log("Correzione dei percorsi nei file...");
  execSync('node fix-paths.js', { stdio: 'inherit' });
} catch (error) {
  console.error("Errore durante la correzione dei percorsi:", error);
  process.exit(1);
}

// Crea public.zip dalla directory dist/public senza includere la cartella 'public'
try {
  console.log("Creazione di public.zip con la struttura corretta...");
  
  // Elimina lo zip precedente se esiste
  const outputZipPath = path.join(outputDir, 'public.zip');
  if (fs.existsSync(outputZipPath)) {
    fs.unlinkSync(outputZipPath);
  }
  
  // Cambia directory alla directory principale
  process.chdir(outputDir);
  
  // Crea il nuovo zip includendo solo i file in dist/public (e non l'intera struttura di cartelle)
  // Utilizziamo l'opzione -j (junk paths) per evitare di includere la struttura delle cartelle
  execSync(`cd dist/public && zip -r "${outputZipPath}" * -x "dist/*"`, { stdio: 'inherit' });
  
  // Aggiungiamo anche il file notifications_redirect.html alla radice dello zip
  if (fs.existsSync('notifications_redirect.html')) {
    console.log("Aggiungo notifications_redirect.html allo zip...");
    execSync(`zip -j "${outputZipPath}" notifications_redirect.html`, { stdio: 'inherit' });
  } else {
    console.warn("ATTENZIONE: notifications_redirect.html non trovato, non verrà incluso nel package");
  }
  
  // Creiamo una directory notifications vuota per mantere la struttura
  console.log("Creazione della directory notifications nel package...");
  // Crea una directory temporanea nella dist/public
  const notificationsDir = path.join(__dirname, 'dist', 'public', 'notifications');
  if (!fs.existsSync(notificationsDir)) {
    fs.mkdirSync(notificationsDir, { recursive: true });
    fs.writeFileSync(path.join(notificationsDir, '.gitkeep'), '');
  }
  
  // Aggiungiamo la directory notifications al package
  console.log("Aggiunta della directory notifications al package...");
  execSync(`cd dist/public && zip -r "${outputZipPath}" notifications/`, { stdio: 'inherit' });
  
  console.log(`File public.zip creato con successo in: ${outputZipPath}`);
} catch (error) {
  console.error("Errore durante la creazione del file zip:", error);
  process.exit(1);
}

// Verifica il contenuto dello zip
try {
  console.log("Verifica del contenuto dello zip...");
  execSync(`unzip -l public.zip | head -n 20`, { stdio: 'inherit' });
} catch (error) {
  console.error("Errore durante la verifica del contenuto zip:", error);
}

console.log("Processo completato con successo!");