import { supabase } from './supabaseClient'
import { hojeEmBelem } from '../domain/mensalidade'

function ultimoDiaDoMes(ano, mes) {
  return new Date(ano, mes, 0).getDate()
}

function doisDigitos(n) {
  return String(n).padStart(2, '0')
}

export async function gerarMensalidadesDoMesAtual() {
  const { data: alunosAtivos, error } = await supabase
    .from('aluno')
    .select('*')
    .eq('ativo', true)

  if (error || !alunosAtivos) return

  const [ano, mes] = hojeEmBelem().split('-').map(Number)
  const mesReferencia = `${ano}-${doisDigitos(mes)}-01`

  for (const aluno of alunosAtivos) {
    if (!aluno.dia_vencimento || !aluno.valor_mensalidade) continue

    const dia = Math.min(aluno.dia_vencimento, ultimoDiaDoMes(ano, mes))
    const dataVencimentoStr = `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`

    await supabase.from('mensalidade').upsert(
      {
        aluno_id: aluno.id,
        mes_referencia: mesReferencia,
        data_vencimento: dataVencimentoStr,
        valor: aluno.valor_mensalidade,
        status: 'pendente',
      },
      { onConflict: 'aluno_id,mes_referencia', ignoreDuplicates: true }
    )
  }
}
