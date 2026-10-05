import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, X, Check, UserPlus } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import Loading from '../../../components/Loading'
import Janela from '../../../components/Janela'

const LIMITE_LISTAS = 500
const campoBase =
  'px-3.5 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

function nomeDoJogador(jogador) {
  return jogador.apelido ? `${jogador.nome} (${jogador.apelido})` : jogador.nome
}

function EquipeDetalhe() {
  const { id, equipeId } = useParams()
  const navigate = useNavigate()

  const [campeonato, setCampeonato] = useState(null)
  const [equipe, setEquipe] = useState(null)
  const [membros, setMembros] = useState([])
  const [alunosAtivos, setAlunosAtivos] = useState([])
  const [convidados, setConvidados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [editandoNome, setEditandoNome] = useState(false)
  const [nome, setNome] = useState('')
  const [selecao, setSelecao] = useState('')
  const [janelaConvidado, setJanelaConvidado] = useState(false)
  const [novoConvidado, setNovoConvidado] = useState('')
  const [novoApelido, setNovoApelido] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    carregar()
  }, [id, equipeId])

  async function carregar() {
    const [campeonatoRes, equipeRes, membrosRes, alunosRes, convidadosRes] = await Promise.all([
      supabase.from('campeonato').select('id, nome').eq('id', id).single(),
      supabase.from('equipe').select('id, nome, cor').eq('id', equipeId).eq('campeonato_id', id).single(),
      supabase
        .from('equipe_jogador')
        .select('id, equipe_id, jogador(id, nome, apelido, aluno_id)')
        .eq('campeonato_id', id)
        .limit(LIMITE_LISTAS),
      supabase.from('aluno').select('id, nome').eq('ativo', true).order('nome').limit(LIMITE_LISTAS),
      supabase.from('jogador').select('id, nome, apelido').is('aluno_id', null).order('nome').limit(LIMITE_LISTAS),
    ])

    if (campeonatoRes.error || equipeRes.error) {
      navigate(`/campeonatos/${id}`)
      return
    }

    setCampeonato(campeonatoRes.data)
    setEquipe(equipeRes.data)
    setNome(equipeRes.data.nome)
    setMembros(membrosRes.data || [])
    setAlunosAtivos(alunosRes.data || [])
    setConvidados(convidadosRes.data || [])
    setCarregando(false)
  }

  async function salvarNome() {
    if (!nome.trim()) return
    setOcupado(true)
    const { error } = await supabase.from('equipe').update({ nome: nome.trim() }).eq('id', equipeId)
    setOcupado(false)
    if (error) {
      alert(error.code === '23505' ? 'Já existe um time com esse nome neste campeonato.' : 'Erro ao renomear: ' + error.message)
      return
    }
    setEditandoNome(false)
    carregar()
  }

  async function excluirEquipe() {
    if (!window.confirm(`Excluir o time ${equipe.nome}? Os jogadores saem do time (continuam cadastrados).`)) return
    const { error } = await supabase.from('equipe').delete().eq('id', equipeId)
    if (error) {
      alert(error.code === '23503' ? 'Este time já tem jogos e não pode ser excluído.' : 'Erro ao excluir: ' + error.message)
      return
    }
    navigate(`/campeonatos/${id}`)
  }

  async function vincular(jogadorId) {
    const { error } = await supabase
      .from('equipe_jogador')
      .insert({ campeonato_id: id, equipe_id: equipeId, jogador_id: jogadorId })
    if (error) {
      alert(error.code === '23505' ? 'Esse jogador já está em um time deste campeonato.' : 'Erro ao adicionar jogador: ' + error.message)
      return false
    }
    return true
  }

  async function adicionarSelecionado() {
    if (!selecao) return
    const [tipo, valor] = selecao.split(':')
    setOcupado(true)

    let jogadorId = valor
    if (tipo === 'aluno') {
      const { data: existente } = await supabase.from('jogador').select('id').eq('aluno_id', valor).maybeSingle()
      if (existente) {
        jogadorId = existente.id
      } else {
        const aluno = alunosAtivos.find((a) => a.id === valor)
        const { data, error } = await supabase
          .from('jogador')
          .insert({ nome: aluno.nome, aluno_id: valor })
          .select('id')
          .single()
        if (error) {
          setOcupado(false)
          alert('Erro ao cadastrar jogador: ' + error.message)
          return
        }
        jogadorId = data.id
      }
    }

    const ok = await vincular(jogadorId)
    setOcupado(false)
    if (ok) {
      setSelecao('')
      carregar()
    }
  }

  async function cadastrarConvidado(e) {
    e.preventDefault()
    if (!novoConvidado.trim()) return
    setOcupado(true)
    const { data, error } = await supabase
      .from('jogador')
      .insert({ nome: novoConvidado.trim(), apelido: novoApelido.trim() || null })
      .select('id')
      .single()
    if (error) {
      setOcupado(false)
      alert('Erro ao cadastrar convidado: ' + error.message)
      return
    }

    const ok = await vincular(data.id)
    setOcupado(false)
    if (ok) {
      setNovoConvidado('')
      setNovoApelido('')
      setJanelaConvidado(false)
      carregar()
    }
  }

  async function removerJogador(membroId) {
    const { error } = await supabase.from('equipe_jogador').delete().eq('id', membroId)
    if (error) {
      alert('Erro ao remover jogador: ' + error.message)
      return
    }
    carregar()
  }

  if (carregando) return <Loading />

  const doTime = membros.filter((m) => m.equipe_id === equipeId && m.jogador)
  const alunosNosTimes = new Set(membros.map((m) => m.jogador?.aluno_id).filter(Boolean))
  const jogadoresNosTimes = new Set(membros.map((m) => m.jogador?.id).filter(Boolean))
  const opcoesAlunos = alunosAtivos.filter((a) => !alunosNosTimes.has(a.id))
  const opcoesConvidados = convidados.filter((j) => !jogadoresNosTimes.has(j.id))

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/campeonatos/${id}`} className="p-2 rounded-lg hover:bg-hover text-ink/60" aria-label={`Voltar para ${campeonato.nome}`}>
            <ArrowLeft size={18} />
          </Link>
          {editandoNome ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <input className={`${campoBase} min-w-0`} value={nome} onChange={(e) => setNome(e.target.value)} />
              <button type="button" onClick={salvarNome} disabled={ocupado} className="p-2 rounded-lg text-campo-dark hover:bg-hover" aria-label="Salvar nome">
                <Check size={18} />
              </button>
              <button type="button" onClick={() => { setEditandoNome(false); setNome(equipe.nome) }} className="p-2 rounded-lg text-ink/50 hover:bg-hover" aria-label="Cancelar">
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: equipe.cor || '#9CA3AF' }} />
              <h2 className="text-2xl font-bold text-campo-dark truncate">{equipe.nome}</h2>
              <button type="button" onClick={() => setEditandoNome(true)} className="p-2 rounded-lg text-ink/40 hover:bg-hover shrink-0" aria-label="Renomear time">
                <Pencil size={15} />
              </button>
              <button type="button" onClick={excluirEquipe} className="p-2 rounded-lg text-brick hover:bg-brick-light shrink-0" aria-label="Excluir time">
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setJanelaConvidado(true)}
          className="flex items-center gap-2 bg-campo text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors shrink-0"
        >
          <UserPlus size={16} />
          Cadastrar Jogador
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        <select className={`${campoBase} flex-1 min-w-0`} value={selecao} onChange={(e) => setSelecao(e.target.value)} aria-label="Adicione um aluno">
          <option value="">Adicione um aluno</option>
          {opcoesAlunos.length > 0 && (
            <optgroup label="Alunos">
              {opcoesAlunos.map((a) => (
                <option key={a.id} value={`aluno:${a.id}`}>{a.nome}</option>
              ))}
            </optgroup>
          )}
          {opcoesConvidados.length > 0 && (
            <optgroup label="Convidados já cadastrados">
              {opcoesConvidados.map((j) => (
                <option key={j.id} value={`jogador:${j.id}`}>{nomeDoJogador(j)}</option>
              ))}
            </optgroup>
          )}
        </select>
        <button
          type="button"
          onClick={adicionarSelecionado}
          disabled={!selecao || ocupado}
          className="bg-campo text-white text-sm font-semibold px-4 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>

      <ul className="space-y-2">
        {doTime.map((m) => (
          <li key={m.id} className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              {nomeDoJogador(m.jogador)}
              {!m.jogador.aluno_id && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-hover text-ink/60">CONVIDADO</span>
              )}
            </span>
            <button type="button" onClick={() => removerJogador(m.id)} className="p-2 rounded-lg text-ink/40 hover:bg-hover" aria-label={`Remover ${m.jogador.nome} do time`}>
              <X size={16} />
            </button>
          </li>
        ))}
        {doTime.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum jogador neste time ainda.</p>
        )}
      </ul>

      {janelaConvidado && (
        <Janela titulo="Cadastrar jogador convidado" aoFechar={() => setJanelaConvidado(false)}>
          <form onSubmit={cadastrarConvidado} className="flex flex-col gap-3">
            <input className={campoBase} placeholder="Nome" value={novoConvidado} onChange={(e) => setNovoConvidado(e.target.value)} autoFocus required />
            <input className={campoBase} placeholder="Apelido (opcional)" value={novoApelido} onChange={(e) => setNovoApelido(e.target.value)} />
            <p className="text-[11px] text-ink/50">Para jogadores que não são alunos. Ele fica salvo e pode ser usado em outros campeonatos.</p>
            <button
              type="submit"
              disabled={ocupado || !novoConvidado.trim()}
              className="w-full bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark transition-colors disabled:opacity-50"
            >
              {ocupado ? 'Cadastrando...' : 'Cadastrar e adicionar ao time'}
            </button>
          </form>
        </Janela>
      )}
    </div>
  )
}

export default EquipeDetalhe
