import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { STATUS_CAMPEONATO } from '../../../lib/campeonatoStatus'
import { formatarDataHoraCurta } from '../../../lib/data'
import { carregarCampeonatoCompleto, buscarMeuAlunoId, proximoJogoDaEquipe } from '../../../lib/campeonatoDados'
import ClassificacaoCampeonato from '../../../components/campeonato/ClassificacaoCampeonato'
import RankingsCampeonato from '../../../components/campeonato/RankingsCampeonato'
import JogosLeitura from '../../../components/campeonato/JogosLeitura'

const ABAS = [
  { valor: 'jogos', rotulo: 'Jogos' },
  { valor: 'tabela', rotulo: 'Tabela' },
  { valor: 'chave', rotulo: 'Chave' },
  { valor: 'craques', rotulo: 'Craques' },
]

function AlunoCampeonatoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [dados, setDados] = useState(null)
  const [meuAlunoId, setMeuAlunoId] = useState(null)
  const [aba, setAba] = useState('jogos')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregar()
  }, [id])

  async function carregar() {
    const [completo, alunoId] = await Promise.all([carregarCampeonatoCompleto(id), buscarMeuAlunoId()])
    if (!completo) {
      navigate('/campeonatos', { replace: true })
      return
    }
    setDados(completo)
    setMeuAlunoId(alunoId)
    setCarregando(false)
  }

  if (carregando) return null

  const { campeonato, equipes, membros, grupos, jogos, eventos } = dados
  const status = STATUS_CAMPEONATO[campeonato.status] || STATUS_CAMPEONATO.montando
  const meuVinculo = membros.find((m) => m.jogador?.aluno_id && m.jogador.aluno_id === meuAlunoId)
  const meuTime = meuVinculo ? equipes.find((e) => e.id === meuVinculo.equipe_id) : null
  const proximoJogo = meuTime ? proximoJogoDaEquipe(jogos, meuTime.id) : null
  const adversarioId = proximoJogo ? (proximoJogo.equipe_a_id === meuTime.id ? proximoJogo.equipe_b_id : proximoJogo.equipe_a_id) : null
  const adversario = adversarioId ? equipes.find((e) => e.id === adversarioId) : null

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link to="/campeonatos" className="p-2 rounded-lg hover:bg-hover text-ink/60" aria-label="Voltar">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-campo-dark truncate">{campeonato.nome}</h2>
          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${status.classe}`}>{status.rotulo}</span>
        </div>
      </div>

      {meuTime && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1 text-campo">
            <Shield size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">Seu time</span>
          </div>
          <div className="flex items-center gap-2 text-base font-bold text-campo-dark">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: meuTime.cor || '#9CA3AF' }} />
            {meuTime.nome}
          </div>
          <div className="text-xs text-ink/60 mt-1.5">
            {proximoJogo
              ? `Próximo jogo: contra ${adversario?.nome ?? 'time a definir'} — ${proximoJogo.data_hora ? formatarDataHoraCurta(proximoJogo.data_hora) : 'data a definir'}${proximoJogo.local ? ` · ${proximoJogo.local}` : ''}`
              : 'Nenhum jogo marcado no momento.'}
          </div>
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

      {aba === 'jogos' && (
        <JogosLeitura tipo="grupos" jogos={jogos} equipes={equipes} grupos={grupos} destacarEquipeId={meuTime?.id} />
      )}
      {aba === 'tabela' && (
        <ClassificacaoCampeonato campeonato={campeonato} equipes={equipes} grupos={grupos} jogos={jogos} />
      )}
      {aba === 'chave' && (
        <JogosLeitura tipo="mata" jogos={jogos} equipes={equipes} grupos={grupos} destacarEquipeId={meuTime?.id} />
      )}
      {aba === 'craques' && (
        <RankingsCampeonato campeonato={campeonato} equipes={equipes} jogos={jogos} membros={membros} eventos={eventos} />
      )}
    </div>
  )
}

export default AlunoCampeonatoDetalhe
