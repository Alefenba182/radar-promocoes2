# Conexão OAuth do Mercado Livre

Esta etapa adiciona o callback OAuth seguro. Ela ainda não altera o scanner; a integração da busca autenticada será feita depois que esta etapa estiver publicada.

## 1. Criar as tabelas

No Supabase, abra **SQL Editor**, crie uma consulta, cole o conteúdo de `supabase/mercadolivre-oauth.sql` e execute.

## 2. Criar a Edge Function

Em **Edge Functions**, crie uma função chamada `mercadolivre-oauth`. No editor, substitua o conteúdo de `index.ts` pelo arquivo `supabase/functions/mercadolivre-oauth/index.ts` deste repositório e publique.

Desative **Verify JWT with legacy secret** para essa função. O retorno do Mercado Livre chega pelo navegador sem JWT do Supabase; a função valida um state aleatório, de uso único e com validade de 10 minutos.

## 3. Cadastrar os secrets

Em **Edge Functions → Secrets**, adicione:

- `ML_CLIENT_ID`: Client ID da aplicação do Mercado Livre.
- `ML_CLIENT_SECRET`: Client Secret da aplicação. Não compartilhe este valor no chat.
- `ML_REDIRECT_URI`: `https://vektbwbqgffonwngvvkq.supabase.co/functions/v1/mercadolivre-oauth`

O endereço precisa ser idêntico ao cadastrado no DevCenter do Mercado Livre. Não inclua `?action=start`.

## 4. Atualizar o redirect URI no DevCenter

Na aplicação do Mercado Livre, substitua o endereço antigo pelo valor de `ML_REDIRECT_URI` acima e salve.

## 5. Autorizar

Depois de executar o SQL, publicar a função e cadastrar os três secrets, abra no navegador:

`https://vektbwbqgffonwngvvkq.supabase.co/functions/v1/mercadolivre-oauth?action=start`

Entre na conta do Mercado Livre e aceite a autorização. Ao final, a página deverá confirmar **Mercado Livre conectado!**

Os tokens são gravados apenas no banco, sem acesso por usuários anon/authenticated. O Client Secret nunca vai para o navegador.
