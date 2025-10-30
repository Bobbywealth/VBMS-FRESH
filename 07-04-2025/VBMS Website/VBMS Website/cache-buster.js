// VBMS Cache Buster - Force reload of all cached resources
console.log('🔄 VBMS Cache Buster - Clearing all cached resources...');

// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Clear service worker cache if available
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Clear cache API if available
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

// Force page reload with cache bypass
setTimeout(() => {
  console.log('✅ Cache cleared - reloading page...');
  window.location.reload(true);
}, 1000);

