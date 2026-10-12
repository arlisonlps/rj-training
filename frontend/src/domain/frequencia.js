const OFFSET_DIA = { terca: 1, quarta: 2, quinta: 3 }
const DIAS_DE_TREINO = [2, 3, 4]

function doisDigitos(n) {
  return String(n).padStart(2, '0')
}

function chaveDia(data) {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

export function mesesDoPeriodo(de, ate) {
  const meses = []
  let ano = de.ano
  let mes = de.mes
  while (ano < ate.ano || (ano === ate.ano && mes <= ate.mes)) {
    meses.push({ ano, mes })
    mes++
    if (mes > 12) {
      mes = 1
      ano++
    }
  }
  return meses
}

export function limitesDaBuscaDoPeriodo(de, ate) {
  const inicio = new Date(de.ano, de.mes - 1, 1)
  inicio.setDate(inicio.getDate() - 7)
  return { de: chaveDia(inicio), ate: chaveDia(new Date(ate.ano, ate.mes, 0)) }
}

export function limitesDaBuscaDoMes(ano, mes) {
  return limitesDaBuscaDoPeriodo({ ano, mes }, { ano, mes })
}

export function diasEsperadosDoMes(ano, mes, hoje) {
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const dias = []
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const data = new Date(ano, mes - 1, dia)
    if (!DIAS_DE_TREINO.includes(data.getDay())) continue
    const chave = chaveDia(data)
    if (chave < hoje) dias.push(chave)
  }
  return dias
}

export function diasEsperadosDoPeriodo(de, ate, hoje) {
  return mesesDoPeriodo(de, ate).flatMap(({ ano, mes }) => diasEsperadosDoMes(ano, mes, hoje))
}

export function dataDoRegistro(registro) {
  const [ano, mes, dia] = registro.semana_referencia.split('-').map(Number)
  return chaveDia(new Date(ano, mes - 1, dia + (OFFSET_DIA[registro.dia_semana] || 0)))
}

export function calcularFrequenciaDoPeriodo({ de, ate, hoje, alunos, registros }) {
  const esperados = diasEsperadosDoPeriodo(de, ate, hoje)
  const conjuntoEsperados = new Set(esperados)

  const presentesPorAluno = new Map()
  for (const registro of registros) {
    const dia = dataDoRegistro(registro)
    if (!conjuntoEsperados.has(dia)) continue
    if (!presentesPorAluno.has(registro.aluno_id)) presentesPorAluno.set(registro.aluno_id, new Set())
    presentesPorAluno.get(registro.aluno_id).add(dia)
  }

  const ultimosTreinos = esperados.slice(-3)

  const linhas = alunos
    .map((aluno) => {
      const presentes = presentesPorAluno.get(aluno.id) ?? new Set()
      return {
        alunoId: aluno.id,
        nome: aluno.nome,
        presentes: presentes.size,
        esperados: esperados.length,
        percentual: esperados.length === 0 ? 0 : Math.round((presentes.size / esperados.length) * 100),
        recentes: ultimosTreinos.filter((dia) => presentes.has(dia)).length,
        dias: esperados.map((dia) => ({ data: dia, presente: presentes.has(dia) })),
      }
    })
    .sort((a, b) => b.percentual - a.percentual || b.recentes - a.recentes || a.nome.localeCompare(b.nome))

  return { esperados, linhas }
}

export function calcularFrequenciaDoMes({ ano, mes, hoje, alunos, registros }) {
  return calcularFrequenciaDoPeriodo({ de: { ano, mes }, ate: { ano, mes }, hoje, alunos, registros })
}
