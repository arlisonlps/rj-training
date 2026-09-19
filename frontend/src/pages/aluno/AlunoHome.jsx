import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { CalendarDays, Wallet, Scale, Copy, Check, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { PIX_CHAVE, PIX_NOME, PIX_BANCO } from '../../lib/pix'

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

function statusCalculado(m) {
  if (m.status === 'pago') return 'pago'
  const hoje = new Date().toISOString().split('T')[0]
  if (m.data_vencimento < hoje) return 'atrasado'
  const emCincoDias = new Date()
  emCincoDias.setDate(emCincoDias.getDate() + 5)
  const emCincoDiasStr = emCincoDias.toISOString().split('T')[0]
  if (m.data_vencimento <= emCincoDiasStr) return 'vencendo'
  return 'pendente'
}

function primeiroNome(nome) {
  return nome?.split(' ')[0] || ''
}

function AlunoHome() {
  const [aluno, setAluno] = useState(null)
  const [horarios, setHorarios] = useState([])
  const [mensalidade, setMensalidade] = useState(null)
  const [historicoPesoRecente, setHistoricoPesoRecente] = useState([])
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
  const statusMensalidade = mensalidade ? statusCalculado(mensalidade) : null

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-2">Olá, {aluno ? primeiroNome(aluno.nome) : '...'}!</h2>
      <p className="text-ink/70 mb-6">Bem-vindo ao seu painel do RJ Training.</p>

      <Link to="/horario">
        <div className="flex items-center gap-2 bg-campo-light text-campo-dark text-sm font-semibold rounded-xl px-4 py-3 mb-4 hover:brightness-95 active:scale-[0.99] transition-all cursor-pointer">
          <CalendarDays size={18} className="shrink-0" />
          {proximo
            ? proximo.hoje
              ? `Seu treino é hoje às ${proximo.horario}!`
              : `Seu próximo treino é ${NOMES_DIAS[proximo.dia_semana]} às ${proximo.horario}`
            : 'Você não tem um treino agendado, clique aqui para agendar!'}
        </div>
      </Link>

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

      {statusMensalidade === 'vencendo' && (
        <Link to="/mensalidade">
          <div className="flex items-center gap-2 bg-amber-light text-amber text-sm font-semibold rounded-xl px-4 py-3 mb-4 hover:brightness-95 active:scale-[0.99] transition-all cursor-pointer">
            <AlertTriangle size={18} className="shrink-0" />
            Você tem uma mensalidade próxima do vencimento, evite atrasos.
          </div>
        </Link>
      )}

      <div className="mb-4">
        <Link to="/mensalidade">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
            <div className="flex items-center gap-2 mb-3 text-campo">
              <Wallet size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Mensalidade do mês</span>
            </div>
            {mensalidade ? (
              <>
                <div className="text-lg font-bold mb-1">R$ {mensalidade.valor}</div>
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
      </div>

      <Link to="/peso">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
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
  )
}

export default AlunoHome
