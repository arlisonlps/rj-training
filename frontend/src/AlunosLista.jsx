import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, Pencil, Trash2, Plus } from 'lucide-react'
import { supabase } from './supabaseClient'

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

  useEffect(() => {
    buscarAlunos()
  }, [])

  async function buscarAlunos() {
    const { data, error } = await supabase.from('aluno').select('*').order('nome')
    if (error) {
      console.error('Erro ao buscar alunos:', error)
      return
    }
    setAlunos(data)
  }

  async function excluirAluno(id, nome) {
    const confirmado = window.confirm(`Tem certeza que deseja excluir este aluno? (${nome})`)
    if (!confirmado) return

    const { error } = await supabase.from('aluno').delete().eq('id', id)
    if (error) {
      alert('Erro ao excluir aluno: ' + error.message)
      return
    }
    buscarAlunos()
  }

  const filtrados = alunos.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANHO_PAGINA))
  const inicio = (paginaAtual - 1) * TAMANHO_PAGINA
  const paginaDeAlunos = filtrados.slice(inicio, inicio + TAMANHO_PAGINA)

  function mudarBusca(valor) {
    setBusca(valor)
    setPaginaAtual(1)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Alunos</h2>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Pesquisar aluno..."
            value={busca}
            onChange={(e) => mudarBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
          />
        </div>
        <Link to="/alunos/novo">
          <button className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors">
            <Plus size={16} />
            Cadastrar Novo Aluno
          </button>
        </Link>
      </div>

      <ul className="space-y-2">
        {paginaDeAlunos.map((aluno) => (
          <li
            key={aluno.id}
            className="flex items-center justify-between gap-3 bg-white border border-black/5 rounded-xl px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-campo-light text-campo-dark flex items-center justify-center text-xs font-bold shrink-0">
                {iniciais(aluno.nome)}
              </div>
              <span className="font-medium text-sm">{aluno.nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/alunos/${aluno.id}`}>
                <button className="p-2 rounded-lg border border-black/10 text-ink/60 hover:bg-black/5" title="Visualizar">
                  <Eye size={16} />
                </button>
              </Link>
              <Link to={`/alunos/${aluno.id}/editar`}>
                <button className="p-2 rounded-lg bg-campo text-white hover:bg-campo-dark" title="Editar">
                  <Pencil size={16} />
                </button>
              </Link>
              <button
                onClick={() => excluirAluno(aluno.id, aluno.nome)}
                className="p-2 rounded-lg bg-brick-light text-brick hover:bg-brick hover:text-white transition-colors"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
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
                : 'bg-white border border-black/10 text-ink/60 hover:bg-black/5'
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