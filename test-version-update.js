// Script di test per l'aggiornamento della versione nel service worker
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni il percorso corrente con supporto ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generiamo un timestamp in stile YYY.MM.DD.HHMMSS usando formato italiano per essere più comprensibile
function generateVersionTimestamp() {
  const now = new Date();

  // Formato UTC per uso interno in file di build
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  
  // Crea il nuovo numero di versione in formato UTC
  const versionDateUTC = `${year}.${month}.${day}`;
  const versionTimeUTC = `${hours}${minutes}${seconds}`;
  
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
  
  const versionDate = `${italianYear}.${italianMonth}.${italianDay}`;
  const versionTime = `${italianHours}${italianMinutes}${italianSeconds}`;
  const italianVersionString = `${versionDate}.${versionTime}`;
  
  console.log(`Timestamp UTC originale: ${versionDateUTC}.${versionTimeUTC}`);
  console.log(`Timestamp convertito in formato italiano: ${italianVersionString}`);
  
  return {
    versionString: italianVersionString,
    versionDate,
    versionTime,
    versionDateUTC,
    versionTimeUTC
  };
}

// Funzione di aggiornamento della versione (test)
function updateServiceWorkerVersion() {
  console.log("Esecuzione dell'aggiornamento della versione del service worker...");
  
  // Generiamo il nuovo timestamp
  const { versionString, versionDate, versionTime, versionDateUTC, versionTimeUTC } = generateVersionTimestamp();
  console.log(`Nuova versione generata: ${versionString}`);
  
  // Aggiorniamo anche la costante BUILD_DATE nel file constants.ts
  const constantsPath = path.join(__dirname, 'client', 'src', 'lib', 'constants.ts');
  console.log(`Cerco il file constants.ts in: ${constantsPath}`);
  
  if (fs.existsSync(constantsPath)) {
    let constantsContent = fs.readFileSync(constantsPath, 'utf8');
    console.log("Contenuto originale di constants.ts (estratto):");
    console.log(constantsContent.split('\n').filter(line => line.includes('BUILD_DATE')).join('\n'));
    
    const buildDateRegex = /export const BUILD_DATE = ["'][\d\.]+["'];/;
    
    if (buildDateRegex.test(constantsContent)) {
      constantsContent = constantsContent.replace(
        buildDateRegex, 
        `export const BUILD_DATE = "${versionString}";`
      );
      fs.writeFileSync(constantsPath, constantsContent, 'utf8');
      console.log(`Aggiornata costante BUILD_DATE in constants.ts a ${versionString}`);
      
      // Verifica l'aggiornamento
      const updatedContent = fs.readFileSync(constantsPath, 'utf8');
      console.log("Contenuto aggiornato di constants.ts (estratto):");
      console.log(updatedContent.split('\n').filter(line => line.includes('BUILD_DATE')).join('\n'));
    } else {
      console.log('Attenzione: Pattern per BUILD_DATE non trovato in constants.ts');
    }
  } else {
    console.log(`Il file constants.ts non è stato trovato in: ${constantsPath}`);
  }
  
  // Percorso del service worker di test
  const serviceWorkerPath = path.join(__dirname, 'service-worker-test.js');
  
  // Leggiamo il file di test
  let content = fs.readFileSync(serviceWorkerPath, 'utf8');
  
  // Log del contenuto iniziale
  console.log("\nContenuto iniziale (prime 3 righe):");
  console.log(content.split('\n').slice(0, 3).join('\n'));
  
  // 1. Aggiorna il commento di versione nella prima parte del file
  // Pattern è: // Versione: 2025.04.08.144500 - Rimosso parametro 'esit' in favore del solo 'success' standardizzato per tutte le API
  let versionHeaderRegex = /\/\/ Versione: [\d\.]+/;
  if (versionHeaderRegex.test(content)) {
    content = content.replace(versionHeaderRegex, `// Versione: ${versionString}`);
    console.log(`\nAggiornato header di versione a ${versionString}`);
  } else {
    console.log('\nATTENZIONE: Pattern per il commento di versione non trovato');
  }
  
  // 2. Aggiorna il nome della cache
  // Pattern è: const CACHE_NAME = 'markeplay-notifier-v2025-04-08-144500';
  const cacheNameRegex = /const CACHE_NAME = ['"]markeplay-notifier-v[\d\-]+['"]/;
  const cacheNameString = `const CACHE_NAME = 'markeplay-notifier-v${versionDate.replace(/\./g, '-')}-${versionTime}'`;
  if (cacheNameRegex.test(content)) {
    content = content.replace(cacheNameRegex, cacheNameString);
    console.log(`Aggiornato CACHE_NAME a ${cacheNameString}`);
  } else {
    console.log('ATTENZIONE: Pattern per CACHE_NAME non trovato');
  }
  
  // 3. Aggiorna la linea di log nell'evento di attivazione
  // Pattern completo è: console.log('[ServiceWorker] Activate event - versione 2025.04.08.144500 - Rimosso parametro esit in favore del solo success standardizzato');
  const activateLogRegex = /\[ServiceWorker\] Activate event - versione [\d\.]+/;
  if (activateLogRegex.test(content)) {
    content = content.replace(activateLogRegex, `[ServiceWorker] Activate event - versione ${versionString}`);
    console.log(`Aggiornato log di attivazione a versione ${versionString}`);
  } else {
    console.log('ATTENZIONE: Pattern per il log di attivazione non trovato')
  }
  
  // Scriviamo il contenuto aggiornato nel file di test
  fs.writeFileSync(serviceWorkerPath, content, 'utf8');
  
  // Verifichiamo il risultato
  console.log("\nContenuto aggiornato (prime 3 righe):");
  const updatedContent = fs.readFileSync(serviceWorkerPath, 'utf8');
  console.log(updatedContent.split('\n').slice(0, 3).join('\n'));
  
  // Verifica dei pattern di log
  console.log("\nVerifica dell'aggiornamento del log di attivazione:");
  const activateLine = updatedContent.split('\n').find(line => line.includes('[ServiceWorker] Activate event'));
  console.log(activateLine || "Log di attivazione non trovato");
  
  // Verifica che BUILD_DATE sia stato aggiornato
  console.log("\nVerifica dell'aggiornamento di BUILD_DATE in constants.ts:");
  if (fs.existsSync(constantsPath)) {
    const updatedConstantsContent = fs.readFileSync(constantsPath, 'utf8');
    const buildDateLine = updatedConstantsContent.split('\n').find(line => line.includes('BUILD_DATE ='));
    console.log(buildDateLine || "BUILD_DATE non trovato");
    
    if (buildDateLine && buildDateLine.includes(versionString)) {
      console.log("✅ BUILD_DATE aggiornato correttamente");
    } else if (buildDateLine) {
      console.log("❌ BUILD_DATE non contiene la versione corretta!");
      console.log(`Atteso: ${versionString}, Trovato: ${buildDateLine.match(/["']([\d\.]+)["']/)?.[1] || 'non identificato'}`);
    }
  } else {
    console.log("Il file constants.ts non è stato trovato!");
  }
  
  console.log("\nTest completato con successo!");
  return true;
}

// Esegui il test
try {
  updateServiceWorkerVersion();
} catch (error) {
  console.error("Errore durante il test:", error);
}