-- Agendador do Radar de Promoções (executar uma única vez no SQL Editor do Supabase).
-- Antes de executar, substitua COLE_AQUI_O_MESMO_CRON_SECRET pelo valor já cadastrado
-- em Edge Functions > Secrets. Não publique esse valor no GitHub nem o envie no chat.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'radar_cron_secret'
  ) then
    perform vault.create_secret(
      'COLE_AQUI_O_MESMO_CRON_SECRET',
      'radar_cron_secret',
      'Autorização do agendador do Radar de Promoções'
    );
  end if;
end
$$;

-- Evita criar mais de um agendamento com o mesmo nome ao executar novamente.
select cron.unschedule(jobid)
from cron.job
where jobname = 'radar-scan-every-15-minutes';

select cron.schedule(
  'radar-scan-every-15-minutes',
  '*/15 * * * *',
  $job$
    select net.http_post(
      url := 'https://vektbwbqgffonwngvvkq.supabase.co/functions/v1/scan-offers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'radar_cron_secret'
          limit 1
        )
      ),
      body := '{}'::jsonb
    );
  $job$
);
