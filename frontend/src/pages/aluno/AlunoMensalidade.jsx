import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

function selo(status) {
  if (status === 'pago') return 'bg-campo-light text-campo-dark'
  if (status === 'atrasado') return 'bg-brick-light text-brick'
  return 'bg-amber-light text-amber'
}

function AlunoMensalidade() {
  const [mensalidade, setMensalidade] = useState(null)
  const [carregando, setCarregando] = useState(true)

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
      const hoje = new Date()
      const mesReferencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

      const { data } = await supabase
        .from('mensalidade')
        .select('*')
        .eq('aluno_id', perfil.aluno_id)
        .eq('mes_referencia', mesReferencia)
        .maybeSingle()

      setMensalidade(data)
    }
    setCarregando(false)
  }

  function statusCalculado(m) {
    if (m.status === 'pago') return 'pago'
    const hoje = new Date().toISOString().split('T')[0]
    return m.data_vencimento < hoje ? 'atrasado' : 'pendente'
  }

  if (carregando) return null

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Minha mensalidade</h2>

      {!mensalidade && (
        <p className="text-sm text-ink/50">Nenhuma mensalidade encontrada para este mês ainda.</p>
      )}

      {mensalidade && (
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
          <div className="text-sm text-ink/50 mb-1">Vencimento: {mensalidade.data_vencimento}</div>
          <div className="text-lg font-bold mb-3">R$ {mensalidade.valor}</div>
          <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded ${selo(statusCalculado(mensalidade))}`}>
            {statusCalculado(mensalidade).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}

export default AlunoMensalidade