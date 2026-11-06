# Agenda do Cowork Kindo

Reserva dos postos do cowork de cabeleireiro (2 cadeiras de cabeleireiro e 1 de manicure), no andar de cima da Perfumaria Kindo. Hora R$ 20 e diária das 9h às 18h por R$ 120 (valores alteráveis na área do dono).

## Projeto na Cloudflare Pages

- Repositório: este, com **diretório raiz** `cowork`
- Comando de build: (vazio)
- Diretório de saída: `public`
- Funções: pasta `functions/` (detectada automaticamente)

## Ligações (Configurações → Ligações / Bindings)

| Nome          | Tipo                    | O que guarda                    |
|---------------|-------------------------|---------------------------------|
| `DB`          | Banco D1                | Reservas e valores              |
| `COMPROVANTES`| Namespace KV            | Arquivos dos comprovantes       |
| `ADMIN_SENHA` | Variável (Secreta)      | Senha da área do dono           |

As tabelas são criadas sozinhas no primeiro acesso.

Publicado em kindo-cowork.pages.dev.
