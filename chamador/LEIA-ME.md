# Chamador Kindo

Quando o robô do WhatsApp (LetsBot) responde ao cliente com algo como *"Chamei uma
vendedora"*, *"Encaminhei para a vendedora confirmar"* ou *"a vendedora precisa
confirmar"*, o chamador:

1. faz a **Alexa** da loja falar: *"Atenção! Ana Lima precisa de uma vendedora no WhatsApp."*
2. toca um **alarme na caixa ligada ao computador** e fala a mesma frase (Windows).

Se ninguém da loja responder o cliente, repete o aviso depois de 5 minutos (até 2
lembretes). Quando a atendente responde no WhatsApp, o chamado some sozinho. Também avisa
quando o robô manda uma **COMANDA KINDO** (pedido fechado para separar).

Fora do horário (seg–sáb, 8h30–17h) fica quieto. Quando a loja abre, avisa quem
pediu vendedora com a loja fechada e ainda não foi respondido.

## O que precisa

- Um computador da loja ligado no horário de atendimento (Windows), com a caixa de som conectada.
- Python 3: <https://www.python.org/downloads/>. Na instalação, marque **"Add Python to PATH"**.
- Chave de API do LetsBot (o plano tem API incluída).
- Conta grátis no **Voice Monkey** (200 avisos/mês grátis).

## Passo a passo

### 1. Voice Monkey (faz a Alexa falar)
1. Entre em <https://voicemonkey.io> com a mesma conta Amazon da Alexa da loja.
2. No app Alexa, ative a skill **Voice Monkey**.
3. No painel do Voice Monkey, crie um **Speaker** chamado `loja` e escolha a Echo da loja.
4. Em **API**, copie o **token**.

### 2. Chave do LetsBot
Painel LetsBot → Configurações → **API** → gerar/copiar a chave.

### 3. Configurar
1. Copie a pasta `chamador` para o computador da loja.
2. Copie `config.exemplo.ini` para `config.ini` e cole o token do Voice Monkey e a chave do LetsBot.

### 4. Testar
Abra o Prompt de Comando na pasta e rode:

```
python chamador.py falar     (a Alexa e a caixa do computador devem falar)
python chamador.py testar    (lista as chamadas do robô dos últimos 3 dias e quem ainda espera)
```

Se o `testar` der erro, mande um print da tela para o Claude.

### 5. Deixar ligado sempre
Dê dois cliques em `iniciar.bat`. Para abrir sozinho quando o computador ligar:
`Win + R` → `shell:startup` → coloque ali um atalho para o `iniciar.bat`.
