import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'

const dias = [
  { label: 'Terça', valor: 'terca' },
  { label: 'Quarta', valor: 'quarta' },
  { label: 'Quinta', valor: 'quinta' },
]

function Treinos() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Dias de treino</h2>
      <div className="flex gap-4 flex-wrap">
        {dias.map((dia) => (
          <Link key={dia.valor} to={`/treinos/${dia.valor}`}>
            <div className="bg-white border border-black/5 border-t-4 border-t-campo rounded-xl px-8 py-6 shadow-sm flex flex-col items-center gap-2 min-w-[140px] hover:shadow-md transition-shadow cursor-pointer">
              <CalendarDays size={20} className="text-campo" />
              <span className="font-bold text-campo-dark">{dia.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Treinos