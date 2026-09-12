import { useEffect, useState } from 'react'

const CHAVE = 'rj-training-tema'

function prefereEscuro() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function deveFicarEscuro(tema) {
  if (tema === 'escuro') return true
  if (tema === 'claro') return false
  return prefereEscuro()
}

function aplicarTema(tema) {
  document.documentElement.classList.toggle('dark', deveFicarEscuro(tema))
}

export function useTema() {
  const [tema, setTema] = useState(() => localStorage.getItem(CHAVE) || 'sistema')

  useEffect(() => {
    aplicarTema(tema)
    localStorage.setItem(CHAVE, tema)
  }, [tema])

  useEffect(() => {
    if (tema !== 'sistema') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const aoMudar = () => aplicarTema('sistema')
    media.addEventListener('change', aoMudar)
    return () => media.removeEventListener('change', aoMudar)
  }, [tema])

  return [tema, setTema]
}
