# Markeplay Notifier

Un'applicazione web progressiva (PWA) che consente agli utenti di ricevere notifiche da Markeplay. Sviluppata con React, TypeScript e Vite.

## Caratteristiche

- Ricezione notifiche in tempo reale
- Interfaccia utente responsive
- Supporto per temi chiaro/scuro
- Installazione come PWA
- Integrazione con le API di Markeplay
- Service worker avanzato per notifiche

## Installazione

```bash
# Clona il repository
git clone https://github.com/your-username/markeplay-notifier.git

# Entra nella directory
cd markeplay-notifier

# Installa le dipendenze
npm install

# Avvia l'applicazione in modalità sviluppo
npm run dev
```

## Build

```bash
# Crea una build di produzione
npm run build

# Genera lo ZIP per il deployment
node create_zip.js
```

## Tecnologie utilizzate

- React
- TypeScript
- Vite
- Express
- WebSockets
- Service Workers
- IndexedDB

## Struttura del progetto

- `client/` - Frontend React
- `server/` - Backend Express
- `shared/` - Codice condiviso tra frontend e backend
- `attached_assets/` - Immagini e risorse
- `create_zip.js` - Script per la generazione del pacchetto di deployment
- `fix-paths.js` - Script per correggere i percorsi nei file di build

## Deployment

L'applicazione è progettata per essere deployata nella subdirectory `/applications/notificationapp/` del sito Markeplay.

## CORS e reindirizzamenti

L'applicazione gestisce correttamente le comunicazioni cross-origin e i reindirizzamenti tra i domini `markeplay.com` e `serviceapi.markeplay.com`.