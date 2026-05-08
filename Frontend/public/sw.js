// ============================================
// Service Worker for Push Notifications
// Release Module
// ============================================

// Track unread notification count
let badgeCount = 0;

// Listen for push events from the server
self.addEventListener('push', function (event) {
  let data = { title: '🚀 Release Module', body: 'You have a new notification', url: '/' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  // Increment badge count on the app icon
  badgeCount++;

  const base = self.registration.scope;
  const options = {
    body: data.body,
    icon: data.icon || `${base}favicon.svg`,
    badge: data.badge || `${base}favicon.svg`,
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    requireInteraction: true,
    tag: 'release-notification-' + Date.now(),
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(function () {
      // Update the badge count on the installed app icon
      if (navigator.setAppBadge) {
        navigator.setAppBadge(badgeCount);
      }
    })
  );
});

// Handle notification click — navigate to the relevant page
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // Decrement badge count
  badgeCount = Math.max(0, badgeCount - 1);
  if (navigator.setAppBadge) {
    if (badgeCount > 0) {
      navigator.setAppBadge(badgeCount);
    } else {
      navigator.clearAppBadge();
    }
  }

  if (event.action === 'dismiss') return;

  // Build the full URL using the SW scope (e.g. /ReleaseModule/)
  // The hash route defaults to /Dashboard/Index — the ProtectedRoute
  // will redirect to /Login if the session has expired.
  const base = self.registration.scope;   // e.g. https://host/ReleaseModule/
  const hashRoute = event.notification.data?.url || '/Dashboard/Index';
  const urlToOpen = base + '#' + hashRoute;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(urlToOpen);
    })
  );
});

// When user opens the app, clear the badge
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    badgeCount = 0;
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge();
    }
  }
});

// Activate immediately
self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});
