import test from 'node:test'
import assert from 'node:assert/strict'
import {
  diasEsperadosDoMes,
  dataDoRegistro,
  limitesDaBuscaDoMes,
  limitesDaBuscaDoPeriodo,
  mesesDoPeriodo,
  calcularFrequenciaDoMes,
  calcularFrequenciaDoPeriodo,
} from './frequencia.js'

test('meses do período atravessam a virada do ano', () => {
  assert.deepEqual(mesesDoPeriodo({ ano: 2025, mes: 11 }, { ano: 2026, mes: 2 }), [
    { ano: 2025, mes: 11 },
    { ano: 2025, mes: 12 },
    { ano: 2026, mes: 1 },
    { ano: 2026, mes: 2 },
  ])
  assert.equal(mesesDoPeriodo({ ano: 2026, mes: 5 }, { ano: 2026, mes: 5 }).length, 1)
  assert.equal(mesesDoPeriodo({ ano: 2026, mes: 6 }, { ano: 2026, mes: 5 }).length, 0)
})

test('período de 3 meses soma os treinos de cada mês', () => {
  const de = { ano: 2026, mes: 8 }
  const ate = { ano: 2026, mes: 10 }
  const alunos = [{ id: 'a', nome: 'Ana' }, { id: 'b', nome: 'Bia' }]
  const registros = [
    { aluno_id: 'a', semana_referencia: '2026-08-03', dia_semana: 'terca' },
    { aluno_id: 'a', semana_referencia: '2026-09-07', dia_semana: 'quarta' },
    { aluno_id: 'a', semana_referencia: '2026-10-05', dia_semana: 'quinta' },
    { aluno_id: 'b', semana_referencia: '2026-07-27', dia_semana: 'quinta' },
    { aluno_id: 'b', semana_referencia: '2026-09-07', dia_semana: 'quinta' },
  ]

  const { esperados, linhas } = calcularFrequenciaDoPeriodo({ de, ate, hoje: '2026-11-01', alunos, registros })

  assert.equal(diasEsperadosDoMes(2026, 8, '2026-11-01').length, 12)
  assert.equal(diasEsperadosDoMes(2026, 9, '2026-11-01').length, 14)
  assert.equal(esperados.length, 12 + 14 + 13)

  const ana = linhas.find((l) => l.alunoId === 'a')
  assert.equal(ana.presentes, 3)
  assert.equal(ana.percentual, 8)
  assert.equal(linhas.find((l) => l.alunoId === 'b').presentes, 1)
})

test('a busca do período começa 7 dias antes do primeiro mês e vai até o fim do último', () => {
  assert.deepEqual(limitesDaBuscaDoPeriodo({ ano: 2026, mes: 1 }, { ano: 2026, mes: 12 }), {
    de: '2025-12-25',
    ate: '2026-12-31',
  })
})

test('ano inteiro conta só os treinos que já passaram', () => {
  const { esperados } = calcularFrequenciaDoPeriodo({
    de: { ano: 2026, mes: 1 },
    ate: { ano: 2026, mes: 12 },
    hoje: '2026-10-12',
    alunos: [],
    registros: [],
  })
  assert.ok(esperados.every((dia) => dia < '2026-10-12'))
  assert.ok(esperados.length > 100)
})

test('mês fechado conta todas as terças, quartas e quintas', () => {
  const dias = diasEsperadosDoMes(2026, 10, '2026-11-01')
  assert.equal(dias.length, 13)
  assert.equal(dias[0], '2026-10-01')
  assert.equal(dias.at(-1), '2026-10-29')
})

test('mês em andamento conta só até ontem', () => {
  assert.deepEqual(diasEsperadosDoMes(2026, 10, '2026-10-12'), ['2026-10-01', '2026-10-06', '2026-10-07', '2026-10-08'])
  assert.deepEqual(diasEsperadosDoMes(2026, 10, '2026-10-01'), [])
  assert.deepEqual(diasEsperadosDoMes(2026, 11, '2026-10-12'), [])
})

test('data do registro soma o dia da semana à segunda-feira da semana', () => {
  assert.equal(dataDoRegistro({ semana_referencia: '2026-10-05', dia_semana: 'terca' }), '2026-10-06')
  assert.equal(dataDoRegistro({ semana_referencia: '2026-10-05', dia_semana: 'quarta' }), '2026-10-07')
  assert.equal(dataDoRegistro({ semana_referencia: '2026-09-28', dia_semana: 'quinta' }), '2026-10-01')
})

test('a busca do mês começa 7 dias antes, para pegar a semana que vem do mês anterior', () => {
  assert.deepEqual(limitesDaBuscaDoMes(2026, 10), { de: '2026-09-24', ate: '2026-10-31' })
})

test('percentual, presenças e dias presentes de um mês passado', () => {
  const alunos = [{ id: 'a', nome: 'Ana' }, { id: 'b', nome: 'Bia' }, { id: 'c', nome: 'Caio' }]
  const registros = [
    { aluno_id: 'a', semana_referencia: '2026-09-28', dia_semana: 'quinta' },
    { aluno_id: 'a', semana_referencia: '2026-10-05', dia_semana: 'terca' },
    { aluno_id: 'a', semana_referencia: '2026-10-05', dia_semana: 'terca' },
    { aluno_id: 'b', semana_referencia: '2026-10-05', dia_semana: 'quarta' },
    { aluno_id: 'b', semana_referencia: '2026-11-02', dia_semana: 'terca' },
  ]

  const { esperados, linhas } = calcularFrequenciaDoMes({ ano: 2026, mes: 10, hoje: '2026-11-01', alunos, registros })

  assert.equal(esperados.length, 13)
  const ana = linhas.find((l) => l.alunoId === 'a')
  assert.equal(ana.presentes, 2)
  assert.equal(ana.percentual, 15)
  assert.deepEqual(ana.dias.filter((d) => d.presente).map((d) => d.data), ['2026-10-01', '2026-10-06'])

  assert.equal(linhas.find((l) => l.alunoId === 'b').presentes, 1)
  assert.equal(linhas.find((l) => l.alunoId === 'c').presentes, 0)
  assert.deepEqual(linhas.map((l) => l.alunoId), ['a', 'b', 'c'])
})

test('empate no percentual desempata pelos últimos 3 treinos e depois pelo nome', () => {
  const alunos = [{ id: 'z', nome: 'Zeca' }, { id: 'a', nome: 'Ana' }, { id: 'b', nome: 'Bia' }]
  const registros = [
    { aluno_id: 'z', semana_referencia: '2026-10-26', dia_semana: 'quinta' },
    { aluno_id: 'a', semana_referencia: '2026-10-05', dia_semana: 'terca' },
    { aluno_id: 'b', semana_referencia: '2026-10-05', dia_semana: 'quarta' },
  ]

  const { linhas } = calcularFrequenciaDoMes({ ano: 2026, mes: 10, hoje: '2026-11-01', alunos, registros })

  assert.ok(linhas.every((l) => l.percentual === 8))
  assert.deepEqual(linhas.map((l) => l.nome), ['Zeca', 'Ana', 'Bia'])
})

test('mês sem treinos esperados não divide por zero', () => {
  const { esperados, linhas } = calcularFrequenciaDoMes({
    ano: 2026,
    mes: 12,
    hoje: '2026-10-12',
    alunos: [{ id: 'a', nome: 'Ana' }],
    registros: [],
  })
  assert.equal(esperados.length, 0)
  assert.equal(linhas[0].percentual, 0)
})
