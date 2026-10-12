import { supabase } from './supabaseClient'
import { limitesDaBuscaDoPeriodo } from '../domain/frequencia'

const TAMANHO_PAGINA = 1000

export async function buscarPresencasDoPeriodo(de, ate) {
  const limites = limitesDaBuscaDoPeriodo(de, ate)
  const registros = []

  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await supabase
      .from('presenca')
      .select('aluno_id, dia_semana, semana_referencia')
      .eq('presente', true)
      .gte('semana_referencia', limites.de)
      .lte('semana_referencia', limites.ate)
      .order('semana_referencia')
      .order('aluno_id')
      .order('dia_semana')
      .range(inicio, inicio + TAMANHO_PAGINA - 1)

    if (error) throw error
    registros.push(...data)
    if (data.length < TAMANHO_PAGINA) break
  }

  return registros
}

export function buscarPresencasDoMes(ano, mes) {
  return buscarPresencasDoPeriodo({ ano, mes }, { ano, mes })
}
