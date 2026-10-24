-- Remove a funcionalidade de campeonatos do banco (tabelas, funções e dados).
-- ATENÇÃO: apaga todos os campeonatos, times, jogadores, jogos e estatísticas. Não tem como desfazer.
begin;

drop function if exists public.campeonato_publico(text);

drop table if exists public.campeonato_link;
drop table if exists public.jogo_evento;
drop table if exists public.jogo;
drop table if exists public.equipe_jogador;
drop table if exists public.equipe;
drop table if exists public.grupo;
drop table if exists public.jogador;
drop table if exists public.campeonato;

drop function if exists public.validar_evento_jogo();
drop function if exists public.usuario_ativo();

commit;
