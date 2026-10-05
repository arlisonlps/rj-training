export function formatarData(dataIso) {
  if (!dataIso) return '-'
  const [ano, mes, dia] = dataIso.split('-')
  return `${dia}/${mes}/${ano}`
}

function doisDigitos(n) {
  return String(n).padStart(2, '0')
}

export function paraInputDataHora(dataHoraIso) {
  if (!dataHoraIso) return ''
  const d = new Date(dataHoraIso)
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}T${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
}

export function deInputDataHora(valor) {
  return valor ? new Date(valor).toISOString() : null
}

export function formatarDataHoraCurta(dataHoraIso) {
  if (!dataHoraIso) return 'Sem data'
  const d = new Date(dataHoraIso)
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)} às ${doisDigitos(d.getHours())}h${doisDigitos(d.getMinutes())}`
}
