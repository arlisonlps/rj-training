-- Data e hora limite do aviso no app. Vazio = vale até o professor desativar.
alter table public.aviso
  add column expira_em timestamptz;
