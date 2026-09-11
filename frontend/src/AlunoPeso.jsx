import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function AlunoPeso() {
  const [alunoId, setAlunoId] = useState(null)
  const [historico, setHistorico] = useState([])
  const [novoPeso, setNovoPeso] = useState('')
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
      setAlunoId(perfil.aluno_id)
      await carregarHistorico(perfil.aluno_id)
    }
    setCarregando(false)
  }

  async function carregarHistorico(id) {
    const { data } = await supabase
      .from('peso_historico')
      .select('*')
      .eq('aluno_id', id)
      .order('registrado_em', { ascending: false })
    setHistorico(data || [])
  }

  async function registrarPeso(e) {
    e.preventDefault()
    if (!novoPeso || !alunoId) return

    const { error } = await supabase.from('peso_historico').insert({
      aluno_id: alunoId,
      peso: Number(novoPeso),
    })

    if (error) {
      alert('Erro ao registrar peso: ' + error.message)
      return
    }

    setNovoPeso('')
    carregarHistorico(alunoId)
  }

  if (carregando) return null

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Meu peso</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
        <form onSubmit={registrarPeso} className="flex gap-2 mb-5">
          <input
            type="number"
            step="0.1"
            placeholder="Novo peso (kg)"
            value={novoPeso}
            onChange={(e) => setNovoPeso(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
          />
          <button type="submit" className="bg-campo text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-campo-dark transition-colors">
            Registrar
          </button>
        </form>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-ink/50 border-b border-black/5">
              <th className="pb-2">Data</th>
              <th className="pb-2">Peso</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((h) => (
              <tr key={h.id} className="border-b border-black/5">
                <td className="py-2">{h.registrado_em}</td>
                <td className="py-2 font-medium">{h.peso} kg</td>
              </tr>
            ))}
            {historico.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-ink/50 text-center">Nenhum registro ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AlunoPeso