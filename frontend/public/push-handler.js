self.addEventListener('push', (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch {
    dados = { corpo: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'RJ Training', {
      body: dados.corpo || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: dados.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (janelas.length > 0) {
        const janela = janelas[0]
        await janela.focus()
        if ('navigate' in janela) await janela.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    })()
  )
})
