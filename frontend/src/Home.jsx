import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Users, Cake } from 'lucide-react'
import { supabase } from './supabaseClient'
import Loading from './Loading'

function Home() {
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalAtrasados, setTotalAtrasados] = useState(0)
  const [aniversariantes, setAniversariantes] = useState([])

  useEffect(() => {
    carregarTudo()
  }, [])

  async function carregarTudo() {
    const { data: userData } = await supabase.auth.getUser()
    const nomeUsuario = userData.user?.user_metadata?.nome || userData.user?.email
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
    const mesReferencia = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    const hojeStr = hoje.toISOString().split('T')[0]

    const { data: mensalidadesMes } = await supabase
      .from('mensalidade')
      .select('status, data_vencimento')
      .eq('mes_referencia', mesReferencia)

    const atrasadas = (mensalidadesMes || []).filter(
      (m) => m.status !== 'pago' && m.data_vencimento < hojeStr
    )
    setTotalAtrasados(atrasadas.length)

    setCarregando(false)
  }

  if (carregando) return <Loading />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-2">Home</h2>
      <p className="text-ink/70 mb-6">Olá {nome}, seja bem-vindo ao painel administrativo do RJ Training!</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link to="/alunos">
          <div className="bg-white border border-black/5 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-2 mb-2 text-campo">
              <Users size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Alunos ativos</span>
            </div>
            <div className="text-3xl font-bold text-campo-dark">{totalAtivos}</div>
          </div>
        </Link>

        <Link to="/mensalidades">
          <div className="bg-white border border-black/5 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-2 mb-2 text-brick">
              <AlertTriangle size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Mensalidades atrasadas</span>
            </div>
            <div className="text-3xl font-bold text-brick">{totalAtrasados}</div>
          </div>
        </Link>
      </div>

      {aniversariantes.length > 0 && (
        <div className="bg-white border border-black/5 rounded-xl p-5 shadow-sm">
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