# Fechamento de Caixa

App para o fechamento diário dos caixas da loja. Substitui a planilha "Backup de Fecha caixa" (uma aba por dia, 3 caixas lado a lado) e usa as mesmas contas:

```
Total sistema = Rel. caixa sistema + Troco inicial + Suprimento
Total gaveta  = Crédito à vista + Crédito parcelado + Débito + PIX + Troco final
                + Sangrias + Despesas + Vale transporte + Outros (crediário, cheque, QR code...)
Diferença     = Total gaveta − Total sistema
```

Funciona direto no navegador, sem instalar nada: abra `index.html`.

## Telas

- **Dia**: um cartão por caixa, na mesma ordem da planilha. Diferença calculada enquanto digita.
  - O troco inicial já vem preenchido com o troco final do último fechamento do mesmo caixa. Se o valor lançado for diferente, o app avisa.
  - "Contar cédulas e moedas" substitui a tabelinha de moedas da planilha (colunas M a O) e pode lançar o total como troco final.
  - Quantas sangrias forem precisas, e "outro recebimento" para crediário, cheque etc.
  - Ao salvar com falta ou sobra fora da tolerância, pede justificativa nas observações.
  - "Ficha em branco" imprime a ficha de papel que o operador preenche no caixa (a aba `ficha_fechamento`).
- **Calendário**: o mês em semanas de segunda a sábado com a diferença de cada caixa por dia, como a "Planilha4". Verde fica dentro da tolerância, vermelho é falta, laranja é sobra e roxo é gaveta não lançada.
- **Painel**: vendas, diferença líquida, soma das faltas, diferenças por caixa, formas de pagamento, vendas por dia, as maiores diferenças e as gavetas que ainda não foram lançadas.
- **Ajustes**: número de caixas, tolerância (padrão R$ 2,00), backup, importação e exportação para Excel (CSV).

Os dados ficam salvos no navegador (localStorage). Faça backup em **Ajustes → Baixar backup** com frequência. Trocar de computador ou limpar o navegador apaga os dados.

## Página do operador (`operador.html`)

Cada operador lança o fechamento do próprio caixa no fim do dia, pelo celular ou pelo computador do caixa.

- Escolhe a data, o caixa e escreve o nome. O troco inicial já vem com o troco final do último fechamento daquele caixa.
- A diferença aparece enquanto digita. No celular, uma barra fixa no rodapé mostra o valor.
- Quando a diferença passa da tolerância, a página lista **onde pode estar o problema**, da pista mais provável para a menos provável, com um botão que leva ao campo.
- Se a diferença for maior que 9 de cada 10 fechamentos daquele caixa (mínimo de R$ 20), a página pede para recontar e explicar o que aconteceu, mas o envio é liberado mesmo sem justificativa.
- Reenviar o mesmo caixa e dia substitui o lançamento, mas os envios anteriores ficam registrados (quem, quando e qual diferença).
- A aba **Calendário** mostra o mês com a diferença de cada caixa em cada dia, o total de faltas e sobras do mês e o saldo por caixa. Tocar num caixa abre o envio.
- A aba **Conferência** mostra os envios por dia, com diferença, justificativa e as pistas encontradas.
- O que já foi digitado fica guardado no aparelho se a página fechar antes do envio.

### O que o diagnóstico procura (`diagnosticar` em `calc.js`)

| Pista | Exemplo |
|---|---|
| Valor lançado igual à sobra | Sangria de R$ 600 lançada duas vezes |
| Troco inicial ou suprimento igual à falta | Reforço registrado que não entrou na gaveta |
| Dois números trocados de lugar | Débito 1.215,12 no lugar de 1.251,12 |
| Zero a mais ou a menos | Sistema 37.032,60 no lugar de 3.703,26 |
| Forma de pagamento zerada que costuma aparecer | PIX em branco num caixa onde PIX é 12% das vendas |
| Relatório do sistema menor que cartões e PIX | Sistema R$ 74,96 com R$ 302,38 em cartões e PIX (relatório tirado cedo ou de outro caixa) |
| Forma de pagamento muito acima do normal | Maquininha do dia todo lançada num caixa só |
| Troco inicial diferente do fechamento anterior | Abriu com R$ 1.066,55, mas ontem fechou com R$ 966,55 |
| Diferença que se desfaz com a do dia anterior | −R$ 100,84 num dia e +R$ 100,98 no seguinte |
| Diferença que se compensa com outro caixa | Caixa 1 −R$ 98,24 e Caixa 2 +R$ 100,63 no mesmo dia |
| Diferença redonda | Uma nota de R$ 50 ou uma sangria sem lançamento |

O "normal" de cada caixa vem do histórico: `node ferramentas/gerar_perfil.js historico.json perfil.json` (ou `perfil.js` para usar a página abrindo o arquivo direto).

### Publicar para a equipe

A página publicada guarda os envios num banco compartilhado. Para publicar de novo depois de mudar o código: `python3 ferramentas/empacotar.py operador.html saida.html`. Os operadores precisam de acesso de **Colaborador** para enviar. Só quem é Editor muda o perfil e a tolerância (`config/`). Abrindo `operador.html` direto do computador, os envios ficam só naquele navegador.

## Importar as planilhas antigas

Os arquivos `.xlk` são backups do Excel. O importador lê todas as abas `dd_mm_aaaa`:

```bash
pip install openpyxl
python3 ferramentas/importar_planilhas.py Backup_de_Fecha_caixa_*.xlk -o dados.js
```

- Saída `dados.js`: fica na pasta do app e é carregada sozinha na primeira abertura.
- Saída `historico.json`: importe em **Ajustes → Importar backup ou histórico**.

O importador:
- localiza os caixas pelo título "Caixa Nº" e os campos pelo rótulo, então aceita tanto o layout antigo (fevereiro) quanto o atual;
- joga linhas com rótulo fora do padrão ("CED", "crediario", "QR CODE") em "outros recebimentos", porque a planilha também as soma na gaveta;
- ignora abas em branco e, quando a mesma data aparece em dois arquivos, fica com a versão do último arquivo;
- corrige abas com mês trocado no nome (ex.: `23_04_2026` dentro do arquivo de junho vira 23/06).

`dados.js`, planilhas e backups estão no `.gitignore` para os números da loja não irem para o repositório.

## Testes

```bash
npm test
```

Os testes conferem as contas com um caixa real da planilha (Caixa 1 de 01/06/2026, diferença de R$ 0,53) e simulam os erros que o diagnóstico precisa achar.
