import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { AlertTriangle, Users, Cake, Trophy, CalendarCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'

const CORES_POSICAO = [
  'bg-amber-light text-amber',
  'bg-gray-300 text-gray-700',
  'bg-orange-200 text-orange-800',
]

function Home() {
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalAtrasados, setTotalAtrasados] = useState(0)
  const [aniversariantes, setAniversariantes] = useState([])
  const [destaques, setDestaques] = useState([])
  const [rankingFrequencia, setRankingFrequencia] = useState([])
  const [slideAtual, setSlideAtual] = useState(0)
  const [carrosselRef] = useAutoAnimate()

  useEffect(() => {
    carregarTudo()
  }, [])

  useEffect(() => {
    const intervalo = setInterval(() => setSlideAtual((atual) => atual + 1), 5000)
    return () => clearInterval(intervalo)
  }, [])

  async function carregarTudo() {
    const { data: userData } = await supabase.auth.getUser()
    const nomeUsuario = userData.user?.user_metadata?.full_name || userData.user?.user_metadata?.nome || userData.user?.email
    setNome(nomeUsuario)

    const { data: alunos } = await supabase.from('aluno').select('*').eq('ativo', true)
    setTotalAtivos(alunos?.length || 0)

    const mesAtual = new Date().getMonth() + 1
    const nascidosNoMes = (alunos || [])
      .filter((a) => {
        if (!a.nascimento) return false
        const mesNascimento = Number(a.nascimento.split('-')[1])
        return mesNascimento === mesAtual
      })
      .sort((a, b) => Number(a.nascimento.split('-')[2]) - Number(b.nascimento.split('-')[2]))
    setAniversariantes(nascidosNoMes)

    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    const hojeStr = hoje.toISOString().split('T')[0]

    const { data: mensalidadesAtrasadas } = await supabase
      .from('mensalidade')
      .select('aluno_id')
      .neq('status', 'pago')
      .lt('data_vencimento', hojeStr)

    setTotalAtrasados(mensalidadesAtrasadas?.length || 0)
    const idsAtrasados = new Set((mensalidadesAtrasadas || []).map((m) => m.aluno_id))

    await calcularDestaques(ano, mes, idsAtrasados)
    await calcularFrequencia(ano, mes, idsAtrasados)

    setCarregando(false)
  }

  async function calcularDestaques(ano, mes, idsAtrasados) {
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
      if (idsAtrasados.has(alunoId)) continue

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

  async function calcularFrequencia(ano, mes, idsAtrasados) {
    const inicioMes = new Date(ano, mes, 1)
    const inicioProximoMes = new Date(ano, mes + 1, 1)

    const { data: registros, error } = await supabase
      .from('presenca')
      .select('aluno_id, presente, registrado_em, aluno(nome)')
      .gte('registrado_em', inicioMes.toISOString())
      .lt('registrado_em', inicioProximoMes.toISOString())

    if (error || !registros) {
      setRankingFrequencia([])
      return
    }

    const porAluno = {}
    for (const r of registros) {
      if (idsAtrasados.has(r.aluno_id)) continue
      if (!porAluno[r.aluno_id]) {
        porAluno[r.aluno_id] = { nome: r.aluno?.nome || 'Aluno', total: 0, presentes: 0 }
      }
      porAluno[r.aluno_id].total++
      if (r.presente) porAluno[r.aluno_id].presentes++
    }

    const resultado = Object.values(porAluno)
      .map((a) => ({ nome: a.nome, percentual: Math.round((a.presentes / a.total) * 100) }))
      .sort((a, b) => b.percentual - a.percentual)

    setRankingFrequencia(resultado.slice(0, 5))
  }

  if (carregando) return <Loading />

  const slides = [
    destaques.length > 0 && {
      chave: 'pesagem',
      titulo: 'Ranking de pesagem do mês atual',
      Icone: Trophy,
      conteudo: (
        <ul className="space-y-2">
          {destaques.map((d, i) => (
            <li key={d.nome + i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${CORES_POSICAO[i] || 'bg-hover text-ink/50'
                    }`}
                >
                  {i + 1}
                </span>
                <span className="font-medium">{d.nome}</span>
              </span>
              <span className="text-campo-dark font-bold">-{d.perda} kg</span>
            </li>
          ))}
        </ul>
      ),
    },
    rankingFrequencia.length > 0 && {
      chave: 'frequencia',
      titulo: 'Ranking de frequência do mês atual',
      Icone: CalendarCheck,
      conteudo: (
        <ul className="space-y-2">
          {rankingFrequencia.map((r, i) => (
            <li key={r.nome + i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${CORES_POSICAO[i] || 'bg-hover text-ink/50'
                    }`}
                >
                  {i + 1}
                </span>
                <span className="font-medium">{r.nome}</span>
              </span>
              <span className="text-campo-dark font-bold">{r.percentual}%</span>
            </li>
          ))}
        </ul>
      ),
    },
    aniversariantes.length > 0 && {
      chave: 'aniversariantes',
      titulo: 'Aniversariantes do mês',
      Icone: Cake,
      conteudo: (
        <ul className="space-y-1">
          {aniversariantes.map((a) => (
            <li key={a.id} className="text-sm text-ink/70">
              {a.nome} --- dia {a.nascimento.split('-')[2]}
            </li>
          ))}
        </ul>
      ),
    },
  ].filter(Boolean)

  const slideAtivo = slides[slideAtual % slides.length]

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-2">Home</h2>
      <p className="text-ink/70 mb-6">Olá {nome}, seja bem-vindo ao painel administrativo do RJ Training!</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link to="/alunos">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer">
            <div className="flex items-center gap-2 mb-2 text-campo">
              <Users size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Alunos ativos</span>
            </div>
            <div className="text-3xl font-bold text-campo">{totalAtivos}</div>
          </div>
        </Link>

        <Link to="/mensalidades">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer">
            <div className="flex items-center gap-2 mb-2 text-campo">
              <AlertTriangle size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Mensalidades atrasadas</span>
            </div>
            <div className="text-3xl font-bold text-campo">{totalAtrasados}</div>
          </div>
        </Link>
      </div>

      {slides.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div ref={carrosselRef}>
            <div key={slideAtivo.chave}>
              <div className="flex items-center gap-2 mb-3 text-campo-dark">
                <slideAtivo.Icone size={18} />
                <span className="text-sm font-bold">{slideAtivo.titulo}</span>
              </div>
              {slideAtivo.conteudo}
            </div>
          </div>

          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-border">
              {slides.map((s, i) => (
                <span
                  key={s.chave}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === slideAtual % slides.length ? 'bg-campo' : 'bg-hover'
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Home