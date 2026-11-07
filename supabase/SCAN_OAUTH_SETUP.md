# Scanner autenticado do Mercado Livre

A função `scan-offers` agora usa o token OAuth salvo por `mercadolivre-oauth`, renova automaticamente o access token quando está próximo de expirar e repete uma busca uma vez se a API responder 401.

## Publicação manual no Supabase

1. Abra **Edge Functions → scan-offers → Code**.
2. Substitua o conteúdo de `index.ts` pelo arquivo `supabase/functions/scan-offers/index.ts` deste repositório.
3. Publique a função.
4. Não altere `CRON_SECRET`, `ML_CLIENT_ID` ou `ML_CLIENT_SECRET`.

O scanner continua protegido por `CRON_SECRET`. A chave de serviço do Supabase e os tokens OAuth são usados apenas no servidor.


## Busca manual pelo painel

O botão **Buscar ofertas agora** chama esta função com o JWT da sessão do usuário. A função valida o JWT no Supabase Auth e restringe a execução à configuração daquele usuário. Chamadas do agendador continuam usando exclusivamente o `CRON_SECRET` e podem percorrer todas as configurações. A função mantém `verify_jwt = false` no gateway porque faz a validação dos dois tipos de credencial internamente.


## Alternativa oficial quando a busca geral retorna 403

A função tenta o fluxo documentado de catálogo: `GET /products/search?status=active&site_id=MLB&q=...` e, para cada produto retornado, `GET /products/{PRODUCT_ID}`. Só considera uma oferta quando `buy_box_winner` contém `item_id`, preço e o produto tem `permalink`; também exige `shipping.free_shipping === true`. O catálogo não garante vencedor para todos os produtos e não expõe necessariamente condições de parcelamento. Nesses casos, o scanner não inventa preço, frete ou parcelas. O fallback ainda depende de validação real após a publicação da Edge Function.
