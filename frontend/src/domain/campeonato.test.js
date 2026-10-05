import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classificacaoGrupo,
  gerarJogosGrupo,
  gerarMataMata,
  vencedorDoJogo,
  calcularAvancos,
  campeaoDoCampeonato,
  situacaoDisciplinar,
  rankingsEstatisticas,
  conferirPlacar,
} from './campeonato.js'

let contador = 0
function jogoDeGrupo(a, b, golsA, golsB, extra = {}) {
  contador++
  return {
    id: `j${contador}`,
    fase: 'grupo',
    rodada: extra.rodada ?? contador,
    equipe_a_id: a,
    equipe_b_id: b,
    gols_a: golsA,
    gols_b: golsB,
    encerrado: golsA != null,
    ...extra,
  }
}

const equipes = (...nomes) => nomes.map((nome) => ({ id: nome, nome }))
const ordem = (tabela) => tabela.map((linha) => linha.equipeId)

test('pontos: 3 por vitória, 1 por empate, 0 por derrota', () => {
  const tabela = classificacaoGrupo(equipes('A', 'B'), [jogoDeGrupo('A', 'B', 2, 1)])
  assert.deepEqual(ordem(tabela), ['A', 'B'])
  assert.equal(tabela[0].pontos, 3)
  assert.equal(tabela[1].pontos, 0)

  const empate = classificacaoGrupo(equipes('A', 'B'), [jogoDeGrupo('A', 'B', 1, 1)])
  assert.equal(empate[0].pontos, 1)
  assert.equal(empate[1].pontos, 1)
})

test('jogos não encerrados não contam', () => {
  const tabela = classificacaoGrupo(equipes('A', 'B'), [jogoDeGrupo('A', 'B', null, null)])
  assert.equal(tabela[0].jogos, 0)
})

test('confronto direto vence o saldo de gols', () => {
  const jogos = [
    jogoDeGrupo('A', 'B', 0, 1),
    jogoDeGrupo('A', 'C', 5, 0),
    jogoDeGrupo('A', 'D', 1, 0),
    jogoDeGrupo('B', 'C', 0, 1),
    jogoDeGrupo('B', 'D', 2, 0),
    jogoDeGrupo('C', 'D', 0, 0),
  ]
  const tabela = classificacaoGrupo(equipes('A', 'B', 'C', 'D'), jogos)
  const a = tabela.find((l) => l.equipeId === 'A')
  const b = tabela.find((l) => l.equipeId === 'B')
  assert.equal(a.pontos, 6)
  assert.equal(b.pontos, 6)
  assert.ok(a.saldo > b.saldo)
  assert.deepEqual(ordem(tabela), ['B', 'A', 'C', 'D'])
})

test('confronto direto empatado: decide o saldo de gols geral', () => {
  const jogos = [
    jogoDeGrupo('A', 'B', 1, 1),
    jogoDeGrupo('A', 'C', 4, 0),
    jogoDeGrupo('B', 'C', 1, 0),
  ]
  const tabela = classificacaoGrupo(equipes('A', 'B', 'C'), jogos)
  assert.deepEqual(ordem(tabela), ['A', 'B', 'C'])
  assert.equal(tabela[0].empateNaoResolvido, false)
})

test('empate triplo em ciclo cai para o saldo de gols', () => {
  const jogos = [
    jogoDeGrupo('A', 'B', 3, 0),
    jogoDeGrupo('B', 'C', 1, 0),
    jogoDeGrupo('C', 'A', 1, 0),
  ]
  const tabela = classificacaoGrupo(equipes('A', 'B', 'C'), jogos)
  assert.deepEqual(ordem(tabela), ['A', 'C', 'B'])
  assert.ok(tabela.every((l) => l.pontos === 3))
  assert.ok(tabela.every((l) => !l.empateNaoResolvido))
})

test('empate total sinaliza que o professor precisa decidir', () => {
  const tabela = classificacaoGrupo(equipes('A', 'B'), [jogoDeGrupo('A', 'B', 1, 1)])
  assert.ok(tabela.every((l) => l.empateNaoResolvido))
})

test('desempate manual do professor resolve o empate total', () => {
  const jogos = [jogoDeGrupo('A', 'B', 1, 1)]
  const comOrdem = [
    { id: 'A', nome: 'A', desempate_manual: 2 },
    { id: 'B', nome: 'B', desempate_manual: 1 },
  ]
  const tabela = classificacaoGrupo(comOrdem, jogos)
  assert.deepEqual(ordem(tabela), ['B', 'A'])
  assert.ok(tabela.every((l) => !l.empateNaoResolvido))
})

test('desempate manual incompleto ou repetido continua sinalizado', () => {
  const jogos = [jogoDeGrupo('A', 'B', 1, 1)]
  const incompleto = [{ id: 'A', nome: 'A', desempate_manual: 1 }, { id: 'B', nome: 'B' }]
  assert.ok(classificacaoGrupo(incompleto, jogos).every((l) => l.empateNaoResolvido))

  const repetido = [
    { id: 'A', nome: 'A', desempate_manual: 1 },
    { id: 'B', nome: 'B', desempate_manual: 1 },
  ]
  assert.ok(classificacaoGrupo(repetido, jogos).every((l) => l.empateNaoResolvido))
})

test('gerarJogosGrupo: todos contra todos uma vez, sem repetir time na rodada', () => {
  for (const quantidade of [2, 3, 4, 5, 6]) {
    const ids = Array.from({ length: quantidade }, (_, i) => `T${i}`)
    const jogos = gerarJogosGrupo(ids)
    assert.equal(jogos.length, (quantidade * (quantidade - 1)) / 2)

    const confrontos = new Set(jogos.map((j) => [j.equipe_a_id, j.equipe_b_id].sort().join('x')))
    assert.equal(confrontos.size, jogos.length)

    const porRodada = Map.groupBy(jogos, (j) => j.rodada)
    for (const rodada of porRodada.values()) {
      const times = rodada.flatMap((j) => [j.equipe_a_id, j.equipe_b_id])
      assert.equal(new Set(times).size, times.length)
    }
  }
})

function classificados(grupos, porGrupo = 2) {
  return grupos.flatMap((grupo) =>
    Array.from({ length: porGrupo }, (_, i) => ({
      equipeId: `${grupo}${i + 1}`,
      grupoId: grupo,
      posicao: i + 1,
      pontos: 9 - i * 3,
      saldo: 5 - i,
      golsPro: 6 - i,
    }))
  )
}

test('mata-mata com 2 grupos: cruza 1º de um com 2º do outro', () => {
  const jogos = gerarMataMata(classificados(['A', 'B']))
  const semis = jogos.filter((j) => j.fase === 'semifinal')
  assert.equal(semis.length, 2)
  assert.deepEqual([semis[0].equipe_a_id, semis[0].equipe_b_id], ['A1', 'B2'])
  assert.deepEqual([semis[1].equipe_a_id, semis[1].equipe_b_id], ['B1', 'A2'])
  assert.equal(jogos.filter((j) => j.fase === 'final').length, 1)
  assert.equal(semis[0].proximo_chave, 'final-1')
  assert.equal(semis[0].proximo_lado, 'a')
  assert.equal(semis[1].proximo_lado, 'b')
})

test('mata-mata com 4 grupos: times do mesmo grupo só se cruzam depois das quartas', () => {
  const jogos = gerarMataMata(classificados(['A', 'B', 'C', 'D']))
  const quartas = jogos.filter((j) => j.fase === 'quartas')
  assert.equal(quartas.length, 4)

  const jogoDe = (equipe) => quartas.find((j) => j.equipe_a_id === equipe || j.equipe_b_id === equipe)
  assert.notEqual(jogoDe('A1').proximo_chave, jogoDe('A2').proximo_chave)
  for (const grupo of ['A', 'B', 'C', 'D']) {
    assert.notEqual(jogoDe(`${grupo}1`).chave, jogoDe(`${grupo}2`).chave)
  }
})

test('mata-mata com 6 classificados: os 2 melhores ganham folga na primeira rodada', () => {
  const jogos = gerarMataMata(classificados(['A', 'B', 'C']))
  const quartas = jogos.filter((j) => j.fase === 'quartas')
  assert.equal(quartas.length, 2)

  const semis = jogos.filter((j) => j.fase === 'semifinal')
  const comFolga = semis.flatMap((s) => [s.equipe_a_id, s.equipe_b_id]).filter(Boolean)
  assert.equal(comFolga.length, 2)
  assert.ok(comFolga.every((id) => id.endsWith('1')))
})

test('mata-mata com 3 classificados: 1 jogo de abertura e o melhor já na final', () => {
  const jogos = gerarMataMata([
    { equipeId: 'X', grupoId: 'A', posicao: 1, pontos: 9, saldo: 5, golsPro: 6 },
    { equipeId: 'Y', grupoId: 'A', posicao: 2, pontos: 6, saldo: 1, golsPro: 3 },
    { equipeId: 'Z', grupoId: 'B', posicao: 1, pontos: 7, saldo: 2, golsPro: 4 },
  ])
  assert.equal(jogos.filter((j) => j.fase === 'semifinal').length, 1)
  const final = jogos.find((j) => j.fase === 'final')
  assert.ok([final.equipe_a_id, final.equipe_b_id].includes('X'))
})

test('vencedorDoJogo usa pênaltis quando empata', () => {
  const base = { encerrado: true, equipe_a_id: 'A', equipe_b_id: 'B' }
  assert.equal(vencedorDoJogo({ ...base, gols_a: 2, gols_b: 1 }), 'A')
  assert.equal(vencedorDoJogo({ ...base, gols_a: 0, gols_b: 1 }), 'B')
  assert.equal(vencedorDoJogo({ ...base, gols_a: 1, gols_b: 1, penaltis_a: 3, penaltis_b: 4 }), 'B')
  assert.equal(vencedorDoJogo({ ...base, gols_a: 1, gols_b: 1 }), null)
  assert.equal(vencedorDoJogo({ ...base, encerrado: false, gols_a: 1, gols_b: 0 }), null)
})

function chaveamentoPronto() {
  return [
    { id: 's1', fase: 'semifinal', equipe_a_id: 'A', equipe_b_id: 'B', proximo_jogo_id: 'f', proximo_lado: 'a', encerrado: false },
    { id: 's2', fase: 'semifinal', equipe_a_id: 'C', equipe_b_id: 'D', proximo_jogo_id: 'f', proximo_lado: 'b', encerrado: false },
    { id: 'f', fase: 'final', equipe_a_id: null, equipe_b_id: null, proximo_jogo_id: null, proximo_lado: null, encerrado: false },
  ]
}

test('vencedor da semifinal avança para o lado certo da final', () => {
  const jogos = chaveamentoPronto()
  Object.assign(jogos[0], { encerrado: true, gols_a: 2, gols_b: 0 })
  Object.assign(jogos[1], { encerrado: true, gols_a: 1, gols_b: 1, penaltis_a: 2, penaltis_b: 4 })

  const mudancas = calcularAvancos(jogos)
  assert.deepEqual(mudancas.map((m) => [m.jogoId, m.campo, m.equipeId]), [
    ['f', 'equipe_a_id', 'A'],
    ['f', 'equipe_b_id', 'D'],
  ])
})

test('jogo sem decisão não leva ninguém para a próxima fase', () => {
  assert.deepEqual(calcularAvancos(chaveamentoPronto()), [])
})

test('reabrir semifinal remove o time da final, mas avisa se a final já foi encerrada', () => {
  const jogos = chaveamentoPronto()
  Object.assign(jogos[2], { equipe_a_id: 'A', equipe_b_id: 'D' })
  const [mudanca] = calcularAvancos(jogos)
  assert.deepEqual([mudanca.campo, mudanca.equipeId, mudanca.bloqueado], ['equipe_a_id', null, false])

  Object.assign(jogos[2], { encerrado: true })
  assert.equal(calcularAvancos(jogos)[0].bloqueado, true)
})

test('campeão é o vencedor da final', () => {
  const jogos = chaveamentoPronto()
  assert.equal(campeaoDoCampeonato(jogos), null)
  Object.assign(jogos[2], { equipe_a_id: 'A', equipe_b_id: 'D', encerrado: true, gols_a: 0, gols_b: 1 })
  assert.equal(campeaoDoCampeonato(jogos), 'D')
})

function cenarioDisciplina(fases) {
  contador = 0
  const jogos = fases.map((fase, i) => ({
    id: `d${i + 1}`,
    fase,
    rodada: i + 1,
    equipe_a_id: 'E1',
    equipe_b_id: `R${i + 1}`,
    gols_a: 0,
    gols_b: 0,
    encerrado: true,
  }))
  return { jogos, equipeJogadores: [{ jogador_id: 'P1', equipe_id: 'E1' }] }
}

const cartao = (jogo, tipo, extra = {}) => ({ jogo_id: jogo, jogador_id: 'P1', tipo, ...extra })
const situacao = (jogos, eventos, equipeJogadores, config) =>
  situacaoDisciplinar(jogos, eventos, equipeJogadores, config).get('P1')

test('um amarelo deixa o jogador pendurado', () => {
  const { jogos, equipeJogadores } = cenarioDisciplina(['grupo', 'grupo'])
  jogos[1].encerrado = false
  const s = situacao(jogos, [cartao('d1', 'amarelo')], equipeJogadores)
  assert.equal(s.pendurado, true)
  assert.equal(s.suspenso, false)
  assert.equal(s.amarelosAcumulados, 1)
})

test('dois amarelos em jogos diferentes suspendem 1 jogo e depois zeram', () => {
  const { jogos, equipeJogadores } = cenarioDisciplina(['grupo', 'grupo', 'grupo', 'grupo'])
  jogos[2].encerrado = false
  jogos[3].encerrado = false
  const eventos = [cartao('d1', 'amarelo'), cartao('d2', 'amarelo')]

  let s = situacao(jogos, eventos, equipeJogadores)
  assert.equal(s.suspenso, true)
  assert.equal(s.proximoJogoId, 'd3')

  jogos[2].encerrado = true
  s = situacao(jogos, eventos, equipeJogadores)
  assert.equal(s.suspenso, false)
  assert.equal(s.amarelosAcumulados, 0)
  assert.equal(s.pendurado, false)
})

test('dois amarelos no mesmo jogo viram vermelho e não acumulam', () => {
  const { jogos, equipeJogadores } = cenarioDisciplina(['grupo', 'grupo'])
  jogos[1].encerrado = false
  const s = situacao(jogos, [cartao('d1', 'amarelo'), cartao('d1', 'amarelo')], equipeJogadores)
  assert.equal(s.suspenso, true)
  assert.equal(s.jogosDeSuspensao, 1)
  assert.equal(s.amarelosAcumulados, 0)
  assert.equal(s.totalVermelhos, 1)
})

test('vermelho direto respeita a quantidade de jogos informada', () => {
  const { jogos, equipeJogadores } = cenarioDisciplina(['grupo', 'grupo', 'grupo'])
  jogos[1].encerrado = false
  jogos[2].encerrado = false
  const s = situacao(jogos, [cartao('d1', 'vermelho', { jogos_suspensao: 2 })], equipeJogadores)
  assert.equal(s.suspenso, true)
  assert.equal(s.jogosDeSuspensao, 2)
})

test('vermelho direto sem informar suspende 1 jogo', () => {
  const { jogos, equipeJogadores } = cenarioDisciplina(['grupo', 'grupo'])
  jogos[1].encerrado = false
  const s = situacao(jogos, [cartao('d1', 'vermelho')], equipeJogadores)
  assert.equal(s.jogosDeSuspensao, 1)
})

test('amarelos zeram quando o mata-mata começa, mas a suspensão continua', () => {
  let { jogos, equipeJogadores } = cenarioDisciplina(['grupo', 'grupo', 'quartas'])
  jogos[2].encerrado = false
  let s = situacao(jogos, [cartao('d1', 'amarelo'), cartao('d2', 'amarelo')], equipeJogadores)
  assert.equal(s.suspenso, true)

  ;({ jogos, equipeJogadores } = cenarioDisciplina(['grupo', 'quartas']))
  jogos[1].encerrado = false
  s = situacao(jogos, [cartao('d1', 'amarelo')], equipeJogadores)
  assert.equal(s.amarelosAcumulados, 0)
  assert.equal(s.pendurado, false)
})

test('configuração permite não zerar os amarelos no mata-mata', () => {
  const { jogos, equipeJogadores } = cenarioDisciplina(['grupo', 'quartas'])
  jogos[1].encerrado = false
  const s = situacao(jogos, [cartao('d1', 'amarelo')], equipeJogadores, { zerar_amarelos_no_mata_mata: false })
  assert.equal(s.pendurado, true)
})

test('rankings: gol contra não conta na artilharia e só jogos encerrados valem', () => {
  const jogos = [
    { id: 'g1', encerrado: true, melhor_jogador_id: 'P2' },
    { id: 'g2', encerrado: true, melhor_jogador_id: 'P2' },
    { id: 'g3', encerrado: false, melhor_jogador_id: 'P1' },
  ]
  const eventos = [
    { jogo_id: 'g1', jogador_id: 'P1', tipo: 'gol' },
    { jogo_id: 'g1', jogador_id: 'P1', tipo: 'gol' },
    { jogo_id: 'g2', jogador_id: 'P2', tipo: 'gol' },
    { jogo_id: 'g2', jogador_id: 'P3', tipo: 'gol_contra' },
    { jogo_id: 'g1', jogador_id: 'P2', tipo: 'assistencia' },
    { jogo_id: 'g3', jogador_id: 'P1', tipo: 'gol' },
  ]
  const jogadores = [
    { id: 'P1', nome: 'Paulo', apelido: null },
    { id: 'P2', nome: 'Pedro', apelido: 'Pedrão' },
    { id: 'P3', nome: 'Pablo', apelido: null },
  ]
  const r = rankingsEstatisticas(jogos, eventos, jogadores)
  assert.deepEqual(r.artilharia.map((x) => [x.jogadorId, x.total]), [['P1', 2], ['P2', 1]])
  assert.deepEqual(r.assistencias.map((x) => [x.jogadorId, x.total]), [['P2', 1]])
  assert.deepEqual(r.melhoresEmCampo.map((x) => [x.nome, x.total]), [['Pedrão', 2]])
})

test('conferirPlacar compara gols e gols contra com o placar digitado', () => {
  const jogo = { id: 'g1', equipe_a_id: 'E1', equipe_b_id: 'E2', gols_a: 2, gols_b: 1 }
  const equipeJogadores = [
    { jogador_id: 'P1', equipe_id: 'E1' },
    { jogador_id: 'P2', equipe_id: 'E2' },
  ]
  const certo = [
    { jogo_id: 'g1', jogador_id: 'P1', tipo: 'gol' },
    { jogo_id: 'g1', jogador_id: 'P2', tipo: 'gol_contra' },
    { jogo_id: 'g1', jogador_id: 'P2', tipo: 'gol' },
  ]
  assert.equal(conferirPlacar(jogo, certo, equipeJogadores).confere, true)

  const faltando = [{ jogo_id: 'g1', jogador_id: 'P1', tipo: 'gol' }]
  const resultado = conferirPlacar(jogo, faltando, equipeJogadores)
  assert.equal(resultado.confere, false)
  assert.equal(resultado.registradoA, 1)
})
