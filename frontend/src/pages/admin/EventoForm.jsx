import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'

const campoBase =
  'px-3.5 py-2.5 rounded-lg border border-border-strong text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'
const rotuloBase = 'flex flex-col gap-1.5 text-xs font-semibold text-ink/60'

function EventoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [local, setLocal] = useState('')
  const [vagasLimite, setVagasLimite] = useState('')
  const [carregando, setCarregando] = useState(editando)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (editando) {
      carregarEvento()
    }
  }, [id])

  async function carregarEvento() {
    const { data, error } = await supabase.from('evento').select('*').eq('id', id).single()
    if (error) {
      alert('Erro ao carregar evento: ' + error.message)
      return
    }
    setTitulo(data.titulo || '')
    setDescricao(data.descricao || '')
    setDataHora(data.data_hora ? data.data_hora.slice(0, 16) : '')
    setLocal(data.local || '')
    setVagasLimite(data.vagas_limite || '')
    setCarregando(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)

    const dados = {
      titulo,
      descricao: descricao || null,
      data_hora: dataHora,
      local: local || null,
      vagas_limite: vagasLimite ? Number(vagasLimite) : null,
    }

    let error
    if (editando) {
      ; ({ error } = await supabase.from('evento').update(dados).eq('id', id))
    } else {
      ; ({ error } = await supabase.from('evento').insert(dados))
    }

    setSalvando(false)

    if (error) {
      alert('Erro ao salvar evento: ' + error.message)
      return
    }

    navigate('/eventos')
  }

  if (carregando) return <Loading />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/eventos" className="p-2 rounded-lg hover:bg-hover text-ink/60">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-2xl font-bold text-campo-dark">
            {editando ? 'Editar Evento' : 'Criar Evento'}
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
          Título
          <input
            className={campoBase}
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Churrasco de fim de ano"
            required
          />
        </label>
        <label className={rotuloBase}>
          Data e horário
          <input
            className={campoBase}
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            required
          />
        </label>
        <label className={rotuloBase}>
          Local
          <input
            className={campoBase}
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex: Sede do RJ Training"
          />
        </label>
        <label className={rotuloBase}>
          Limite de vagas
          <input
            className={campoBase}
            type="number"
            min="1"
            value={vagasLimite}
            onChange={(e) => setVagasLimite(e.target.value)}
            placeholder="Sem limite"
          />
        </label>
        <label className={`${rotuloBase} md:col-span-2`}>
          Descrição
          <textarea
            className={`${campoBase} min-h-24 resize-y`}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes do evento (opcional)"
          />
        </label>
      </form>
    </div>
  )
}

export default EventoForm
