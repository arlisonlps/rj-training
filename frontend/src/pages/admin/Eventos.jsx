import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PartyPopper, Plus, MapPin, Users } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'

function formatarDataHora(dataHora) {
  const data = new Date(dataHora)
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  const hora = String(data.getHours()).padStart(2, '0')
  const minuto = String(data.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} às ${hora}h${minuto}`
}

function Eventos() {
  const [eventos, setEventos] = useState([])
  const [inscritosPorEvento, setInscritosPorEvento] = useState({})
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarEventos()
  }, [])

  async function buscarEventos() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('evento')
      .select('*')
      .order('data_hora', { ascending: true })

    if (error) {
      console.error('Erro ao buscar eventos:', error)
      setCarregando(false)
      return
    }

    const { data: inscricoes } = await supabase.from('evento_inscricao').select('evento_id')
    const contagem = {}
    for (const i of inscricoes || []) {
      contagem[i.evento_id] = (contagem[i.evento_id] || 0) + 1
    }
    setInscritosPorEvento(contagem)

    setEventos(data)
    setCarregando(false)
  }

  if (carregando) return <Loading />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-campo-dark">Eventos</h2>
        <Link to="/eventos/novo">
          <button className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors">
            <Plus size={16} />
            Criar Evento
          </button>
        </Link>
      </div>

      <ul className="space-y-3">
        {eventos.map((evento) => {
          const jaPassou = new Date(evento.data_hora) < new Date()
          const inscritos = inscritosPorEvento[evento.id] || 0
          return (
            <Link key={evento.id} to={`/eventos/${evento.id}`}>
              <li
                className={`bg-surface border border-border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer ${jaPassou || evento.cancelado ? 'opacity-60' : ''
                  }`}
              >
                <div className="flex items-center gap-2 mb-1 text-campo">
                  <PartyPopper size={16} />
                  <span className="font-bold text-sm">{evento.titulo}</span>
                  {evento.cancelado && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brick-light text-brick">CANCELADO</span>
                  )}
                  {!evento.cancelado && jaPassou && <span className="text-[10px] font-bold text-ink/40">(encerrado)</span>}
                </div>
                <div className="text-xs text-ink/50 mb-2">{formatarDataHora(evento.data_hora)}</div>
                <div className="flex items-center gap-4 text-xs text-ink/60">
                  {evento.local && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {evento.local}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {inscritos}{evento.vagas_limite ? `/${evento.vagas_limite}` : ''} inscritos
                  </span>
                </div>
              </li>
            </Link>
          )
        })}
        {eventos.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum evento criado ainda.</p>
        )}
      </ul>
    </div>
  )
}

export default Eventos
