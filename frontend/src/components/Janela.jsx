import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

function Janela({ titulo, aoFechar, children }) {
  useEffect(() => {
    function aoApertarTecla(e) {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoApertarTecla)
    return () => document.removeEventListener('keydown', aoApertarTecla)
  }, [aoFechar])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative w-full max-w-sm bg-surface rounded-2xl p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="absolute top-3 right-3 p-1.5 rounded-lg text-ink/50 hover:bg-hover transition-colors">
          <X size={18} />
        </button>
        <h3 className="text-lg font-bold text-campo-dark mb-4 pr-8">{titulo}</h3>
        {children}
      </div>
    </div>,
    document.body
  )
}

export default Janela
