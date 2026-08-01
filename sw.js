/* Fuerza de Ventas Totalplay — service worker
   Guarda una copia del flyer en el teléfono. Así abre siempre, aunque la red
   móvil esté lenta o inestable, y sin volver a descargarlo cada vez.

   IMPORTANTE: cada vez que publiques una actualización del flyer, sube el
   número de CACHE (v2 → v3 → v4…). Ese cambio es lo que hace que los
   celulares que ya lo tienen instalado reciban la versión nueva. */

const CACHE = 'tp-fuerzaventas-v30';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './manteleta-1-prev.jpg',
  './manteleta-2-prev.jpg',
  './manteleta-1.jpg',
  './manteleta-2.jpg',
  './bn_hero.jpg',
  './bn_juegos.jpg',
  './bn_paso1.jpg',
  './bn_paso2.jpg',
  './bn_paso3.jpg',
  './bn_paso4.jpg',
  './bn_paso5.jpg',
  './bn_paso6.jpg',
  './bn_paso7.jpg',
  './bn_flyer.jpg',
  './modelado-5000.jpg',
  './modelado-10000.jpg',
  './modelado-5000-prev.jpg',
  './modelado-10000-prev.jpg'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // Uno por uno: si algún archivo falla, no se cae la instalación completa.
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

// Respuesta de emergencia: nunca se devuelve algo vacío al navegador,
// porque eso deja la pantalla en blanco con error.
function paginaDeRespaldo(){
  return new Response(
    '<!doctype html><html lang="es"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="font-family:system-ui,sans-serif;background:#073B4C;color:#fff;' +
    'display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">' +
    '<div><h2 style="color:#FFD23F;margin:0 0 8px">Sin conexion</h2>' +
    '<p style="opacity:.85;font-size:14px">Conectate a internet y vuelve a abrir la liga.</p></div>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;

  let url;
  try{ url = new URL(req.url); }catch(err){ return; }

  // La lista de empleados (Google) nunca se guarda: siempre debe ser la viva.
  if(url.hostname.indexOf('docs.google.com') !== -1) return;

  // empleados.csv del propio sitio: primero la red, para que las altas y bajas
  // de la plantilla lleguen el mismo dia. La copia guardada queda de respaldo,
  // y es lo que permite entrar cuando no hay senal.
  if(url.pathname.indexOf('empleados.csv') !== -1){
    e.respondWith(
      fetch(req).then(function(res){
        if(res && res.status === 200){
          const copia = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || new Response('', { status: 504, statusText: 'Sin conexion' });
        });
      })
    );
    return;
  }

  // Al abrir la liga: primero la copia guardada (abre al instante, aunque la
  // senal este mala) y en paralelo se busca la version nueva para la proxima vez.
  if(req.mode === 'navigate'){
    e.respondWith(
      caches.match('./index.html').then(function(hit){
        const red = fetch(req).then(function(res){
          if(res && res.status === 200){
            const copia = res.clone();
            caches.open(CACHE).then(function(c){ c.put('./index.html', copia); });
          }
          return res;
        }).catch(function(){ return null; });

        if(hit) return hit;
        return red.then(function(res){ return res || paginaDeRespaldo(); });
      }).catch(function(){ return paginaDeRespaldo(); })
    );
    return;
  }

  // Resto de archivos: copia guardada primero, si no esta se busca en la red.
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.status === 200){
          const copia = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return res;
      }).catch(function(){
        return new Response('', { status: 504, statusText: 'Sin conexion' });
      });
    }).catch(function(){
      return new Response('', { status: 504, statusText: 'Sin conexion' });
    })
  );
});
