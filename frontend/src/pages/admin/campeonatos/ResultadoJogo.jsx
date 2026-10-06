import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Minus, Plus } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { conferirPlacar, situacaoDisciplinar } from '../../../domain/campeonato'

const campoBase =
  'px-3 py-2 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

const COLUNAS = [
  { tipo: 'gol', rotulo: 'Gol', cabecalho: 'Gol' },
  { tipo: 'assistencia', rotulo: 'Assistência', cabecalho: 'Ass.' },
  { tipo: 'amarelo', rotulo: 'Cartão amarelo', cabecalho: <span className="inline-block w-2.5 h-3.5 rounded-sm bg-amber" /> },
  { tipo: 'vermelho', rotulo: 'Cartão vermelho', cabecalho: <span className="inline-block w-2.5 h-3.5 rounded-sm bg-brick" /> },
]

function nomeDoJogador(jogador) {
  return jogador.apelido || jogador.nome
}

function numeroOuNulo(texto) {
  return texto === '' ? null : Number(texto)
}

function Celula({ valor, rotulo, nome, ocupado, aoMais, aoMenos }) {
  return (
    <td className="w-[62px] text-center py-1.5">
      {valor === 0 ? (
        <button
          type="button"
          onClick={aoMais}
          disabled={ocupado}
          className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-cream text-ink/50 hover:bg-hover disabled:opacity-50"
          aria-label={`Adicionar ${rotulo} para ${nome}`}
        >
          <Plus size={14} />
        </button>
      ) : (
        <span className="inline-flex items-center">
          <button
            type="button"
            onClick={aoMenos}
            disabled={ocupado}
            className="w-6 h-7 inline-flex items-center justify-center rounded-md text-ink/60 hover:bg-hover disabled:opacity-50"
            aria-label={`Remover ${rotulo} de ${nome}`}
          >
            <Minus size={12} />
          </button>
          <span className="w-3.5 text-center text-sm font-bold">{valor}</span>
          <button
            type="button"
            onClick={aoMais}
            disabled={ocupado}
            className="w-6 h-7 inline-flex items-center justify-center rounded-md bg-campo text-white hover:bg-campo-dark disabled:opacity-50"
            aria-label={`Adicionar ${rotulo} para ${nome}`}
          >
            <Plus size={12} />
          </button>
        </span>
      )}
    </td>
  )
}

function ResultadoJogo({ jogo, campeonato, nomeA, nomeB, jogos, membros, eventos, aoFechar }) {
  const [golsA, setGolsA] = useState(jogo.gols_a ?? '')
  const [golsB, setGolsB] = useState(jogo.gols_b ?? '')
  const [penaltisA, setPenaltisA] = useState(jogo.penaltis_a ?? '')
  const [penaltisB, setPenaltisB] = useState(jogo.penaltis_b ?? '')
  const [melhor, setMelhor] = useState(jogo.melhor_jogador_id ?? '')
  const [eventosDoJogo, setEventosDoJogo] = useState(() => eventos.filter((e) => e.jogo_id === jogo.id))
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    function aoApertarTecla(e) {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoApertarTecla)
    return () => document.removeEventListener('keydown', aoApertarTecla)
  }, [aoFechar])

  const jogadoresDoTime = (equipeId) => membros.filter((m) => m.equipe_id === equipeId && m.jogador).map((m) => m.jogador)
  const jogadoresA = jogadoresDoTime(jogo.equipe_a_id)
  const jogadoresB = jogadoresDoTime(jogo.equipe_b_id)
  const equipeJogadores = membros.filter((m) => m.jogador).map((m) => ({ jogador_id: m.jogador.id, equipe_id: m.equipe_id }))

  const eventosDoCampeonato = eventos.filter((e) => e.jogo_id !== jogo.id).concat(eventosDoJogo)
  const disciplina = situacaoDisciplinar(jogos, eventosDoCampeonato, equipeJogadores, campeonato)

  const mataMata = jogo.fase !== 'grupo'
  const empatou = golsA !== '' && golsB !== '' && Number(golsA) === Number(golsB)
  const placar = { ...jogo, gols_a: numeroOuNulo(golsA), gols_b: numeroOuNulo(golsB) }
  const conferencia = conferirPlacar(placar, eventosDoJogo, equipeJogadores)
  const placarPreenchido = golsA !== '' && golsB !== ''

  function contar(jogadorId, tipo) {
    return eventosDoJogo.filter((e) => e.jogador_id === jogadorId && e.tipo === tipo).length
  }

  function situacaoNoJogo(jogadorId) {
    const situacao = disciplina.get(jogadorId)
    return {
      suspenso: !jogo.encerrado && Boolean(situacao?.suspenso) && situacao.proximoJogoId === jogo.id,
      pendurado: !jogo.encerrado && Boolean(situacao?.pendurado),
    }
  }

  async function adicionar(jogador, tipo) {
    if (situacaoNoJogo(jogador.id).suspenso) {
      if (!window.confirm(`${nomeDoJogador(jogador)} está suspenso neste jogo. Lançar mesmo assim?`)) return
    }

    setOcupado(true)
    const { data, error } = await supabase
      .from('jogo_evento')
      .insert({ jogo_id: jogo.id, jogador_id: jogador.id, tipo })
      .select('*')
      .single()
    setOcupado(false)

    if (error) {
      alert('Erro ao lançar: ' + error.message)
      return
    }
    setEventosDoJogo((atuais) => [...atuais, data])
  }

  async function remover(jogadorId, tipo) {
    const alvo = [...eventosDoJogo].reverse().find((e) => e.jogador_id === jogadorId && e.tipo === tipo)
    if (!alvo) return

    setOcupado(true)
    const { error } = await supabase.from('jogo_evento').delete().eq('id', alvo.id)
    setOcupado(false)

    if (error) {
      alert('Erro ao remover: ' + error.message)
      return
    }
    setEventosDoJogo((atuais) => atuais.filter((e) => e.id !== alvo.id))
  }

  async function salvar(encerrar) {
    const gA = numeroOuNulo(golsA)
    const gB = numeroOuNulo(golsB)
    const pA = numeroOuNulo(penaltisA)
    const pB = numeroOuNulo(penaltisB)
    const decidePorPenaltis = mataMata && gA !== null && gA === gB

    if (encerrar) {
      if (gA === null || gB === null) {
        alert('Preencha o placar dos dois times para encerrar o jogo.')
        return
      }
      if (decidePorPenaltis && (pA === null || pB === null || pA === pB)) {
        alert('Jogo de mata-mata empatado: informe o placar dos pênaltis, com um vencedor.')
        return
      }
      if (!conferencia.confere) {
        const texto = `Os gols lançados (${conferencia.registradoA} x ${conferencia.registradoB}) não batem com o placar (${gA} x ${gB}). Encerrar mesmo assim?`
        if (!window.confirm(texto)) return
      }
    }

    setOcupado(true)
    const { error } = await supabase
      .from('jogo')
      .update({
        gols_a: gA,
        gols_b: gB,
        penaltis_a: decidePorPenaltis && pA !== null && pB !== null && pA !== pB ? pA : null,
        penaltis_b: decidePorPenaltis && pA !== null && pB !== null && pA !== pB ? pB : null,
        melhor_jogador_id: melhor || null,
        encerrado: encerrar,
      })
      .eq('id', jogo.id)
    setOcupado(false)

    if (error) {
      alert('Erro ao salvar o resultado: ' + error.message)
      return
    }
    aoFechar()
  }

  function tabelaDoTime(nome, jogadores) {
    return (
      <section key={nome} className="mb-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-sm font-bold text-campo-dark pb-1.5">{nome}</th>
              {COLUNAS.map((c) => (
                <th key={c.tipo} className="w-[62px] text-center text-[11px] font-semibold text-ink/50 pb-1.5" aria-label={c.rotulo}>
                  {c.cabecalho}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jogadores.map((jogador) => {
              const { suspenso, pendurado } = situacaoNoJogo(jogador.id)
              return (
                <tr key={jogador.id} className="border-b border-border last:border-b-0">
                  <td className="py-1.5 pr-2">
                    <div className="text-sm font-medium leading-tight">{nomeDoJogador(jogador)}</div>
                    {(suspenso || pendurado) && (
                      <div className="flex gap-1 mt-0.5">
                        {suspenso && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-brick-light text-brick">SUSPENSO</span>}
                        {pendurado && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-light text-amber">PENDURADO</span>}
                      </div>
                    )}
                  </td>
                  {COLUNAS.map((c) => (
                    <Celula
                      key={c.tipo}
                      valor={contar(jogador.id, c.tipo)}
                      rotulo={c.rotulo}
                      nome={nomeDoJogador(jogador)}
                      ocupado={ocupado}
                      aoMais={() => adicionar(jogador, c.tipo)}
                      aoMenos={() => remover(jogador.id, c.tipo)}
                    />
                  ))}
                </tr>
              )
            })}
            {jogadores.length === 0 && (
              <tr>
                <td colSpan={COLUNAS.length + 1} className="py-2 text-xs text-ink/50">Este time ainda não tem jogadores.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    )
  }

  function golsContra() {
    const doJogo = eventosDoJogo.filter((e) => e.tipo === 'gol_contra')
    const todos = [...jogadoresA, ...jogadoresB]

    return (
      <div className="mb-4">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink/60">
          Gol contra (opcional)
          <select
            className={campoBase}
            value=""
            disabled={ocupado}
            onChange={(e) => {
              const jogador = todos.find((j) => j.id === e.target.value)
              if (jogador) adicionar(jogador, 'gol_contra')
            }}
          >
            <option value="">Quem fez o gol contra...</option>
            {todos.map((jogador) => (
              <option key={jogador.id} value={jogador.id}>{nomeDoJogador(jogador)}</option>
            ))}
          </select>
        </label>
        {doJogo.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-2">
            {doJogo.map((evento) => {
              const jogador = todos.find((j) => j.id === evento.jogador_id)
              return (
                <li key={evento.id} className="flex items-center gap-1 bg-brick-light text-brick text-xs font-semibold rounded-full pl-2.5 pr-1 py-1">
                  {jogador ? nomeDoJogador(jogador) : 'Jogador'}
                  <button type="button" onClick={() => remover(evento.jogador_id, 'gol_contra')} className="p-0.5 rounded-full hover:bg-black/10" aria-label="Remover gol contra">
                    <X size={12} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lançar resultado do jogo"
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="absolute top-3 right-3 p-1.5 rounded-lg text-ink/50 hover:bg-hover">
          <X size={18} />
        </button>

        <h3 className="text-lg font-bold text-campo-dark mb-4 pr-8">Resultado do jogo</h3>

        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="flex-1 text-right text-sm font-bold truncate">{nomeA}</span>
          <input type="number" min="0" inputMode="numeric" className={`${campoBase} w-16 text-center`} value={golsA} onChange={(e) => setGolsA(e.target.value)} aria-label={`Gols de ${nomeA}`} />
          <span className="text-ink/40">x</span>
          <input type="number" min="0" inputMode="numeric" className={`${campoBase} w-16 text-center`} value={golsB} onChange={(e) => setGolsB(e.target.value)} aria-label={`Gols de ${nomeB}`} />
          <span className="flex-1 text-sm font-bold truncate">{nomeB}</span>
        </div>

        {mataMata && empatou && (
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-xs font-semibold text-ink/60">Pênaltis</span>
            <input type="number" min="0" inputMode="numeric" className={`${campoBase} w-16 text-center`} value={penaltisA} onChange={(e) => setPenaltisA(e.target.value)} aria-label={`Pênaltis de ${nomeA}`} />
            <span className="text-ink/40">x</span>
            <input type="number" min="0" inputMode="numeric" className={`${campoBase} w-16 text-center`} value={penaltisB} onChange={(e) => setPenaltisB(e.target.value)} aria-label={`Pênaltis de ${nomeB}`} />
          </div>
        )}

        {placarPreenchido && !conferencia.confere && (
          <p className="text-xs text-amber font-medium text-center mb-2">
            Gols lançados: {conferencia.registradoA} x {conferencia.registradoB}. Não bate com o placar, mas você pode salvar assim.
          </p>
        )}

        <div className="mt-4">
          {tabelaDoTime(nomeA, jogadoresA)}
          {tabelaDoTime(nomeB, jogadoresB)}
        </div>

        {golsContra()}

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink/60 mb-5">
          Melhor jogador da partida
          <select className={campoBase} value={melhor} onChange={(e) => setMelhor(e.target.value)}>
            <option value="">Não definido</option>
            {[...jogadoresA, ...jogadoresB].map((jogador) => (
              <option key={jogador.id} value={jogador.id}>{nomeDoJogador(jogador)}</option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          {!jogo.encerrado && (
            <button type="button" onClick={() => salvar(false)} disabled={ocupado} className="flex-1 bg-campo-light text-campo-dark text-sm font-semibold rounded-lg py-2.5 hover:brightness-95 transition-all disabled:opacity-60">
              Salvar rascunho
            </button>
          )}
          <button type="button" onClick={() => salvar(true)} disabled={ocupado} className="flex-1 bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark transition-colors disabled:opacity-60">
            {jogo.encerrado ? 'Salvar alterações' : 'Encerrar jogo'}
          </button>
        </div>
        {jogo.encerrado && (
          <button type="button" onClick={() => salvar(false)} disabled={ocupado} className="w-full mt-2 text-xs font-semibold text-brick hover:underline disabled:opacity-60">
            Reabrir jogo
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}

export default ResultadoJogo
