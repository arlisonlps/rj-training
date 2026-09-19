import { useState, useEffect } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatarData } from '../../lib/data'
import { PIX_CHAVE, PIX_NOME, PIX_BANCO } from '../../lib/pix'

function BotaoPix({ copiado, onClick }) {
  const [ref] = useAutoAnimate()

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-campo-dark active:scale-95 transition-all"
    >
      <span ref={ref} className="flex items-center gap-1.5">
        {copiado ? <Check size={14} key="check" /> : <Copy size={14} key="copy" />}
        <span key={copiado ? 'copiado' : 'copiar'}>
          {copiado ? 'Chave copiada!' : `Copiar PIX (${PIX_BANCO})`}
        </span>
      </span>
    </button>
  )
}

function selo(status) {
  if (status === 'pago') return 'bg-sucesso-light text-sucesso'
  if (status === 'atrasado') return 'bg-brick-light text-brick'
  return 'bg-amber-light text-amber'
}

function nomeDoMes(mesReferencia) {
  const [ano, mes] = mesReferencia.split('-')
  const data = new Date(Number(ano), Number(mes) - 1, 1)
  const nome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function ultimosTresMeses() {
  const hoje = new Date()
  return [0, 1, 2].map((offset) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1)
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-01`
  })
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

function AlunoMensalidade() {
  const [mensalidades, setMensalidades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pixCopiadoId, setPixCopiadoId] = useState(null)
  const [listaRef] = useAutoAnimate()

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data: userData } = await supabase.auth.getUser()
    const { data: perfil } = await supabase
      .from('perfil_usuario')
      .select('aluno_id')
      .eq('user_id', userData.user.id)
      .single()

    if (perfil?.aluno_id) {
      const meses = ultimosTresMeses()

      const { data } = await supabase
        .from('mensalidade')
        .select('*')
        .eq('aluno_id', perfil.aluno_id)
        .in('mes_referencia', meses)
        .order('mes_referencia', { ascending: false })

      setMensalidades(data || [])
    }
    setCarregando(false)
  }

  async function copiarPix(id) {
    try {
      await navigator.clipboard.writeText(PIX_CHAVE)
      setPixCopiadoId(id)
      setTimeout(() => setPixCopiadoId(null), 2000)
    } catch {
      alert(`Chave PIX: ${PIX_CHAVE}`)
    }
  }

  if (carregando) return null

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Minha mensalidade</h2>

      {mensalidades.length === 0 && (
        <p className="text-sm text-ink/50">Nenhuma mensalidade encontrada nos últimos meses.</p>
      )}

      <div ref={listaRef} className="flex flex-col gap-3">
        {mensalidades.map((m) => {
          const status = statusCalculado(m)
          return (
            <div key={m.id} className="bg-surface rounded-2xl shadow-sm border border-border p-6">
              <div className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">
                {nomeDoMes(m.mes_referencia)}
              </div>
              <div className="text-sm text-ink/50 mb-1">Vencimento: {formatarData(m.data_vencimento)}</div>
              <div className="text-lg font-bold mb-3">R$ {m.valor}</div>
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded transition-all duration-300 ${selo(status)}`}>
                {status.toUpperCase()}
              </span>

              {status !== 'pago' && (
                <div className="mt-4 pt-4 border-t border-border">
                  <BotaoPix copiado={pixCopiadoId === m.id} onClick={() => copiarPix(m.id)} />
                  <p className="text-[10px] text-ink/40 mt-1.5 text-center">Recebedor: {PIX_NOME}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AlunoMensalidade
