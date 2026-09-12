import { supabase } from './supabaseClient'

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
    const dataVencimento = new Date(ano, mes, aluno.dia_vencimento)
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
