import { Sun, Moon, Monitor } from 'lucide-react'
import { useTema } from '../lib/tema'

const OPCOES = [
  { valor: 'claro', label: 'Claro', Icon: Sun },
  { valor: 'escuro', label: 'Escuro', Icon: Moon },
  { valor: 'sistema', label: 'Sistema', Icon: Monitor },
]

function SeletorTema({ className = '' }) {
  const [tema, setTema] = useTema()

  const indiceAtual = OPCOES.findIndex((o) => o.valor === tema)
  const atual = OPCOES[indiceAtual] || OPCOES[2]
  const proximo = OPCOES[(indiceAtual + 1) % OPCOES.length]

  return (
    <button
      type="button"
      onClick={() => setTema(proximo.valor)}
      title={`Tema: ${atual.label} (toque para mudar para ${proximo.label})`}
      className={`p-2 rounded-lg transition-colors ${className}`}
    >
      <atual.Icon size={18} strokeWidth={2} />
    </button>
  )
}

export default SeletorTema
