# Conexão OAuth do Mercado Livre

A aplicação do Mercado Livre já foi cadastrada com o Redirect URI da raiz do GitHub Pages:

`https://alefenba182.github.io/radar-promocoes2/`

Não precisamos alterar a aplicação nem criar outra. O painel `index.html` detecta o retorno OAuth e encaminha somente os parâmetros (`code`, `state` e eventual erro) para a Edge Function. A troca do código e o Client Secret continuam exclusivamente no servidor.

## Ajustar o Secret

Em **Supabase → Edge Functions → Secrets**, edite o secret existente `ML_REDIRECT_URI` para exatamente:

`https://alefenba182.github.io/radar-promocoes2/`

Mantenha `ML_CLIENT_ID` e `ML_CLIENT_SECRET` como estão.

## Publicar

Publique o `index.html` atualizado pelo GitHub Pages e substitua o código da Edge Function `mercadolivre-oauth` pelo arquivo do repositório. Mantenha **Verify JWT with legacy secret** desativado.

A função usa o Redirect URI original cadastrado no DevCenter para iniciar a autorização e trocar o código por tokens. O state aleatório, de uso único e com validade de 10 minutos continua validado no servidor.

Não inicie a autorização até que o painel e a função estejam publicados e o secret `ML_REDIRECT_URI` esteja atualizado.
