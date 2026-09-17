import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { ArrowLeft, CheckCircle2, XCircle, UserPlus, UserMinus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'

const OFFSET_DIA = { terca: 1, quarta: 2, quinta: 3 }

function inicioDaSemanaDate() {
  const hoje = new Date()
  const diaSemana = hoje.getDay()
  const diferenca = diaSemana === 0 ? -6 : 1 - diaSemana
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() + diferenca)
  segunda.setHours(0, 0, 0, 0)
  return segunda
}

function inicioDaSemanaStr() {
  return inicioDaSemanaDate().toISOString().split('T')[0]
}

function diaJaPassou(dia) {
  const base = inicioDaSemanaDate()
  const dataDoDia = new Date(base)
  dataDoDia.setDate(base.getDate() + OFFSET_DIA[dia])

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  return dataDoDia.getTime() < hoje.getTime()
}

function dataDoHorario(dia, horario) {
  const base = inicioDaSemanaDate()
  const data = new Date(base)
  data.setDate(base.getDate() + OFFSET_DIA[dia])
  const hora = Number(horario.slice(0, 2))
  data.setHours(hora, 0, 0, 0)
  return data
}

function horarioJaPassou(dia, horario) {
  return dataDoHorario(dia, horario).getTime() < Date.now()
}

function formatarData(dia) {
  const base = inicioDaSemanaDate()
  const data = new Date(base)
  data.setDate(base.getDate() + OFFSET_DIA[dia])
  const d = String(data.getDate()).padStart(2, '0')
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const a = data.getFullYear()
  return `${d}/${m}/${a}`
}

const horarios = ['06h', '07h', '17h', '18h']

const nomesDias = {
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
}

function TreinoHorario() {
  const { dia } = useParams()
  const [horarioSelecionado, setHorarioSelecionado] = useState('06h')
  const [alunos, setAlunos] = useState([])
  const [presencas, setPresencas] = useState({})
  const [carregando, setCarregando] = useState(true)

  const [alunosDisponiveis, setAlunosDisponiveis] = useState([])
  const [alunoParaAdicionar, setAlunoParaAdicionar] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [erroAdicionar, setErroAdicionar] = useState('')
  const [removendoId, setRemovendoId] = useState(null)
  const [listaRef] = useAutoAnimate()

  const jaPassou = diaJaPassou(dia)
  const podeMarcarPresenca = horarioJaPassou(dia, horarioSelecionado)

  useEffect(() => {
    setCarregando(true)
    buscarAlunos()
    buscarAlunosDisponiveis()
  }, [dia])

  useEffect(() => {
    buscarAlunos()
  }, [horarioSelecionado])

  async function buscarAlunosDisponiveis() {
    const { data: agendadosNoDia, error: erroAgendados } = await supabase
      .from('horario_treino')
      .select('aluno_id')
      .eq('dia_semana', dia)
      .eq('semana_referencia', inicioDaSemanaStr())

    if (erroAgendados) {
      console.error('Erro ao buscar agendados do dia:', erroAgendados)
      return
    }

    const idsJaAgendados = new Set((agendadosNoDia || []).map((a) => a.aluno_id))

    const { data: todosAlunos, error: erroAlunos } = await supabase
      .from('aluno')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')

    if (erroAlunos) {
      console.error('Erro ao buscar alunos:', erroAlunos)
      return
    }

    setAlunosDisponiveis((todosAlunos || []).filter((a) => !idsJaAgendados.has(a.id)))
  }

  async function adicionarAluno() {
    if (!alunoParaAdicionar) return

    setAdicionando(true)
    setErroAdicionar('')

    const { error } = await supabase.from('horario_treino').insert({
      aluno_id: alunoParaAdicionar,
      dia_semana: dia,
      horario: horarioSelecionado,
      semana_referencia: inicioDaSemanaStr(),
    })

    setAdicionando(false)

    if (error) {
      setErroAdicionar('Erro ao adicionar aluno: ' + error.message)
      return
    }

    setAlunoParaAdicionar('')
    buscarAlunos()
    buscarAlunosDisponiveis()
  }

  async function removerAluno(horarioId, nome) {
    const confirmado = window.confirm(`Remover ${nome} deste horário?`)
    if (!confirmado) return

    setRemovendoId(horarioId)

    const { error } = await supabase.from('horario_treino').delete().eq('id', horarioId)

    setRemovendoId(null)

    if (error) {
      alert('Erro ao remover aluno: ' + error.message)
      return
    }

    buscarAlunos()
    buscarAlunosDisponiveis()
  }

  async function buscarAlunos() {
    const { data, error } = await supabase
      .from('horario_treino')
      .select('*, aluno(nome)')
      .eq('dia_semana', dia)
      .eq('horario', horarioSelecionado)
      .eq('semana_referencia', inicioDaSemanaStr())

    if (error) {
      console.error('Erro ao buscar horário:', error)
      setCarregando(false)
      return
    }
    setAlunos(data)

    const { data: presencasData, error: erroPresencas } = await supabase
      .from('presenca')
      .select('aluno_id, presente')
      .eq('dia_semana', dia)
      .eq('horario', horarioSelecionado)
      .eq('semana_referencia', inicioDaSemanaStr())

    if (!erroPresencas) {
      const mapa = {}
      for (const p of presencasData || []) {
        mapa[p.aluno_id] = p.presente
      }
      setPresencas(mapa)
    }

    setCarregando(false)
  }

  async function marcarPresenca(alunoId, presente) {
    setPresencas((atual) => ({ ...atual, [alunoId]: presente }))

    const { error } = await supabase.from('presenca').upsert(
      {
        aluno_id: alunoId,
        dia_semana: dia,
        horario: horarioSelecionado,
        semana_referencia: inicioDaSemanaStr(),
        presente,
      },
      { onConflict: 'aluno_id,dia_semana,horario,semana_referencia' }
    )

    if (error) {
      alert('Erro ao registrar presença: ' + error.message)
      buscarAlunos()
    }
  }

  if (carregando) return <Loading />

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/treinos" className="p-2 rounded-lg hover:bg-hover text-ink/60">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-campo-dark">{nomesDias[dia] || dia}</h2>
          <p className="text-sm text-ink/50">{formatarData(dia)}</p>
        </div>
      </div>

      {jaPassou && (
        <div className="flex items-center gap-2 bg-campo-light text-campo-dark text-sm font-medium rounded-lg px-4 py-3 mb-6">
          <CheckCircle2 size={18} />
          Treino concluído, aguarde o agendamento dos alunos para a próxima semana.
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {horarios.map((h) => (
          <button
            key={h}
            onClick={() => setHorarioSelecionado(h)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${horarioSelecionado === h
              ? 'bg-campo text-white'
              : 'bg-surface border border-border-strong text-ink/60 hover:bg-hover'
              }`}
          >
            {h}
          </button>
        ))}
      </div>

      {!podeMarcarPresenca && (
        <p className="text-xs text-ink/50 mb-3">A marcação de presença libera depois que esse horário começar.</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={alunoParaAdicionar}
          onChange={(e) => setAlunoParaAdicionar(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border-strong text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
        >
          <option value="">Adicionar aluno avulso neste horário...</option>
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
      {erroAdicionar && <p className="text-brick text-xs mb-3">{erroAdicionar}</p>}

      <ul ref={listaRef} className="space-y-2">
        {alunos.map((item) => {
          const presente = presencas[item.aluno_id]
          return (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-surface border border-border rounded-xl px-4 py-3 shadow-sm"
            >
              <span className="font-medium text-sm">{item.aluno?.nome}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!podeMarcarPresenca}
                  onClick={() => marcarPresenca(item.aluno_id, true)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${presente === true
                    ? 'bg-sucesso text-white'
                    : 'bg-hover text-ink/60'
                    }`}
                >
                  <CheckCircle2 size={14} />
                  Presente
                </button>
                <button
                  type="button"
                  disabled={!podeMarcarPresenca}
                  onClick={() => marcarPresenca(item.aluno_id, false)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${presente === false
                    ? 'bg-brick text-white'
                    : 'bg-hover text-ink/60'
                    }`}
                >
                  <XCircle size={14} />
                  Faltou
                </button>
                <button
                  type="button"
                  disabled={podeMarcarPresenca || removendoId === item.id}
                  onClick={() => removerAluno(item.id, item.aluno?.nome)}
                  title={podeMarcarPresenca ? 'Treino já começou, não é possível remover' : 'Remover deste horário'}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-hover text-ink/60 hover:bg-brick-light hover:text-brick transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserMinus size={14} />
                  {removendoId === item.id ? 'Removendo...' : 'Remover'}
                </button>
              </div>
            </li>
          )
        })}
        {alunos.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum aluno nesse horário.</p>
        )}
      </ul>
    </div>
  )
}

export default TreinoHorario
