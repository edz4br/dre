# Simulado DRE — Fundamentos da Contabilidade

Aplicação colaborativa para treinar a DRE apresentada nas Aulas 10, 11 e 12 e no plano de contas de resultado. Cada pessoa recebe contas de origem e precisa somá-las para apurar os valores da sua área. Os subtotais não são entregues prontos.

## Áreas do grupo

- **Operacional — dois gerentes na mesma aba:** somam receitas brutas, custos, lucro bruto, contas operacionais e resultado operacional.
- **Investimento:** apura equivalência patrimonial, outras receitas e despesas de investimentos e o resultado antes do financiamento e tributos.
- **Financiamento:** apura juros de empréstimos, leasings e benefícios a empregados; calcula o resultado antes do imposto; apura IR e CSLL com as alíquotas indicadas no caso.
- **Controller:** soma o resultado de operações descontinuadas e fecha o resultado do exercício com os valores informados pelos gerentes, sem alterar as apurações deles.

## Ordem da DRE

O painel segue o modelo usado nas aulas: receitas brutas; custos dos produtos e serviços vendidos; lucro bruto; outras receitas operacionais; despesas de vendas; pesquisa e desenvolvimento; despesas gerais e administrativas; perda por redução ao valor recuperável do ágio; outras despesas operacionais; resultado operacional; equivalência patrimonial; outras receitas e despesas de investimentos; resultado antes do financiamento e tributos; juros de empréstimos, leasings e benefícios a empregados; resultado antes do imposto de renda; IR e CSLL; operações descontinuadas; resultado do exercício.

Cada caso mostra todas as contas de origem com valores positivos. Valores com sinal `(-)` devem ser subtraídos. Nenhuma categoria fica marcada como “não ocorreu” ou com valor zero. Os casos novos variam os valores; as alíquotas usam os exemplos das aulas: IR de 15% e CSLL de 9%, ou IR de 11% e CSLL de 8%.

## Caso novo e sincronização

O botão **Nova DRE** pede a senha de controle, gera um caso novo e limpa respostas e correções da sala toda. A IA cria o perfil fictício da empresa e seu contexto; uma geração com regras financeiras cria os valores de origem e mantém os cálculos coerentes. Se a IA estiver indisponível, o sistema usa um contexto de reserva e ainda gera valores novos. A senha fica guardada como segredo do Worker e não é publicada no código do site.

O site usa GitHub Pages na pasta `site/`. A API em `worker/` sincroniza as salas em tempo real usando Cloudflare D1. A variável `RESET_PASSWORD` fica configurada como segredo do Worker; `ALLOWED_ORIGIN` restringe a API ao domínio do site.

## Desenvolvimento e validação

```sh
node --test
node dev-server.js
```

Os testes verificam a ordem da DRE, os totais calculados a partir das contas, a geração de casos positivos, a correção por área, a sincronização e a senha de reset.

O arquivo `wrangler.jsonc` na raiz é usado pelas prévias do Cloudflare Workers Builds com o comando padrão `npx wrangler preview`; ele aponta para o D1 de teste `simulado-dre-preview`, inclusive no bloco `previews`. Em **Previews Base**, mantenha a raiz como `/` e o vínculo D1 como `simulado-dre-preview`. A produção usa `npx wrangler deploy --config worker/wrangler.jsonc` e o banco `simulado-dre`. Quando `worker/schema.sql` mudar, aplique o mesmo esquema também ao banco de prévia.
