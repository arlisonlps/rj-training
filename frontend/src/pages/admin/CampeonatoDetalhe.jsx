import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { STATUS_CAMPEONATO } from '../../lib/campeonatoStatus'
import Loading from '../../components/Loading'
import NovoTimeModal from './NovoTimeModal'
import GruposCampeonato from './GruposCampeonato'
import JogosCampeonato from './JogosCampeonato'
import MataMataCampeonato from './MataMataCampeonato'
import ClassificacaoCampeonato from '../../components/campeonato/ClassificacaoCampeonato'
import RankingsCampeonato from '../../components/campeonato/RankingsCampeonato'

const LIMITE_LISTAS = 500
const LIMITE_EVENTOS = 5000
const ABAS = [
  { valor: 'times', rotulo: 'Times' },
  { valor: 'grupos', rotulo: 'Grupos' },
  { valor: 'jogos', rotulo: 'Jogos' },
  { valor: 'classificacao', rotulo: 'Classificação' },
  { valor: 'mata_mata', rotulo: 'Mata-mata' },
  { valor: 'craques', rotulo: 'Craques' },
]

function CampeonatoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [campeonato, setCampeonato] = useState(null)
  const [equipes, setEquipes] = useState([])
  const [membros, setMembros] = useState([])
  const [grupos, setGrupos] = useState([])
  const [jogos, setJogos] = useState([])
  const [eventos, setEventos] = useState([])
  const [aba, setAba] = useState('times')
  const [carregando, setCarregando] = useState(true)
  const [janelaTime, setJanelaTime] = useState(false)
  const [erroCarga, setErroCarga] = useState('')

  useEffect(() => {
    carregar()
  }, [id])

  async function carregar() {
    const [campeonatoRes, equipesRes, membrosRes, gruposRes, jogosRes] = await Promise.all([
      supabase.from('campeonato').select('*').eq('id', id).single(),
      supabase.from('equipe').select('id, nome, cor, grupo_id, desempate_manual').eq('campeonato_id', id).order('nome'),
      supabase
        .from('equipe_jogador')
        .select('id, equipe_id, jogador(id, nome, apelido, aluno_id)')
        .eq('campeonato_id', id)
        .limit(LIMITE_LISTAS),
      supabase.from('grupo').select('id, nome').eq('campeonato_id', id).order('nome'),
      supabase.from('jogo').select('*').eq('campeonato_id', id).order('rodada').limit(LIMITE_LISTAS),
    ])

    if (campeonatoRes.error) {
      console.error('Erro ao carregar campeonato:', campeonatoRes.error)
      navigate('/campeonatos')
      return
    }

    const falha = [equipesRes, membrosRes, gruposRes, jogosRes].find((r) => r.error)
    if (falha) console.error('Erro ao carregar dados do campeonato:', falha.error)
    setErroCarga(falha ? falha.error.message : '')

    const jogosCarregados = jogosRes.data || []
    let eventosCarregados = []
    if (jogosCarregados.length > 0) {
      const { data } = await supabase
        .from('jogo_evento')
        .select('*')
        .in('jogo_id', jogosCarregados.map((j) => j.id))
        .limit(LIMITE_EVENTOS)
      eventosCarregados = data || []
    }

    setCampeonato(campeonatoRes.data)
    setEquipes(equipesRes.data || [])
    setMembros(membrosRes.data || [])
    setGrupos(gruposRes.data || [])
    setJogos(jogosCarregados)
    setEventos(eventosCarregados)
    setCarregando(false)
  }

  async function excluirCampeonato() {
    if (!window.confirm(`Excluir o campeonato "${campeonato.nome}"? Times, jogos e resultados serão apagados.`)) return
    const { error } = await supabase.from('campeonato').delete().eq('id', id)
    if (error) {
      alert('Erro ao excluir campeonato: ' + error.message)
      return
    }
    navigate('/campeonatos')
  }

  if (carregando) return <Loading />

  const status = STATUS_CAMPEONATO[campeonato.status] || STATUS_CAMPEONATO.montando
  const nomeDoGrupo = Object.fromEntries(grupos.map((g) => [g.id, g.nome]))

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/campeonatos" className="p-2 rounded-lg hover:bg-hover text-ink/60">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-campo-dark truncate">{campeonato.nome}</h2>
            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${status.classe}`}>{status.rotulo}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link to={`/campeonatos/${id}/editar`} className="p-2 rounded-lg text-ink/50 hover:bg-hover" aria-label="Editar campeonato">
            <Pencil size={17} />
          </Link>
          <button type="button" onClick={excluirCampeonato} className="p-2 rounded-lg text-brick hover:bg-brick-light" aria-label="Excluir campeonato">
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {erroCarga && (
        <div className="bg-brick-light text-brick text-sm rounded-xl px-4 py-3 mb-5">
          Não foi possível carregar todos os dados do campeonato: {erroCarga}
        </div>
      )}

      <div className="flex rounded-lg border border-border bg-surface p-1 mb-5 overflow-x-auto max-w-full w-fit">
        {ABAS.map(({ valor, rotulo }) => (
          <button
            key={valor}
            type="button"
            onClick={() => setAba(valor)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${aba === valor ? 'bg-campo text-white' : 'text-ink/60 hover:bg-hover'}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'times' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-campo-dark">
              Times <span className="text-ink/40 font-semibold">({equipes.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setJanelaTime(true)}
              className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors"
            >
              <Plus size={16} />
              Cadastrar Times
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {equipes.map((equipe) => {
              const total = membros.filter((m) => m.equipe_id === equipe.id && m.jogador).length
              return (
                <Link key={equipe.id} to={`/campeonatos/${id}/times/${equipe.id}`}>
                  <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full min-h-24">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: equipe.cor || '#9CA3AF' }} />
                      <span className="font-bold text-sm text-campo-dark truncate">{equipe.nome}</span>
                    </div>
                    <div className="text-xs text-ink/60">{total} {total === 1 ? 'jogador' : 'jogadores'}</div>
                    {equipe.grupo_id && <div className="text-[11px] text-ink/40 mt-0.5">{nomeDoGrupo[equipe.grupo_id]}</div>}
                  </div>
                </Link>
              )
            })}
          </div>
          {equipes.length === 0 && (
            <p className="text-sm text-ink/50 py-6 text-center">Nenhum time cadastrado ainda. Toque em Cadastrar Times.</p>
          )}
          {equipes.length > 0 && (
            <p className="text-xs text-ink/50 mt-4">Toque em um time para cadastrar os jogadores. Com os times prontos, siga para a aba Grupos.</p>
          )}
        </div>
      )}

      {aba === 'grupos' && (
        <GruposCampeonato campeonato={campeonato} equipes={equipes} grupos={grupos} jogos={jogos} aoMudar={carregar} />
      )}

      {aba === 'jogos' && (
        <JogosCampeonato
          campeonato={campeonato}
          equipes={equipes}
          grupos={grupos}
          jogos={jogos}
          membros={membros}
          eventos={eventos}
          aoMudar={carregar}
        />
      )}

      {aba === 'classificacao' && (
        <ClassificacaoCampeonato campeonato={campeonato} equipes={equipes} grupos={grupos} jogos={jogos} editavel aoMudar={carregar} />
      )}

      {aba === 'mata_mata' && (
        <MataMataCampeonato
          campeonato={campeonato}
          equipes={equipes}
          grupos={grupos}
          jogos={jogos}
          membros={membros}
          eventos={eventos}
          aoMudar={carregar}
        />
      )}

      {aba === 'craques' && (
        <RankingsCampeonato campeonato={campeonato} equipes={equipes} jogos={jogos} membros={membros} eventos={eventos} />
      )}

      {janelaTime && (
        <NovoTimeModal
          campeonatoId={id}
          aoFechar={() => setJanelaTime(false)}
          aoCriar={() => {
            setJanelaTime(false)
            carregar()
          }}
        />
      )}
    </div>
  )
}

export default CampeonatoDetalhe
