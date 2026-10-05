-- Campeonatos e jogos (fut7): campeonato, grupos, equipes, jogadores, jogos e eventos.
-- Classificação, suspensões e rankings são calculados a partir dos jogos e eventos (nada disso é gravado).
-- Só o professor escreve. Aluno aprovado e ativo apenas lê.

begin;

create or replace function public.usuario_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from perfil_usuario p
    join aluno a on a.id = p.aluno_id
    where p.user_id = auth.uid() and p.status = 'aprovado' and a.ativo
  );
$$;

revoke execute on function public.usuario_ativo() from public, anon;
grant execute on function public.usuario_ativo() to authenticated;

create table public.campeonato (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  status text not null default 'montando'
    check (status in ('montando', 'grupos', 'mata_mata', 'encerrado')),
  classificados_por_grupo int not null default 2 check (classificados_por_grupo >= 1),
  amarelos_para_suspensao int not null default 2 check (amarelos_para_suspensao >= 1),
  zerar_amarelos_no_mata_mata boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.jogador (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  apelido text,
  aluno_id uuid unique references public.aluno(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.grupo (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonato(id) on delete cascade,
  nome text not null,
  unique (campeonato_id, nome),
  unique (id, campeonato_id)
);

create table public.equipe (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonato(id) on delete cascade,
  grupo_id uuid,
  nome text not null,
  cor text,
  unique (campeonato_id, nome),
  unique (id, campeonato_id),
  foreign key (grupo_id, campeonato_id)
    references public.grupo(id, campeonato_id) on delete set null (grupo_id)
);

create table public.equipe_jogador (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null,
  equipe_id uuid not null,
  jogador_id uuid not null references public.jogador(id) on delete cascade,
  unique (campeonato_id, jogador_id),
  foreign key (equipe_id, campeonato_id)
    references public.equipe(id, campeonato_id) on delete cascade
);

create table public.jogo (
  id uuid primary key default gen_random_uuid(),
  campeonato_id uuid not null references public.campeonato(id) on delete cascade,
  fase text not null check (fase in ('grupo', 'oitavas', 'quartas', 'semifinal', 'final')),
  rodada int,
  grupo_id uuid references public.grupo(id) on delete set null,
  equipe_a_id uuid,
  equipe_b_id uuid,
  data_hora timestamptz,
  local text,
  gols_a int check (gols_a >= 0),
  gols_b int check (gols_b >= 0),
  penaltis_a int check (penaltis_a >= 0),
  penaltis_b int check (penaltis_b >= 0),
  melhor_jogador_id uuid references public.jogador(id) on delete set null,
  encerrado boolean not null default false,
  proximo_jogo_id uuid references public.jogo(id) on delete set null,
  proximo_lado text check (proximo_lado in ('a', 'b')),
  criado_em timestamptz not null default now(),
  foreign key (equipe_a_id, campeonato_id) references public.equipe(id, campeonato_id),
  foreign key (equipe_b_id, campeonato_id) references public.equipe(id, campeonato_id),
  constraint jogo_equipes_diferentes
    check (equipe_a_id is null or equipe_b_id is null or equipe_a_id <> equipe_b_id),
  constraint jogo_penaltis_validos check (
    (penaltis_a is null and penaltis_b is null)
    or (fase <> 'grupo' and penaltis_a is not null and penaltis_b is not null
        and penaltis_a <> penaltis_b and gols_a is not null and gols_a = gols_b)
  ),
  constraint jogo_encerrado_completo check (
    not encerrado
    or (equipe_a_id is not null and equipe_b_id is not null
        and gols_a is not null and gols_b is not null
        and (fase = 'grupo' or gols_a <> gols_b or penaltis_a is not null))
  )
);

create table public.jogo_evento (
  id uuid primary key default gen_random_uuid(),
  jogo_id uuid not null references public.jogo(id) on delete cascade,
  jogador_id uuid not null references public.jogador(id) on delete cascade,
  tipo text not null check (tipo in ('gol', 'assistencia', 'gol_contra', 'amarelo', 'vermelho')),
  minuto int check (minuto between 0 and 120),
  jogos_suspensao int check (jogos_suspensao >= 1),
  criado_em timestamptz not null default now()
);

create or replace function public.validar_evento_jogo()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_a uuid;
  v_b uuid;
  v_campeonato uuid;
begin
  select equipe_a_id, equipe_b_id, campeonato_id into v_a, v_b, v_campeonato
  from jogo where id = new.jogo_id;

  if not exists (
    select 1 from equipe_jogador ej
    where ej.jogador_id = new.jogador_id
      and ej.campeonato_id = v_campeonato
      and ej.equipe_id in (v_a, v_b)
  ) then
    raise exception 'O jogador não pertence a nenhuma das equipes deste jogo.';
  end if;

  return new;
end;
$$;

create trigger jogo_evento_valida_jogador
  before insert or update of jogo_id, jogador_id on public.jogo_evento
  for each row execute function public.validar_evento_jogo();

create index on public.equipe (campeonato_id);
create index on public.equipe_jogador (equipe_id);
create index on public.jogo (campeonato_id, fase, data_hora);
create index on public.jogo_evento (jogo_id);
create index on public.jogo_evento (jogador_id, tipo);

alter table public.campeonato enable row level security;
alter table public.jogador enable row level security;
alter table public.grupo enable row level security;
alter table public.equipe enable row level security;
alter table public.equipe_jogador enable row level security;
alter table public.jogo enable row level security;
alter table public.jogo_evento enable row level security;

create policy "Admin gerencia campeonato" on public.campeonato
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "Aluno ativo le campeonato" on public.campeonato
  for select to authenticated using (usuario_ativo());

create policy "Admin gerencia jogador" on public.jogador
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "Aluno ativo le jogador" on public.jogador
  for select to authenticated using (usuario_ativo());

create policy "Admin gerencia grupo" on public.grupo
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "Aluno ativo le grupo" on public.grupo
  for select to authenticated using (usuario_ativo());

create policy "Admin gerencia equipe" on public.equipe
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "Aluno ativo le equipe" on public.equipe
  for select to authenticated using (usuario_ativo());

create policy "Admin gerencia equipe_jogador" on public.equipe_jogador
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "Aluno ativo le equipe_jogador" on public.equipe_jogador
  for select to authenticated using (usuario_ativo());

create policy "Admin gerencia jogo" on public.jogo
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "Aluno ativo le jogo" on public.jogo
  for select to authenticated using (usuario_ativo());

create policy "Admin gerencia jogo_evento" on public.jogo_evento
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "Aluno ativo le jogo_evento" on public.jogo_evento
  for select to authenticated using (usuario_ativo());

revoke all on public.campeonato, public.jogador, public.grupo, public.equipe,
  public.equipe_jogador, public.jogo, public.jogo_evento from anon;

commit;
