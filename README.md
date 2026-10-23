# Simulador DRE · Fundamentos da Contabilidade

Aplicação para praticar em grupo a atividade de apuração da Demonstração do Resultado do Exercício. O caso apresenta contas de origem detalhadas; cada pessoa soma sua parte, registra os subtotais e confere a apuração. A DRE compartilhada acompanha os lançamentos em tempo real.

## Dinâmica do grupo

O grupo tem cinco integrantes em quatro áreas:

- **Operacional:** dois gerentes dividem a mesma aba, a mesma correção de área e a mesma folha de rascunho. Juntos, valem 1 ponto.
- **Investimento:** um gerente e uma folha de rascunho; vale 1 ponto.
- **Financiamento e tributos:** um gerente e uma folha de rascunho; vale 1 ponto.
- **Controller:** fecha o resultado usando os valores informados pelos gerentes. A tela acompanha o fechamento separadamente; o controller não altera nem corrige as apurações anteriores.

Há três folhas de rascunho compartilhadas: operacional, investimento e financiamento. As correções mostram o resultado por área, os itens corretos e os que precisam de revisão. O controller soma a receita e as despesas da operação descontinuada, desconta os tributos informados pelo gerente financeiro e adiciona o resultado líquido das operações continuadas.

## Estrutura ensinada

O simulador usa a apresentação em cascata da IFRS 18 e do CPC 51 / NBC TG 51, conforme as aulas e imagens enviadas:

1. Receita bruta de vendas e serviços, formada pela soma das contas de origem.
2. Deduções da receita bruta e receita líquida.
3. Receitas e despesas da categoria operacional, incluindo consumo de materiais e variação dos estoques.
4. Resultado operacional.
5. Resultado da categoria de investimentos.
6. Resultado antes de financiamento e tributos sobre o lucro.
7. Juros, efeitos cambiais e despesas de provisões da categoria de financiamento.
8. Resultado antes do IR e da CSLL, tributos e resultado líquido das operações continuadas.
9. Resultado líquido das operações descontinuadas e lucro líquido do exercício.

Cada subtotal é um campo de apuração. O gerente precisa somar os valores detalhados e digitar o resultado; a aplicação não entrega o subtotal pronto.

## Fórmulas de apoio

- Receita bruta = vendas e serviços somados.
- Receita líquida = receita bruta − deduções.
- Consumo de materiais = estoque inicial + compras − estoque final.
- Variação dos estoques de produtos = estoque final − estoque inicial. Aumento é positivo; redução é negativo.
- Resultado operacional = receita líquida + outras receitas operacionais − consumo de materiais + variação dos estoques − despesas operacionais.
- Resultado antes de financiamento e tributos = resultado operacional + equivalência patrimonial + demais receitas e despesas de investimentos.
- Resultado antes de IR e CSLL = resultado anterior − juros de financiamento − juros de benefícios a empregados + ganhos cambiais − despesas de provisões.
- IR das operações continuadas = resultado antes dos tributos × alíquota de IR do caso.
- CSLL das operações continuadas = resultado antes dos tributos × alíquota de CSLL do caso.
- Total de tributos continuados = IR + CSLL, calculados separadamente.
- Resultado líquido de operações continuadas = resultado antes dos tributos − IR e CSLL.
- IR e CSLL da operação descontinuada são calculados separadamente sobre receitas − despesas; some os dois tributos.
- Resultado líquido de operações descontinuadas = receitas − despesas − tributos da unidade.
- Lucro líquido do exercício = resultado líquido das operações continuadas + resultado líquido das operações descontinuadas.

As despesas são digitadas como valores positivos e aparecem entre parênteses na DRE. Ganhos e perdas são registrados com o sinal indicado. As alíquotas e todos os dados financeiros são fictícios e simplificados para fins de treino.

## Casos novos

O botão **Gerar outra DRE** pede a senha de controle e substitui o caso de toda a sala, limpando campos, correções e rascunhos. A IA pode criar o nome, o setor e o contexto da empresa fictícia. Um gerador determinístico cria as contas financeiras e mantém as fórmulas consistentes, sem depender da IA para fazer aritmética. Se a IA estiver indisponível, o simulador cria um contexto automático de reserva. Todos os casos incluem valores nas contas e nas linhas calculadas.

## Referência contábil

O material enviado apresenta a estrutura nova da DRE. A referência técnica usada pelo aplicativo é o CPC 51 / NBC TG 51, alinhado à IFRS 18. A IFRS Foundation informa vigência para períodos anuais iniciados em ou após 1º de janeiro de 2027. Uma das imagens cita a Lei 14.967/2024, mas essa lei trata de segurança privada e segurança de instituições financeiras; não é a norma da DRE. Consulte os links oficiais na página do aplicativo e no CPC.

## Hospedagem e sincronização

- **Site:** GitHub Pages, publicado pela ação em .github/workflows.
- **API:** Cloudflare Worker, em worker/index.js.
- **Banco:** Cloudflare D1. Os valores e rascunhos de cada sala ficam sincronizados entre os integrantes.
- **Senha de reset:** segredo RESET_PASSWORD configurado no Worker; não fica no JavaScript público.
- **Origem permitida:** ALLOWED_ORIGIN, restrita ao domínio do site.
- **Prévia:** o wrangler.jsonc da raiz aponta para o banco isolado simulado-dre-preview. A configuração de produção em worker/wrangler.jsonc aponta para simulado-dre.

## Desenvolvimento

Na pasta do projeto:

    node --test
    node dev-server.js

A prévia local fica em http://127.0.0.1:4173 e não chama a API de produção. As salas locais ficam no navegador usado para a prévia.

Para publicar o site, envie as alterações para main; a ação do GitHub Pages publica a pasta site. Para publicar a API, use a configuração de produção do Worker após validar a prévia com o banco simulado-dre-preview:

    npx wrangler deploy --config worker/wrangler.jsonc

Os testes cobrem as fórmulas, os sinais, os subtotais por área, os casos sem valores zerados, a correção, o fechamento do controller, os rascunhos e a API.
