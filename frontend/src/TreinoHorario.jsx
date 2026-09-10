import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from './supabaseClient'
import Loading from './Loading'

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
  const [carregando, setCarregando] = useState(true)

  const jaPassou = diaJaPassou(dia)

  useEffect(() => {
    if (jaPassou) {
      setCarregando(false)
      return
    }
    setCarregando(true)
    buscarAlunos()
  }, [dia])

  useEffect(() => {
    if (jaPassou) return
    buscarAlunos()
  }, [horarioSelecionado])

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
    setCarregando(false)
  }

  if (carregando) return <Loading />

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/treinos" className="p-2 rounded-lg hover:bg-black/5 text-ink/60">
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-2xl font-bold text-campo-dark">{nomesDias[dia] || dia}</h2>
      </div>

      {jaPassou ? (
        <p className="text-sm text-ink/50 py-6 text-center">
          Esse dia já passou. A lista volta a aparecer quando alunos escolherem horários pra próxima semana.
        </p>
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            {horarios.map((h) => (
              <button
                key={h}
                onClick={() => setHorarioSelecionado(h)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${horarioSelecionado === h
                  ? 'bg-campo text-white'
                  : 'bg-white border border-black/10 text-ink/60 hover:bg-black/5'
                  }`}
              >
                {h}
              </button>
            ))}
          </div>

          <ul className="space-y-2">
            {alunos.map((item) => (
              <li key={item.id} className="bg-white border border-black/5 rounded-xl px-4 py-3 shadow-sm font-medium text-sm">
                {item.aluno?.nome}
              </li>
            ))}
            {alunos.length === 0 && (
              <p className="text-sm text-ink/50 py-6 text-center">Nenhum aluno nesse horário ainda.</p>
            )}
          </ul>
        </>
      )}
    </div>
  )
}

export default TreinoHorario