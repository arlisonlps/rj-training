import { useState, useEffect } from 'react'
import { Scale } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from './supabaseClient'

function formatarDataCurta(dataIso) {
  const data = new Date(dataIso)
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

function AlunoPeso() {
  const [historico, setHistorico] = useState([])
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
      const { data } = await supabase
        .from('peso_historico')
        .select('*')
        .eq('aluno_id', perfil.aluno_id)
        .order('registrado_em', { ascending: true })
      setHistorico(data || [])
    }
    setCarregando(false)
  }

  if (carregando) return null

  const dadosGrafico = historico.map((h) => ({
    data: formatarDataCurta(h.registrado_em),
    peso: h.peso,
  }))
  const historicoDecrescente = [...historico].reverse()

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Meu peso</h2>

      <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-campo-dark mb-4">
          <Scale size={16} />
          Evolução do peso
        </h3>

        {dadosGrafico.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum registro ainda. Fale com o professor para registrar seu peso.</p>
        )}

        {dadosGrafico.length === 1 && (
          <p className="text-sm text-ink/50 pb-6 text-center">
            Só tem um registro ainda — o gráfico aparece a partir do segundo peso registrado.
          </p>
        )}

        {dadosGrafico.length >= 2 && (
          <div style={{ width: '100%', height: 240 }} className="mb-6">
            <ResponsiveContainer>
              <LineChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="data" tick={{ fontSize: 12 }} stroke="#8A8A8E" />
                <YAxis tick={{ fontSize: 12 }} stroke="#8A8A8E" unit="kg" width={50} />
                <Tooltip formatter={(valor) => [`${valor} kg`, 'Peso']} />
                <Line type="monotone" dataKey="peso" stroke="#C1272D" strokeWidth={2} dot={{ r: 4, fill: '#C1272D' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {historico.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-ink/50 border-b border-border">
                <th className="pb-2">Data</th>
                <th className="pb-2">Peso</th>
              </tr>
            </thead>
            <tbody>
              {historicoDecrescente.map((h) => (
                <tr key={h.id} className="border-b border-border">
                  <td className="py-2">{formatarDataCurta(h.registrado_em)}</td>
                  <td className="py-2 font-medium">{h.peso} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default AlunoPeso