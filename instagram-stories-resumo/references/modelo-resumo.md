# Modelo do resumo

Copie a estrutura. Remova a seção de métricas quando não houver números;
não escreva "não disponível" em cada linha.

```
# Stories @<conta> — <dia>/<mês>
<N> stories entre <hora do primeiro> e <hora do último>. <Tema do dia em uma frase.>

## Card a card
1. <hora ou idade> · <tipo> · <o que aparece: produto, cena, pessoa> · <texto na tela, preço de/por> · <sticker ou CTA e o que pede> · <views, se houver>
2. ...
(um item por card, na ordem de publicação; se faltou card, diga "faltam os cards X a Y")

## Leitura geral
- Mensagem principal: <uma frase>
- Ofertas: <produto — preço> (uma por linha)
- Chamadas para ação: <botão/sticker → destino>
- Métricas: <retenção do 1º ao último card>; <maior queda entre card X e Y>; <card com mais respostas ou toques para trás>
- Pendências: <cards ilegíveis, cortados ou não enviados>

## Sugestões (apenas se pedidas ou se o padrão for evidente; máximo 3)
- ...
```

## Vocabulário

- **Retenção**: views do último card ÷ views do primeiro, em %.
- **Queda**: diferença de views entre dois cards consecutivos. A maior
  queda aponta o card que fez o seguidor sair.
- **Saída (exit)**: fechou os stories neste card.
- **Toque para frente**: pulou este card. Alto = card sem interesse.
- **Toque para trás**: voltou para rever. Alto = card prendeu atenção.
- **Arrastou para o próximo perfil**: abandonou a conta neste card.

Views tiradas de prints não são uma sequência decrescente exata: quem abre
os stories horas depois entra direto no card mais recente, e a contagem
ainda cresce enquanto o card está no ar. Por isso um card mais novo pode
ter mais views que o anterior, e isso não é erro de leitura. Trate a queda
entre cards como sinal de onde o interesse caiu, não como contagem exata
de saídas; saídas e toques exatos só vêm dos insights (Windsor ou API).
Quando as views voltam a subir depois de um card fraco, diga isso como
recuperação de audiência, sem inventar causa.

## Exemplo com métricas do Windsor

```
# Stories @kindoperfumaria — 22/09
5 stories entre 9h12 e 17h40. Segunda do Preço de Custo com 3 produtos e uma enquete.

## Card a card
1. 9h12 · foto · vitrine da loja com aviso "aberto até 19h" · sem CTA · 530 views · 12 saídas
2. 10h05 · foto · Kaiak Aventura 100ml · de R$ 189,90 por R$ 119,90 · texto "só hoje" · 498 views · 31 saídas
3. 10h07 · foto · Malbec Gold 100ml · de R$ 219,90 por R$ 149,90 · 470 views · 19 saídas · 14 toques para trás
4. 13h30 · enquete · "Qual você prefere?" Malbec × Essencial · 455 views · 22 respostas
5. 17h40 · foto · Episol Color FPS70 · R$ 89,90 · link "Comprar no WhatsApp" · 290 views · 60 saídas

## Leitura geral
- Mensagem principal: preço de custo em três perfumes e no protetor solar.
- Ofertas: Kaiak Aventura — R$ 119,90; Malbec Gold — R$ 149,90; Episol Color — R$ 89,90.
- Chamadas para ação: só o card 5 tem link (WhatsApp).
- Métricas: retenção de 55%; maior queda entre o card 4 e o 5 (−165 views, 7 horas de intervalo); Malbec Gold foi o card mais revisto.
- Pendências: nenhuma.
```
