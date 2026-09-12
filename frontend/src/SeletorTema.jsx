import { Sun, Moon, Monitor } from 'lucide-react'
import { useTema } from './tema'

const OPCOES = [
  { valor: 'claro', label: 'Claro', Icon: Sun },
  { valor: 'escuro', label: 'Escuro', Icon: Moon },
  { valor: 'sistema', label: 'Sistema', Icon: Monitor },
]

function SeletorTema({ className = '' }) {
  const [tema, setTema] = useTema()

  return (
    <div className={`inline-flex rounded-lg border border-border bg-surface p-1 ${className}`}>
      {OPCOES.map(({ valor, label, Icon }) => (
        <button
          key={valor}
          type="button"
          onClick={() => setTema(valor)}
          title={label}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            tema === valor ? 'bg-campo text-white' : 'text-ink/60 hover:bg-hover'
          }`}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

export default SeletorTema
