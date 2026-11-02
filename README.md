# HomeLib

Biblioteca de casa para duas pessoas. Site estático (React + Vite + TypeScript) que usa uma **planilha do Google** como banco de dados, via **Google Apps Script**.

## 1. Backend (planilha + Apps Script)

1. Crie uma planilha nova no Google Sheets.
2. **Extensões → Apps Script**. Apague o conteúdo e cole o arquivo `apps-script/Code.gs`.
3. Na lista de funções, escolha **`setup`** e clique em **Executar** (autorize quando pedir). Antes, preencha as senhas em `SEED_USERS` no topo do `Code.gs` (só no editor do Apps Script, nunca no repositório). Isso cria as abas e os dois usuários seed: `vinicius.mattos` e `evelyn.mattos`.
4. **Implantar → Nova implantação → App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a URL terminada em `/exec`.

> Ao alterar o `Code.gs` depois, use *Implantar → Gerenciar implantações → editar → Nova versão* (a URL se mantém).

## 2. Front-end

```bash
npm install
cp .env.example .env     # preencha VITE_APPS_SCRIPT_URL (e, opcionalmente, a chave OpenAI)
npm run dev              # desenvolvimento
npm run build            # gera a pasta dist/ (estática)
```

Hospede a pasta `dist/` em qualquer lugar gratuito (GitHub Pages, Netlify, Cloudflare Pages…).
As variáveis `VITE_*` são embutidas **na hora do build**, então rode `npm run build` depois de editar o `.env`.

## Variáveis do `.env`

| Variável | Obrigatória | Para quê |
|---|---|---|
| `VITE_APPS_SCRIPT_URL` | sim | URL `/exec` do Apps Script |
| `VITE_OPENAI_API_KEY` | não | Cadastro por foto e classificação de gênero quando o Google Books não informa |
| `VITE_OPENAI_MODEL` | não | Modelo com visão (padrão `gpt-4o-mini`) |
| `VITE_GOOGLE_BOOKS_KEY` | não | Aumenta a cota de busca do Google Books |

## Como funciona

- **Cadastro por texto:** busca no Google Books (título, autor ou ISBN) e preenche título, autor, páginas, capa e gênero. Tudo é editável.
- **Cadastro por foto:** a foto da capa vai para a OpenAI, que devolve título/autor; depois o Google Books completa os dados.
- **Gênero automático:** vem das categorias do Google Books, mapeadas para gêneros em português (ou classificado pela OpenAI). A estante é agrupada por gênero.
- **Leitura:** cada pessoa marca só o próprio "li"; o status da outra pessoa aparece no cartão.
- **Perfil:** foto (redimensionada para caber na célula), nome, livros lidos; dá para ver o perfil do outro.
- **Compartilhar:** envia um livro ao outro usuário (aba *Recebidos*), que pode mandar para a estante ou para "Quero ter".

## Avisos de segurança (leia)

- **Chave da OpenAI no front-end:** como o site é estático, qualquer `VITE_OPENAI_API_KEY` fica visível para quem abrir o site. Use uma chave dedicada com **limite de gasto baixo** e mantenha o endereço do site discreto.
- **Apps Script público:** a URL `/exec` aceita requisições de qualquer pessoa; os dados só são liberados mediante login (senhas guardadas com hash + salt na aba `Users`; sessões de 30 dias na aba `Sessions`). As senhas seed não ficam no repositório: preencha-as só no editor do Apps Script e apague-as depois do `setup()`.
- Não compartilhe a planilha com ninguém além de vocês dois (as abas `Users` e `Sessions` contêm hashes e tokens).
