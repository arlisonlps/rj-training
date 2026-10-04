import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Cake, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const AUSENCIA_MINIMA_MS = 10 * 60 * 1000

async function buscarAniversariantesDeHoje() {
  const { data, error } = await supabase.from('aluno').select('id, nome, nascimento').eq('ativo', true)
  if (error || !data) return []

  const hoje = new Date()
  const mesDia = `${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  return data
    .filter((a) => a.nascimento && a.nascimento.slice(5) === mesDia)
    .map((a) => ({ id: a.id, nome: a.nome, idade: hoje.getFullYear() - Number(a.nascimento.slice(0, 4)) }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

function ModalAniversariantes() {
  const [aniversariantes, setAniversariantes] = useState([])
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let montado = true
    let saiuEm = null

    async function verificar() {
      const lista = await buscarAniversariantesDeHoje()
      if (!montado) return
      setAniversariantes(lista)
      setAberto(lista.length > 0)
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

  if (!aberto || aniversariantes.length === 0) return null

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-6"
      onClick={() => setAberto(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-aniversariantes"
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
          <Cake size={22} />
        </div>

        <h2 id="titulo-modal-aniversariantes" className="text-lg font-bold text-campo-dark mb-2">
          {aniversariantes.length === 1 ? 'Aniversariante do dia' : 'Aniversariantes do dia'}
        </h2>

        <ul className="text-sm text-ink mb-5 space-y-1">
          {aniversariantes.map((a) => (
            <li key={a.id}>
              <span className="font-semibold">{a.nome}</span>
              <span className="text-ink/60"> faz {a.idade} anos hoje</span>
            </li>
          ))}
        </ul>

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

export default ModalAniversariantes
