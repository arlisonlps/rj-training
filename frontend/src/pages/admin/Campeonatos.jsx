import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Plus, Users } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { STATUS_CAMPEONATO } from '../../lib/campeonatoStatus'
import Loading from '../../components/Loading'

function Campeonatos() {
  const [campeonatos, setCampeonatos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarCampeonatos()
  }, [])

  async function buscarCampeonatos() {
    const { data, error } = await supabase
      .from('campeonato')
      .select('id, nome, status, equipe(count)')
      .order('criado_em', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar campeonatos:', error)
    }
    setCampeonatos(data || [])
    setCarregando(false)
  }

  if (carregando) return <Loading />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-campo-dark">Campeonatos</h2>
        <Link to="/campeonatos/novo">
          <button className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors">
            <Plus size={16} />
            Criar Campeonato
          </button>
        </Link>
      </div>

      <ul className="space-y-3">
        {campeonatos.map((c) => {
          const status = STATUS_CAMPEONATO[c.status] || STATUS_CAMPEONATO.montando
          const totalEquipes = c.equipe?.[0]?.count ?? 0
          return (
            <Link key={c.id} to={`/campeonatos/${c.id}`}>
              <li className="bg-surface border border-border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer">
                <div className="flex items-center gap-2 mb-2 text-campo">
                  <Trophy size={16} />
                  <span className="font-bold text-sm">{c.nome}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${status.classe}`}>{status.rotulo}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-ink/60">
                  <Users size={12} />
                  {totalEquipes} {totalEquipes === 1 ? 'time' : 'times'}
                </div>
              </li>
            </Link>
          )
        })}
        {campeonatos.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Nenhum campeonato criado ainda.</p>
        )}
      </ul>
    </div>
  )
}

export default Campeonatos
