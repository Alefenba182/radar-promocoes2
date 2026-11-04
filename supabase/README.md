# Configuração do banco (Supabase)

1. No Supabase, abra **SQL Editor** e crie uma consulta.
2. Copie todo o conteúdo de `supabase/schema.sql`, cole e execute (**Run**).
3. Em **Authentication → Sign In / Providers** (ou **Auth → Settings**), habilite **Allow anonymous sign-ins**.

A tabela `public.search_configs` usa Row Level Security. Cada usuário autenticado anonimamente só pode ler e alterar a própria configuração. A chave publishable pode ser usada no navegador; nunca coloque uma `service_role` ou secret key no frontend.
