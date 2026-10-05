import { rankingsEstatisticas, situacaoDisciplinar } from '../../domain/campeonato'

const LIMITE_RANKING = 10

function Ranking({ titulo, itens, equipePorJogador, unidade }) {
  return (
    <section className="bg-surface border border-border rounded-xl p-4 mb-4">
      <h3 className="text-sm font-bold text-campo-dark mb-2">{titulo}</h3>
      <ul className="space-y-1.5">
        {itens.slice(0, LIMITE_RANKING).map((item, i) => (
          <li key={item.jogadorId} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold bg-hover text-ink/60 shrink-0">{i + 1}</span>
              <span className="font-medium truncate">{item.nome}</span>
              <span className="text-xs text-ink/50 truncate">{equipePorJogador.get(item.jogadorId)}</span>
            </span>
            <span className="font-bold text-campo-dark shrink-0">{item.total} {unidade}</span>
          </li>
        ))}
        {itens.length === 0 && <li className="text-xs text-ink/50">Ainda sem registros.</li>}
      </ul>
    </section>
  )
}

function RankingsCampeonato({ campeonato, equipes, jogos, membros, eventos }) {
  const jogadores = []
  const equipePorJogador = new Map()
  const equipeJogadores = []
  const nomeEquipe = Object.fromEntries(equipes.map((e) => [e.id, e.nome]))

  for (const m of membros) {
    if (!m.jogador) continue
    jogadores.push(m.jogador)
    equipePorJogador.set(m.jogador.id, nomeEquipe[m.equipe_id])
    equipeJogadores.push({ jogador_id: m.jogador.id, equipe_id: m.equipe_id })
  }

  const { artilharia, assistencias, melhoresEmCampo } = rankingsEstatisticas(jogos, eventos, jogadores)
  const disciplina = situacaoDisciplinar(jogos, eventos, equipeJogadores, campeonato)
  const nomes = new Map(jogadores.map((j) => [j.id, j.apelido || j.nome]))

  const comRegistro = [...disciplina.values()]
    .filter((s) => s.totalAmarelos > 0 || s.totalVermelhos > 0 || s.suspenso || s.pendurado)
    .sort((a, b) => Number(b.suspenso) - Number(a.suspenso) || Number(b.pendurado) - Number(a.pendurado) || b.totalAmarelos - a.totalAmarelos)

  return (
    <div>
      <Ranking titulo="Artilharia" itens={artilharia} equipePorJogador={equipePorJogador} unidade="gols" />
      <Ranking titulo="Assistências" itens={assistencias} equipePorJogador={equipePorJogador} unidade="assist." />
      <Ranking titulo="Melhor em campo" itens={melhoresEmCampo} equipePorJogador={equipePorJogador} unidade="vezes" />

      <section className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-bold text-campo-dark mb-2">Disciplina</h3>
        <ul className="space-y-2">
          {comRegistro.map((s) => (
            <li key={s.jogadorId} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{nomes.get(s.jogadorId)}</span>
                <span className="text-xs text-ink/50 truncate">{equipePorJogador.get(s.jogadorId)}</span>
                {s.suspenso && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brick-light text-brick shrink-0">SUSPENSO</span>}
                {s.pendurado && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-light text-amber shrink-0">PENDURADO</span>}
              </span>
              <span className="flex items-center gap-3 text-xs shrink-0">
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-3.5 rounded-sm bg-amber" />{s.totalAmarelos}</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-3.5 rounded-sm bg-brick" />{s.totalVermelhos}</span>
              </span>
            </li>
          ))}
          {comRegistro.length === 0 && <li className="text-xs text-ink/50">Nenhum cartão até agora.</li>}
        </ul>
      </section>
    </div>
  )
}

export default RankingsCampeonato
