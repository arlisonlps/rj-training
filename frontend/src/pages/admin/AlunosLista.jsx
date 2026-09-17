import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { Search, Eye, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'

const TAMANHO_PAGINA = 5

function iniciais(nome) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function AlunosLista() {
  const [alunos, setAlunos] = useState([])
  const [busca, setBusca] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [listaRef] = useAutoAnimate()

  useEffect(() => {
    buscarAlunos()
  }, [])

  async function buscarAlunos() {
    const { data, error } = await supabase.from('aluno').select('*').order('nome')
    if (error) {
      console.error('Erro ao buscar alunos:', error)
      setCarregando(false)
      return
    }
    setAlunos(data)
    setCarregando(false)
  }

  const visiveis = alunos.filter((a) => (mostrarInativos ? true : a.ativo))

  const filtrados = visiveis.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANHO_PAGINA))
  const inicio = (paginaAtual - 1) * TAMANHO_PAGINA
  const paginaDeAlunos = filtrados.slice(inicio, inicio + TAMANHO_PAGINA)

  function mudarBusca(valor) {
    setBusca(valor)
    setPaginaAtual(1)
  }

  if (carregando) return <Loading />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Alunos</h2>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Pesquisar aluno..."
            value={busca}
            onChange={(e) => mudarBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border-strong bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
          />
        </div>
        <Link to="/alunos/novo">
          <button className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors">
            <Plus size={16} />
            Cadastrar Novo Aluno
          </button>
        </Link>
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-ink/60 mb-4">
        <input
          type="checkbox"
          checked={mostrarInativos}
          onChange={(e) => {
            setMostrarInativos(e.target.checked)
            setPaginaAtual(1)
          }}
        />
        Mostrar alunos desativados
      </label>

      <ul ref={listaRef} className="space-y-4">
        {paginaDeAlunos.map((aluno) => (
          <Link key={aluno.id} to={`/alunos/${aluno.id}`}>
            <li
              className={`flex items-center justify-between gap-3 bg-surface border border-border-strong rounded-xl px-4 py-4 shadow-md hover:shadow-lg transition-all active:scale-[0.98] ${!aluno.ativo ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-campo-light text-campo-dark flex items-center justify-center text-xs font-bold shrink-0">
                  {iniciais(aluno.nome)}
                </div>
                <span className="font-medium text-sm truncate">
                  {aluno.nome}
                  {!aluno.ativo && <span className="ml-2 text-[10px] font-bold text-ink/40">(desativado)</span>}
                </span>
              </div>
              <span className="p-2 rounded-lg border border-border-strong text-ink/60 shrink-0" title="Visualizar">
                <Eye size={16} />
              </span>
            </li>
          </Link>
        ))}
        {paginaDeAlunos.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum aluno encontrado.</p>
        )}
      </ul>

      {totalPaginas > 1 && (
        <div className="flex justify-center gap-1.5 mt-6">
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPaginaAtual(n)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${paginaAtual === n
                  ? 'bg-campo text-white'
                  : 'bg-surface border border-border-strong text-ink/60 hover:bg-hover'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AlunosLista