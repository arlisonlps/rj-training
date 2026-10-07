-- Link público de leitura de um campeonato: quem tem o código vê jogos, classificação, mata-mata e estatísticas sem login.
-- O código fica numa tabela só do professor; os dados saem por uma função que devolve apenas o campeonato daquele código.
begin;

create table public.campeonato_link (
  campeonato_id uuid primary key references public.campeonato(id) on delete cascade,
  token text not null unique,
  criado_em timestamptz not null default now()
);

alter table public.campeonato_link enable row level security;

create policy "Admin gerencia link do campeonato" on public.campeonato_link
  for all to authenticated using (is_admin()) with check (is_admin());

revoke all on public.campeonato_link from anon;

create or replace function public.campeonato_publico(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select campeonato_id into v_id from campeonato_link where token = p_token;
  if v_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'campeonato', (
      select jsonb_build_object(
        'id', c.id,
        'nome', c.nome,
        'status', c.status,
        'classificados_por_grupo', c.classificados_por_grupo,
        'amarelos_para_suspensao', c.amarelos_para_suspensao,
        'zerar_amarelos_no_mata_mata', c.zerar_amarelos_no_mata_mata
      )
      from campeonato c where c.id = v_id
    ),
    'equipes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'nome', e.nome, 'cor', e.cor, 'grupo_id', e.grupo_id, 'desempate_manual', e.desempate_manual
      ) order by e.nome)
      from equipe e where e.campeonato_id = v_id
    ), '[]'::jsonb),
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.nome) order by g.nome)
      from grupo g where g.campeonato_id = v_id
    ), '[]'::jsonb),
    'membros', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ej.id,
        'equipe_id', ej.equipe_id,
        'jogador', jsonb_build_object('id', j.id, 'nome', j.nome, 'apelido', j.apelido)
      ))
      from equipe_jogador ej
      join jogador j on j.id = ej.jogador_id
      where ej.campeonato_id = v_id
    ), '[]'::jsonb),
    'jogos', coalesce((
      select jsonb_agg(to_jsonb(jogo_linha) order by jogo_linha.rodada)
      from jogo jogo_linha where jogo_linha.campeonato_id = v_id
    ), '[]'::jsonb),
    'eventos', coalesce((
      select jsonb_agg(to_jsonb(evento_linha))
      from jogo_evento evento_linha
      join jogo jogo_do_evento on jogo_do_evento.id = evento_linha.jogo_id
      where jogo_do_evento.campeonato_id = v_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.campeonato_publico(text) from public;
grant execute on function public.campeonato_publico(text) to anon, authenticated;

commit;
