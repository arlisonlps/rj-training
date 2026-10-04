import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { UserCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const AUSENCIA_MINIMA_MS = 10 * 60 * 1000

async function contarPendentes() {
  const { count, error } = await supabase
    .from('perfil_usuario')
    .select('user_id', { count: 'exact', head: true })
    .eq('papel', 'aluno')
    .eq('status', 'pendente')
  if (error) return 0
  return count || 0
}

function ModalAprovacoesPendentes() {
  const navigate = useNavigate()
  const [total, setTotal] = useState(0)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let montado = true
    let saiuEm = null

    async function verificar() {
      const pendentes = await contarPendentes()
      if (!montado) return
      setTotal(pendentes)
      setAberto(pendentes > 0)
    }

    function aoMudarVisibilidade() {
      if (document.visibilityState === 'hidden') {
        saiuEm = Date.now()
        return
      }
      if (saiuEm && Date.now() - saiuEm >= AUSENCIA_MINIMA_MS) verificar()
      saiuEm = null
    }

    verificar()
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

  function verAprovacoes() {
    setAberto(false)
    navigate('/aprovacoes')
  }

  if (!aberto || total === 0) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={() => setAberto(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-aprovacoes"
        className="relative w-full max-w-sm bg-surface rounded-2xl p-6 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-ink/50 hover:bg-hover transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-campo-light text-campo-dark flex items-center justify-center">
          <UserCheck size={22} />
        </div>

        <h2 id="titulo-modal-aprovacoes" className="text-lg font-bold text-campo-dark mb-2">
          Alunos aguardando aprovação
        </h2>

        <p className="text-sm text-ink/70 mb-5">
          Você tem {total} {total === 1 ? 'aluno pendente' : 'alunos pendentes'} de aprovação.
        </p>

        <button
          type="button"
          onClick={verAprovacoes}
          className="w-full bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark active:scale-[0.98] transition-all"
        >
          Ver aprovações
        </button>
      </div>
    </div>,
    document.body
  )
}

export default ModalAprovacoesPendentes
