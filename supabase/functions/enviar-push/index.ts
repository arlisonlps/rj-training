import { createClient } from 'npm:@supabase/supabase-js@2'

const cabecalhosCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
  })
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

    const { titulo, corpo, url } = await req.json()
    if (!corpo || !String(corpo).trim()) return resposta({ erro: 'Escreva a mensagem.' }, 400)

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

    const { data: aparelhos, error } = await supabase
      .from('push_subscription')
      .select('id, endpoint, p256dh, auth')
    if (error) return resposta({ erro: `Erro ao ler aparelhos: ${error.message}` }, 500)

    const payload = JSON.stringify({
      titulo: titulo || 'RJ Training',
      corpo: String(corpo).trim(),
      url: url || '/',
    })

    let enviados = 0
    let removidos = 0
    let falhas = 0
    const motivos: string[] = []

    await Promise.all(
      (aparelhos ?? []).map(async (a) => {
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
            payload,
          )
          enviados++
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await supabase.from('push_subscription').delete().eq('id', a.id)
            removidos++
          } else {
            falhas++
            motivos.push(`${status ?? 'sem status'}: ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }),
    )

    return resposta({ total: aparelhos?.length ?? 0, enviados, removidos, falhas, motivos })
  } catch (e) {
    return resposta({ erro: `Falha interna: ${e instanceof Error ? e.message : String(e)}` }, 500)
  }
})
