self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    renotify: data.renotify,
    tag: data.tag,
    badge: data.badge,
    icon: data.icon,
  });
});
