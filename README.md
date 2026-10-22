# Simulado DRE em grupo

Site de treino para o trabalho de Fundamentos da Contabilidade. O exemplo usa os valores da apresentação da aula 11 (14/10/2026). Há quatro abas: operacional (compartilhada pelos dois gerentes), investimento, financiamento e controller. Cada área tem ajuda contextual e correção. A DRE acompanha os valores preenchidos e o botão de reinício apaga a sala mediante senha.

## Como está organizado

- `site/`: página estática publicada no GitHub Pages.
- `worker/`: API do Cloudflare Workers e banco D1. A senha existe apenas como segredo do servidor.
- `.github/workflows/pages.yml`: publicação automática da pasta `site/` no GitHub Pages.
- `tests/`: verificação dos cálculos e da correção.

O GitHub Pages hospeda apenas arquivos estáticos. O Worker fornece gravação e correção compartilhadas; o D1 guarda os dados de cada sala. A interface consulta o servidor a cada 2,5 segundos e também atualiza o próprio navegador imediatamente. O código aleatório na URL identifica a sala. Quem recebe esse link pode alterar as respostas; distribua-o somente ao grupo.

## Prévia sem servidor

Na raiz do projeto, execute `node --test` e `node dev-server.js`; abra `http://127.0.0.1:4173`. Com `site/config.js` vazio, o site funciona como demonstração neste navegador, inclusive em outras abas do mesmo navegador. A senha de reinício **somente da demonstração** é `treino`. Esse modo não sincroniza aparelhos diferentes.

## Publicação completa

1. Crie um repositório público no GitHub, por exemplo `simulado-dre`, e envie todos os arquivos deste projeto mantendo a estrutura de pastas. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**. O fluxo de publicação usa a ramificação `main` e entrega somente `site/`.
2. Em uma conta Cloudflare sua, crie o D1 com `npx wrangler d1 create simulado-dre`. Copie `worker/wrangler.jsonc.example` para `worker/wrangler.jsonc`. Substitua `database_id` pelo identificador retornado e `ALLOWED_ORIGIN` pela origem do GitHub Pages, como `https://edz4br.github.io` (sem o caminho do repositório). Não coloque senhas nesse arquivo.
3. Crie a tabela com `npx wrangler d1 execute simulado-dre --remote --file=worker/schema.sql --config worker/wrangler.jsonc`. Defina a senha do reinício com `npx wrangler secret put RESET_PASSWORD --config worker/wrangler.jsonc`. Digite uma senha forte no prompt. Publique a API com `npx wrangler deploy --config worker/wrangler.jsonc`.
4. Coloque a URL pública retornada pelo Worker em `site/config.js`, na variável `DRE_API_URL` (sem `/` no final). Envie a alteração ao GitHub. Confirme que a faixa superior diz **Sala sincronizada**. Copie o link de uma sala e compartilhe com o grupo.

Use uma senha de reinício exclusiva para este site. Não publique a senha ou chaves da Cloudflare no repositório. A API restringe as chamadas de navegadores à origem configurada, limita tentativas de reinício e mantém as respostas no D1.

## Papel do controller no exercício

Segundo os slides, cada gerente apura sua área e o controller faz o cálculo final, assina e entrega o relatório. No simulado, ele recebe os valores dos gerentes pela DRE ao vivo e preenche cinco subtotais. Se uma apuração de um gerente parecer errada, peça à pessoa responsável que confira sua área. O site não envia o relatório ao professor.
