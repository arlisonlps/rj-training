import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Plus, X } from 'lucide-react'

function MenuMais({ itens }) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-semibold text-ink/50"
      >
        <Plus size={20} strokeWidth={2} />
        Mais
      </button>

      {aberto && (
        <div className="fixed inset-0 z-30 flex items-end" onClick={() => setAberto(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-surface rounded-t-2xl p-4 pb-6 z-10 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-campo-dark">Mais opções</span>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="p-1.5 rounded-lg hover:bg-hover text-ink/50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {itens.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setAberto(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-semibold transition-colors ${isActive ? 'bg-campo text-white' : 'bg-cream text-ink/70'
                    }`
                  }
                >
                  <Icon size={22} strokeWidth={2} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MenuMais
