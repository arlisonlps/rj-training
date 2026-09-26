import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Megaphone, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const AUSENCIA_MINIMA_MS = 10 * 60 * 1000

async function buscarAvisoAtivo() {
  const { data } = await supabase
    .from('aviso')
    .select('id, mensagem')
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data || null
}

function ModalAviso() {
  const [aviso, setAviso] = useState(null)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let montado = true
    let saiuEm = null

    async function mostrar() {
      const atual = await buscarAvisoAtivo()
      if (!montado) return
      setAviso(atual)
      setAberto(Boolean(atual))
    }

    function aoMudarVisibilidade() {
      if (document.visibilityState === 'hidden') {
        saiuEm = Date.now()
        return
      }
      if (saiuEm && Date.now() - saiuEm >= AUSENCIA_MINIMA_MS) mostrar()
      saiuEm = null
    }

    mostrar()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)

    return () => {
      montado = false
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [])

  useEffect(() => {
    if (!aberto) return

    function aoApertarTecla(e) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('keydown', aoApertarTecla)
    return () => document.removeEventListener('keydown', aoApertarTecla)
  }, [aberto])

  if (!aberto || !aviso) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={() => setAberto(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-aviso"
        className="relative w-full max-w-sm bg-surface rounded-2xl p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar aviso"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-ink/50 hover:bg-hover transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-campo-light text-campo-dark flex items-center justify-center">
          <Megaphone size={22} />
        </div>

        <h2 id="titulo-modal-aviso" className="text-lg font-bold text-campo-dark text-center mb-3">
          Aviso do professor
        </h2>

        <p className="text-sm text-ink whitespace-pre-line leading-relaxed mb-5">{aviso.mensagem}</p>

        <button
          type="button"
          onClick={() => setAberto(false)}
          className="w-full bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark active:scale-[0.98] transition-all"
        >
          Fechar
        </button>
      </div>
    </div>,
    document.body
  )
}

export default ModalAviso
