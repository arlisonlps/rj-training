import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Check, Pencil, X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatarData } from '../../lib/data'
import Loading from '../../components/Loading'

function nomeDoMes(mesReferencia) {
  const [ano, mes] = mesReferencia.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  const nome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function selo(status) {
  if (status === 'pago') return 'bg-sucesso-light text-sucesso'
  if (status === 'atrasado') return 'bg-brick-light text-brick'
  return 'bg-amber-light text-amber'
}

function borda(status) {
  if (status === 'pago') return 'border-l-sucesso'
  if (status === 'atrasado') return 'border-l-brick'
  return 'border-l-amber'
}

const OPCOES_STATUS = [
  { valor: 'pendente', label: 'Pendente' },
  { valor: 'pago', label: 'Pago' },
  { valor: 'vencendo', label: 'Vencendo' },
  { valor: 'atrasado', label: 'Atrasado' },
]

function MensalidadeDetalhe() {
  const { mes } = useParams()
  const [mensalidades, setMensalidades] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const [carregando, setCarregando] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [novaData, setNovaData] = useState('')
  const [salvandoData, setSalvandoData] = useState(false)

  useEffect(() => {
    buscarMensalidades()
  }, [mes])

  async function buscarMensalidades() {
    const { data, error } = await supabase
      .from('mensalidade')
      .select('*, aluno(nome, telefone)')
      .eq('mes_referencia', mes)
      .order('data_vencimento')

    if (error) {
      console.error('Erro ao buscar mensalidades:', error)
      setCarregando(false)
      return
    }
    setMensalidades(data)
    setCarregando(false)
  }

  function iniciarEdicaoData(m) {
    setEditandoId(m.id)
    setNovaData(m.data_vencimento)
  }

  async function salvarNovaData(id) {
    if (!novaData) return

    setSalvandoData(true)
    const { error } = await supabase
      .from('mensalidade')
      .update({ data_vencimento: novaData })
      .eq('id', id)

    setSalvandoData(false)

    if (error) {
      alert('Erro ao atualizar data de vencimento: ' + error.message)
      return
    }

    setEditandoId(null)
    buscarMensalidades()
  }

  async function marcarComoPago(id) {
    const hoje = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('mensalidade')
      .update({ status: 'pago', data_pagamento: hoje })
      .eq('id', id)

    if (error) {
      alert('Erro ao marcar como pago: ' + error.message)
      return
    }
    buscarMensalidades()
  }

  function statusCalculado(m) {
    if (m.status === 'pago') return 'pago'
    const hoje = new Date().toISOString().split('T')[0]
    if (m.data_vencimento < hoje) return 'atrasado'
    const emCincoDias = new Date()
    emCincoDias.setDate(emCincoDias.getDate() + 5)
    const emCincoDiasStr = emCincoDias.toISOString().split('T')[0]
    if (m.data_vencimento <= emCincoDiasStr) return 'vencendo'
    return 'pendente'
  }

  function linkWhatsapp(m, status) {
    const mensagem = status === 'vencendo'
      ? `Olá ${m.aluno.nome}, sua mensalidade vence dia ${formatarData(m.data_vencimento)}, faça o pagamento para evitar atrasos!`
      : `Fala ${m.aluno.nome}, Verifiquei que sua mensalidade está em atraso. Vamos regulzarizar o pagamento?`
    return `https://wa.me/${m.aluno.telefone}?text=${encodeURIComponent(mensagem)}`
  }

  if (carregando) return <Loading />

  const mensalidadesFiltradas = mensalidades.filter((m) => statusCalculado(m) === filtroStatus)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mensalidades" className="p-2 rounded-lg hover:bg-hover text-ink/60">
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-2xl font-bold text-campo-dark">{nomeDoMes(mes)}</h2>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-surface p-1 mb-6">
        {OPCOES_STATUS.map(({ valor, label }) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltroStatus(valor)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${filtroStatus === valor ? 'bg-campo text-white' : 'text-ink/60 hover:bg-hover'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {mensalidadesFiltradas.map((m) => {
          const status = statusCalculado(m)
          return (
            <li
              key={m.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface border border-border border-l-4 ${borda(status)} rounded-xl px-4 py-3 shadow-sm`}
            >
              <div>
                <div className="font-semibold text-sm">{m.aluno?.nome}</div>
                {editandoId === m.id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-ink/50">R$ {m.valor} — vence</span>
                    <input
                      type="date"
                      value={novaData}
                      onChange={(e) => setNovaData(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-border-strong text-xs focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
                    />
                    <button
                      type="button"
                      onClick={() => salvarNovaData(m.id)}
                      disabled={salvandoData}
                      className="text-xs font-semibold text-campo-dark hover:underline disabled:opacity-60"
                    >
                      {salvandoData ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoId(null)}
                      className="text-ink/40 hover:text-ink/60"
                      title="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-ink/50 mt-0.5 flex items-center gap-1.5">
                    R$ {m.valor} — vence {formatarData(m.data_vencimento)}
                    <button
                      type="button"
                      onClick={() => iniciarEdicaoData(m)}
                      className="text-ink/30 hover:text-campo-dark"
                      title="Editar data de vencimento"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1.5 ${selo(status)}`}>
                  {status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {status !== 'pago' && (
                  <button
                    onClick={() => marcarComoPago(m.id)}
                    className="flex items-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-campo-dark transition-colors"
                  >
                    <Check size={14} />
                    Marcar pago
                  </button>
                )}
                {(status === 'atrasado' || status === 'vencendo') && (
                  <a href={linkWhatsapp(m, status)} target="_blank" rel="noreferrer">
                    <button className="flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity">
                      <MessageCircle size={14} />
                      Cobrar
                    </button>
                  </a>
                )}
              </div>
            </li>
          )
        })}
        {mensalidadesFiltradas.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">
            {mensalidades.length === 0
              ? 'Nenhuma mensalidade nesse mês.'
              : `Nenhum aluno com status "${OPCOES_STATUS.find((o) => o.valor === filtroStatus)?.label}".`}
          </p>
        )}
      </ul>
    </div>
  )
}

export default MensalidadeDetalhe