import { useState } from 'react'
import JogoLinha from './JogoLinha'
import ResultadoJogo from './ResultadoJogo'

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
