export const FASES = ['grupo', 'oitavas', 'quartas', 'semifinal', 'final']

const ORDEM_FASE = Object.fromEntries(FASES.map((fase, i) => [fase, i]))
const FASE_POR_QUANTIDADE_DE_JOGOS = { 1: 'final', 2: 'semifinal', 4: 'quartas', 8: 'oitavas' }

function compararJogos(a, b) {
  const porFase = ORDEM_FASE[a.fase] - ORDEM_FASE[b.fase]
  if (porFase !== 0) return porFase
  if (a.data_hora && b.data_hora && a.data_hora !== b.data_hora) return a.data_hora < b.data_hora ? -1 : 1
  if (a.data_hora && !b.data_hora) return -1
  if (!a.data_hora && b.data_hora) return 1
  return (a.rodada ?? 0) - (b.rodada ?? 0)
}

function montarTabela(equipeIds, jogos) {
  const tabela = Object.fromEntries(
    equipeIds.map((id) => [
      id,
      { equipeId: id, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsPro: 0, golsContra: 0, saldo: 0, pontos: 0 },
    ])
  )

  for (const jogo of jogos) {
    const a = tabela[jogo.equipe_a_id]
    const b = tabela[jogo.equipe_b_id]
    if (!a || !b) continue

    a.jogos++
    b.jogos++
    a.golsPro += jogo.gols_a
    a.golsContra += jogo.gols_b
    b.golsPro += jogo.gols_b
    b.golsContra += jogo.gols_a

    if (jogo.gols_a > jogo.gols_b) {
      a.vitorias++
      a.pontos += 3
      b.derrotas++
    } else if (jogo.gols_a < jogo.gols_b) {
      b.vitorias++
      b.pontos += 3
      a.derrotas++
    } else {
      a.empates++
      b.empates++
      a.pontos++
      b.pontos++
    }
  }

  for (const linha of Object.values(tabela)) linha.saldo = linha.golsPro - linha.golsContra
  return tabela
}

function agruparPor(ids, chave) {
  const grupos = new Map()
  for (const id of ids) {
    const valor = chave(id)
    if (!grupos.has(valor)) grupos.set(valor, [])
    grupos.get(valor).push(id)
  }
  return [...grupos.entries()].sort((x, y) => y[0] - x[0]).map(([, lista]) => lista)
}

export function classificacaoGrupo(equipes, jogos) {
  const ids = equipes.map((e) => e.id)
  const nomes = Object.fromEntries(equipes.map((e) => [e.id, e.nome ?? '']))
  const encerrados = jogos.filter(
    (j) => j.fase === 'grupo' && j.encerrado && ids.includes(j.equipe_a_id) && ids.includes(j.equipe_b_id)
  )
  const geral = montarTabela(ids, encerrados)
  const naoResolvidos = new Set()

  function desempatar(empatados) {
    if (empatados.length === 1) return empatados

    const entreSi = encerrados.filter((j) => empatados.includes(j.equipe_a_id) && empatados.includes(j.equipe_b_id))
    const confrontoDireto = montarTabela(empatados, entreSi)
    const faixas = agruparPor(empatados, (id) => confrontoDireto[id].pontos)
    if (faixas.length > 1) return faixas.flatMap(desempatar)

    const porSaldo = agruparPor(empatados, (id) => geral[id].saldo)
    return porSaldo.flatMap((mesmoSaldo) => {
      const porGolsPro = agruparPor(mesmoSaldo, (id) => geral[id].golsPro)
      return porGolsPro.flatMap((iguais) => {
        if (iguais.length > 1) iguais.forEach((id) => naoResolvidos.add(id))
        return [...iguais].sort((x, y) => nomes[x].localeCompare(nomes[y]))
      })
    })
  }

  const ordenados = agruparPor(ids, (id) => geral[id].pontos).flatMap(desempatar)

  return ordenados.map((id, i) => ({
    ...geral[id],
    posicao: i + 1,
    empateNaoResolvido: naoResolvidos.has(id),
  }))
}

export function gerarJogosGrupo(equipeIds) {
  const ids = [...equipeIds]
  if (ids.length < 2) return []
  if (ids.length % 2 === 1) ids.push(null)

  const total = ids.length
  const jogos = []

  for (let rodada = 1; rodada < total; rodada++) {
    for (let i = 0; i < total / 2; i++) {
      const a = ids[i]
      const b = ids[total - 1 - i]
      if (a && b) jogos.push({ rodada, equipe_a_id: a, equipe_b_id: b })
    }
    ids.splice(1, 0, ids.pop())
  }

  return jogos
}

export function vencedorDoJogo(jogo) {
  if (!jogo.encerrado || jogo.equipe_a_id == null || jogo.equipe_b_id == null) return null
  if (jogo.gols_a > jogo.gols_b) return jogo.equipe_a_id
  if (jogo.gols_a < jogo.gols_b) return jogo.equipe_b_id
  if (jogo.penaltis_a == null || jogo.penaltis_b == null) return null
  return jogo.penaltis_a > jogo.penaltis_b ? jogo.equipe_a_id : jogo.equipe_b_id
}

function proximaPotenciaDeDois(n) {
  let potencia = 2
  while (potencia < n) potencia *= 2
  return potencia
}

function ordemDeSementes(tamanho) {
  let ordem = [1, 2]
  while (ordem.length < tamanho) {
    const soma = ordem.length * 2 + 1
    ordem = ordem.flatMap((semente) => [semente, soma - semente])
  }
  return ordem
}

function cruzarGrupos(classificados) {
  const grupos = [...new Set(classificados.map((c) => c.grupoId))]
  const porGrupo = Object.fromEntries(grupos.map((g) => [g, classificados.filter((c) => c.grupoId === g)]))
  const todosComDois = grupos.every((g) => porGrupo[g].length === 2)
  const quantidade = classificados.length
  const potenciaDeDois = (quantidade & (quantidade - 1)) === 0
  if (!todosComDois || grupos.length % 2 !== 0 || !potenciaDeDois) return null

  const primeiraMetade = []
  const segundaMetade = []
  for (let i = 0; i < grupos.length; i += 2) {
    const [g1, g2] = [porGrupo[grupos[i]], porGrupo[grupos[i + 1]]]
    const primeiro = (lista) => lista.find((c) => c.posicao === 1)
    const segundo = (lista) => lista.find((c) => c.posicao === 2)
    primeiraMetade.push([primeiro(g1).equipeId, segundo(g2).equipeId])
    segundaMetade.push([primeiro(g2).equipeId, segundo(g1).equipeId])
  }
  return [...primeiraMetade, ...segundaMetade]
}

function semearClassificados(classificados) {
  const ordenados = [...classificados].sort(
    (x, y) =>
      x.posicao - y.posicao ||
      (y.pontos ?? 0) - (x.pontos ?? 0) ||
      (y.saldo ?? 0) - (x.saldo ?? 0) ||
      (y.golsPro ?? 0) - (x.golsPro ?? 0) ||
      String(x.equipeId).localeCompare(String(y.equipeId))
  )
  const tamanho = proximaPotenciaDeDois(ordenados.length)
  const ordem = ordemDeSementes(tamanho)
  const pares = []
  for (let i = 0; i < ordem.length; i += 2) {
    const sementeA = ordenados[ordem[i] - 1]
    const sementeB = ordenados[ordem[i + 1] - 1]
    pares.push([sementeA ? sementeA.equipeId : null, sementeB ? sementeB.equipeId : null])
  }
  return pares
}

export function gerarMataMata(classificados) {
  if (classificados.length < 2) return []

  const pares = cruzarGrupos(classificados) ?? semearClassificados(classificados)
  const rodadas = []
  let quantidade = pares.length

  while (quantidade >= 1) {
    const fase = FASE_POR_QUANTIDADE_DE_JOGOS[quantidade]
    if (!fase) throw new Error('Mata-mata com mais de 16 equipes não é suportado.')
    rodadas.push({ fase, quantidade })
    quantidade = quantidade === 1 ? 0 : quantidade / 2
  }

  const jogos = []
  rodadas.forEach(({ fase, quantidade: total }, indiceRodada) => {
    for (let i = 0; i < total; i++) {
      const jogo = { chave: `${fase}-${i + 1}`, fase, equipe_a_id: null, equipe_b_id: null, proximo_chave: null, proximo_lado: null }
      if (indiceRodada === 0) {
        ;[jogo.equipe_a_id, jogo.equipe_b_id] = pares[i]
      }
      if (indiceRodada < rodadas.length - 1) {
        jogo.proximo_chave = `${rodadas[indiceRodada + 1].fase}-${Math.floor(i / 2) + 1}`
        jogo.proximo_lado = i % 2 === 0 ? 'a' : 'b'
      }
      jogos.push(jogo)
    }
  })

  const porChave = Object.fromEntries(jogos.map((j) => [j.chave, j]))
  const resultado = []
  for (const jogo of jogos) {
    const folga = jogo.fase === rodadas[0].fase && (jogo.equipe_a_id == null) !== (jogo.equipe_b_id == null)
    if (folga) {
      const equipe = jogo.equipe_a_id ?? jogo.equipe_b_id
      const proximo = porChave[jogo.proximo_chave]
      proximo[jogo.proximo_lado === 'a' ? 'equipe_a_id' : 'equipe_b_id'] = equipe
    } else {
      resultado.push(jogo)
    }
  }

  const chavesExistentes = new Set(resultado.map((j) => j.chave))
  return resultado.map((j) => ({
    ...j,
    proximo_chave: chavesExistentes.has(j.proximo_chave) ? j.proximo_chave : null,
    proximo_lado: chavesExistentes.has(j.proximo_chave) ? j.proximo_lado : null,
  }))
}

export function situacaoDisciplinar(jogos, eventos, equipeJogadores, config = {}) {
  const limite = config.amarelos_para_suspensao ?? 2
  const zerarNoMataMata = config.zerar_amarelos_no_mata_mata ?? true

  const eventosPorJogoEJogador = new Map()
  for (const evento of eventos) {
    if (evento.tipo !== 'amarelo' && evento.tipo !== 'vermelho') continue
    const chave = `${evento.jogo_id}|${evento.jogador_id}`
    if (!eventosPorJogoEJogador.has(chave)) eventosPorJogoEJogador.set(chave, [])
    eventosPorJogoEJogador.get(chave).push(evento)
  }

  const resultado = new Map()

  for (const { jogador_id: jogadorId, equipe_id: equipeId } of equipeJogadores) {
    const jogosDaEquipe = jogos
      .filter((j) => j.equipe_a_id === equipeId || j.equipe_b_id === equipeId)
      .sort(compararJogos)

    let amarelos = 0
    let suspensao = 0
    let totalAmarelos = 0
    let totalVermelhos = 0
    let zerou = false
    let proximoJogoId = null

    for (const jogo of jogosDaEquipe) {
      if (zerarNoMataMata && !zerou && jogo.fase !== 'grupo') {
        amarelos = 0
        zerou = true
      }

      if (!jogo.encerrado) {
        proximoJogoId = jogo.id
        break
      }

      if (suspensao > 0) suspensao--

      const doJogo = eventosPorJogoEJogador.get(`${jogo.id}|${jogadorId}`) ?? []
      const amarelosNoJogo = doJogo.filter((e) => e.tipo === 'amarelo').length
      totalAmarelos += amarelosNoJogo

      if (amarelosNoJogo >= 2) {
        totalVermelhos++
        suspensao += 1
      } else {
        amarelos += amarelosNoJogo
      }

      for (const vermelho of doJogo.filter((e) => e.tipo === 'vermelho')) {
        totalVermelhos++
        suspensao += vermelho.jogos_suspensao ?? 1
      }

      if (amarelos >= limite) {
        suspensao += 1
        amarelos = 0
      }
    }

    const suspenso = suspensao > 0
    resultado.set(jogadorId, {
      jogadorId,
      amarelosAcumulados: amarelos,
      totalAmarelos,
      totalVermelhos,
      suspenso,
      jogosDeSuspensao: suspensao,
      proximoJogoId,
      pendurado: !suspenso && limite >= 2 && amarelos === limite - 1,
    })
  }

  return resultado
}

function rankingPorContagem(contagem, jogadores) {
  const nomes = new Map(jogadores.map((j) => [j.id, j.apelido || j.nome]))
  return [...contagem.entries()]
    .filter(([, total]) => total > 0)
    .map(([jogadorId, total]) => ({ jogadorId, nome: nomes.get(jogadorId) ?? '', total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
}

export function rankingsEstatisticas(jogos, eventos, jogadores) {
  const encerrados = new Set(jogos.filter((j) => j.encerrado).map((j) => j.id))
  const gols = new Map()
  const assistencias = new Map()
  const melhores = new Map()

  for (const evento of eventos) {
    if (!encerrados.has(evento.jogo_id)) continue
    if (evento.tipo === 'gol') gols.set(evento.jogador_id, (gols.get(evento.jogador_id) ?? 0) + 1)
    if (evento.tipo === 'assistencia') {
      assistencias.set(evento.jogador_id, (assistencias.get(evento.jogador_id) ?? 0) + 1)
    }
  }

  for (const jogo of jogos) {
    if (!jogo.encerrado || !jogo.melhor_jogador_id) continue
    melhores.set(jogo.melhor_jogador_id, (melhores.get(jogo.melhor_jogador_id) ?? 0) + 1)
  }

  return {
    artilharia: rankingPorContagem(gols, jogadores),
    assistencias: rankingPorContagem(assistencias, jogadores),
    melhoresEmCampo: rankingPorContagem(melhores, jogadores),
  }
}

export function conferirPlacar(jogo, eventos, equipeJogadores) {
  const equipePorJogador = new Map(equipeJogadores.map((e) => [e.jogador_id, e.equipe_id]))
  let registradoA = 0
  let registradoB = 0

  for (const evento of eventos) {
    if (evento.jogo_id !== jogo.id) continue
    const equipe = equipePorJogador.get(evento.jogador_id)
    if (evento.tipo === 'gol') {
      if (equipe === jogo.equipe_a_id) registradoA++
      else if (equipe === jogo.equipe_b_id) registradoB++
    }
    if (evento.tipo === 'gol_contra') {
      if (equipe === jogo.equipe_a_id) registradoB++
      else if (equipe === jogo.equipe_b_id) registradoA++
    }
  }

  return {
    registradoA,
    registradoB,
    placarA: jogo.gols_a,
    placarB: jogo.gols_b,
    confere: registradoA === jogo.gols_a && registradoB === jogo.gols_b,
  }
}
