# Simulado DRE em grupo

Site de treino para o trabalho de Fundamentos da Contabilidade, baseado nas aulas 10 e 11 e no plano de contas de resultado enviados pelo grupo. O exercício apresenta contas de origem detalhadas: os gerentes apuram os totais da própria área e o controller fecha os subtotais da DRE.

## Como o exercício funciona

- **Operacional (dois gerentes):** somam vendas de mercadorias e prestação de serviços para chegar à receita bruta; apuram deduções e custos a partir das contas de origem; somam as demais receitas e despesas operacionais.
- **Investimento:** soma equivalência patrimonial e calcula o resultado líquido de outras receitas e despesas de investimento.
- **Financiamento:** soma juros de empréstimos, arrendamentos e benefícios; calcula IRPJ de 15% mais CSLL de 9% sobre o resultado antes do imposto; apura o resultado líquido de operações descontinuadas.
- **Controller:** usa os valores dos gerentes para calcular receita líquida, lucro bruto, resultado operacional, resultado antes do financiamento e tributos, resultado antes do imposto e resultado do exercício.

As contas de origem ficam separadas dos campos de apuração, então o site não entrega subtotais prontos aos gerentes. Os dados de origem do caso têm valores positivos; as contas marcadas como deduções são subtraídas ao calcular os resultados.

## Estrutura

- `site/`: página publicada no GitHub Pages.
- `worker/`: API do Cloudflare Workers, configuração do D1 e esquema da tabela. A senha de reset existe apenas como segredo do servidor.
- `.github/workflows/pages.yml`: publica automaticamente a pasta `site/` no GitHub Pages.
- `tests/`: testes dos cálculos, da apuração a partir das contas de origem e da API.

O GitHub Pages hospeda os arquivos estáticos. O Worker recebe e corrige as respostas; o D1 guarda os dados de cada sala. A interface consulta o servidor a cada 2,5 segundos. O código da URL identifica a sala; qualquer pessoa com o link pode alterar as respostas.

## Prévia e testes locais

Na raiz do projeto, execute `node --test` e `node dev-server.js`; abra `http://127.0.0.1:4173`. Sem conexão ao Worker, a prévia usa o caso fixo e o armazenamento do navegador; ela não sincroniza aparelhos diferentes.

## Publicação

1. O GitHub Actions publica `site/` a cada envio para `main`. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
2. A API usa o Worker `simulado-dre-api` e o banco D1 `simulado-dre`. `worker/wrangler.jsonc` aponta para esse banco e restringe chamadas à origem deste GitHub Pages.
3. Cloudflare Workers Builds está conectado ao repositório `edz4br/dre` na branch `main`, com raiz `.` e comando `npx wrangler deploy --config worker/wrangler.jsonc`.
4. Em **Settings → Variables and secrets**, configure `RESET_PASSWORD` como segredo do Worker.
5. Depois da implantação, abra uma sala e confirme que a faixa superior indica **Sala sincronizada**. Preencha um campo e abra a mesma sala em outro aparelho para verificar a atualização.

O arquivo `site/config.js` aponta para o Worker público. Não coloque a senha nem chaves de acesso no repositório.

## Novas DREs

O botão **Nova DRE** solicita a senha do controller. No site online, o Worker usa Cloudflare Workers AI para criar uma empresa e um contexto fictícios; os valores das contas de origem são gerados em faixas plausíveis e os subtotais são calculados pelo sistema para corrigir as apurações. Se a IA falhar, o site usa um contexto reserva e ainda gera novos valores. Os dados e respostas atuais só mudam quando uma nova DRE é gerada com a senha correta.
