import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, Plus, Share2, Copy, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { STATUS_CAMPEONATO } from '../../../lib/campeonatoStatus'
import Loading from '../../../components/Loading'
import Janela from '../../../components/Janela'
import NovoTimeModal from './NovoTimeModal'
import GruposCampeonato from './GruposCampeonato'
import JogosCampeonato from './JogosCampeonato'
import MataMataCampeonato from './MataMataCampeonato'
import ClassificacaoCampeonato from '../../../components/campeonato/ClassificacaoCampeonato'
import RankingsCampeonato from '../../../components/campeonato/RankingsCampeonato'

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
  const [token, setToken] = useState(null)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [alterandoLink, setAlterandoLink] = useState(false)
  const [janelaLink, setJanelaLink] = useState(false)

  useEffect(() => {
    carregar()
  }, [id])

  async function carregar() {
    const [campeonatoRes, equipesRes, membrosRes, gruposRes, jogosRes, linkRes] = await Promise.all([
      supabase.from('campeonato').select('*').eq('id', id).single(),
      supabase.from('equipe').select('id, nome, cor, grupo_id, desempate_manual').eq('campeonato_id', id).order('nome'),
      supabase
        .from('equipe_jogador')
        .select('id, equipe_id, jogador(id, nome, apelido, aluno_id)')
        .eq('campeonato_id', id)
        .limit(LIMITE_LISTAS),
      supabase.from('grupo').select('id, nome').eq('campeonato_id', id).order('nome'),
      supabase.from('jogo').select('*').eq('campeonato_id', id).order('rodada').limit(LIMITE_LISTAS),
      supabase.from('campeonato_link').select('token').eq('campeonato_id', id).maybeSingle(),
    ])

    if (campeonatoRes.error) {
      console.error('Erro ao carregar campeonato:', campeonatoRes.error)
      navigate('/campeonatos')
      return
    }

    const falha = [equipesRes, membrosRes, gruposRes, jogosRes, linkRes].find((r) => r.error)
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
    setToken(linkRes.data?.token ?? null)
    setEquipes(equipesRes.data || [])
    setMembros(membrosRes.data || [])
    setGrupos(gruposRes.data || [])
    setJogos(jogosCarregados)
    setEventos(eventosCarregados)
    setCarregando(false)
  }

  async function ativarLink() {
    setAlterandoLink(true)
    const novoToken = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
    const { error } = await supabase.from('campeonato_link').insert({ campeonato_id: id, token: novoToken })
    setAlterandoLink(false)
    if (error) {
      alert('Erro ao ativar o link: ' + error.message)
      return
    }
    setToken(novoToken)
  }

  async function desativarLink() {
    if (!window.confirm('Desativar o link público? Quem já recebeu o link deixa de conseguir abrir.')) return
    setAlterandoLink(true)
    const { error } = await supabase.from('campeonato_link').delete().eq('campeonato_id', id)
    setAlterandoLink(false)
    if (error) {
      alert('Erro ao desativar o link: ' + error.message)
      return
    }
    setToken(null)
  }

  async function compartilharLink() {
    try {
      await navigator.share({
        title: campeonato.nome,
        text: `Acompanhe o campeonato ${campeonato.nome}`,
        url: `${window.location.origin}/campeonato/${token}`,
      })
    } catch {
      // o professor fechou a janela de compartilhar
    }
  }

  async function copiarLink() {
    const endereco = `${window.location.origin}/campeonato/${token}`
    try {
      await navigator.clipboard.writeText(endereco)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    } catch {
      alert(`Link: ${endereco}`)
    }
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
            <h2 className="text-2xl font-bold text-campo-dark line-clamp-2 break-words">{campeonato.nome}</h2>
            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${status.classe}`}>{status.rotulo}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => setJanelaLink(true)} className="relative p-2 rounded-lg text-ink/50 hover:bg-hover" aria-label="Compartilhar campeonato">
            <Share2 size={17} />
            {token && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sucesso" />}
          </button>
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

      {janelaLink && (
        <Janela titulo="Compartilhar campeonato" aoFechar={() => setJanelaLink(false)}>
          {token ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink/70">
                Este link está ativo. Qualquer pessoa que receber acompanha o campeonato (jogos, tabela, chave e estatísticas)
                sem precisar de cadastro. Para parar de compartilhar, desative o link.
              </p>
              <input
                readOnly
                value={`${window.location.origin}/campeonato/${token}`}
                onFocus={(e) => e.target.select()}
                className="px-3 py-2 rounded-lg border border-border-strong bg-cream text-xs text-ink/70 focus:outline-none"
                aria-label="Endereço do link público"
              />
              {typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={compartilharLink}
                  className="w-full flex items-center justify-center gap-2 bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark active:scale-[0.98] transition-all"
                >
                  <Share2 size={16} />
                  Compartilhar
                </button>
              )}
              <button
                type="button"
                onClick={copiarLink}
                className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg py-2.5 active:scale-[0.98] transition-all ${typeof navigator.share === 'function' ? 'bg-campo-light text-campo-dark hover:brightness-95' : 'bg-campo text-white hover:bg-campo-dark'}`}
              >
                {linkCopiado ? <Check size={16} /> : <Copy size={16} />}
                {linkCopiado ? 'Link copiado!' : 'Copiar link'}
              </button>
              <button
                type="button"
                onClick={desativarLink}
                disabled={alterandoLink}
                className="text-xs font-semibold text-brick hover:underline disabled:opacity-60"
              >
                Desativar link
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink/70">
                Crie um link para quem não tem cadastro acompanhar o campeonato: jogos, tabela, chave e estatísticas.
                Quem abrir não precisa fazer login e só consegue visualizar. Você pode desativar quando quiser.
              </p>
              <button
                type="button"
                onClick={ativarLink}
                disabled={alterandoLink}
                className="w-full flex items-center justify-center gap-2 bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <Share2 size={16} />
                {alterandoLink ? 'Criando link...' : 'Criar link para compartilhar'}
              </button>
            </div>
          )}
        </Janela>
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
