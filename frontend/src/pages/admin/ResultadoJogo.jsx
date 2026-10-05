import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Minus, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { conferirPlacar, situacaoDisciplinar } from '../../domain/campeonato'

const campoBase =
  'px-3 py-2 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

const TIPOS = [
  { tipo: 'gol', rotulo: 'Gols' },
  { tipo: 'assistencia', rotulo: 'Assist.' },
  { tipo: 'amarelo', rotulo: 'Amarelo' },
  { tipo: 'vermelho', rotulo: 'Vermelho' },
  { tipo: 'gol_contra', rotulo: 'Gol contra' },
]

function nomeDoJogador(jogador) {
  return jogador.apelido || jogador.nome
}

function numeroOuNulo(texto) {
  return texto === '' ? null : Number(texto)
}

function Contador({ rotulo, valor, aoMais, aoMenos, ocupado }) {
  return (
    <div className="flex items-center justify-between gap-1 bg-cream rounded-lg px-2 py-1">
      <span className="text-[11px] font-semibold text-ink/60">{rotulo}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={aoMenos} disabled={valor === 0 || ocupado} className="p-1.5 rounded-md hover:bg-hover disabled:opacity-30" aria-label={`Remover ${rotulo}`}>
          <Minus size={13} />
        </button>
        <span className="w-4 text-center text-sm font-bold">{valor}</span>
        <button type="button" onClick={aoMais} disabled={ocupado} className="p-1.5 rounded-md bg-campo text-white hover:bg-campo-dark disabled:opacity-50" aria-label={`Adicionar ${rotulo}`}>
          <Plus size={13} />
        </button>
      </div>
    </div>
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

  const jogadoresA = membros.filter((m) => m.equipe_id === jogo.equipe_a_id && m.jogador)
  const jogadoresB = membros.filter((m) => m.equipe_id === jogo.equipe_b_id && m.jogador)
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

  async function adicionar(jogadorId, tipo) {
    const situacao = disciplina.get(jogadorId)
    const jogador = membros.find((m) => m.jogador?.id === jogadorId)?.jogador
    if (!jogo.encerrado && situacao?.suspenso && situacao.proximoJogoId === jogo.id) {
      if (!window.confirm(`${nomeDoJogador(jogador)} está suspenso neste jogo. Lançar mesmo assim?`)) return
    }

    setOcupado(true)
    const { data, error } = await supabase
      .from('jogo_evento')
      .insert({ jogo_id: jogo.id, jogador_id: jogadorId, tipo })
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
        const texto = `Os gols registrados (${conferencia.registradoA} x ${conferencia.registradoB}) não batem com o placar (${gA} x ${gB}). Encerrar mesmo assim?`
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

  function listaDoTime(nome, jogadores) {
    return (
      <section key={nome} className="mb-4">
        <h4 className="text-sm font-bold text-campo-dark mb-2">{nome}</h4>
        <ul className="space-y-2">
          {jogadores.map(({ jogador }) => {
            const situacao = disciplina.get(jogador.id)
            const suspensoAqui = !jogo.encerrado && situacao?.suspenso && situacao.proximoJogoId === jogo.id
            const penduradoAqui = !jogo.encerrado && situacao?.pendurado
            return (
              <li key={jogador.id} className="border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">{nomeDoJogador(jogador)}</span>
                  {suspensoAqui && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brick-light text-brick">SUSPENSO</span>}
                  {penduradoAqui && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-light text-amber">PENDURADO</span>}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIPOS.map(({ tipo, rotulo }) => (
                    <Contador
                      key={tipo}
                      rotulo={rotulo}
                      valor={contar(jogador.id, tipo)}
                      aoMais={() => adicionar(jogador.id, tipo)}
                      aoMenos={() => remover(jogador.id, tipo)}
                      ocupado={ocupado}
                    />
                  ))}
                </div>
              </li>
            )
          })}
          {jogadores.length === 0 && <li className="text-xs text-ink/50">Este time ainda não tem jogadores.</li>}
        </ul>
      </section>
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
          <p className="text-xs text-amber font-medium text-center mb-3">
            Gols lançados abaixo: {conferencia.registradoA} x {conferencia.registradoB}. Não bate com o placar, mas você pode salvar assim.
          </p>
        )}

        <div className="mt-4">
          {listaDoTime(nomeA, jogadoresA)}
          {listaDoTime(nomeB, jogadoresB)}
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink/60 mb-5">
          Melhor jogador da partida
          <select className={campoBase} value={melhor} onChange={(e) => setMelhor(e.target.value)}>
            <option value="">Não definido</option>
            {[...jogadoresA, ...jogadoresB].map(({ jogador }) => (
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
