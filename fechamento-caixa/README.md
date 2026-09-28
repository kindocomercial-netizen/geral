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

Os testes conferem as contas com um caixa real da planilha (Caixa 1 de 01/06/2026, diferença de R$ 0,53).
