import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Search, MessageCircle, Check } from 'lucide-react'
import { supabase } from './supabaseClient'
import Loading from './Loading'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function nomeDoMes(mesReferencia) {
  const [ano, mes] = mesReferencia.split('-')
  return `${NOMES_MESES[Number(mes) - 1]} ${ano}`
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

function statusCalculado(m) {
  if (m.status === 'pago') return 'pago'
  const hoje = new Date().toISOString().split('T')[0]
  return m.data_vencimento < hoje ? 'atrasado' : 'pendente'
}

function linkWhatsapp(m) {
  const mensagem = `Olá ${m.aluno.nome}, sua mensalidade está em atraso. Poderia regularizar o pagamento?`
  return `https://wa.me/${m.aluno.telefone}?text=${encodeURIComponent(mensagem)}`
}

function MensalidadesMeses() {
  const [todasMensalidades, setTodasMensalidades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAno, setFiltroAno] = useState('todos')
  const [filtroMes, setFiltroMes] = useState('todos')

  useEffect(() => {
    gerarMensalidadesDoMesAtual().then(carregarTudo)
  }, [])

  async function gerarMensalidadesDoMesAtual() {
    const { data: alunosAtivos, error } = await supabase
      .from('aluno')
      .select('*')
      .eq('ativo', true)

    if (error || !alunosAtivos) return

    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth()
    const mesReferencia = `${ano}-${String(mes + 1).padStart(2, '0')}-01`

    for (const aluno of alunosAtivos) {
      const dataVencimento = new Date(ano, mes, aluno.dia_vencimento)
      const dataVencimentoStr = dataVencimento.toISOString().split('T')[0]

      await supabase.from('mensalidade').upsert(
        {
          aluno_id: aluno.id,
          mes_referencia: mesReferencia,
          data_vencimento: dataVencimentoStr,
          valor: aluno.valor_mensalidade,
          status: 'pendente',
        },
        { onConflict: 'aluno_id,mes_referencia', ignoreDuplicates: true }
      )
    }
  }

  async function carregarTudo() {
    const { data, error } = await supabase
      .from('mensalidade')
      .select('*, aluno(nome, telefone)')
      .order('data_vencimento', { ascending: false })

    if (error) {
      console.error('Erro ao carregar mensalidades:', error)
      setCarregando(false)
      return
    }

    setTodasMensalidades(data)
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
    carregarTudo()
  }

  if (carregando) return <Loading />

  const anosDisponiveis = [...new Set(todasMensalidades.map((m) => m.mes_referencia.slice(0, 4)))].sort((a, b) => b.localeCompare(a))

  const filtradasPorData = todasMensalidades.filter((m) => {
    const [ano, mes] = m.mes_referencia.split('-')
    if (filtroAno !== 'todos' && ano !== filtroAno) return false
    if (filtroMes !== 'todos' && mes !== filtroMes) return false
    return true
  })

  const modoBusca = busca.trim().length > 0

  const resultadosBusca = modoBusca
    ? filtradasPorData.filter((m) => m.aluno?.nome?.toLowerCase().includes(busca.toLowerCase()))
    : []

  const agrupadoPorMes = {}
  if (!modoBusca) {
    for (const m of filtradasPorData) {
      if (!agrupadoPorMes[m.mes_referencia]) {
        agrupadoPorMes[m.mes_referencia] = { total: 0, pagas: 0, atrasadas: 0 }
      }
      agrupadoPorMes[m.mes_referencia].total++
      const status = statusCalculado(m)
      if (status === 'pago') agrupadoPorMes[m.mes_referencia].pagas++
      if (status === 'atrasado') agrupadoPorMes[m.mes_referencia].atrasadas++
    }
  }

  const listaMeses = Object.entries(agrupadoPorMes)
    .map(([mesReferencia, contagens]) => ({ mesReferencia, ...contagens }))
    .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia))

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Mensalidades</h2>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder="Pesquisar aluno..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
          />
        </div>

        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
        >
          <option value="todos">Todos os meses</option>
          {NOMES_MESES.map((nome, i) => (
            <option key={nome} value={String(i + 1).padStart(2, '0')}>{nome}</option>
          ))}
        </select>

        <select
          value={filtroAno}
          onChange={(e) => setFiltroAno(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
        >
          <option value="todos">Todos os anos</option>
          {anosDisponiveis.map((ano) => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
      </div>

      {modoBusca ? (
        <ul className="space-y-2">
          {resultadosBusca.map((m) => {
            const status = statusCalculado(m)
            return (
              <li
                key={m.id}
                className={`flex items-center justify-between gap-3 bg-white border border-black/5 border-l-4 ${borda(status)} rounded-xl px-4 py-3 shadow-sm flex-wrap`}
              >
                <div>
                  <div className="font-semibold text-sm">{m.aluno?.nome}</div>
                  <div className="text-xs text-ink/50 mt-0.5">
                    {nomeDoMes(m.mes_referencia)} — R$ {m.valor} — vence {m.data_vencimento}
                  </div>
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
          {resultadosBusca.length === 0 && (
            <p className="text-sm text-ink/50 py-6 text-center">Nenhum resultado para essa busca.</p>
          )}
        </ul>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listaMeses.map((m) => (
            <Link key={m.mesReferencia} to={`/mensalidades/${m.mesReferencia}`}>
              <div className="bg-white border border-black/5 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-campo" />
                  <span className="font-bold text-campo-dark">{nomeDoMes(m.mesReferencia)}</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="text-ink/60">{m.total} aluno{m.total !== 1 ? 's' : ''}</span>
                  <span className="text-campo-dark font-semibold">{m.pagas} pago{m.pagas !== 1 ? 's' : ''}</span>
                  {m.atrasadas > 0 && (
                    <span className="text-brick font-semibold">{m.atrasadas} atrasado{m.atrasadas !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {listaMeses.length === 0 && (
            <p className="text-sm text-ink/50 py-6 text-center col-span-2">Nenhuma mensalidade encontrada com esse filtro.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default MensalidadesMeses