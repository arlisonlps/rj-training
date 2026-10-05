-- Ordem definida pelo professor para desempates que as regras automáticas não resolvem (1 = melhor).
alter table public.equipe
  add column desempate_manual int check (desempate_manual >= 1);
