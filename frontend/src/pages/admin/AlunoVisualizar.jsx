import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Scale, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'

function iniciais(nome) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function Campo({ rotulo, valor }) {
  return (
    <div className="bg-cream rounded-lg px-4 py-3 border border-border min-w-0">
      <div className="text-xs font-semibold text-ink/50 mb-0.5">{rotulo}</div>
      <div className="text-sm font-medium break-words">{valor || '-'}</div>
    </div>
  )
}

function formatarDataCurta(dataIso) {
  const [, mes, dia] = dataIso.split('-')
  return `${dia}/${mes}`
}

function AlunoVisualizar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [aluno, setAluno] = useState(null)
  const [historicoPeso, setHistoricoPeso] = useState([])
  const [novoPeso, setNovoPeso] = useState('')

  useEffect(() => {
    carregarAluno()
    carregarHistorico()
  }, [id])

  async function carregarAluno() {
    const { data, error } = await supabase.from('aluno').select('*').eq('id', id).single()
    if (error) {
      console.error('Erro ao carregar aluno:', error)
      return
    }
    setAluno(data)
  }

  async function carregarHistorico() {
    const { data, error } = await supabase
      .from('peso_historico')
      .select('*')
      .eq('aluno_id', id)
      .order('registrado_em', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Erro ao carregar histórico:', error)
      return
    }
    setHistoricoPeso((data || []).reverse())
  }

  async function registrarPeso(e) {
    e.preventDefault()
    if (!novoPeso) return

    const { error } = await supabase.from('peso_historico').insert({
      aluno_id: id,
      peso: Number(novoPeso),
    })

    if (error) {
      alert('Erro ao registrar peso: ' + error.message)
      return
    }

    await supabase.from('aluno').update({ peso: Number(novoPeso) }).eq('id', id)

    setNovoPeso('')
    carregarHistorico()
    carregarAluno()
  }

  async function alternarAtivo() {
    const acao = aluno.ativo ? 'desativar' : 'reativar'
    const confirmado = window.confirm(`Tem certeza que deseja ${acao} este aluno? (${aluno.nome})`)
    if (!confirmado) return

    const { error } = await supabase.from('aluno').update({ ativo: !aluno.ativo }).eq('id', id)
    if (error) {
      alert(`Erro ao ${acao} aluno: ` + error.message)
      return
    }
    carregarAluno()
  }

  async function excluirAluno() {
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir "${aluno.nome}"? Isso apaga PERMANENTEMENTE o aluno e todo o histórico dele (mensalidades, peso, horários de treino). Não tem como desfazer.`
    )
    if (!confirmado) return

    const { error } = await supabase.from('aluno').delete().eq('id', id)
    if (error) {
      alert('Erro ao excluir aluno: ' + error.message)
      return
    }
    navigate('/alunos')
  }

  if (!aluno) return <Loading />

  const dadosGrafico = historicoPeso.map((h) => ({
    data: formatarDataCurta(h.registrado_em),
    peso: h.peso,
  }))

  const historicoDecrescente = [...historicoPeso].reverse()

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/alunos" className="p-2 rounded-lg hover:bg-hover text-ink/60">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-2xl font-bold text-campo-dark">Visualizar Aluno</h2>
        </div>
        <Link to={`/alunos/${id}/editar`}>
          <button className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors">
            <Pencil size={16} />
            Editar
          </button>
        </Link>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-border p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-campo-light text-campo-dark flex items-center justify-center text-lg font-bold">
            {iniciais(aluno.nome)}
          </div>
          <div>
            <div className="text-lg font-bold">{aluno.nome}</div>
            <div className="text-sm text-ink/50">{aluno.posicao || 'Posição não informada'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Campo rotulo="CPF" valor={aluno.cpf} />
          <Campo rotulo="Nascimento" valor={aluno.nascimento} />
          <Campo rotulo="Posição" valor={aluno.posicao} />
          <Campo rotulo="Peso" valor={aluno.peso ? `${aluno.peso} kg` : null} />
          <Campo rotulo="Altura" valor={aluno.altura ? `${aluno.altura} m` : null} />
          <Campo rotulo="WhatsApp" valor={aluno.telefone} />
          <Campo rotulo="Vencimento" valor={`Dia ${aluno.dia_vencimento}`} />
          <Campo rotulo="Valor" valor={`R$ ${aluno.valor_mensalidade}`} />
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-campo-dark mb-4">
          <Scale size={16} />
          Evolução do peso
        </h3>

        <form onSubmit={registrarPeso} className="flex gap-2 mb-6">
          <input
            type="number"
            step="0.1"
            placeholder="Novo peso (kg)"
            value={novoPeso}
            onChange={(e) => setNovoPeso(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
          />
          <button type="submit" className="bg-campo text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-campo-dark transition-colors">
            Registrar
          </button>
        </form>

        {dadosGrafico.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum registro ainda.</p>
        )}

        {dadosGrafico.length === 1 && (
          <p className="text-sm text-ink/50 pb-6 text-center">
            Só tem um registro ainda — o gráfico aparece a partir do segundo peso registrado.
          </p>
        )}

        {dadosGrafico.length >= 2 && (
          <div style={{ width: '100%', height: 240 }} className="mb-6">
            <ResponsiveContainer>
              <LineChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="data" tick={{ fontSize: 12 }} stroke="#8A8A8E" />
                <YAxis tick={{ fontSize: 12 }} stroke="#8A8A8E" unit="kg" width={50} />
                <Tooltip formatter={(valor) => [`${valor} kg`, 'Peso']} />
                <Line type="monotone" dataKey="peso" stroke="#C1272D" strokeWidth={2} dot={{ r: 4, fill: '#C1272D' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {historicoPeso.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-ink/50 border-b border-border">
                <th className="pb-2">Data</th>
                <th className="pb-2">Peso</th>
              </tr>
            </thead>
            <tbody>
              {historicoDecrescente.map((h) => (
                <tr key={h.id} className="border-b border-border">
                  <td className="py-2">{h.registrado_em}</td>
                  <td className="py-2 font-medium">{h.peso} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-3 mt-6">
        {aluno.ativo ? (
          <button
            onClick={alternarAtivo}
            className="flex items-center gap-2 bg-brick-light text-brick text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-brick hover:text-white transition-colors"
          >
            <UserX size={16} />
            Desativar aluno
          </button>
        ) : (
          <button
            onClick={alternarAtivo}
            className="flex items-center gap-2 bg-campo-light text-campo-dark text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo hover:text-white transition-colors"
          >
            <UserCheck size={16} />
            Reativar aluno
          </button>
        )}
        <button
          onClick={excluirAluno}
          className="flex items-center gap-2 bg-hover text-ink/60 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-brick hover:text-white transition-colors"
        >
          <Trash2 size={16} />
          Excluir permanentemente
        </button>
      </div>
    </div>
  )
}

export default AlunoVisualizar