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

## Instalação rápida (Windows)

1. **Voice Monkey (para a Alexa falar)**: entre em <https://voicemonkey.io> com a mesma conta
   Amazon da Echo da loja, ative a skill **Voice Monkey** no app Alexa, crie um **Speaker**
   chamado `loja` escolhendo a Echo e copie o **token** em *API*. (Pode pular e fazer depois:
   sem ele só a caixa do computador toca.)
2. **Chave do LetsBot**: painel LetsBot → Configurações → **API** → copiar a chave.
3. Extraia o `chamador.zip` numa pasta fixa, por exemplo `Documentos\chamador`.
   (Não rode de dentro do zip nem da pasta Downloads.)
4. Dê dois cliques em **`instalar.bat`**. Ele:
   - instala o Python se precisar;
   - pede a chave do LetsBot e o token do Voice Monkey;
   - testa a leitura do WhatsApp e toca um aviso de teste;
   - deixa o Chamador abrindo sozinho quando o computador liga;
   - liga o Chamador numa janela minimizada (não feche essa janela).

Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações → Executar assim mesmo**.

Para mudar as chaves depois: rode `instalar.bat` de novo ou edite o `config.ini`.
Para desligar de vez: apague o atalho "Chamador Kindo" em `Win + R` → `shell:startup`.

## Comandos (Prompt de Comando, dentro da pasta)

```
python chamador.py falar     (a Alexa e a caixa do computador devem falar)
python chamador.py testar    (lista as chamadas do robô dos últimos 3 dias e quem ainda espera)
```

Se o `testar` der erro, mande um print da tela para o Claude.
