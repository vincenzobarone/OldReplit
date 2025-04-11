// Service Worker for Markeplay Notifier PWA
// Versione: 2025.04.08.162037 - Rimosso parametro 'esit' in favore del solo 'success' standardizzato per tutte le API

const CACHE_NAME = 'markeplay-notifier-v2025-04-08-162037';
const BASE_PATH = '/applications/notificationapp';
const ASSETS_TO_CACHE = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/favicon.ico`,
  `${BASE_PATH}/icon.svg`,
  `${BASE_PATH}/icon-192x192.png`,
  `${BASE_PATH}/icon-512x512.png`
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Gestione messaggio per forzare l'aggiornamento del service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Ricevuto messaggio SKIP_WAITING, forzo l\'aggiornamento immediato');
    self.skipWaiting();
  }
});

// Activate event - clean up old caches and register periodic sync
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event - versione 2025.04.08.162037 - Rimosso parametro esit in favore del solo success standardizzato');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME;
          })
          .map((cacheName) => {
            console.log('[ServiceWorker] Eliminazione cache obsoleta:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Start periodic check for notifications (every minute)
      console.log('[ServiceWorker] Impostazione controllo notifiche periodico (ogni minuto)');
      setInterval(checkForNewNotifications, 60000);
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, cache fallback strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // API requests should not be cached
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the fetched response
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // If network fetch fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.message || 'New notification from Markeplay',
      icon: `${BASE_PATH}/icon-192x192.png`,
      badge: `${BASE_PATH}/icon-192x192.png`,
      image: data.imageUrl || undefined,
      vibrate: [200, 100, 200],
      data: {
        url: data.link || BASE_PATH + '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Markeplay Notifier', options)
    );
  } catch (error) {
    // Fallback for non-JSON data
    const message = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Markeplay Notifier', {
        body: message,
        icon: `${BASE_PATH}/icon-192x192.png`,
        badge: `${BASE_PATH}/icon-192x192.png`,
        vibrate: [200, 100, 200]
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // If we have a matching client, focus it
        for (const client of clientList) {
          if ((client.url === BASE_PATH + '/' || client.url === BASE_PATH) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open a new window
        if (clients.openWindow) {
          const url = event.notification.data?.url || `${BASE_PATH}/`;
          return clients.openWindow(url);
        }
      })
  );
});

// Periodic background sync for checking notifications
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNewNotifications());
  }
});

// Function to check for new notifications in the background
async function checkForNewNotifications() {
  try {
    const user = await getUser();
    if (!user) return;
    
    // Prima verifichiamo se ci sono nuove notifiche tramite l'API Markeplay
    // Includiamo esplicitamente la challenge key nelle chiamate fetch dal service worker
    // Questo valore deve corrispondere esattamente a quello definito in constants.ts
    const NOTIFICATION_CHALLENGE_KEY = 'FASDGWXCNK994?--';
    // Logga i dettagli della richiesta per debug
    console.log('[ServiceWorker] Esecuzione check-messages con challenge key negli header e nel body');
    console.log('[ServiceWorker] Headers challenge key:', NOTIFICATION_CHALLENGE_KEY);
    console.log('[ServiceWorker] Body challenge key:', NOTIFICATION_CHALLENGE_KEY);
    console.log('[ServiceWorker] User ID:', user.id);
    console.log('[ServiceWorker] UniqueID:', user.uniqueId);
    
    const proxyResponse = await fetch('/api/proxy/check-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'challenge-key': NOTIFICATION_CHALLENGE_KEY,
        'X-Challenge-Key': NOTIFICATION_CHALLENGE_KEY,
        'Authorization': `Bearer ${NOTIFICATION_CHALLENGE_KEY}`
      },
      body: JSON.stringify({ 
        userId: user.id,
        uniqueId: user.uniqueId, // Per compatibilità con il nostro backend
        uniqueid: user.uniqueId, // Per compatibilità con l'API Markeplay (tutto minuscolo)
        challenge_key: NOTIFICATION_CHALLENGE_KEY, // Formato principale
        notificationChallengeKey: NOTIFICATION_CHALLENGE_KEY // Formato alternativo
      }),
    });
    
    // Ora otteniamo tutte le notifiche (incluse quelle appena scaricate)
    // Aggiungiamo la challenge key anche qui per sicurezza
    const notificationsUrl = `/api/notifications?userId=${user.id}&challenge_key=${encodeURIComponent(NOTIFICATION_CHALLENGE_KEY)}`;
    console.log('[ServiceWorker] Ottengo notifiche con challenge key in URL:', notificationsUrl);
    
    const response = await fetch(notificationsUrl, {
      headers: {
        'challenge-key': NOTIFICATION_CHALLENGE_KEY,
        'X-Challenge-Key': NOTIFICATION_CHALLENGE_KEY,
        'Authorization': `Bearer ${NOTIFICATION_CHALLENGE_KEY}`
      }
    });
    if (!response.ok) return;
    
    const data = await response.json();
    if (!data.success) return; // Ora usiamo solo il parametro success standardizzato
    
    const notifications = data.content;
    const unreadNotifications = notifications.filter(n => !n.read);
    
    if (unreadNotifications.length > 0) {
      // Mostriamo le ultime 3 notifiche non lette per evitare di sovraccaricare l'utente
      const recentNotifications = unreadNotifications.slice(0, 3);
      
      // Se ci sono notifiche non lette, notifichiamo i client per riprodurre un suono
      if (unreadNotifications.length > 0) {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
          client.postMessage({ 
            type: 'NEW_NOTIFICATIONS',
            count: unreadNotifications.length
          });
        });
      }
      
      for (const notification of recentNotifications) {
        await self.registration.showNotification('Markeplay Notifier', {
          body: notification.message,
          title: notification.title,
          icon: `${BASE_PATH}/icon-192x192.png`,
          badge: `${BASE_PATH}/icon-192x192.png`,
          image: notification.imageUrl || undefined,
          vibrate: [200, 100, 200],
          silent: false, // Assicuriamoci che la notifica non sia silenziosa
          data: {
            url: notification.link || `${BASE_PATH}/`,
            notificationId: notification.id,
            shouldPlaySound: true // Segnialiamo che dovrebbe essere riprodotto un suono
          }
        });
      }
    }
  } catch (error) {
    console.error('Background notification check failed:', error);
  }
}

// Helper function to get user data from IndexedDB
async function getUser() {
  if (!indexedDB) return null;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('markeplay-notifier', 1);
    
    request.onerror = () => resolve(null);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('user', 'readonly');
      const store = transaction.objectStore('user');
      const getRequest = store.get(1); // Assuming user data is stored with ID 1
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
      
      getRequest.onerror = () => {
        resolve(null);
      };
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('user')) {
        db.createObjectStore('user', { keyPath: 'id' });
      }
    };
  });
}
