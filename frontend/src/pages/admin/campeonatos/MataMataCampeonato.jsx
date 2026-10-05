import { useState } from 'react'
import { Swords, RotateCcw, Trophy } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { classificacaoGrupo, gerarMataMata, calcularAvancos, campeaoDoCampeonato } from '../../../domain/campeonato'
import JogoLinha from './JogoLinha'
import ResultadoJogo from './ResultadoJogo'

const NOME_FASE = { oitavas: 'Oitavas de final', quartas: 'Quartas de final', semifinal: 'Semifinal', final: 'Final' }
const ORDEM_FASES = ['oitavas', 'quartas', 'semifinal', 'final']
const campoBase =
  'px-3 py-2 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

function ordenarPorFaseERodada(jogos) {
  return [...jogos].sort((a, b) => ORDEM_FASES.indexOf(a.fase) - ORDEM_FASES.indexOf(b.fase) || a.rodada - b.rodada)
}

function MataMataCampeonato({ campeonato, equipes, grupos, jogos, membros, eventos, aoMudar }) {
  const [edicoes, setEdicoes] = useState({})
  const [ocupado, setOcupado] = useState(false)
  const [jogoAberto, setJogoAberto] = useState(null)

  const nomePorEquipe = Object.fromEntries(equipes.map((e) => [e.id, e.nome]))
  const jogosDeGrupo = jogos.filter((j) => j.fase === 'grupo')
  const jogosMataMata = ordenarPorFaseERodada(jogos.filter((j) => j.fase !== 'grupo'))
  const gruposOrdenados = [...grupos].sort((a, b) => a.nome.localeCompare(b.nome))

  async function sincronizarAvancos() {
    const { data: atuais } = await supabase.from('jogo').select('*').eq('campeonato_id', campeonato.id).neq('fase', 'grupo')
    const lista = atuais || []

    let bloqueado = false
    for (const mudanca of calcularAvancos(lista)) {
      if (mudanca.bloqueado) {
        bloqueado = true
        continue
      }
      await supabase.from('jogo').update({ [mudanca.campo]: mudanca.equipeId }).eq('id', mudanca.jogoId)
    }
    if (bloqueado) {
      alert('Esse resultado muda quem avança, mas o jogo seguinte já foi encerrado. Reabra o jogo seguinte e lance de novo.')
    }

    const campeao = campeaoDoCampeonato(lista)
    const statusDesejado = campeao ? 'encerrado' : 'mata_mata'
    if (campeonato.status !== statusDesejado && lista.length > 0) {
      await supabase.from('campeonato').update({ status: statusDesejado }).eq('id', campeonato.id)
    }
  }

  async function fecharResultado() {
    setJogoAberto(null)
    await sincronizarAvancos()
    aoMudar()
  }

  if (jogosMataMata.length > 0) {
    const algumEncerrado = jogosMataMata.some((j) => j.encerrado)
    const campeaoId = campeaoDoCampeonato(jogosMataMata)
    const fasesPresentes = ORDEM_FASES.filter((f) => jogosMataMata.some((j) => j.fase === f))
    const jogoDoModal = jogoAberto ? jogos.find((j) => j.id === jogoAberto) : null

    async function refazer() {
      if (!window.confirm('Apagar todo o mata-mata para montar de novo?')) return
      setOcupado(true)
      const { error } = await supabase.from('jogo').delete().eq('campeonato_id', campeonato.id).neq('fase', 'grupo')
      if (error) {
        setOcupado(false)
        alert('Erro ao apagar o mata-mata: ' + error.message)
        return
      }
      await supabase.from('campeonato').update({ status: 'grupos' }).eq('id', campeonato.id)
      setOcupado(false)
      aoMudar()
    }

    return (
      <div className="space-y-6">
        {campeaoId && (
          <div className="flex items-center gap-3 bg-amber-light text-amber rounded-2xl px-5 py-4">
            <Trophy size={26} className="shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide">Campeão</div>
              <div className="text-lg font-bold">{nomePorEquipe[campeaoId]}</div>
            </div>
          </div>
        )}

        {fasesPresentes.map((fase) => (
          <section key={fase}>
            <h3 className="text-base font-bold text-campo-dark mb-2">{NOME_FASE[fase]}</h3>
            <ul className="space-y-2">
              {jogosMataMata
                .filter((j) => j.fase === fase)
                .map((jogo) => (
                  <JogoLinha
                    key={jogo.id + (jogo.data_hora || '') + (jogo.local || '') + (jogo.equipe_a_id || '') + (jogo.equipe_b_id || '')}
                    jogo={jogo}
                    nomeA={nomePorEquipe[jogo.equipe_a_id]}
                    nomeB={nomePorEquipe[jogo.equipe_b_id]}
                    aoSalvar={aoMudar}
                    aoAbrirResultado={() => setJogoAberto(jogo.id)}
                  />
                ))}
            </ul>
          </section>
        ))}

        <div className="bg-surface border border-border rounded-xl p-4">
          {algumEncerrado ? (
            <p className="text-xs text-ink/50">Já existem jogos com resultado, então não é possível apagar e refazer o mata-mata.</p>
          ) : (
            <button
              type="button"
              onClick={refazer}
              disabled={ocupado}
              className="flex items-center gap-1.5 bg-brick-light text-brick text-xs font-semibold px-3 py-2 rounded-lg hover:bg-brick hover:text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Apagar mata-mata e refazer
            </button>
          )}
        </div>

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

  const faltamEncerrar = jogosDeGrupo.filter((j) => !j.encerrado).length
  const pendencias = []
  if (jogosDeGrupo.length === 0) pendencias.push('Gere os jogos da fase de grupos primeiro.')
  if (faltamEncerrar > 0) {
    pendencias.push(`Faltam ${faltamEncerrar} ${faltamEncerrar === 1 ? 'jogo' : 'jogos'} da fase de grupos para encerrar.`)
  }

  const classificados = []
  if (pendencias.length === 0) {
    for (const grupo of gruposOrdenados) {
      const doGrupo = equipes.filter((e) => e.grupo_id === grupo.id)
      if (doGrupo.length === 0) continue
      const tabela = classificacaoGrupo(doGrupo, jogos)
      const empatados = tabela.filter((l) => l.empateNaoResolvido && l.posicao <= campeonato.classificados_por_grupo)
      if (empatados.length > 0) {
        pendencias.push(`Defina o desempate do ${grupo.nome} na aba Classificação.`)
      }
      for (const linha of tabela.slice(0, campeonato.classificados_por_grupo)) {
        classificados.push({
          equipeId: linha.equipeId,
          grupoId: grupo.id,
          grupoNome: grupo.nome,
          posicao: linha.posicao,
          pontos: linha.pontos,
          saldo: linha.saldo,
          golsPro: linha.golsPro,
        })
      }
    }
  }

  if (pendencias.length > 0 || classificados.length < 2) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-campo-dark mb-2">O mata-mata ainda não pode ser montado.</p>
        <ul className="space-y-1">
          {(pendencias.length > 0 ? pendencias : ['São necessários pelo menos 2 classificados.']).map((p) => (
            <li key={p} className="text-xs text-amber font-medium">{p}</li>
          ))}
        </ul>
      </div>
    )
  }

  const estrutura = gerarMataMata(classificados)
  const rotuloClassificado = Object.fromEntries(
    classificados.map((c) => [c.equipeId, `${nomePorEquipe[c.equipeId]} (${c.posicao}º ${c.grupoNome})`])
  )

  function equipeDoSlot(jogo, lado) {
    const campo = lado === 'a' ? 'equipe_a_id' : 'equipe_b_id'
    return edicoes[`${jogo.chave}:${lado}`] ?? jogo[campo]
  }

  const slotsEditaveis = estrutura.flatMap((jogo) =>
    ['a', 'b'].filter((lado) => jogo[lado === 'a' ? 'equipe_a_id' : 'equipe_b_id'] != null).map((lado) => ({ jogo, lado }))
  )
  const escolhidas = slotsEditaveis.map(({ jogo, lado }) => equipeDoSlot(jogo, lado))
  const repetidas = new Set(escolhidas).size !== escolhidas.length
  const rodadasOrdenadas = ORDEM_FASES.filter((f) => estrutura.some((j) => j.fase === f))

  function origemDoSlot(jogo, lado) {
    const alimentador = estrutura.find((j) => j.proximo_chave === jogo.chave && j.proximo_lado === lado)
    return alimentador ? `Vencedor de ${NOME_FASE[alimentador.fase]} ${alimentador.chave.split('-')[1]}` : 'A definir'
  }

  async function gerar() {
    if (repetidas) {
      alert('Um mesmo time aparece em mais de um confronto. Ajuste antes de gerar.')
      return
    }
    if (!window.confirm('Gerar o mata-mata com esses confrontos?')) return

    setOcupado(true)
    const registros = estrutura.map((jogo) => ({
      campeonato_id: campeonato.id,
      fase: jogo.fase,
      rodada: Number(jogo.chave.split('-')[1]),
      equipe_a_id: equipeDoSlot(jogo, 'a'),
      equipe_b_id: equipeDoSlot(jogo, 'b'),
    }))

    const { data: criados, error } = await supabase.from('jogo').insert(registros).select('id, fase, rodada')
    if (error) {
      setOcupado(false)
      alert('Erro ao gerar o mata-mata: ' + error.message)
      return
    }

    const idPorChave = Object.fromEntries(criados.map((c) => [`${c.fase}-${c.rodada}`, c.id]))
    for (const jogo of estrutura.filter((j) => j.proximo_chave)) {
      const { error: erroLigacao } = await supabase
        .from('jogo')
        .update({ proximo_jogo_id: idPorChave[jogo.proximo_chave], proximo_lado: jogo.proximo_lado })
        .eq('id', idPorChave[jogo.chave])
      if (erroLigacao) {
        await supabase.from('jogo').delete().eq('campeonato_id', campeonato.id).neq('fase', 'grupo')
        setOcupado(false)
        alert('Erro ao ligar as fases do mata-mata: ' + erroLigacao.message)
        return
      }
    }

    await supabase.from('campeonato').update({ status: 'mata_mata' }).eq('id', campeonato.id)
    setOcupado(false)
    aoMudar()
  }

  return (
    <div>
      <p className="text-sm text-ink/70 mb-4">
        Fase de grupos concluída. Esses são os confrontos sugeridos, cruzando os grupos. Você pode trocar os times antes de gerar.
      </p>

      <div className="space-y-5 mb-5">
        {rodadasOrdenadas.map((fase) => (
          <section key={fase}>
            <h3 className="text-base font-bold text-campo-dark mb-2">{NOME_FASE[fase]}</h3>
            <ul className="space-y-2">
              {estrutura
                .filter((j) => j.fase === fase)
                .map((jogo) => (
                  <li key={jogo.chave} className="bg-surface border border-border rounded-xl p-3 flex flex-col gap-2">
                    {['a', 'b'].map((lado) => {
                      const editavel = jogo[lado === 'a' ? 'equipe_a_id' : 'equipe_b_id'] != null
                      return editavel ? (
                        <select
                          key={lado}
                          className={campoBase}
                          value={equipeDoSlot(jogo, lado)}
                          onChange={(e) => setEdicoes((atuais) => ({ ...atuais, [`${jogo.chave}:${lado}`]: e.target.value }))}
                          aria-label={`Time ${lado.toUpperCase()} do jogo ${jogo.chave}`}
                        >
                          {classificados.map((c) => (
                            <option key={c.equipeId} value={c.equipeId}>{rotuloClassificado[c.equipeId]}</option>
                          ))}
                        </select>
                      ) : (
                        <div key={lado} className="px-3 py-2 text-sm text-ink/50 bg-cream rounded-lg">{origemDoSlot(jogo, lado)}</div>
                      )
                    })}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {repetidas && <p className="text-xs text-amber font-medium mb-3">Um mesmo time aparece em mais de um confronto.</p>}

      <button
        type="button"
        onClick={gerar}
        disabled={ocupado || repetidas}
        className="flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-50"
      >
        <Swords size={16} />
        Gerar mata-mata
      </button>
    </div>
  )
}

export default MataMataCampeonato
