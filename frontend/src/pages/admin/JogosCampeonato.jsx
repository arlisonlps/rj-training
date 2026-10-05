import { useState } from 'react'
import { MapPin, Save, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { paraInputDataHora, deInputDataHora } from '../../lib/data'
import ResultadoJogo from './ResultadoJogo'

const campoBase =
  'px-3 py-2 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

function JogoLinha({ jogo, nomeA, nomeB, aoSalvar, aoAbrirResultado }) {
  const [dataHora, setDataHora] = useState(paraInputDataHora(jogo.data_hora))
  const [local, setLocal] = useState(jogo.local || '')
  const [salvando, setSalvando] = useState(false)

  const alterado = dataHora !== paraInputDataHora(jogo.data_hora) || local !== (jogo.local || '')
  const temPlacar = jogo.gols_a !== null && jogo.gols_b !== null

  async function salvar() {
    setSalvando(true)
    const { error } = await supabase
      .from('jogo')
      .update({ data_hora: deInputDataHora(dataHora), local: local.trim() || null })
      .eq('id', jogo.id)
    setSalvando(false)
    if (error) {
      alert('Erro ao salvar o jogo: ' + error.message)
      return
    }
    aoSalvar()
  }

  return (
    <li className="bg-surface border border-border rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-semibold text-sm">
          {nomeA}
          <span className="mx-2 font-bold text-campo-dark">{temPlacar ? `${jogo.gols_a} x ${jogo.gols_b}` : 'x'}</span>
          {nomeB}
          {jogo.penaltis_a !== null && (
            <span className="ml-2 text-xs font-normal text-ink/50">({jogo.penaltis_a} x {jogo.penaltis_b} nos pênaltis)</span>
          )}
        </div>
        {jogo.encerrado && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sucesso-light text-sucesso shrink-0">ENCERRADO</span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="datetime-local"
          className={`${campoBase} flex-1 min-w-44`}
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
          aria-label="Data e horário do jogo"
        />
        <div className="relative flex-1 min-w-36">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            className={`${campoBase} w-full pl-8`}
            placeholder="Local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
        </div>
        {alterado ? (
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={aoAbrirResultado}
            className="flex items-center gap-1.5 bg-campo-light text-campo-dark text-xs font-semibold px-3 py-2.5 rounded-lg hover:brightness-95 transition-all"
          >
            <ClipboardList size={14} />
            {jogo.encerrado ? 'Ver / editar resultado' : 'Lançar resultado'}
          </button>
        )}
      </div>
    </li>
  )
}

function JogosCampeonato({ campeonato, equipes, grupos, jogos, membros, eventos, aoMudar }) {
  const [jogoAberto, setJogoAberto] = useState(null)

  const nomePorEquipe = Object.fromEntries(equipes.map((e) => [e.id, e.nome]))
  const jogosDeGrupo = jogos.filter((j) => j.fase === 'grupo')

  if (jogosDeGrupo.length === 0) {
    return (
      <p className="text-sm text-ink/50 py-6 text-center">
        Nenhum jogo ainda. Monte os grupos e gere os jogos na aba Grupos.
      </p>
    )
  }

  const gruposOrdenados = [...grupos].sort((a, b) => a.nome.localeCompare(b.nome))
  const jogoDoModal = jogoAberto ? jogos.find((j) => j.id === jogoAberto) : null

  function fecharResultado() {
    setJogoAberto(null)
    aoMudar()
  }

  return (
    <div className="space-y-6">
      {gruposOrdenados.map((grupo) => {
        const doGrupo = jogosDeGrupo.filter((j) => j.grupo_id === grupo.id)
        if (doGrupo.length === 0) return null
        const rodadas = [...new Set(doGrupo.map((j) => j.rodada))].sort((a, b) => a - b)

        return (
          <section key={grupo.id}>
            <h3 className="text-base font-bold text-campo-dark mb-2">{grupo.nome}</h3>
            {rodadas.map((rodada) => (
              <div key={rodada} className="mb-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-1.5">Rodada {rodada}</div>
                <ul className="space-y-2">
                  {doGrupo
                    .filter((j) => j.rodada === rodada)
                    .map((jogo) => (
                      <JogoLinha
                        key={jogo.id + (jogo.data_hora || '') + (jogo.local || '')}
                        jogo={jogo}
                        nomeA={nomePorEquipe[jogo.equipe_a_id]}
                        nomeB={nomePorEquipe[jogo.equipe_b_id]}
                        aoSalvar={aoMudar}
                        aoAbrirResultado={() => setJogoAberto(jogo.id)}
                      />
                    ))}
                </ul>
              </div>
            ))}
          </section>
        )
      })}

      {jogoDoModal && (
        <ResultadoJogo
          key={jogoDoModal.id}
          jogo={jogoDoModal}
          campeonato={campeonato}
          nomeA={nomePorEquipe[jogoDoModal.equipe_a_id]}
          nomeB={nomePorEquipe[jogoDoModal.equipe_b_id]}
          jogos={jogos}
          membros={membros}
          eventos={eventos}
          aoFechar={fecharResultado}
        />
      )}
    </div>
  )
}

export default JogosCampeonato
