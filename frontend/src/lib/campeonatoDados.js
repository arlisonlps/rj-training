import { supabase } from './supabaseClient'

const LIMITE_LISTAS = 500
const LIMITE_EVENTOS = 5000

export async function carregarCampeonatoCompleto(id) {
  const [campeonatoRes, equipesRes, membrosRes, gruposRes, jogosRes] = await Promise.all([
    supabase.from('campeonato').select('*').eq('id', id).single(),
    supabase.from('equipe').select('id, nome, cor, grupo_id, desempate_manual').eq('campeonato_id', id).order('nome'),
    supabase
      .from('equipe_jogador')
      .select('id, equipe_id, jogador(id, nome, apelido, aluno_id)')
      .eq('campeonato_id', id)
      .limit(LIMITE_LISTAS),
    supabase.from('grupo').select('id, nome').eq('campeonato_id', id).order('nome'),
    supabase.from('jogo').select('*').eq('campeonato_id', id).order('rodada').limit(LIMITE_LISTAS),
  ])

  if (campeonatoRes.error) return null

  const jogos = jogosRes.data || []
  let eventos = []
  if (jogos.length > 0) {
    const { data } = await supabase
      .from('jogo_evento')
      .select('*')
      .in('jogo_id', jogos.map((j) => j.id))
      .limit(LIMITE_EVENTOS)
    eventos = data || []
  }

  return {
    campeonato: campeonatoRes.data,
    equipes: equipesRes.data || [],
    membros: membrosRes.data || [],
    grupos: gruposRes.data || [],
    jogos,
    eventos,
  }
}

export async function buscarMeuAlunoId() {
  const { data: userData } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfil_usuario')
    .select('aluno_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  return perfil?.aluno_id ?? null
}

export function proximoJogoDaEquipe(jogos, equipeId) {
  return (
    jogos
      .filter((j) => !j.encerrado && (j.equipe_a_id === equipeId || j.equipe_b_id === equipeId))
      .sort((a, b) => {
        if (a.data_hora && b.data_hora) return a.data_hora < b.data_hora ? -1 : 1
        if (a.data_hora) return -1
        if (b.data_hora) return 1
        return 0
      })[0] ?? null
  )
}

export async function buscarMeuCampeonato(alunoId) {
  const { data: jogador } = await supabase.from('jogador').select('id').eq('aluno_id', alunoId).maybeSingle()
  if (!jogador) return null

  const { data: vinculos } = await supabase
    .from('equipe_jogador')
    .select('equipe(id, nome, cor, campeonato(id, nome, status, criado_em))')
    .eq('jogador_id', jogador.id)

  const equipe = (vinculos || [])
    .map((v) => v.equipe)
    .filter((e) => e?.campeonato && e.campeonato.status !== 'encerrado')
    .sort((a, b) => (a.campeonato.criado_em < b.campeonato.criado_em ? 1 : -1))[0]
  if (!equipe) return null

  const { data: jogos } = await supabase
    .from('jogo')
    .select('id, equipe_a_id, equipe_b_id, data_hora, local, encerrado')
    .eq('campeonato_id', equipe.campeonato.id)
    .eq('encerrado', false)
    .or(`equipe_a_id.eq.${equipe.id},equipe_b_id.eq.${equipe.id}`)
    .limit(50)

  const proximoJogo = proximoJogoDaEquipe(jogos || [], equipe.id)
  let adversario = null
  if (proximoJogo) {
    const adversarioId = proximoJogo.equipe_a_id === equipe.id ? proximoJogo.equipe_b_id : proximoJogo.equipe_a_id
    const { data } = await supabase.from('equipe').select('id, nome').eq('id', adversarioId).maybeSingle()
    adversario = data
  }

  return { campeonato: equipe.campeonato, equipe, proximoJogo, adversario }
}
