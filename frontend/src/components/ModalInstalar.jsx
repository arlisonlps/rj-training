import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download, Smartphone, Check, X } from 'lucide-react'
import { estadoInstalacao, observarInstalacao, instalarApp } from '../lib/instalacao'

function ModalInstalar() {
  const [estado, setEstado] = useState(() => estadoInstalacao())
  const [fechado, setFechado] = useState(false)
  const [instalando, setInstalando] = useState(false)
  const [instalado, setInstalado] = useState(false)

  useEffect(() => observarInstalacao(() => setEstado(estadoInstalacao())), [])

  async function instalar() {
    setInstalando(true)
    const resultado = await instalarApp()
    setInstalando(false)
    if (resultado === 'accepted') setInstalado(true)
  }

  const visivel = !fechado && (instalado || estado === 'instalavel' || estado === 'ios')
  if (!visivel) return null

  const ios = estado === 'ios'

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-instalar"
        className="relative w-full max-w-sm bg-surface rounded-2xl p-6 text-center shadow-lg"
      >
        <button type="button" onClick={() => setFechado(true)} aria-label="Fechar" className="absolute top-3 right-3 p-1.5 rounded-lg text-ink/50 hover:bg-hover transition-colors">
          <X size={18} />
        </button>

        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-campo-light text-campo-dark flex items-center justify-center">
          {instalado ? <Check size={22} /> : ios ? <Smartphone size={22} /> : <Download size={22} />}
        </div>

        {instalado ? (
          <>
            <h2 id="titulo-modal-instalar" className="text-lg font-bold text-campo-dark mb-2">App instalado!</h2>
            <p className="text-sm text-ink/70 mb-5">Procure o ícone do RJ Training na sua tela inicial e abra por ele.</p>
            <button type="button" onClick={() => setFechado(true)} className="w-full bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark active:scale-[0.98] transition-all">
              Entendi
            </button>
          </>
        ) : ios ? (
          <>
            <h2 id="titulo-modal-instalar" className="text-lg font-bold text-campo-dark mb-2">Instale o app no seu iPhone</h2>
            <ol className="text-sm text-ink/70 text-left space-y-1.5 mb-1 list-decimal pl-5">
              <li>Toque no botão de compartilhar do Safari.</li>
              <li>Escolha &quot;Adicionar à Tela de Início&quot;.</li>
              <li>Abra o app pelo ícone novo.</li>
            </ol>
          </>
        ) : (
          <>
            <h2 id="titulo-modal-instalar" className="text-lg font-bold text-campo-dark mb-2">Instale o app no seu dispositivo</h2>
            <p className="text-sm text-ink/70 mb-5">
              Acesso direto pela tela inicial, tela cheia como um aplicativo e avisos do professor no celular.
            </p>
            <button
              type="button"
              onClick={instalar}
              disabled={instalando}
              className="w-full bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {instalando ? 'Instalando...' : 'Instalar'}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default ModalInstalar
