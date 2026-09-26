import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const cabecalhosCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Aparelho = { id: string; endpoint: string; p256dh: string; auth: string }
type Resultado = { enviados: number; removidos: number; falhas: number; motivos: string[] }
type WebPush = { sendNotification: (assinatura: unknown, payload: string) => Promise<unknown> }

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
  })
}

function hojeEmBelem(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem' }).format(new Date())
}

function somarDias(dataIso: string, dias: number): string {
  const data = new Date(`${dataIso}T00:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

function formatarDiaMes(dataIso: string): string {
  const [, mes, dia] = dataIso.split('-')
  return `${dia}/${mes}`
}

function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
}

async function enviarPara(
  supabase: SupabaseClient,
  webpush: WebPush,
  aparelhos: Aparelho[],
  payload: string,
): Promise<Resultado> {
  const resultado: Resultado = { enviados: 0, removidos: 0, falhas: 0, motivos: [] }

  await Promise.all(
    aparelhos.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          payload,
        )
        resultado.enviados++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await supabase.from('push_subscription').delete().eq('id', a.id)
          resultado.removidos++
        } else {
          resultado.falhas++
          resultado.motivos.push(`${status ?? 'sem status'}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }),
  )

  return resultado
}

async function avisarVencimentos(supabase: SupabaseClient, webpush: WebPush, simular: boolean) {
  const hoje = hojeEmBelem()
  const emCincoDias = somarDias(hoje, 5)

  const { data: mensalidades, error } = await supabase
    .from('mensalidade')
    .select('aluno_id, valor, data_vencimento, aluno(nome, ativo)')
    .neq('status', 'pago')
    .in('data_vencimento', [hoje, emCincoDias])
  if (error) throw new Error(`Erro ao ler mensalidades: ${error.message}`)

  const avisos = (mensalidades ?? [])
    .map((m) => {
      const aluno = Array.isArray(m.aluno) ? m.aluno[0] : m.aluno
      return { ...m, nome: aluno?.nome as string | undefined, ativo: aluno?.ativo as boolean | undefined }
    })
    .filter((m) => m.ativo)

  const alunoIds = [...new Set(avisos.map((m) => m.aluno_id))]
  const { data: perfis } = alunoIds.length
    ? await supabase.from('perfil_usuario').select('user_id, aluno_id').in('aluno_id', alunoIds)
    : { data: [] }
  const usuarioPorAluno = new Map((perfis ?? []).map((p) => [p.aluno_id, p.user_id]))

  const usuarioIds = [...new Set(usuarioPorAluno.values())]
  const { data: todosAparelhos } = usuarioIds.length
    ? await supabase.from('push_subscription').select('id, user_id, endpoint, p256dh, auth').in('user_id', usuarioIds)
    : { data: [] }

  const aparelhosPorUsuario = new Map<string, Aparelho[]>()
  for (const a of todosAparelhos ?? []) {
    const lista = aparelhosPorUsuario.get(a.user_id) ?? []
    lista.push(a)
    aparelhosPorUsuario.set(a.user_id, lista)
  }

  const resumo = {
    hoje,
    simulacao: simular,
    avisosCincoDias: 0,
    avisosNoDia: 0,
    semAparelho: 0,
    enviados: 0,
    removidos: 0,
    falhas: 0,
    motivos: [] as string[],
    alunos: [] as { nome?: string; tipo: string; aparelhos: number }[],
  }

  for (const m of avisos) {
    const noDia = m.data_vencimento === hoje
    const valor = formatarValor(m.valor)
    const corpo = noDia
      ? `Sua mensalidade de ${valor} vence hoje. Faça o pagamento para evitar atrasos!`
      : `Sua mensalidade de ${valor} vence dia ${formatarDiaMes(m.data_vencimento)}. Faça o pagamento para evitar atrasos!`

    if (noDia) resumo.avisosNoDia++
    else resumo.avisosCincoDias++

    const usuarioId = usuarioPorAluno.get(m.aluno_id)
    const aparelhos = usuarioId ? aparelhosPorUsuario.get(usuarioId) ?? [] : []
    resumo.alunos.push({ nome: m.nome, tipo: noDia ? 'no dia' : '5 dias antes', aparelhos: aparelhos.length })

    if (aparelhos.length === 0) {
      resumo.semAparelho++
      continue
    }
    if (simular) continue

    const resultado = await enviarPara(
      supabase,
      webpush,
      aparelhos,
      JSON.stringify({ titulo: 'Mensalidade', corpo, url: '/mensalidade' }),
    )
    resumo.enviados += resultado.enviados
    resumo.removidos += resultado.removidos
    resumo.falhas += resultado.falhas
    resumo.motivos.push(...resultado.motivos)
  }

  return resumo
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosCors })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const segredoCron = req.headers.get('x-cron-secret')
    const chamadoPeloCron = Boolean(segredoCron) && segredoCron === Deno.env.get('CRON_SECRET')

    if (!chamadoPeloCron) {
      const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) return resposta({ erro: 'Não autenticado.' }, 401)

      const { data: perfil } = await supabase
        .from('perfil_usuario')
        .select('papel')
        .eq('user_id', user.id)
        .maybeSingle()
      if (perfil?.papel !== 'admin') {
        return resposta({ erro: 'Somente o professor pode enviar notificações.' }, 403)
      }
    }

    const dados = await req.json().catch(() => ({}))

    const faltando = ['VAPID_SUBJECT', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'].filter(
      (nome) => !Deno.env.get(nome),
    )
    if (faltando.length > 0) {
      return resposta({ erro: `Secrets ausentes na função: ${faltando.join(', ')}.` }, 500)
    }

    const { default: webpush } = await import('npm:web-push@3.6.7')
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )

    if (dados.modo === 'vencimentos') {
      if (!chamadoPeloCron) {
        return resposta({ erro: 'Este modo só pode ser chamado pelo agendador.' }, 403)
      }
      return resposta(await avisarVencimentos(supabase, webpush, dados.simular === true))
    }

    const { titulo, corpo, url } = dados
    if (!corpo || !String(corpo).trim()) return resposta({ erro: 'Escreva a mensagem.' }, 400)

    const { data: aparelhos, error } = await supabase
      .from('push_subscription')
      .select('id, endpoint, p256dh, auth')
    if (error) return resposta({ erro: `Erro ao ler aparelhos: ${error.message}` }, 500)

    const resultado = await enviarPara(
      supabase,
      webpush,
      aparelhos ?? [],
      JSON.stringify({
        titulo: titulo || 'RJ Training',
        corpo: String(corpo).trim(),
        url: url || '/',
      }),
    )

    return resposta({ total: aparelhos?.length ?? 0, ...resultado })
  } catch (e) {
    return resposta({ erro: `Falha interna: ${e instanceof Error ? e.message : String(e)}` }, 500)
  }
})
