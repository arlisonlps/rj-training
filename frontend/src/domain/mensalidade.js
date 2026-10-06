export const JURO_ATRASO_MENSAL = 15

const FUSO = 'America/Belem'
const DIA_EM_MS = 24 * 60 * 60 * 1000

export function hojeEmBelem(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora)
}

export function somarDias(dataIso, dias) {
  const data = new Date(`${dataIso}T00:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

export function diasEntre(inicioIso, fimIso) {
  return Math.round((Date.parse(`${fimIso}T00:00:00Z`) - Date.parse(`${inicioIso}T00:00:00Z`)) / DIA_EM_MS)
}

export function statusDaMensalidade(mensalidade, hoje = hojeEmBelem()) {
  if (mensalidade.status === 'pago') return 'pago'
  if (mensalidade.data_vencimento < hoje) return 'atrasado'
  if (mensalidade.data_vencimento <= somarDias(hoje, 5)) return 'vencendo'
  return 'pendente'
}

export function mesesDeAtraso(dataVencimento, hoje = hojeEmBelem()) {
  const dias = diasEntre(dataVencimento, hoje)
  return dias <= 0 ? 0 : Math.ceil(dias / 30)
}

export function valorComJuro(mensalidade, status, hoje = hojeEmBelem()) {
  const valor = Number(mensalidade.valor)
  if (status !== 'atrasado') return valor
  return valor + JURO_ATRASO_MENSAL * mesesDeAtraso(mensalidade.data_vencimento, hoje)
}
