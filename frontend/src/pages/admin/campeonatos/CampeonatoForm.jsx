import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import Loading from '../../../components/Loading'

const campoBase =
  'px-3.5 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'
const rotuloBase = 'flex flex-col gap-1.5 text-xs font-semibold text-ink/60'

function CampeonatoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)

  const [nome, setNome] = useState('')
  const [classificados, setClassificados] = useState('2')
  const [carregando, setCarregando] = useState(editando)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!editando) return
    carregarCampeonato()
  }, [id])

  async function carregarCampeonato() {
    const { data, error } = await supabase
      .from('campeonato')
      .select('nome, classificados_por_grupo')
      .eq('id', id)
      .single()
    if (error) {
      alert('Erro ao carregar campeonato: ' + error.message)
      return
    }
    setNome(data.nome)
    setClassificados(String(data.classificados_por_grupo))
    setCarregando(false)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!nome.trim()) return

    setSalvando(true)
    const dados = { nome: nome.trim(), classificados_por_grupo: Number(classificados) }

    if (editando) {
      const { error } = await supabase.from('campeonato').update(dados).eq('id', id)
      setSalvando(false)
      if (error) {
        alert('Erro ao salvar campeonato: ' + error.message)
        return
      }
      navigate(`/campeonatos/${id}`)
      return
    }

    const { data, error } = await supabase.from('campeonato').insert(dados).select('id').single()
    setSalvando(false)
    if (error) {
      alert('Erro ao criar campeonato: ' + error.message)
      return
    }
    navigate(`/campeonatos/${data.id}`)
  }

  if (carregando) return <Loading />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to={editando ? `/campeonatos/${id}` : '/campeonatos'} className="p-2 rounded-lg hover:bg-hover text-ink/60">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-2xl font-bold text-campo-dark">
            {editando ? 'Editar Campeonato' : 'Criar Campeonato'}
          </h2>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-60"
        >
          <Save size={16} />
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <form onSubmit={salvar} className="bg-surface rounded-2xl shadow-sm border border-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className={`${rotuloBase} md:col-span-2`}>
          Nome do campeonato
          <input
            className={campoBase}
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Copa RJ Training 2026"
            required
          />
        </label>
        <label className={rotuloBase}>
          Classificados por grupo
          <input
            className={campoBase}
            type="number"
            min="1"
            value={classificados}
            onChange={(e) => setClassificados(e.target.value)}
            required
          />
          <span className="text-[11px] font-normal text-ink/50">Quantos times de cada grupo avançam para o mata-mata.</span>
        </label>
      </form>
    </div>
  )
}

export default CampeonatoForm
