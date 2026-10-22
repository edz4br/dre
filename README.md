# Simulado DRE em grupo

Site de treino para o trabalho de Fundamentos da Contabilidade, com os valores da apresentação da aula 11 (14/10/2026). Há quatro abas: operacional (compartilhada pelos dois gerentes), investimento, financiamento e controller. Cada área tem ajuda contextual e correção. A DRE acompanha as respostas em tempo real e o reinício da sala exige a senha do controller.

## Estrutura

- `site/`: página publicada no GitHub Pages.
- `worker/`: API do Cloudflare Workers, configuração do D1 e esquema da tabela. A senha existe apenas como segredo do servidor.
- `.github/workflows/pages.yml`: publica automaticamente a pasta `site/` no GitHub Pages.
- `tests/`: testes dos cálculos, da correção e da API.

O GitHub Pages hospeda os arquivos estáticos. O Worker recebe e corrige as respostas; o D1 guarda os dados de cada sala. A interface consulta o servidor a cada 2,5 segundos. O código aleatório da URL identifica a sala; qualquer pessoa com o link pode alterar as respostas.

## Prévia local

Na raiz do projeto, execute `node --test` e `node dev-server.js`; abra `http://127.0.0.1:4173`. O modo de demonstração local usa o armazenamento do navegador e não sincroniza aparelhos diferentes.

## Publicação

1. O GitHub Actions publica `site/` a cada envio para `main`. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**.
2. A API usa o Worker `simulado-dre-api` e o banco D1 `simulado-dre`. `worker/wrangler.jsonc` aponta para esse banco e restringe chamadas à origem deste GitHub Pages.
3. Cloudflare Workers Builds ja esta conectado ao repositorio `edz4br/dre` na branch `main`, com raiz `.` e comando `npx wrangler deploy --config worker/wrangler.jsonc`. Cada envio para `main` dispara uma implantacao.
4. Em **Settings → Variables and secrets**, adicione `RESET_PASSWORD` como secret do Worker.
5. Depois da implantação, abra uma sala e confirme que a faixa superior indica **Sala sincronizada**. Preencha um campo e abra a mesma sala em outro aparelho para testar a atualização.

O arquivo `site/config.js` já aponta para o Worker público. Não coloque a senha nem chaves de acesso no repositório.

## Papel do controller

Segundo os slides, cada gerente apura sua área e o controller faz o cálculo final, assina e entrega o relatório. No simulado, o controller recebe os valores pela DRE ao vivo e preenche cinco subtotais. Se uma apuração parecer incorreta, peça à pessoa responsável pela área que a confira. O site não envia o relatório ao professor.
