import { supabase } from './supabaseClient'

export const JURO_ATRASO_MENSAL = 15

function mesesAtraso(dataVencimento) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const vencimento = new Date(dataVencimento + 'T00:00:00')
  const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24))
  return diasAtraso <= 0 ? 0 : Math.ceil(diasAtraso / 30)
}

export function valorComJuro(mensalidade, status) {
  const valor = Number(mensalidade.valor)
  if (status !== 'atrasado') return valor
  return valor + JURO_ATRASO_MENSAL * mesesAtraso(mensalidade.data_vencimento)
}

function ultimoDiaDoMes(ano, mesIndex) {
  return new Date(ano, mesIndex + 1, 0).getDate()
}

export async function gerarMensalidadesDoMesAtual() {
  const { data: alunosAtivos, error } = await supabase
    .from('aluno')
    .select('*')
    .eq('ativo', true)

  if (error || !alunosAtivos) return

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const mesReferencia = `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  for (const aluno of alunosAtivos) {
    if (!aluno.dia_vencimento || !aluno.valor_mensalidade) continue

    const dia = Math.min(aluno.dia_vencimento, ultimoDiaDoMes(ano, mes))
    const dataVencimento = new Date(ano, mes, dia)
    const dataVencimentoStr = dataVencimento.toISOString().split('T')[0]

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
