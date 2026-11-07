# Publicar scanner pelo GitHub Actions

Este fluxo evita copiar o arquivo grande pelo celular. Ele publica somente a Edge Function `scan-offers` do repositório no projeto Supabase configurado.

## Preparação única

1. No Supabase, abra **Account → Access Tokens** (ou **Access Tokens**) e crie um token pessoal com acesso de gerenciamento ao projeto.
2. No GitHub, abra o repositório **Settings → Secrets and variables → Actions → New repository secret**.
3. Nome: `SUPABASE_ACCESS_TOKEN`.
4. Valor: cole o token pessoal do Supabase. Não envie esse token no chat e não o coloque em arquivos do repositório.

## Publicar

1. No GitHub, abra **Actions**.
2. Escolha **Publicar scanner no Supabase**.
3. Toque em **Run workflow** e confirme.
4. Aguarde o resultado **Success**.

O fluxo usa o Supabase CLI para publicar somente `scan-offers` no projeto `vektbwbqgffonwngvvkq`. Ele não altera tabelas, segredos nem a função OAuth. A função mantém `verify_jwt = false` conforme `supabase/config.toml`; a própria função valida JWT de usuário e o segredo do agendador.

Se o repositório não tiver o secret configurado, o fluxo falha com uma mensagem clara e não publica nada.
