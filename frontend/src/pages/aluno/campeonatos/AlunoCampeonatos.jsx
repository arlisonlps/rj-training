import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { STATUS_CAMPEONATO } from '../../../lib/campeonatoStatus'

function AlunoCampeonatos() {
  const [campeonatos, setCampeonatos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data, error } = await supabase
      .from('campeonato')
      .select('id, nome, status')
      .order('criado_em', { ascending: false })
      .limit(20)
    if (error) console.error('Erro ao buscar campeonatos:', error)
    setCampeonatos(data || [])
    setCarregando(false)
  }

  if (carregando) return null
  if (campeonatos.length === 1) return <Navigate to={`/campeonatos/${campeonatos[0].id}`} replace />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Campeonatos</h2>
      <ul className="space-y-3">
        {campeonatos.map((c) => {
          const status = STATUS_CAMPEONATO[c.status] || STATUS_CAMPEONATO.montando
          return (
            <Link key={c.id} to={`/campeonatos/${c.id}`}>
              <li className="bg-surface border border-border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer">
                <div className="flex items-center gap-2 text-campo">
                  <Trophy size={16} />
                  <span className="font-bold text-sm">{c.nome}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${status.classe}`}>{status.rotulo}</span>
                </div>
              </li>
            </Link>
          )
        })}
        {campeonatos.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum campeonato por enquanto.</p>
        )}
      </ul>
    </div>
  )
}

export default AlunoCampeonatos
