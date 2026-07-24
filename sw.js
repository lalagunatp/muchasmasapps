/* Fuerza de Ventas Totalplay — service worker
   Guarda una copia del flyer en el teléfono. Así abre siempre, aunque la red
   móvil esté lenta o inestable, y sin volver a descargarlo cada vez.

   IMPORTANTE: cada vez que publiques una actualización del flyer, sube el
   número de CACHE (v1 → v2 → v3…). Ese cambio es lo que hace que los
   celulares que ya lo tienen instalado reciban la versión nueva. */

const CACHE = 'tp-fuerzaventas-v1';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // Si algún archivo falla, no se cae la instalación completa.
      return Promise.all(ARCHIVOS.map(function(u){
        return c.add(u).catch(function(){});
      }));
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(llaves){
      return Promise.all(llaves.map(function(k){
        if(k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // La lista de empleados (Google) nunca se guarda: siempre debe ser la viva.
  if(url.hostname.indexOf('docs.google.com') !== -1) return;

  // Para el propio sitio: se intenta la red primero (para traer novedades) y
  // si falla o tarda, se entrega la copia guardada. Nunca se queda en blanco.
  if(url.origin === self.location.origin){
    e.respondWith(
      fetch(req).then(function(res){
        if(res && res.status === 200){
          const copia = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Recursos externos (tipografías): copia guardada primero.
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        if(res && res.status === 200){
          const copia = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return res;
      }).catch(function(){ return hit; });
    })
  );
});
