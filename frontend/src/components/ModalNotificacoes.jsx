import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Smartphone } from 'lucide-react'
import { estadoNotificacoes, ativarNotificacoes } from '../lib/push'

const CHAVE_INSTRUCAO_VISTA = 'rj-training-instrucao-ios-vista'
const ATRASO_MS = 1200

function instrucaoJaVista() {
  try {
    return sessionStorage.getItem(CHAVE_INSTRUCAO_VISTA) === '1'
  } catch {
    return false
  }
}

function marcarInstrucaoVista() {
  try {
    sessionStorage.setItem(CHAVE_INSTRUCAO_VISTA, '1')
  } catch {
    // sem sessionStorage a instrução volta a aparecer ao recarregar
  }
}

function ModalNotificacoes() {
  const [estado, setEstado] = useState(null)
  const [aberto, setAberto] = useState(false)
  const [ativando, setAtivando] = useState(false)

  useEffect(() => {
    let cancelado = false
    let temporizador
    estadoNotificacoes().then((atual) => {
      if (cancelado) return
      const deveAbrir = atual === 'inativo' || (atual === 'ios-sem-instalar' && !instrucaoJaVista())
      if (!deveAbrir) return
      temporizador = setTimeout(() => {
        setEstado(atual)
        setAberto(true)
      }, ATRASO_MS)
    })

    return () => {
      cancelado = true
      clearTimeout(temporizador)
    }
  }, [])

  function entendi() {
    marcarInstrucaoVista()
    setAberto(false)
  }

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

  const instalar = estado === 'ios-sem-instalar'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-notificacoes"
        className="w-full max-w-sm bg-surface rounded-2xl p-6 text-center shadow-lg"
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-campo-light text-campo-dark flex items-center justify-center">
          {instalar ? <Smartphone size={22} /> : <Bell size={22} />}
        </div>

        <h2 id="titulo-modal-notificacoes" className="text-lg font-bold text-campo-dark mb-2">
          {instalar ? 'Instale o app para receber avisos' : 'Ative as notificações'}
        </h2>

        {instalar ? (
          <>
            <ol className="text-sm text-ink/70 text-left space-y-1.5 mb-5 list-decimal pl-5">
              <li>Toque no botão de compartilhar do Safari.</li>
              <li>Escolha &quot;Adicionar à Tela de Início&quot;.</li>
              <li>Abra o app pelo ícone novo e ative as notificações.</li>
            </ol>
            <button
              type="button"
              onClick={entendi}
              className="w-full bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark active:scale-[0.98] transition-all"
            >
              Entendi
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default ModalNotificacoes
