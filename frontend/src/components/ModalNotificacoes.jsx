import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { estadoNotificacoes, ativarNotificacoes } from '../lib/push'
import { estadoInstalacao } from '../lib/instalacao'

const ATRASO_MS = 1200

function ModalNotificacoes() {
  const [aberto, setAberto] = useState(false)
  const [ativando, setAtivando] = useState(false)

  useEffect(() => {
    let cancelado = false
    let temporizador
    estadoNotificacoes().then((atual) => {
      if (cancelado || atual !== 'inativo') return
      const instalacao = estadoInstalacao()
      if (instalacao === 'instalavel' || instalacao === 'ios') return
      temporizador = setTimeout(() => setAberto(true), ATRASO_MS)
    })

    return () => {
      cancelado = true
      clearTimeout(temporizador)
    }
  }, [])

  async function ativar() {
    setAtivando(true)
    try {
      await ativarNotificacoes()
      setAberto(false)
    } catch (erro) {
      alert(erro.message)
      if ((await estadoNotificacoes()) !== 'inativo') setAberto(false)
    } finally {
      setAtivando(false)
    }
  }

  if (!aberto) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-notificacoes"
        className="w-full max-w-sm bg-surface rounded-2xl p-6 text-center shadow-lg"
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-campo-light text-campo-dark flex items-center justify-center">
          <Bell size={22} />
        </div>

        <h2 id="titulo-modal-notificacoes" className="text-lg font-bold text-campo-dark mb-2">
          Ative as notificações
        </h2>

        <p className="text-sm text-ink/70 mb-5">
          Receba os avisos do professor e os lembretes de vencimento da mensalidade direto no celular, mesmo com o app fechado.
        </p>
        <button
          type="button"
          onClick={ativar}
          disabled={ativando}
          className="w-full bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {ativando ? 'Ativando...' : 'Ativar notificações'}
        </button>
      </div>
    </div>,
    document.body
  )
}

export default ModalNotificacoes
