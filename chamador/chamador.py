"""Chamador da Kindo: avisa na caixa de som quando o robô do WhatsApp chama uma vendedora.

Fica rodando no computador da loja. A cada poucos segundos lê as mensagens novas do
LetsBot (GET /api/v1/messages) e, quando o robô escreve algo como "Chamei uma vendedora",
faz a Alexa falar (via Voice Monkey) e toca um alarme na caixa ligada ao computador.
Se ninguém da loja responder o cliente, repete o aviso depois de alguns minutos.

Uso:
    python chamador.py           roda o chamador
    python chamador.py testar    confere a chave do LetsBot e mostra as últimas chamadas do robô
    python chamador.py falar     faz um aviso de teste na Alexa e na caixa do computador

Só usa a biblioteca padrão do Python 3.9+.
"""

import configparser
import datetime as dt
import json
import math
import os
import re
import ssl
import struct
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import wave

PASTA = os.path.dirname(os.path.abspath(__file__))
ARQ_CONFIG = os.path.join(PASTA, "config.ini")
ARQ_ESTADO = os.path.join(PASTA, "estado.json")

# Frases que o robô usa quando passa o cliente para uma pessoa (tiradas das conversas reais).
PESSOA = r"(vendedor|atendente|equipe|consultora)"
FRASES_PADRAO = [
    r"(chamei|chamando|vou chamar|encaminhei|encaminhando|vou encaminhar|pedi|vou pedir|acionei)"
    r"[^.!?\n]{0,60}" + PESSOA,
    PESSOA + r"[^.!?\n]{0,25}(foi|foram|será|vai ser) (chamad|acionad|avisad)",
    r"(encaminhad|repassad)[^.!?\n]{0,25}" + PESSOA,
    PESSOA + r"[^.!?\n]{0,30}(precisa|vai|ir[aá])[^.!?\n]{0,15}(confirmar|continuar|finalizar|verificar|responder)",
    r"(verificad|confirmad|finalizad)\w* pel[ao] " + PESSOA,
    r"COMANDA KINDO",
]
# Frases do robô que citam a vendedora mas não são chamada.
FRASES_IGNORAR = [
    r"avisei a vendedora que (você|vc) não",
    r"^nossas vendedoras atendem",
]

# No Mac, o Python baixado do python.org não enxerga os certificados do sistema.
_CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem") if (
    sys.platform == "darwin" and os.path.exists("/etc/ssl/cert.pem")) else None


def abrir(req, timeout):
    return urllib.request.urlopen(req, timeout=timeout, context=_CTX)


DIAS = {"seg": 0, "ter": 1, "qua": 2, "qui": 3, "sex": 4, "sab": 5, "sáb": 5, "dom": 6}


def log(msg):
    print(dt.datetime.now().strftime("%d/%m %H:%M:%S"), msg, flush=True)


# ---------------------------------------------------------------- configuração

def carregar_config():
    if not os.path.exists(ARQ_CONFIG):
        sys.exit("Falta o config.ini. Copie config.exemplo.ini para config.ini e preencha.")
    cp = configparser.ConfigParser(interpolation=None)
    cp.read(ARQ_CONFIG, encoding="utf-8-sig")
    c = {
        "lb_chave": cp.get("letsbot", "chave_api", fallback="").strip(),
        "lb_base": cp.get("letsbot", "endereco", fallback="https://letsbot.net/api/v1").rstrip("/"),
        "intervalo": max(5, cp.getint("letsbot", "intervalo_segundos", fallback=15)),
        "vm_token": cp.get("alexa", "token_voice_monkey", fallback="").strip(),
        "vm_device": cp.get("alexa", "dispositivo", fallback="").strip(),
        "vm_chime": cp.get("alexa", "campainha", fallback="").strip(),
        "vm_voz": cp.get("alexa", "voz", fallback="").strip(),
        "som_local": cp.getboolean("caixa_computador", "ligada", fallback=True),
        "repeticoes": cp.getint("caixa_computador", "repeticoes", fallback=3),
        "dias": cp.get("horario", "dias", fallback="seg,ter,qua,qui,sex,sab"),
        "abre": cp.get("horario", "abre", fallback="08:30"),
        "fecha": cp.get("horario", "fecha", fallback="17:00"),
        "avisar_pendentes_ao_abrir": cp.getboolean("horario", "avisar_pendentes_ao_abrir", fallback=True),
        "lembrete_min": cp.getint("horario", "lembrar_depois_de_minutos", fallback=5),
        "lembretes": cp.getint("horario", "quantos_lembretes", fallback=2),
        "frases": [f.strip() for f in cp.get("deteccao", "frases_extras", fallback="").split("\n") if f.strip()],
    }
    c["regex"] = [re.compile(p, re.IGNORECASE) for p in FRASES_PADRAO + c["frases"]]
    c["ignorar"] = [re.compile(p, re.IGNORECASE) for p in FRASES_IGNORAR]
    return c


def loja_aberta(c, agora=None):
    agora = agora or dt.datetime.now()
    dias = {DIAS[d.strip().lower()] for d in c["dias"].split(",") if d.strip().lower() in DIAS}
    if agora.weekday() not in dias:
        return False
    abre = dt.datetime.strptime(c["abre"], "%H:%M").time()
    fecha = dt.datetime.strptime(c["fecha"], "%H:%M").time()
    return abre <= agora.time() < fecha


# ---------------------------------------------------------------- estado

def carregar_estado():
    try:
        with open(ARQ_ESTADO, encoding="utf-8") as f:
            e = json.load(f)
    except (OSError, ValueError):
        e = {}
    e.setdefault("cursor", None)
    e.setdefault("vistas", [])
    # cliente (telefone) -> {"nome", "desde", "avisos", "ultimo_aviso"}
    e.setdefault("chamados", {})
    return e


def salvar_estado(e):
    e["vistas"] = e["vistas"][-3000:]
    tmp = ARQ_ESTADO + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(e, f, ensure_ascii=False)
    os.replace(tmp, ARQ_ESTADO)


# ---------------------------------------------------------------- LetsBot

def pedir(c, caminho, params):
    url = c["lb_base"] + caminho + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + c["lb_chave"],
        "Accept": "application/json",
    })
    with abrir(req, 30) as r:
        return json.loads(r.read().decode("utf-8"))


def mensagens_novas(c, cursor, dias_atras=1):
    """Lê as mensagens a partir do cursor salvo. Devolve (mensagens, novo_cursor).

    O cursor da última página é guardado e pedido de novo na próxima volta; as mensagens
    repetidas são descartadas pelo id.
    """
    hoje = dt.datetime.now(dt.timezone.utc).date()
    base = {
        "date_from": (hoje - dt.timedelta(days=dias_atras)).isoformat(),
        "date_to": (hoje + dt.timedelta(days=1)).isoformat(),
    }
    todas = []
    for _ in range(50):
        params = dict(base, cursor=cursor) if cursor else base
        dados = pedir(c, "/messages", params)
        if not dados.get("Status", dados.get("success", True)):
            raise ValueError(dados.get("Message") or dados.get("message") or str(dados)[:200])
        todas += dados.get("data") or []
        prox = dados.get("next_cursor")
        if not prox:
            break
        cursor = prox
    return todas, cursor


def eh_do_robo(m):
    return bool(m.get("from_me")) and m.get("sent_by") == "bot"


def eh_da_loja_humana(m):
    return bool(m.get("from_me")) and m.get("sent_by") != "bot"


def eh_chamada(c, texto):
    texto = (texto or "").strip()
    if any(r.search(texto) for r in c["ignorar"]):
        return False
    return any(r.search(texto) for r in c["regex"])


def cliente_de(m):
    ct = m.get("contact") or {}
    fone = str(ct.get("phone") or "")
    return fone or str(ct.get("id") or m.get("id")), ct.get("name") or ""


def nome_falado(nome, fone):
    nome = (nome or "").strip()
    limpo = re.sub(r"[^\w\s'.-]", "", nome).strip()
    if limpo and not re.fullmatch(r"[\d+\s-]+", limpo):
        return limpo
    if fone:
        return "o cliente com final " + " ".join(fone[-4:])
    return "um cliente"


# ---------------------------------------------------------------- avisos

def falar_alexa(c, frase):
    if not (c["vm_token"] and c["vm_device"]):
        return
    params = {"token": c["vm_token"], "device": c["vm_device"], "speech": frase, "language": "pt-BR"}
    if c["vm_chime"]:
        params["chime"] = c["vm_chime"]
    if c["vm_voz"]:
        params["voice"] = c["vm_voz"]
    url = "https://api-v3.voicemonkey.io/announce?" + urllib.parse.urlencode(params)
    try:
        with abrir(url, 20) as r:
            log("Alexa: " + r.read().decode("utf-8", "replace")[:200])
    except urllib.error.URLError as e:
        log(f"Alexa falhou: {e}")


def _arquivo_alarme():
    caminho = os.path.join(tempfile.gettempdir(), "kindo_alarme.wav")
    if os.path.exists(caminho):
        return caminho
    taxa = 22050
    quadros = bytearray()
    for freq, dur in ((880, 0.18), (0, 0.06), (1175, 0.18), (0, 0.06), (1568, 0.35), (0, 0.4)):
        for i in range(int(taxa * dur)):
            v = 0 if freq == 0 else int(20000 * math.sin(2 * math.pi * freq * i / taxa))
            quadros += struct.pack("<h", v)
    with wave.open(caminho, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(taxa)
        w.writeframes(bytes(quadros))
    return caminho


def _voz_mac():
    """Primeira voz em português do Brasil instalada no Mac (ex.: Luciana)."""
    try:
        vozes = subprocess.run(["say", "-v", "?"], capture_output=True, text=True).stdout
    except OSError:
        return None
    for linha in vozes.splitlines():
        m = re.match(r"(.+?)\s+pt[_-]BR", linha)
        if m:
            return m.group(1).strip()
    return None


def tocar_local(c, frase):
    if not c["som_local"]:
        return
    wav = _arquivo_alarme()
    for _ in range(max(1, c["repeticoes"])):
        if sys.platform.startswith("win"):
            import winsound
            winsound.PlaySound(wav, winsound.SND_FILENAME)
        elif sys.platform == "darwin":
            subprocess.run(["afplay", wav], check=False)
        else:
            os.system(f'aplay -q "{wav}" 2>/dev/null || paplay "{wav}" 2>/dev/null')
    if sys.platform.startswith("win"):
        # Voz do próprio Windows, se houver voz em português instalada.
        seguro = frase.replace("'", "").replace('"', "")
        os.system(
            'powershell -NoProfile -Command "Add-Type -AssemblyName System.Speech; '
            "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"$s.Speak('{seguro}')\""
        )
    elif sys.platform == "darwin":
        voz = _voz_mac()
        subprocess.run(["say"] + (["-v", voz] if voz else []) + [frase], check=False)


def avisar(c, frase):
    log("AVISO: " + frase)
    falar_alexa(c, frase)
    tocar_local(c, frase)


def lista_falada(nomes):
    if len(nomes) > 5:
        return ", ".join(nomes[:5]) + f" e mais {len(nomes) - 5}"
    if len(nomes) > 1:
        return ", ".join(nomes[:-1]) + " e " + nomes[-1]
    return nomes[0]


# ---------------------------------------------------------------- laço

def recente(m, horas=12):
    limite = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=horas)).isoformat()
    return (m.get("message_date") or "") >= limite


def processar(c, estado, msgs, silencioso=False, horas=12):
    """Atualiza os chamados com as mensagens novas. Devolve os clientes que acabaram de chamar."""
    vistas = set(estado["vistas"])
    novos = []
    for m in msgs:
        mid = str(m.get("id"))
        if mid in vistas or m.get("group_id"):
            continue
        vistas.add(mid)
        estado["vistas"].append(mid)
        fone, nome = cliente_de(m)
        if eh_da_loja_humana(m):
            # Alguém da loja respondeu: o chamado está atendido.
            if estado["chamados"].pop(fone, None) is not None:
                log(f"Atendido: {nome_falado(nome, fone)}")
        elif eh_do_robo(m) and recente(m, horas) and eh_chamada(c, m.get("body") or m.get("caption")):
            if fone not in estado["chamados"]:
                estado["chamados"][fone] = {"nome": nome, "desde": m.get("message_date"),
                                            "avisos": 0, "ultimo_aviso": 0}
                if not silencioso:
                    novos.append(fone)
    return novos


def rodar(c):
    estado = carregar_estado()
    if not estado.get("iniciado"):
        # Primeira vez: tudo que já existe conta como lido; das últimas 12 horas, guarda quem
        # ainda está esperando vendedora.
        msgs, estado["cursor"] = mensagens_novas(c, None, dias_atras=1)
        processar(c, estado, [m for m in msgs if recente(m)], silencioso=True)
        estado["vistas"] += [str(m.get("id")) for m in msgs]
        estado["iniciado"] = True
        salvar_estado(estado)
        log(f"Primeira leitura feita. {len(estado['chamados'])} cliente(s) esperando vendedora.")

    estava_aberta = False  # na partida, se a loja estiver aberta, avisa quem já está esperando
    log("Chamador ligado. Loja " + ("aberta." if loja_aberta(c) else "fechada, fico quieto até abrir."))

    while True:
        try:
            msgs, estado["cursor"] = mensagens_novas(c, estado["cursor"])
        except (urllib.error.URLError, ValueError, TimeoutError, OSError) as e:
            log(f"Não consegui ler o LetsBot: {e}")
            time.sleep(max(30, c["intervalo"]))
            continue

        novos = processar(c, estado, msgs)
        aberta = loja_aberta(c)
        agora = time.time()

        if aberta and not estava_aberta and c["avisar_pendentes_ao_abrir"]:
            esperando = [f for f in estado["chamados"] if f not in novos]
            if esperando:
                nomes = [nome_falado(estado["chamados"][f]["nome"], f) for f in esperando]
                avisar(c, f"Bom dia! {len(nomes)} cliente{'s' if len(nomes) > 1 else ''} "
                          f"esperando vendedora no WhatsApp: {lista_falada(nomes)}.")
                for f in esperando:
                    estado["chamados"][f].update(avisos=1, ultimo_aviso=agora)

        if aberta:
            for fone in novos:
                ch = estado["chamados"][fone]
                avisar(c, f"Atenção! {nome_falado(ch['nome'], fone)} precisa de uma vendedora no WhatsApp.")
                ch.update(avisos=1, ultimo_aviso=agora)
            for fone, ch in estado["chamados"].items():
                if (0 < ch["avisos"] <= c["lembretes"]
                        and agora - ch["ultimo_aviso"] >= c["lembrete_min"] * 60):
                    avisar(c, f"Lembrete: {nome_falado(ch['nome'], fone)} ainda está esperando "
                              f"vendedora no WhatsApp.")
                    ch.update(avisos=ch["avisos"] + 1, ultimo_aviso=agora)
        elif novos:
            log("Loja fechada, guardei para avisar ao abrir: "
                + ", ".join(nome_falado(estado["chamados"][f]["nome"], f) for f in novos))

        estava_aberta = aberta
        salvar_estado(estado)
        time.sleep(c["intervalo"])


def testar(c):
    print("Lendo mensagens dos últimos 3 dias em", c["lb_base"] + "/messages", "...")
    try:
        msgs, _ = mensagens_novas(c, None, dias_atras=3)
    except urllib.error.HTTPError as e:
        print("ERRO HTTP", e.code, e.read().decode("utf-8", "replace")[:500])
        return
    except (urllib.error.URLError, ValueError) as e:
        print("ERRO:", e)
        return
    robo = [m for m in msgs if eh_do_robo(m)]
    print(f"OK! {len(msgs)} mensagens lidas, {len(robo)} do robô.\n")
    print("Mensagens do robô que disparam aviso:")
    for m in robo:
        if eh_chamada(c, m.get("body")):
            fone, nome = cliente_de(m)
            print(" ", m.get("message_date", "")[:16], "|", nome_falado(nome, fone), "|",
                  re.sub(r"\s+", " ", m.get("body") or "")[:80])
    estado = {"vistas": [], "chamados": {}}
    processar(c, estado, msgs, silencioso=True, horas=72)
    print(f"\nClientes que ainda esperam vendedora (robô chamou e ninguém da loja respondeu depois): "
          f"{len(estado['chamados'])}")
    for f, ch in estado["chamados"].items():
        print("  -", nome_falado(ch["nome"], f), "desde", (ch["desde"] or "")[:16])


def configurar():
    """Pergunta as chaves e grava o config.ini a partir do config.exemplo.ini."""
    print("Configuração do Chamador Kindo\n")
    chave = ""
    while not chave:
        chave = input("Cole a chave de API do LetsBot e aperte Enter: ").strip()
    token = input("Cole o token do Voice Monkey (Enter para pular, se ainda não tem): ").strip()
    device = ""
    if token:
        device = input("Nome do Speaker no Voice Monkey [loja]: ").strip() or "loja"
    with open(os.path.join(PASTA, "config.exemplo.ini"), encoding="utf-8") as f:
        linhas = f.read().splitlines()
    valores = {"chave_api": chave, "token_voice_monkey": token, "dispositivo": device or "loja"}
    saida = []
    for linha in linhas:
        nome = linha.split("=", 1)[0].strip()
        if "=" in linha and not linha.lstrip().startswith(";") and nome in valores:
            linha = f"{nome} = {valores[nome]}"
        saida.append(linha)
    with open(ARQ_CONFIG, "w", encoding="utf-8") as f:
        f.write("\n".join(saida) + "\n")
    print("\nconfig.ini salvo.")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "configurar":
        configurar()
        sys.exit()
    cfg = carregar_config()
    if cmd == "testar":
        testar(cfg)
    elif cmd == "falar":
        avisar(cfg, "Teste do chamador da Kindo. Se você está ouvindo, está funcionando.")
    else:
        try:
            rodar(cfg)
        except KeyboardInterrupt:
            log("Chamador desligado.")
