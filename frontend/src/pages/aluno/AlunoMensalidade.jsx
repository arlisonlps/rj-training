import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { formatarData } from '../../lib/data'
import { PIX_CHAVE, PIX_NOME, PIX_BANCO } from '../../lib/pix'

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
  return m.data_vencimento < hoje ? 'atrasado' : 'pendente'
}

function AlunoMensalidade() {
  const [mensalidades, setMensalidades] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [pixCopiadoId, setPixCopiadoId] = useState(null)

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

      <div className="flex flex-col gap-3">
        {mensalidades.map((m) => {
          const status = statusCalculado(m)
          return (
            <div key={m.id} className="bg-surface rounded-2xl shadow-sm border border-border p-6">
              <div className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">
                {nomeDoMes(m.mes_referencia)}
              </div>
              <div className="text-sm text-ink/50 mb-1">Vencimento: {formatarData(m.data_vencimento)}</div>
              <div className="text-lg font-bold mb-3">R$ {m.valor}</div>
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded ${selo(status)}`}>
                {status.toUpperCase()}
              </span>

              {status !== 'pago' && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => copiarPix(m.id)}
                    className="w-full flex items-center justify-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-campo-dark transition-colors"
                  >
                    {pixCopiadoId === m.id ? <Check size={14} /> : <Copy size={14} />}
                    {pixCopiadoId === m.id ? 'Chave copiada!' : `Copiar PIX (${PIX_BANCO})`}
                  </button>
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
