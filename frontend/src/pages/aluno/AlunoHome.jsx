import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { CalendarDays, Wallet, Scale, Copy, Check, AlertTriangle, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { PIX_CHAVE, PIX_NOME, PIX_BANCO } from '../../lib/pix'
import { valorComJuro, statusDaMensalidade } from '../../domain/mensalidade'
import { formatarDataHoraCurta } from '../../lib/data'
import { buscarMeuCampeonato } from '../../lib/campeonatoDados'

const NOMES_DIAS = { terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta' }
const ORDEM_DIAS = { terca: 1, quarta: 2, quinta: 3 }

function inicioDaSemana() {
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const diferenca = diaSemana === 0 ? -6 : 1 - diaSemana
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() + diferenca)
  segunda.setHours(0, 0, 0, 0)
  return segunda
}

function dataDoTreino(diaSemana, horario) {
  const base = inicioDaSemana()
  const data = new Date(base)
  data.setDate(base.getDate() + ORDEM_DIAS[diaSemana])
  const hora = Number(horario.slice(0, 2))
  data.setHours(hora, 0, 0, 0)
  return data
}

function proximoTreino(horarios) {
  const agora = Date.now()
  let proximo = null
  for (const h of horarios) {
    const data = dataDoTreino(h.dia_semana, h.horario)
    const diffMs = data.getTime() - agora
    if (diffMs > 0 && (!proximo || diffMs < proximo.diffMs)) {
      proximo = { ...h, diffMs, hoje: data.toDateString() === new Date().toDateString() }
    }
  }
  return proximo
}

function selo(status) {
  if (status === 'pago') return 'bg-sucesso-light text-sucesso'
  if (status === 'atrasado') return 'bg-brick-light text-brick'
  return 'bg-amber-light text-amber'
}

function primeiroNome(nome) {
  return nome?.split(' ')[0] || ''
}

function AlunoHome() {
  const [aluno, setAluno] = useState(null)
  const [horarios, setHorarios] = useState([])
  const [mensalidade, setMensalidade] = useState(null)
  const [historicoPesoRecente, setHistoricoPesoRecente] = useState([])
  const [meuCampeonato, setMeuCampeonato] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [pixCopiado, setPixCopiado] = useState(false)
  const [pixBotaoRef] = useAutoAnimate()

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

    if (perfil?.aluno_id) {
      const { data: alunoData } = await supabase
        .from('aluno')
        .select('*')
        .eq('id', perfil.aluno_id)
        .single()
      setAluno(alunoData)

      const { data: horariosData } = await supabase.rpc('meus_horarios')
      setHorarios(horariosData || [])

      const hoje = new Date()
      const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
      const { data: mensalidadeData } = await supabase
        .from('mensalidade')
        .select('*')
        .eq('aluno_id', perfil.aluno_id)
        .eq('mes_referencia', mesReferencia)
        .maybeSingle()
      setMensalidade(mensalidadeData)

      const { data: pesoData } = await supabase
        .from('peso_historico')
        .select('*')
        .eq('aluno_id', perfil.aluno_id)
        .order('registrado_em', { ascending: false })
        .limit(2)
      setHistoricoPesoRecente(pesoData || [])

      setMeuCampeonato(await buscarMeuCampeonato(perfil.aluno_id).catch(() => null))
    }

    setCarregando(false)
  }

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(PIX_CHAVE)
      setPixCopiado(true)
      setTimeout(() => setPixCopiado(false), 2000)
    } catch {
      alert(`Chave PIX: ${PIX_CHAVE}`)
    }
  }

  if (carregando) return null

  const [ultimoPeso, pesoAnterior] = historicoPesoRecente
  const variacaoPeso = ultimoPeso && pesoAnterior ? ultimoPeso.peso - pesoAnterior.peso : null
  const proximo = proximoTreino(horarios)
  const statusMensalidade = mensalidade ? statusDaMensalidade(mensalidade) : null

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-2">Olá, {aluno ? primeiroNome(aluno.nome) : '...'}!</h2>
      <p className="text-ink/70 mb-6">Bem-vindo ao seu painel do RJ Training.</p>

      {statusMensalidade === 'atrasado' && (
        <Link to="/mensalidade">
          <div className="flex items-center gap-3 bg-brick text-white rounded-2xl px-5 py-5 mb-4 shadow-sm hover:brightness-95 active:scale-[0.99] transition-all cursor-pointer">
            <AlertTriangle size={28} className="shrink-0" />
            <div>
              <div className="text-base font-bold">Sua mensalidade está atrasada!</div>
              <div className="text-sm opacity-90">Toque aqui para regularizar o pagamento.</div>
            </div>
          </div>
        </Link>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <Link to="/horario">
          <div className="flex items-center gap-1.5 bg-campo-light text-campo-dark text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 hover:brightness-95 active:scale-[0.97] transition-all cursor-pointer">
            <CalendarDays size={14} className="shrink-0" />
            {proximo
              ? proximo.hoje
                ? `Treino hoje às ${proximo.horario}`
                : `Próximo treino: ${NOMES_DIAS[proximo.dia_semana]} ${proximo.horario}`
              : 'Sem treino agendado, toque para agendar'}
          </div>
        </Link>

        {statusMensalidade === 'vencendo' && (
          <Link to="/mensalidade">
            <div className="flex items-center gap-1.5 bg-amber-light text-amber text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 hover:brightness-95 active:scale-[0.97] transition-all cursor-pointer">
              <AlertTriangle size={14} className="shrink-0" />
              Mensalidade vence em breve
            </div>
          </Link>
        )}
      </div>

      {meuCampeonato && (
        <Link to={`/campeonatos/${meuCampeonato.campeonato.id}`}>
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer mb-4">
            <div className="flex items-center gap-2 mb-2 text-campo">
              <Trophy size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">{meuCampeonato.campeonato.nome}</span>
            </div>
            <div className="flex items-center gap-2 text-base font-bold text-campo-dark">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: meuCampeonato.equipe.cor || '#9CA3AF' }} />
              {meuCampeonato.equipe.nome}
            </div>
            <div className="text-xs text-ink/60 mt-1.5">
              {meuCampeonato.proximoJogo
                ? `Próximo jogo: contra ${meuCampeonato.adversario?.nome ?? 'time a definir'} — ${meuCampeonato.proximoJogo.data_hora ? formatarDataHoraCurta(meuCampeonato.proximoJogo.data_hora) : 'data a definir'}`
                : 'Nenhum jogo marcado no momento.'}
            </div>
          </div>
        </Link>
      )}

      <div className={`grid grid-cols-1 gap-4 mb-4 ${statusMensalidade === 'atrasado' ? '' : 'sm:grid-cols-2'}`}>
        {statusMensalidade !== 'atrasado' && (
          <Link to="/mensalidade">
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full">
              <div className="flex items-center gap-2 mb-3 text-campo">
                <Wallet size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">Mensalidade do mês</span>
              </div>
              {mensalidade ? (
                <>
                  <div className="text-lg font-bold mb-1">R$ {valorComJuro(mensalidade, statusMensalidade)}</div>
                  {statusMensalidade === 'atrasado' && (
                    <p className="text-[11px] text-brick font-medium mb-1">Inclui juro por atraso</p>
                  )}
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded transition-all duration-300 ${selo(statusMensalidade)}`}>
                    {statusMensalidade.toUpperCase()}
                  </span>
                  {statusMensalidade !== 'pago' && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          copiarPix()
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-campo-dark active:scale-95 transition-all"
                      >
                        <span ref={pixBotaoRef} className="flex items-center gap-1.5">
                          {pixCopiado ? <Check size={14} key="check" /> : <Copy size={14} key="copy" />}
                          <span key={pixCopiado ? 'copiado' : 'copiar'}>
                            {pixCopiado ? 'Chave copiada!' : `Copiar PIX (${PIX_BANCO})`}
                          </span>
                        </span>
                      </button>
                      <p className="text-[10px] text-ink/40 mt-1.5">Recebedor: {PIX_NOME}</p>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink/50">Nenhuma mensalidade gerada ainda.</p>
              )}
            </div>
          </Link>
        )}

        <Link to="/peso">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer h-full">
            <div className="flex items-center gap-2 mb-2 text-campo">
              <Scale size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Meu peso</span>
            </div>
            {ultimoPeso ? (
              <div>
                <div className="text-2xl font-bold text-campo-dark">{ultimoPeso.peso} kg</div>
                {variacaoPeso !== null && (
                  <div className={`text-xs font-semibold mt-1 ${variacaoPeso < 0 ? 'text-campo-dark' : variacaoPeso > 0 ? 'text-brick' : 'text-ink/50'}`}>
                    {variacaoPeso === 0
                      ? 'Sem variação desde o último registro'
                      : `${variacaoPeso > 0 ? '+' : ''}${variacaoPeso.toFixed(1)} kg desde o último registro`}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink/50">Nenhum registro ainda. Fale com o professor para registrar seu peso.</p>
            )}
          </div>
        </Link>
      </div>
    </div>
  )
}

export default AlunoHome
