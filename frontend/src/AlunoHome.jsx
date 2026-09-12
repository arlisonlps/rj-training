import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Wallet, Scale } from 'lucide-react'
import { supabase } from './supabaseClient'

const NOMES_DIAS = { terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta' }
const ORDEM_DIAS = { terca: 1, quarta: 2, quinta: 3 }

function selo(status) {
  if (status === 'pago') return 'bg-campo-light text-campo-dark'
  if (status === 'atrasado') return 'bg-brick-light text-brick'
  return 'bg-amber-light text-amber'
}

function statusCalculado(m) {
  if (m.status === 'pago') return 'pago'
  const hoje = new Date().toISOString().split('T')[0]
  return m.data_vencimento < hoje ? 'atrasado' : 'pendente'
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

  if (carregando) return null

  const horariosOrdenados = [...horarios].sort(
    (a, b) => ORDEM_DIAS[a.dia_semana] - ORDEM_DIAS[b.dia_semana]
  )

  const [ultimoPeso, pesoAnterior] = historicoPesoRecente
  const variacaoPeso = ultimoPeso && pesoAnterior ? ultimoPeso.peso - pesoAnterior.peso : null

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-2">Olá, {aluno ? primeiroNome(aluno.nome) : '...'}!</h2>
      <p className="text-ink/70 mb-6">Bem-vindo ao seu painel do RJ Training.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Link to="/horario">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-2 mb-3 text-campo">
              <CalendarDays size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Meus treinos da semana</span>
            </div>
            {horariosOrdenados.length === 0 ? (
              <p className="text-sm text-ink/50">Nenhum horário marcado ainda.</p>
            ) : (
              <ul className="space-y-1">
                {horariosOrdenados.map((h) => (
                  <li key={h.id} className="text-sm font-medium">
                    {NOMES_DIAS[h.dia_semana]} — {h.horario}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Link>

        <Link to="/mensalidade">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-2 mb-3 text-campo">
              <Wallet size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Mensalidade do mês</span>
            </div>
            {mensalidade ? (
              <>
                <div className="text-lg font-bold mb-1">R$ {mensalidade.valor}</div>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${selo(statusCalculado(mensalidade))}`}>
                  {statusCalculado(mensalidade).toUpperCase()}
                </span>
              </>
            ) : (
              <p className="text-sm text-ink/50">Nenhuma mensalidade gerada ainda.</p>
            )}
          </div>
        </Link>
      </div>

      <Link to="/peso">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
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
