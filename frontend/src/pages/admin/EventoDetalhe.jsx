import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Users, UserPlus, UserMinus, Pencil, Ban, Trash2 } from 'lucide-react'
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

function EventoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evento, setEvento] = useState(null)
  const [inscritos, setInscritos] = useState([])
  const [alunosDisponiveis, setAlunosDisponiveis] = useState([])
  const [alunoParaAdicionar, setAlunoParaAdicionar] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [removendoId, setRemovendoId] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    buscarTudo()
  }, [id])

  async function buscarTudo() {
    setCarregando(true)

    const { data: eventoData, error: erroEvento } = await supabase
      .from('evento')
      .select('*')
      .eq('id', id)
      .single()

    if (erroEvento) {
      console.error('Erro ao buscar evento:', erroEvento)
      setCarregando(false)
      return
    }
    setEvento(eventoData)

    await buscarInscritos()
    setCarregando(false)
  }

  async function buscarInscritos() {
    const { data: inscricoes, error } = await supabase
      .from('evento_inscricao')
      .select('id, aluno_id, aluno(nome)')
      .eq('evento_id', id)

    if (error) {
      console.error('Erro ao buscar inscritos:', error)
      return
    }
    setInscritos(inscricoes || [])

    const idsInscritos = new Set((inscricoes || []).map((i) => i.aluno_id))

    const { data: todosAlunos } = await supabase
      .from('aluno')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')

    setAlunosDisponiveis((todosAlunos || []).filter((a) => !idsInscritos.has(a.id)))
  }

  async function adicionarAluno() {
    if (!alunoParaAdicionar) return

    setAdicionando(true)
    setErro('')

    const { error } = await supabase.from('evento_inscricao').insert({
      evento_id: id,
      aluno_id: alunoParaAdicionar,
    })

    setAdicionando(false)

    if (error) {
      setErro('Erro ao adicionar aluno: ' + error.message)
      return
    }

    setAlunoParaAdicionar('')
    buscarInscritos()
  }

  async function removerAluno(inscricaoId) {
    setRemovendoId(inscricaoId)

    const { error } = await supabase.from('evento_inscricao').delete().eq('id', inscricaoId)

    setRemovendoId(null)

    if (error) {
      alert('Erro ao remover aluno: ' + error.message)
      return
    }

    buscarInscritos()
  }

  async function alternarCancelamento() {
    const mensagem = evento.cancelado
      ? 'Reativar este evento?'
      : 'Cancelar este evento? Ele continuará visível, mas marcado como cancelado.'
    if (!window.confirm(mensagem)) return

    setAlterandoStatus(true)
    const { error } = await supabase
      .from('evento')
      .update({ cancelado: !evento.cancelado })
      .eq('id', id)

    setAlterandoStatus(false)

    if (error) {
      alert('Erro ao atualizar evento: ' + error.message)
      return
    }

    setEvento({ ...evento, cancelado: !evento.cancelado })
  }

  async function excluirEvento() {
    if (!window.confirm(`Excluir o evento "${evento.titulo}" e todas as inscrições dele? Essa ação não pode ser desfeita.`)) return

    setExcluindo(true)
    const { error } = await supabase.from('evento').delete().eq('id', id)
    setExcluindo(false)

    if (error) {
      alert('Erro ao excluir evento: ' + error.message)
      return
    }

    navigate('/eventos')
  }

  if (carregando) return <Loading />
  if (!evento) return <p className="text-sm text-ink/50 py-6 text-center">Evento não encontrado.</p>

  const lotado = evento.vagas_limite ? inscritos.length >= evento.vagas_limite : false

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/eventos" className="p-2 rounded-lg hover:bg-hover text-ink/60">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-campo-dark">{evento.titulo}</h2>
            {evento.cancelado && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brick-light text-brick">CANCELADO</span>
            )}
          </div>
          <p className="text-sm text-ink/50">{formatarDataHora(evento.data_hora)}</p>
        </div>
        <Link to={`/eventos/${id}/editar`} className="p-2 rounded-lg hover:bg-hover text-ink/60" title="Editar evento">
          <Pencil size={18} />
        </Link>
        <button
          type="button"
          onClick={alternarCancelamento}
          disabled={alterandoStatus}
          className="p-2 rounded-lg hover:bg-hover text-ink/60 disabled:opacity-50"
          title={evento.cancelado ? 'Reativar evento' : 'Cancelar evento'}
        >
          <Ban size={18} />
        </button>
        <button
          type="button"
          onClick={excluirEvento}
          disabled={excluindo}
          className="p-2 rounded-lg hover:bg-brick-light text-ink/60 hover:text-brick disabled:opacity-50"
          title="Excluir evento"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 mb-4">
        {evento.descricao && <p className="text-sm text-ink/70 mb-3">{evento.descricao}</p>}
        <div className="flex items-center gap-4 text-xs text-ink/60">
          {evento.local && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {evento.local}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users size={12} />
            {inscritos.length}{evento.vagas_limite ? `/${evento.vagas_limite}` : ''} inscritos
            {lotado && <span className="ml-1 font-bold text-brick">(lotado)</span>}
          </span>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
        <h3 className="text-sm font-bold text-campo-dark mb-4">Participantes</h3>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select
            value={alunoParaAdicionar}
            onChange={(e) => setAlunoParaAdicionar(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border-strong text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
          >
            <option value="">Adicionar aluno ao evento...</option>
            {alunosDisponiveis.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={adicionarAluno}
            disabled={!alunoParaAdicionar || adicionando}
            className="shrink-0 flex items-center justify-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus size={14} />
            {adicionando ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        {erro && <p className="text-brick text-xs mb-3">{erro}</p>}

        <ul className="space-y-2">
          {inscritos.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-2 bg-cream rounded-lg px-3 py-2"
            >
              <span className="text-sm font-medium">{i.aluno?.nome}</span>
              <button
                type="button"
                disabled={removendoId === i.id}
                onClick={() => removerAluno(i.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-hover text-ink/60 hover:bg-brick-light hover:text-brick transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <UserMinus size={14} />
                {removendoId === i.id ? 'Removendo...' : 'Remover'}
              </button>
            </li>
          ))}
          {inscritos.length === 0 && (
            <p className="text-sm text-ink/50 py-4 text-center">Nenhum aluno inscrito ainda.</p>
          )}
        </ul>
      </div>
    </div>
  )
}

export default EventoDetalhe
