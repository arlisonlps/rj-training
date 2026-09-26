import { useState, useEffect } from 'react'
import { Bell, Smartphone, BellOff } from 'lucide-react'
import { estadoNotificacoes, ativarNotificacoes } from '../lib/push'

const CHIP = 'flex items-center gap-1.5 text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5'

function AtivarNotificacoes() {
  const [estado, setEstado] = useState(null)
  const [ativando, setAtivando] = useState(false)

  useEffect(() => {
    estadoNotificacoes().then(setEstado)
  }, [])

  async function ativar() {
    setAtivando(true)
    try {
      await ativarNotificacoes()
      setEstado('ativo')
    } catch (erro) {
      alert(erro.message)
      setEstado(await estadoNotificacoes())
    } finally {
      setAtivando(false)
    }
  }

  if (estado === 'inativo') {
    return (
      <button
        type="button"
        onClick={ativar}
        disabled={ativando}
        className={`${CHIP} bg-campo-light text-campo-dark hover:brightness-95 active:scale-[0.97] transition-all disabled:opacity-60`}
      >
        <Bell size={14} className="shrink-0" />
        {ativando ? 'Ativando...' : 'Ativar notificações'}
      </button>
    )
  }

  if (estado === 'ios-sem-instalar') {
    return (
      <div className={`${CHIP} bg-hover text-ink/60 font-medium`}>
        <Smartphone size={14} className="shrink-0" />
        Para receber notificações, adicione o app à Tela de Início
      </div>
    )
  }

  if (estado === 'bloqueado') {
    return (
      <div className={`${CHIP} bg-hover text-ink/60 font-medium`}>
        <BellOff size={14} className="shrink-0" />
        Notificações bloqueadas no navegador
      </div>
    )
  }

  return null
}

export default AtivarNotificacoes
