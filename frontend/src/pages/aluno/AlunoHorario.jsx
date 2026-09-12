import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const dias = [
  { label: 'Terça', valor: 'terca' },
  { label: 'Quarta', valor: 'quarta' },
  { label: 'Quinta', valor: 'quinta' },
]

const NOMES_DIAS = { terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta' }
const horarios = ['06h', '07h', '17h', '18h']
const OFFSET_DIA = { terca: 1, quarta: 2, quinta: 3 }

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
  data.setDate(base.getDate() + OFFSET_DIA[diaSemana])
  const hora = Number(horario.slice(0, 2))
  data.setHours(hora, 0, 0, 0)
  return data
}

function statusAgendamento(h) {
  const dataTreino = dataDoTreino(h.dia_semana, h.horario)
  const diffMs = dataTreino.getTime() - Date.now()
  if (diffMs <= 0) return 'encerrado'
  if (diffMs < 60 * 60 * 1000) return 'travado'
  return 'aberto'
}

function proximaSegundaFeira(referencia) {
  const diaSemana = referencia.getDay()
  const diasAteSegunda = (8 - diaSemana) % 7 || 7
  const proxima = new Date(referencia)
  proxima.setDate(referencia.getDate() + diasAteSegunda)
  proxima.setHours(0, 0, 0, 0)
  return proxima
}

function formatarContagem(ms) {
  if (ms <= 0) return '0s'
  const totalSegundos = Math.floor(ms / 1000)
  const dias = Math.floor(totalSegundos / 86400)
  const horas = Math.floor((totalSegundos % 86400) / 3600)
  const minutos = Math.floor((totalSegundos % 3600) / 60)
  const segundos = totalSegundos % 60

  const partes = []
  if (dias > 0) partes.push(`${dias}d`)
  if (dias > 0 || horas > 0) partes.push(`${horas}h`)
  if (dias > 0 || horas > 0 || minutos > 0) partes.push(`${minutos}m`)
  partes.push(`${segundos}s`)
  return partes.join(' ')
}

function AlunoHorario() {
  const [meusHorarios, setMeusHorarios] = useState(null)
  const [consultando, setConsultando] = useState(true)
  const [erroConsulta, setErroConsulta] = useState('')
  const [cancelandoId, setCancelandoId] = useState(null)
  const [mensagem, setMensagem] = useState('')

  const [horariosEscolhidos, setHorariosEscolhidos] = useState({ terca: '', quarta: '', quinta: '' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const [horarioRemarcar, setHorarioRemarcar] = useState({})

  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    consultarMeusHorarios()
  }, [])

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const podeEscolherPrimeiraVez = agora.getDay() === 1
  const msAteAbrirEscolha = proximaSegundaFeira(agora).getTime() - agora.getTime()

  async function consultarMeusHorarios() {
    setConsultando(true)
    setErroConsulta('')

    const { data, error } = await supabase.rpc('meus_horarios')

    if (error) {
      setErroConsulta(error.message)
      setMeusHorarios(null)
      setConsultando(false)
      return
    }

    setMeusHorarios(data)
    setConsultando(false)
  }

  async function cancelar(id) {
    setCancelandoId(id)
    setErroConsulta('')

    const { data, error } = await supabase.rpc('cancelar_meu_horario', { p_horario_id: id })

    setCancelandoId(null)

    if (error) {
      setErroConsulta(error.message)
      return
    }
    if (data && data.startsWith('ERRO')) {
      setErroConsulta(data.replace('ERRO: ', ''))
      return
    }

    setMensagem(data)
    consultarMeusHorarios()
  }

  async function confirmarNovoHorario(dia) {
    const horario = horarioRemarcar[dia]
    if (!horario) return

    setErroConsulta('')
    const { data: resultado, error } = await supabase.rpc('escolher_meu_horario', {
      p_dia: dia,
      p_horario: horario,
    })

    if (error) {
      setErroConsulta(error.message)
      return
    }
    if (resultado && resultado.startsWith('ERRO')) {
      setErroConsulta(resultado.replace('ERRO: ', ''))
      return
    }

    setMensagem('Novo horário marcado com sucesso!')
    setHorarioRemarcar({ ...horarioRemarcar, [dia]: '' })
    consultarMeusHorarios()
  }

  async function enviarPrimeiraEscolha(e) {
    e.preventDefault()
    if (!podeEscolherPrimeiraVez) return

    setMensagem('')
    setErro('')

    const diasSemHorario = Object.entries(horariosEscolhidos).filter(([, h]) => !h)
    if (diasSemHorario.length > 0) {
      setErro('Escolha um horário para os 3 dias (Terça, Quarta e Quinta) antes de confirmar.')
      return
    }

    setEnviando(true)

    for (const [dia, horario] of Object.entries(horariosEscolhidos)) {
      const { data: resultado, error } = await supabase.rpc('escolher_meu_horario', {
        p_dia: dia,
        p_horario: horario,
      })

      if (error) {
        setErro(error.message)
        setEnviando(false)
        return
      }
      if (resultado && resultado.startsWith('ERRO')) {
        setErro(resultado.replace('ERRO: ', ''))
        setEnviando(false)
        return
      }
    }

    setMensagem('Horários dos 3 dias registrados com sucesso!')
    setEnviando(false)
    consultarMeusHorarios()
  }

  if (consultando) return null

  const diasComHorario = new Set((meusHorarios || []).map((h) => h.dia_semana))
  const aindaNaoEscolheuNada = diasComHorario.size === 0
  const diasFaltando = dias.map((d) => d.valor).filter((v) => !diasComHorario.has(v))

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-4">Meu horário de treino</h2>

      <div className="bg-amber-light text-amber text-sm rounded-xl px-4 py-3 mb-6">
        Você só poderá agendar seu treino referente à semana atual, toda virada de domingo para segunda! Caso
        agende seu treino e aconteça algum imprevisto, você tem até 1 hora antes do treino agendado para cancelar
        e marcar outro horário posterior, em até 1 hora antes desse horário iniciar.
      </div>

      {meusHorarios && meusHorarios.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 mb-4">
          <h3 className="text-sm font-bold text-campo-dark mb-4">Meus horários desta semana</h3>

          {mensagem && <p className="text-campo-dark text-sm mb-3">{mensagem}</p>}
          {erroConsulta && <p className="text-brick text-sm mb-3">{erroConsulta}</p>}

          <ul className="flex flex-col gap-2">
            {meusHorarios.map((h) => {
              const status = statusAgendamento(h)
              return (
                <li
                  key={h.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${status === 'encerrado' ? 'bg-cream opacity-50' : 'bg-cream'
                    }`}
                >
                  <span className="text-sm font-medium">
                    {NOMES_DIAS[h.dia_semana]} — {h.horario}
                    {status === 'encerrado' && (
                      <span className="ml-2 text-[10px] font-bold text-ink/40">(encerrado)</span>
                    )}
                  </span>
                  {status === 'aberto' && (
                    <button
                      type="button"
                      onClick={() => cancelar(h.id)}
                      disabled={cancelandoId === h.id}
                      className="text-xs font-semibold text-brick hover:underline disabled:opacity-60"
                    >
                      {cancelandoId === h.id ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  )}
                  {status === 'travado' && (
                    <span className="text-[11px] text-ink/40 font-medium">Menos de 1h, não dá mais</span>
                  )}
                  {status === 'encerrado' && (
                    <span className="text-[11px] text-ink/40 font-medium">Horário encerrado</span>
                  )}
                </li>
              )
            })}
          </ul>

          {diasFaltando.length > 0 && (
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
              {diasFaltando.map((dia) => (
                <div key={dia} className="flex items-center gap-2">
                  <span className="w-16 text-sm font-semibold text-ink/70 shrink-0">{NOMES_DIAS[dia]}</span>
                  <select
                    value={horarioRemarcar[dia] || ''}
                    onChange={(e) => setHorarioRemarcar({ ...horarioRemarcar, [dia]: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-border-strong text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
                  >
                    <option value="">Marcar novo horário</option>
                    {horarios.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => confirmarNovoHorario(dia)}
                    className="bg-campo text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-campo-dark transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {aindaNaoEscolheuNada && (
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
          <h3 className="text-sm font-bold text-campo-dark mb-4">Escolher horário da semana</h3>

          {!podeEscolherPrimeiraVez && (
            <p className="text-sm text-ink/60 mb-4">
              Aguarde <span className="font-bold text-campo-dark">{formatarContagem(msAteAbrirEscolha)}</span> para agendar seu treino!
            </p>
          )}

          <form onSubmit={enviarPrimeiraEscolha} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {dias.map((d) => (
                <label key={d.valor} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-semibold text-ink/70 shrink-0">{d.label}</span>
                  <select
                    value={horariosEscolhidos[d.valor]}
                    onChange={(e) =>
                      setHorariosEscolhidos({ ...horariosEscolhidos, [d.valor]: e.target.value })
                    }
                    disabled={!podeEscolherPrimeiraVez}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecione o horário</option>
                    {horarios.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={!podeEscolherPrimeiraVez || enviando}
              className="bg-campo text-white font-semibold text-sm rounded-lg py-2.5 hover:bg-campo-dark transition-colors disabled:opacity-60"
            >
              {enviando ? 'Enviando...' : 'Confirmar os 3 dias'}
            </button>

            {erro && <p className="text-brick text-sm">{erro}</p>}
          </form>
        </div>
      )}
    </div>
  )
}

export default AlunoHorario