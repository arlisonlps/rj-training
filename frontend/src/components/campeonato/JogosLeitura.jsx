import { Trophy, MapPin } from 'lucide-react'
import { campeaoDoCampeonato } from '../../domain/campeonato'
import { formatarDataHoraCurta } from '../../lib/data'

const NOME_FASE = { oitavas: 'Oitavas de final', quartas: 'Quartas de final', semifinal: 'Semifinal', final: 'Final' }
const ORDEM_FASES = ['oitavas', 'quartas', 'semifinal', 'final']

function CartaoJogo({ jogo, nomes, destacarEquipeId }) {
  const nomeA = nomes[jogo.equipe_a_id] || 'A definir'
  const nomeB = nomes[jogo.equipe_b_id] || 'A definir'
  const temPlacar = jogo.gols_a !== null && jogo.gols_b !== null
  const destaque = destacarEquipeId && (jogo.equipe_a_id === destacarEquipeId || jogo.equipe_b_id === destacarEquipeId)

  return (
    <li className={`bg-surface border rounded-xl px-4 py-3 ${destaque ? 'border-campo' : 'border-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center justify-center flex-1 gap-3 text-sm">
          <span className="flex-1 text-right font-semibold truncate">{nomeA}</span>
          <span className="font-bold text-campo-dark shrink-0">{temPlacar ? `${jogo.gols_a} x ${jogo.gols_b}` : 'x'}</span>
          <span className="flex-1 font-semibold truncate">{nomeB}</span>
        </div>
        {jogo.encerrado && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sucesso-light text-sucesso shrink-0">ENCERRADO</span>}
      </div>
      {jogo.penaltis_a !== null && (
        <div className="text-center text-xs text-ink/50 mt-0.5">Pênaltis: {jogo.penaltis_a} x {jogo.penaltis_b}</div>
      )}
      <div className="flex items-center justify-center gap-3 text-[11px] text-ink/50 mt-1.5">
        <span>{jogo.data_hora ? formatarDataHoraCurta(jogo.data_hora) : 'Data a definir'}</span>
        {jogo.local && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {jogo.local}
          </span>
        )}
      </div>
    </li>
  )
}

function JogosLeitura({ tipo, jogos, equipes, grupos, destacarEquipeId }) {
  const nomes = Object.fromEntries(equipes.map((e) => [e.id, e.nome]))

  if (tipo === 'grupos') {
    const doGrupo = jogos.filter((j) => j.fase === 'grupo')
    if (doGrupo.length === 0) return <p className="text-sm text-ink/50 py-6 text-center">Os jogos ainda não foram definidos.</p>

    return (
      <div className="space-y-6">
        {[...grupos]
          .sort((a, b) => a.nome.localeCompare(b.nome))
          .map((grupo) => {
            const jogosDoGrupo = doGrupo.filter((j) => j.grupo_id === grupo.id)
            if (jogosDoGrupo.length === 0) return null
            const rodadas = [...new Set(jogosDoGrupo.map((j) => j.rodada))].sort((a, b) => a - b)
            return (
              <section key={grupo.id}>
                <h3 className="text-base font-bold text-campo-dark mb-2">{grupo.nome}</h3>
                {rodadas.map((rodada) => (
                  <div key={rodada} className="mb-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-1.5">Rodada {rodada}</div>
                    <ul className="space-y-2">
                      {jogosDoGrupo
                        .filter((j) => j.rodada === rodada)
                        .map((jogo) => (
                          <CartaoJogo key={jogo.id} jogo={jogo} nomes={nomes} destacarEquipeId={destacarEquipeId} />
                        ))}
                    </ul>
                  </div>
                ))}
              </section>
            )
          })}
      </div>
    )
  }

  const mataMata = jogos.filter((j) => j.fase !== 'grupo')
  if (mataMata.length === 0) {
    return <p className="text-sm text-ink/50 py-6 text-center">O mata-mata começa depois da fase de grupos.</p>
  }

  const campeaoId = campeaoDoCampeonato(mataMata)

  return (
    <div className="space-y-6">
      {campeaoId && (
        <div className="flex items-center gap-3 bg-amber-light text-amber rounded-2xl px-5 py-4">
          <Trophy size={26} className="shrink-0" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wide">Campeão</div>
            <div className="text-lg font-bold">{nomes[campeaoId]}</div>
          </div>
        </div>
      )}
      {ORDEM_FASES.filter((fase) => mataMata.some((j) => j.fase === fase)).map((fase) => (
        <section key={fase}>
          <h3 className="text-base font-bold text-campo-dark mb-2">{NOME_FASE[fase]}</h3>
          <ul className="space-y-2">
            {mataMata
              .filter((j) => j.fase === fase)
              .sort((a, b) => a.rodada - b.rodada)
              .map((jogo) => (
                <CartaoJogo key={jogo.id} jogo={jogo} nomes={nomes} destacarEquipeId={destacarEquipeId} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default JogosLeitura
