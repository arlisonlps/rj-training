import { useState } from 'react'
import { Plus, X, Swords, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { gerarJogosGrupo } from '../../domain/campeonato'

const campoBase =
  'px-3 py-2 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

function proximaLetra(grupos) {
  const usadas = new Set(grupos.map((g) => g.nome.replace(/^Grupo /, '')))
  for (let i = 0; i < 26; i++) {
    const letra = String.fromCharCode(65 + i)
    if (!usadas.has(letra)) return letra
  }
  return String(grupos.length + 1)
}

function GruposCampeonato({ campeonato, equipes, grupos, jogos, aoMudar }) {
  const [ocupado, setOcupado] = useState(false)

  const jogosDeGrupo = jogos.filter((j) => j.fase === 'grupo')
  const temJogos = jogosDeGrupo.length > 0
  const algumEncerrado = jogosDeGrupo.some((j) => j.encerrado)
  const gruposOrdenados = [...grupos].sort((a, b) => a.nome.localeCompare(b.nome))

  const problemas = []
  if (equipes.length < 2) problemas.push('Crie pelo menos 2 times na aba Times.')
  if (grupos.length === 0) problemas.push('Crie pelo menos um grupo.')
  if (equipes.some((e) => !e.grupo_id)) problemas.push('Todos os times precisam estar em um grupo.')
  for (const grupo of gruposOrdenados) {
    const total = equipes.filter((e) => e.grupo_id === grupo.id).length
    if (total === 0) problemas.push(`${grupo.nome} está vazio. Coloque times nele ou exclua o grupo.`)
    else if (total === 1) problemas.push(`${grupo.nome} tem só 1 time. Cada grupo precisa de pelo menos 2.`)
  }

  async function adicionarGrupo() {
    setOcupado(true)
    const { error } = await supabase
      .from('grupo')
      .insert({ campeonato_id: campeonato.id, nome: `Grupo ${proximaLetra(grupos)}` })
    setOcupado(false)
    if (error) {
      alert('Erro ao criar grupo: ' + error.message)
      return
    }
    aoMudar()
  }

  async function excluirGrupo(grupo) {
    const { error } = await supabase.from('grupo').delete().eq('id', grupo.id)
    if (error) {
      alert('Erro ao excluir grupo: ' + error.message)
      return
    }
    aoMudar()
  }

  async function mudarGrupoDoTime(equipeId, grupoId) {
    const { error } = await supabase
      .from('equipe')
      .update({ grupo_id: grupoId || null })
      .eq('id', equipeId)
    if (error) {
      alert('Erro ao mudar o time de grupo: ' + error.message)
      return
    }
    aoMudar()
  }

  async function gerarJogos() {
    const novos = gruposOrdenados.flatMap((grupo) =>
      gerarJogosGrupo(equipes.filter((e) => e.grupo_id === grupo.id).map((e) => e.id)).map((jogo) => ({
        ...jogo,
        campeonato_id: campeonato.id,
        fase: 'grupo',
        grupo_id: grupo.id,
      }))
    )

    if (!window.confirm(`Gerar ${novos.length} jogos? Depois disso os times não podem mais trocar de grupo.`)) return

    setOcupado(true)
    const { error } = await supabase.from('jogo').insert(novos)
    if (error) {
      setOcupado(false)
      alert('Erro ao gerar jogos: ' + error.message)
      return
    }

    const { error: erroStatus } = await supabase.from('campeonato').update({ status: 'grupos' }).eq('id', campeonato.id)
    setOcupado(false)
    if (erroStatus) alert('Jogos gerados, mas houve erro ao atualizar o status: ' + erroStatus.message)
    aoMudar()
  }

  async function refazerJogos() {
    if (!window.confirm('Apagar todos os jogos da fase de grupos para montar de novo?')) return

    setOcupado(true)
    const { error } = await supabase.from('jogo').delete().eq('campeonato_id', campeonato.id).eq('fase', 'grupo')
    if (error) {
      setOcupado(false)
      alert('Erro ao apagar os jogos: ' + error.message)
      return
    }
    await supabase.from('campeonato').update({ status: 'montando' }).eq('id', campeonato.id)
    setOcupado(false)
    aoMudar()
  }

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {gruposOrdenados.map((grupo) => {
          const total = equipes.filter((e) => e.grupo_id === grupo.id).length
          return (
            <span key={grupo.id} className="flex items-center gap-1.5 bg-campo-light text-campo-dark text-xs font-bold rounded-full pl-3 pr-2 py-1.5">
              {grupo.nome} ({total})
              {!temJogos && total === 0 && (
                <button type="button" onClick={() => excluirGrupo(grupo)} className="p-0.5 rounded-full hover:bg-black/10" aria-label={`Excluir ${grupo.nome}`}>
                  <X size={13} />
                </button>
              )}
            </span>
          )
        })}
        {!temJogos && (
          <button
            type="button"
            onClick={adicionarGrupo}
            disabled={ocupado}
            className="flex items-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2 rounded-full hover:bg-campo-dark transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            Adicionar grupo
          </button>
        )}
      </div>

      <ul className="space-y-2 mb-5">
        {equipes.map((equipe) => (
          <li key={equipe.id} className="flex items-center justify-between gap-3 bg-surface border border-border rounded-xl px-4 py-3">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: equipe.cor || '#9CA3AF' }} />
              <span className="font-semibold text-sm truncate">{equipe.nome}</span>
            </span>
            <select
              className={`${campoBase} w-36 disabled:opacity-60`}
              value={equipe.grupo_id || ''}
              onChange={(e) => mudarGrupoDoTime(equipe.id, e.target.value)}
              disabled={temJogos}
              aria-label={`Grupo do time ${equipe.nome}`}
            >
              <option value="">Sem grupo</option>
              {gruposOrdenados.map((grupo) => (
                <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>
              ))}
            </select>
          </li>
        ))}
        {equipes.length === 0 && (
          <p className="text-sm text-ink/50 py-6 text-center">Crie os times na aba Times primeiro.</p>
        )}
      </ul>

      {temJogos ? (
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-sm text-ink/70 mb-3">
            Os {jogosDeGrupo.length} jogos da fase de grupos já foram gerados. Ajuste data, horário e local na aba Jogos.
          </p>
          {algumEncerrado ? (
            <p className="text-xs text-ink/50">Já existem jogos com resultado, então não é possível apagar e refazer.</p>
          ) : (
            <button
              type="button"
              onClick={refazerJogos}
              disabled={ocupado}
              className="flex items-center gap-1.5 bg-brick-light text-brick text-xs font-semibold px-3 py-2 rounded-lg hover:bg-brick hover:text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Apagar jogos e refazer
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-4">
          {problemas.length > 0 && (
            <ul className="mb-3 space-y-1">
              {problemas.map((p) => (
                <li key={p} className="text-xs text-amber font-medium">{p}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={gerarJogos}
            disabled={ocupado || problemas.length > 0}
            className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-50"
          >
            <Swords size={16} />
            Gerar jogos da fase de grupos
          </button>
          <p className="text-[11px] text-ink/50 mt-2">Cada time enfrenta os outros do seu grupo uma única vez.</p>
        </div>
      )}
    </div>
  )
}

export default GruposCampeonato
