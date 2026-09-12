import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Users, Cake, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'

const MEDALHAS = ['🥇', '🥈', '🥉']

function Home() {
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalAtrasados, setTotalAtrasados] = useState(0)
  const [aniversariantes, setAniversariantes] = useState([])
  const [destaques, setDestaques] = useState([])

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    const { data: userData } = await supabase.auth.getUser()
    const nomeUsuario = userData.user?.user_metadata?.full_name || userData.user?.user_metadata?.nome || userData.user?.email
    setNome(nomeUsuario)

    const { data: alunos } = await supabase.from('aluno').select('*').eq('ativo', true)
    setTotalAtivos(alunos?.length || 0)

    const mesAtual = new Date().getMonth() + 1
    const nascidosNoMes = (alunos || []).filter((a) => {
      if (!a.nascimento) return false
      const mesNascimento = Number(a.nascimento.split('-')[1])
      return mesNascimento === mesAtual
    })
    setAniversariantes(nascidosNoMes)

    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    const hojeStr = hoje.toISOString().split('T')[0]

    const { data: mensalidadesAtrasadas } = await supabase
      .from('mensalidade')
      .select('id')
      .neq('status', 'pago')
      .lt('data_vencimento', hojeStr)

    setTotalAtrasados(mensalidadesAtrasadas?.length || 0)

    await calcularDestaques(ano, mes)

    setCarregando(false)
  }

  async function calcularDestaques(ano, mes) {
    const inicioMesAtual = new Date(ano, mes, 1)
    const inicioMesAnterior = new Date(ano, mes - 1, 1)

    const { data: historico, error } = await supabase
      .from('peso_historico')
      .select('*, aluno(nome)')
      .order('registrado_em', { ascending: true })

    if (error || !historico) {
      setDestaques([])
      return
    }

    const porAluno = {}
    for (const registro of historico) {
      if (!porAluno[registro.aluno_id]) porAluno[registro.aluno_id] = []
      porAluno[registro.aluno_id].push(registro)
    }

    const resultado = []

    for (const alunoId in porAluno) {
      const registros = porAluno[alunoId]

      const doMesAnterior = registros.filter((r) => {
        const data = new Date(r.registrado_em)
        return data >= inicioMesAnterior && data < inicioMesAtual
      })
      const doMesAtual = registros.filter((r) => new Date(r.registrado_em) >= inicioMesAtual)

      if (doMesAnterior.length === 0 || doMesAtual.length === 0) continue

      const pesoAnterior = doMesAnterior[doMesAnterior.length - 1].peso
      const pesoAtual = doMesAtual[doMesAtual.length - 1].peso
      const perda = pesoAnterior - pesoAtual

      if (perda > 0) {
        resultado.push({
          nome: registros[0].aluno?.nome || 'Aluno',
          perda: Math.round(perda * 10) / 10,
        })
      }
    }

    resultado.sort((a, b) => b.perda - a.perda)
    setDestaques(resultado.slice(0, 3))
  }

  if (carregando) return <Loading />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-2">Home</h2>
      <p className="text-ink/70 mb-6">Olá {nome}, seja bem-vindo ao painel administrativo do RJ Training!</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link to="/alunos">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-2 mb-2 text-campo">
              <Users size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Alunos ativos</span>
            </div>
            <div className="text-3xl font-bold text-campo-dark">{totalAtivos}</div>
          </div>
        </Link>

        <Link to="/mensalidades">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-2 mb-2 text-brick">
              <AlertTriangle size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Mensalidades atrasadas</span>
            </div>
            <div className="text-3xl font-bold text-brick">{totalAtrasados}</div>
          </div>
        </Link>
      </div>

      {destaques.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3 text-campo-dark">
            <Trophy size={18} />
            <span className="text-sm font-bold">Atleta destaque — maior perda de peso do mês</span>
          </div>
          <ul className="space-y-2">
            {destaques.map((d, i) => (
              <li key={d.nome + i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span>{MEDALHAS[i]}</span>
                  <span className="font-medium">{d.nome}</span>
                </span>
                <span className="text-campo-dark font-bold">-{d.perda} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aniversariantes.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-campo-dark">
            <Cake size={18} />
            <span className="text-sm font-bold">Aniversariantes do mês</span>
          </div>
          <ul className="space-y-1">
            {aniversariantes.map((a) => (
              <li key={a.id} className="text-sm text-ink/70">
                {a.nome} — dia {a.nascimento.split('-')[2]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Home