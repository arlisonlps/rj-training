import { useState } from 'react'
import { supabase } from './supabaseClient'

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

function EscolherHorario() {
  const [cpf, setCpf] = useState('')
  const [horariosEscolhidos, setHorariosEscolhidos] = useState({
    terca: '',
    quarta: '',
    quinta: '',
  })
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [meusHorarios, setMeusHorarios] = useState(null)
  const [consultando, setConsultando] = useState(false)
  const [erroConsulta, setErroConsulta] = useState('')
  const [cancelandoId, setCancelandoId] = useState(null)

  async function enviar(e) {
    e.preventDefault()
    setMensagem('')
    setErro('')

    const diasSemHorario = Object.entries(horariosEscolhidos).filter(([, h]) => !h)
    if (diasSemHorario.length > 0) {
      setErro('Escolha um horário para os 3 dias (Terça, Quarta e Quinta) antes de confirmar.')
      return
    }

    setEnviando(true)

    for (const [dia, horario] of Object.entries(horariosEscolhidos)) {
      const { error } = await supabase.rpc('escolher_horario_treino', {
        p_cpf: cpf,
        p_dia: dia,
        p_horario: horario,
      })

      if (error) {
        setErro(error.message)
        setEnviando(false)
        return
      }
    }

    setMensagem('Horários dos 3 dias registrados com sucesso!')
    setEnviando(false)
    consultarMeusHorarios()
  }

  async function consultarMeusHorarios() {
    if (!cpf) {
      setErroConsulta('Digite seu CPF antes de consultar.')
      return
    }

    setConsultando(true)
    setErroConsulta('')

    const { data, error } = await supabase.rpc('listar_horarios_semana', { p_cpf: cpf })

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

    const { data, error } = await supabase.rpc('cancelar_horario_treino', {
      p_cpf: cpf,
      p_horario_id: id,
    })

    setCancelandoId(null)

    if (error) {
      setErroConsulta(error.message)
      return
    }

    setErroConsulta('')
    setMensagem(data)
    consultarMeusHorarios()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-campo-dark tracking-tight">RJ Training</h1>
          <p className="text-sm text-ink/60 mt-1">Escolha seus dias e horários de treino</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 mb-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink/60 mb-4">
            CPF
            <input
              type="text"
              placeholder="Somente números"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-black/10 text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
              required
            />
          </label>

          <button
            type="button"
            onClick={consultarMeusHorarios}
            disabled={consultando}
            className="w-full bg-white border border-campo text-campo font-semibold text-sm rounded-lg py-2.5 hover:bg-campo-light transition-colors disabled:opacity-60"
          >
            {consultando ? 'Consultando...' : 'Ver meus horários desta semana'}
          </button>

          {erroConsulta && <p className="text-brick text-sm mt-3">{erroConsulta}</p>}

          {meusHorarios && meusHorarios.length === 0 && (
            <p className="text-sm text-ink/50 mt-4">Você ainda não escolheu nenhum horário essa semana.</p>
          )}

          {meusHorarios && meusHorarios.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {meusHorarios.map((h) => {
                const status = statusAgendamento(h)
                return (
                  <li key={h.id} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${status === 'encerrado' ? 'bg-cream opacity-50' : 'bg-cream'}`}>
                    <span className="text-sm font-medium">
                      {NOMES_DIAS[h.dia_semana]} — {h.horario}
                      {status === 'encerrado' && <span className="ml-2 text-[10px] font-bold text-ink/40">(encerrado)</span>}
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
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
          <h2 className="text-sm font-bold text-campo-dark mb-1">Escolher horário da semana</h2>
          <p className="text-xs text-ink/50 mb-4">Escolha um horário para cada um dos 3 dias de treino.</p>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              {dias.map((d) => (
                <label key={d.valor} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-semibold text-ink/70 shrink-0">{d.label}</span>
                  <select
                    value={horariosEscolhidos[d.valor]}
                    onChange={(e) =>
                      setHorariosEscolhidos({ ...horariosEscolhidos, [d.valor]: e.target.value })
                    }
                    className="flex-1 px-3 py-2.5 rounded-lg border border-black/10 text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
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
              disabled={enviando}
              className="bg-campo text-white font-semibold text-sm rounded-lg py-2.5 hover:bg-campo-dark transition-colors disabled:opacity-60"
            >
              {enviando ? 'Enviando...' : 'Confirmar os 3 dias'}
            </button>

            {mensagem && <p className="text-campo-dark text-sm font-medium">{mensagem}</p>}
            {erro && <p className="text-brick text-sm">{erro}</p>}
          </form>
        </div>
      </div>
    </div>
  )
}

export default EscolherHorario