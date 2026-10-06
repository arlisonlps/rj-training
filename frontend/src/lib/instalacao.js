import { iosSemInstalar } from './push'

let eventoAdiado = null
const ouvintes = new Set()

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function iniciarCapturaDeInstalacao() {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault()
    eventoAdiado = evento
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    eventoAdiado = null
    avisar()
  })
}

export function jaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
}

export function estadoInstalacao() {
  if (jaInstalado()) return 'instalado'
  if (eventoAdiado) return 'instalavel'
  if (iosSemInstalar()) return 'ios'
  return 'indisponivel'
}

export function observarInstalacao(ouvinte) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export async function instalarApp() {
  if (!eventoAdiado) return 'indisponivel'

  const evento = eventoAdiado
  evento.prompt()
  const { outcome } = await evento.userChoice
  eventoAdiado = null
  avisar()
  return outcome
}
