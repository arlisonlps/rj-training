import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { supabase } from './supabaseClient'
import Loading from './Loading'

function nomeDoMes(mesReferencia) {
  const [ano, mes] = mesReferencia.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  const nome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function MensalidadesMeses() {
  const [meses, setMeses] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    gerarMensalidadesDoMesAtual().then(carregarMeses)
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

  async function carregarMeses() {
    const { data, error } = await supabase
      .from('mensalidade')
      .select('mes_referencia, status, data_vencimento')

    if (error) {
      console.error('Erro ao carregar meses:', error)
      return
    }

    const hoje = new Date().toISOString().split('T')[0]
    const agrupado = {}

    for (const m of data) {
      if (!agrupado[m.mes_referencia]) {
        agrupado[m.mes_referencia] = { total: 0, pagas: 0, atrasadas: 0 }
      }
      agrupado[m.mes_referencia].total++
      if (m.status === 'pago') {
        agrupado[m.mes_referencia].pagas++
      } else if (m.data_vencimento < hoje) {
        agrupado[m.mes_referencia].atrasadas++
      }
    }

    const lista = Object.entries(agrupado)
      .map(([mesReferencia, contagens]) => ({ mesReferencia, ...contagens }))
      .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia))

    setMeses(lista)
    setCarregando(false)
  }

  if (carregando) return <Loading />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Mensalidades</h2>

      <div className="grid grid-cols-2 gap-4">
        {meses.map((m) => (
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
        {meses.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center col-span-2">Nenhuma mensalidade registrada ainda.</p>
        )}
      </div>
    </div>
  )
}

export default MensalidadesMeses