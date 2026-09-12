import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { POSICOES } from '../../lib/posicoes'
import Loading from '../../components/Loading'

const campoBase =
  'px-3.5 py-2.5 rounded-lg border border-border-strong text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'
const rotuloBase = 'flex flex-col gap-1.5 text-xs font-semibold text-ink/60'

function AlunoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)

  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [posicao, setPosicao] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [telefone, setTelefone] = useState('')
  const [diaVencimento, setDiaVencimento] = useState('')
  const [valorMensalidade, setValorMensalidade] = useState('')
  const [carregando, setCarregando] = useState(editando)

  useEffect(() => {
    if (editando) {
      carregarAluno()
    }
  }, [id])

  async function carregarAluno() {
    const { data, error } = await supabase.from('aluno').select('*').eq('id', id).single()
    if (error) {
      alert('Erro ao carregar aluno: ' + error.message)
      return
    }
    setNome(data.nome || '')
    setCpf(data.cpf || '')
    setNascimento(data.nascimento || '')
    setPosicao(data.posicao || '')
    setPeso(data.peso || '')
    setAltura(data.altura || '')
    setTelefone(data.telefone || '')
    setDiaVencimento(data.dia_vencimento || '')
    setValorMensalidade(data.valor_mensalidade || '')
    setCarregando(false)
  }

  async function salvar(e) {
    e.preventDefault()

    const dados = {
      nome,
      cpf,
      nascimento: nascimento || null,
      posicao,
      peso: peso ? Number(peso) : null,
      altura: altura ? Number(altura) : null,
      telefone,
      dia_vencimento: Number(diaVencimento),
      valor_mensalidade: Number(valorMensalidade),
    }

    let error
    if (editando) {
      ; ({ error } = await supabase.from('aluno').update(dados).eq('id', id))
    } else {
      ; ({ error } = await supabase.from('aluno').insert(dados))
    }

    if (error) {
      if (error.code === '23505') {
        alert('Já existe um aluno cadastrado com esse CPF.')
      } else {
        alert('Erro ao salvar aluno: ' + error.message)
      }
      return
    }

    navigate('/alunos')
  }

  if (carregando) return <Loading />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/alunos" className="p-2 rounded-lg hover:bg-hover text-ink/60">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-2xl font-bold text-campo-dark">
            {editando ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
          </h2>
        </div>
        <button
          onClick={salvar}
          className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors"
        >
          <Save size={16} />
          Salvar
        </button>
      </div>

      <form onSubmit={salvar} className="bg-surface rounded-2xl shadow-sm border border-border p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className={rotuloBase}>
          Nome
          <input className={campoBase} type="text" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>
        <label className={rotuloBase}>
          CPF
          <input className={campoBase} type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Somente números" required />
        </label>
        <label className={rotuloBase}>
          Nascimento
          <input className={campoBase} type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
        </label>
        <label className={rotuloBase}>
          Posição
          <select className={campoBase} value={posicao} onChange={(e) => setPosicao(e.target.value)}>
            <option value="">Selecione a posição</option>
            {POSICOES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={rotuloBase}>
          Peso (kg)
          <input className={campoBase} type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} />
        </label>
        <label className={rotuloBase}>
          Altura (m)
          <input className={campoBase} type="number" step="0.01" value={altura} onChange={(e) => setAltura(e.target.value)} />
        </label>
        <label className={rotuloBase}>
          WhatsApp
          <input className={campoBase} type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="5591999999999" required />
        </label>
        <label className={rotuloBase}>
          Vencimento (dia)
          <input className={campoBase} type="number" min="1" max="28" value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} required />
        </label>
        <label className={rotuloBase}>
          Valor
          <input className={campoBase} type="number" step="0.01" value={valorMensalidade} onChange={(e) => setValorMensalidade(e.target.value)} required />
        </label>
      </form>
    </div>
  )
}

export default AlunoForm