import test from 'node:test'
import assert from 'node:assert/strict'
import { hojeEmBelem, somarDias, diasEntre, statusDaMensalidade, mesesDeAtraso, valorComJuro } from './mensalidade.js'

const pendente = (vencimento) => ({ status: 'pendente', data_vencimento: vencimento, valor: 100 })

test('hoje em Belém usa o fuso local e não o UTC', () => {
  assert.equal(hojeEmBelem(new Date('2026-10-05T23:30:00-03:00')), '2026-10-05')
  assert.equal(new Date('2026-10-05T23:30:00-03:00').toISOString().slice(0, 10), '2026-10-06')
  assert.equal(hojeEmBelem(new Date('2026-10-06T00:00:00-03:00')), '2026-10-06')
  assert.equal(hojeEmBelem(new Date('2026-10-05T00:00:00-03:00')), '2026-10-05')
})

test('bug do fuso: às 23h30 do dia do vencimento a mensalidade ainda não está atrasada', () => {
  const hoje = hojeEmBelem(new Date('2026-10-05T23:30:00-03:00'))
  const mensalidade = pendente('2026-10-05')

  assert.equal(statusDaMensalidade(mensalidade, hoje), 'vencendo')
  assert.equal(valorComJuro(mensalidade, statusDaMensalidade(mensalidade, hoje), hoje), 100)
})

test('na manhã seguinte ao vencimento fica atrasada e cobra o primeiro mês de juro', () => {
  const hoje = hojeEmBelem(new Date('2026-10-06T00:00:00-03:00'))
  const mensalidade = pendente('2026-10-05')

  assert.equal(statusDaMensalidade(mensalidade, hoje), 'atrasado')
  assert.equal(valorComJuro(mensalidade, 'atrasado', hoje), 115)
})

test('status: pago, vencendo em até 5 dias e pendente depois disso', () => {
  assert.equal(statusDaMensalidade({ status: 'pago', data_vencimento: '2020-01-01' }, '2026-10-05'), 'pago')
  assert.equal(statusDaMensalidade(pendente('2026-10-10'), '2026-10-05'), 'vencendo')
  assert.equal(statusDaMensalidade(pendente('2026-10-11'), '2026-10-05'), 'pendente')
})

test('juro de R$15 a cada 30 dias de atraso', () => {
  assert.equal(mesesDeAtraso('2026-10-05', '2026-10-05'), 0)
  assert.equal(mesesDeAtraso('2026-10-05', '2026-10-06'), 1)
  assert.equal(mesesDeAtraso('2026-10-05', '2026-11-04'), 1)
  assert.equal(mesesDeAtraso('2026-10-05', '2026-11-05'), 2)
  assert.equal(valorComJuro(pendente('2026-08-01'), 'atrasado', '2026-10-05'), 145)
})

test('somarDias e diasEntre atravessam mês e ano', () => {
  assert.equal(somarDias('2026-12-30', 5), '2027-01-04')
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28')
  assert.equal(diasEntre('2026-12-31', '2027-01-02'), 2)
})
