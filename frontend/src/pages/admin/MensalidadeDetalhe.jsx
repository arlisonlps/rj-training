import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Check } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'

function nomeDoMes(mesReferencia) {
  const [ano, mes] = mesReferencia.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  const nome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function selo(status) {
  if (status === 'pago') return 'bg-campo-light text-campo-dark'
  if (status === 'atrasado') return 'bg-brick-light text-brick'
  return 'bg-amber-light text-amber'
}

function borda(status) {
  if (status === 'pago') return 'border-l-campo'
  if (status === 'atrasado') return 'border-l-brick'
  return 'border-l-amber'
}

function MensalidadeDetalhe() {
  const { mes } = useParams()
  const [mensalidades, setMensalidades] = useState([])
  const [carregando, setCarregando] = useState(true)

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
    return m.data_vencimento < hoje ? 'atrasado' : 'pendente'
  }

  function linkWhatsapp(m) {
    const mensagem = `Olá ${m.aluno.nome}, sua mensalidade está em atraso. Poderia regularizar o pagamento?`
    return `https://wa.me/${m.aluno.telefone}?text=${encodeURIComponent(mensagem)}`
  }

  if (carregando) return <Loading />

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mensalidades" className="p-2 rounded-lg hover:bg-hover text-ink/60">
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-2xl font-bold text-campo-dark">{nomeDoMes(mes)}</h2>
      </div>

      <ul className="space-y-2">
        {mensalidades.map((m) => {
          const status = statusCalculado(m)
          return (
            <li
              key={m.id}
              className={`flex items-center justify-between gap-3 bg-surface border border-border border-l-4 ${borda(status)} rounded-xl px-4 py-3 shadow-sm flex-wrap`}
            >
              <div>
                <div className="font-semibold text-sm">{m.aluno?.nome}</div>
                <div className="text-xs text-ink/50 mt-0.5">R$ {m.valor} — vence {m.data_vencimento}</div>
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
                {status === 'atrasado' && (
                  <a href={linkWhatsapp(m)} target="_blank" rel="noreferrer">
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
        {mensalidades.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhuma mensalidade nesse mês.</p>
        )}
      </ul>
    </div>
  )
}

export default MensalidadeDetalhe