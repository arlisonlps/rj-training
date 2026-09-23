import { useState, useEffect } from 'react'
import { PartyPopper, MapPin, Users, Check } from 'lucide-react'
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

function AlunoEventos() {
  const [meuAlunoId, setMeuAlunoId] = useState(null)
  const [eventos, setEventos] = useState([])
  const [inscritosPorEvento, setInscritosPorEvento] = useState({})
  const [meusEventoIds, setMeusEventoIds] = useState(new Set())
  const [inscrevendoId, setInscrevendoId] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data: userData } = await supabase.auth.getUser()
    const { data: perfil } = await supabase
      .from('perfil_usuario')
      .select('aluno_id')
      .eq('user_id', userData.user.id)
      .single()

    if (!perfil?.aluno_id) {
      setCarregando(false)
      return
    }
    setMeuAlunoId(perfil.aluno_id)

    const { data: eventosData, error } = await supabase
      .from('evento')
      .select('*')
      .gte('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true })

    if (error) {
      console.error('Erro ao buscar eventos:', error)
      setCarregando(false)
      return
    }
    setEventos(eventosData || [])

    const { data: inscricoes } = await supabase.from('evento_inscricao').select('evento_id, aluno_id')

    const contagem = {}
    const meus = new Set()
    for (const i of inscricoes || []) {
      contagem[i.evento_id] = (contagem[i.evento_id] || 0) + 1
      if (i.aluno_id === perfil.aluno_id) meus.add(i.evento_id)
    }
    setInscritosPorEvento(contagem)
    setMeusEventoIds(meus)

    setCarregando(false)
  }

  async function inscrever(eventoId) {
    setInscrevendoId(eventoId)
    setErro('')

    const { error } = await supabase.from('evento_inscricao').insert({
      evento_id: eventoId,
      aluno_id: meuAlunoId,
    })

    setInscrevendoId(null)

    if (error) {
      setErro('Erro ao se inscrever: ' + error.message)
      return
    }

    setInscritosPorEvento((atual) => ({ ...atual, [eventoId]: (atual[eventoId] || 0) + 1 }))
    setMeusEventoIds((atual) => new Set(atual).add(eventoId))
  }

  if (carregando) return <Loading />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Eventos</h2>

      {erro && <p className="text-brick text-sm mb-4">{erro}</p>}

      <ul className="space-y-3">
        {eventos.map((evento) => {
          const inscritos = inscritosPorEvento[evento.id] || 0
          const jaInscrito = meusEventoIds.has(evento.id)
          const lotado = evento.vagas_limite ? inscritos >= evento.vagas_limite : false

          return (
            <li
              key={evento.id}
              className={`bg-surface border border-border rounded-xl px-5 py-4 shadow-sm ${evento.cancelado ? 'opacity-60' : ''
                }`}
            >
              <div className="flex items-center gap-2 mb-1 text-campo">
                <PartyPopper size={16} />
                <span className="font-bold text-sm">{evento.titulo}</span>
                {evento.cancelado && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brick-light text-brick">CANCELADO</span>
                )}
              </div>
              <div className="text-xs text-ink/50 mb-2">{formatarDataHora(evento.data_hora)}</div>
              {evento.descricao && <p className="text-sm text-ink/70 mb-2">{evento.descricao}</p>}

              <div className="flex items-center gap-4 text-xs text-ink/60 mb-3">
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

              {evento.cancelado ? (
                <p className="text-xs text-ink/50 font-medium">Este evento foi cancelado.</p>
              ) : jaInscrito ? (
                <div className="flex items-center gap-1.5 text-sucesso text-xs font-semibold">
                  <Check size={14} />
                  Você está inscrito
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inscrever(evento.id)}
                  disabled={lotado || inscrevendoId === evento.id}
                  className="bg-campo text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-campo-dark active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lotado ? 'Lotado' : inscrevendoId === evento.id ? 'Inscrevendo...' : 'Quero participar'}
                </button>
              )}
            </li>
          )
        })}
        {eventos.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum evento marcado por enquanto.</p>
        )}
      </ul>
    </div>
  )
}

export default AlunoEventos
