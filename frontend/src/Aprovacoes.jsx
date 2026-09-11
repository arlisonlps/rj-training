import { useState, useEffect } from 'react'
import { Check, X, User } from 'lucide-react'
import { supabase } from './supabaseClient'

function Aprovacoes() {
  const [pendentes, setPendentes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarPendentes()
  }, [])

  async function buscarPendentes() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('perfil_usuario')
      .select('user_id, criado_em, aluno(id, nome, cpf, telefone, nascimento)')
      .eq('papel', 'aluno')
      .eq('status', 'pendente')
      .order('criado_em')

    if (error) {
      console.error('Erro ao buscar pendentes:', error)
      setCarregando(false)
      return
    }
    setPendentes(data)
    setCarregando(false)
  }

  async function aprovar(userId) {
    const { error } = await supabase
      .from('perfil_usuario')
      .update({ status: 'aprovado' })
      .eq('user_id', userId)

    if (error) {
      alert('Erro ao aprovar: ' + error.message)
      return
    }
    buscarPendentes()
  }

  async function rejeitar(userId, alunoId, nome) {
    const confirmado = window.confirm(`Rejeitar o cadastro de ${nome}? Isso apaga os dados enviados.`)
    if (!confirmado) return

    const { error } = await supabase.from('aluno').delete().eq('id', alunoId)

    if (error) {
      alert('Erro ao rejeitar: ' + error.message)
      return
    }
    buscarPendentes()
  }

  if (carregando) return null

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Aprovações pendentes</h2>

      <ul className="space-y-2">
        {pendentes.map((p) => (
          <li
            key={p.user_id}
            className="flex items-center justify-between gap-3 bg-white border border-black/5 rounded-xl px-4 py-3 shadow-sm flex-wrap"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-campo-light text-campo-dark flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <div>
                <div className="font-medium text-sm">{p.aluno?.nome}</div>
                <div className="text-xs text-ink/50 mt-0.5">
                  CPF: {p.aluno?.cpf} — WhatsApp: {p.aluno?.telefone}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => aprovar(p.user_id)}
                className="flex items-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-campo-dark transition-colors"
              >
                <Check size={14} />
                Aprovar
              </button>
              <button
                onClick={() => rejeitar(p.user_id, p.aluno?.id, p.aluno?.nome)}
                className="flex items-center gap-1.5 bg-brick-light text-brick text-xs font-semibold px-3 py-2 rounded-lg hover:bg-brick hover:text-white transition-colors"
              >
                <X size={14} />
                Rejeitar
              </button>
            </div>
          </li>
        ))}
        {pendentes.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum cadastro pendente no momento.</p>
        )}
      </ul>
    </div>
  )
}

export default Aprovacoes