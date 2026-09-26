import { supabase } from './supabaseClient'

const VAPID_PUBLIC_KEY =
  'BIwZT3YNRnAZ4jNMzNQCmXo0b9k6Rnyk_tc2Fw4FMoigbC0aQxzSC-bA-E1e8W-QZpr4c-RXEehDgO448eTen98'

function chaveParaUint8Array(base64Url) {
  const preenchimento = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + preenchimento).replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(base64)
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0))
}

export function pushSuportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function iosSemInstalar() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  return ios && !instalado
}

async function buscarInscricao() {
  const registro = await navigator.serviceWorker.getRegistration()
  if (!registro) return null
  return registro.pushManager.getSubscription()
}

export async function estadoNotificacoes() {
  if (!pushSuportado()) return iosSemInstalar() ? 'ios-sem-instalar' : 'nao-suportado'
  if (Notification.permission === 'denied') return 'bloqueado'

  const inscricao = await buscarInscricao()
  if (inscricao && Notification.permission === 'granted') return 'ativo'
  return 'inativo'
}

export async function ativarNotificacoes() {
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    throw new Error('Permissão de notificações negada. Libere nas configurações do navegador.')
  }

  const existente = await navigator.serviceWorker.getRegistration()
  if (!existente) {
    throw new Error('As notificações só funcionam no app publicado (não no modo de desenvolvimento).')
  }

  const registro = await navigator.serviceWorker.ready
  const inscricao =
    (await registro.pushManager.getSubscription()) ||
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: chaveParaUint8Array(VAPID_PUBLIC_KEY),
    }))

  const { endpoint, keys } = inscricao.toJSON()
  const { data, error } = await supabase.rpc('registrar_push', {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
  })

  if (error) throw new Error(error.message)
  if (data && data.startsWith('ERRO')) throw new Error(data.replace('ERRO: ', ''))
}

export async function desativarNotificacoes() {
  const inscricao = await buscarInscricao()
  if (!inscricao) return

  await supabase.from('push_subscription').delete().eq('endpoint', inscricao.endpoint)
  await inscricao.unsubscribe()
}
