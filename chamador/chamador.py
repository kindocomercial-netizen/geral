"""Chamador da Kindo: avisa na caixa de som quando o robô do WhatsApp chama uma vendedora.

Fica rodando no computador da loja. A cada poucos segundos lê as mensagens recentes do
LetsBot e, quando o robô escreve algo como "Chamei uma vendedora", faz a Alexa falar
(via Voice Monkey) e toca um alarme na caixa ligada ao computador.

Uso:
    python chamador.py           roda o chamador
    python chamador.py testar    confere a chave do LetsBot e mostra o que a API devolve
    python chamador.py falar     faz um aviso de teste na Alexa e na caixa do computador

Só usa a biblioteca padrão do Python 3.9+.
"""

import configparser
import datetime as dt
import json
import math
import os
import re
import struct
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

# Frases que o robô usa quando passa o cliente para uma pessoa.
FRASES_PADRAO = [
    r"(chamei|chamando|vou chamar|encaminhei|encaminhando|vou encaminhar|pedi para|pedi pra|acionei|avisei)"
    r"[^.!?\n]{0,60}(vendedora|atendente|equipe|consultora)",
    r"(vendedora|atendente)[^.!?\n]{0,30}(precisa|vai|ir[aá])[^.!?\n]{0,15}(confirmar|continuar|finalizar|verificar|responder)",
]

DIAS = {"seg": 0, "ter": 1, "qua": 2, "qui": 3, "sex": 4, "sab": 5, "sáb": 5, "dom": 6}


def log(msg):
    print(dt.datetime.now().strftime("%d/%m %H:%M:%S"), msg, flush=True)


# ---------------------------------------------------------------- configuração

def carregar_config():
    if not os.path.exists(ARQ_CONFIG):
        sys.exit("Falta o config.ini. Copie config.exemplo.ini para config.ini e preencha.")
    cp = configparser.ConfigParser(interpolation=None)
    cp.read(ARQ_CONFIG, encoding="utf-8")
    c = {
        "lb_chave": cp.get("letsbot", "chave_api", fallback="").strip(),
        "lb_base": cp.get("letsbot", "endereco", fallback="https://letsbot.net/api/v1").rstrip("/"),
        "lb_caminho": cp.get("letsbot", "caminho_mensagens", fallback="/message/fetch"),
        "intervalo": cp.getint("letsbot", "intervalo_segundos", fallback=15),
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
        "intervalo_mesmo_cliente": cp.getint("horario", "minutos_entre_avisos_mesmo_cliente", fallback=10),
        "frases": [f.strip() for f in cp.get("deteccao", "frases_extras", fallback="").split("\n") if f.strip()],
    }
    c["regex"] = [re.compile(p, re.IGNORECASE) for p in FRASES_PADRAO + c["frases"]]
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
    e.setdefault("vistas", [])
    e.setdefault("ultimo_aviso", {})
    e.setdefault("pendentes", {})
    return e


def salvar_estado(e):
    e["vistas"] = e["vistas"][-3000:]
    tmp = ARQ_ESTADO + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(e, f, ensure_ascii=False)
    os.replace(tmp, ARQ_ESTADO)


# ---------------------------------------------------------------- LetsBot

def buscar_json(c):
    url = c["lb_base"] + c["lb_caminho"]
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + c["lb_chave"],
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def _texto(d):
    for k in ("body", "text", "conversation", "caption", "content"):
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            return v
    m = d.get("message")
    if isinstance(m, str) and m.strip():
        return m
    if isinstance(m, dict):
        if isinstance(m.get("conversation"), str):
            return m["conversation"]
        ext = m.get("extendedTextMessage")
        if isinstance(ext, dict) and isinstance(ext.get("text"), str):
            return ext["text"]
        return _texto(m)
    return ""


def _de_mim(d):
    key = d.get("key") if isinstance(d.get("key"), dict) else {}
    for v in (key.get("fromMe"), d.get("fromMe"), d.get("from_me"), d.get("is_from_me")):
        if v is not None:
            return v in (True, 1, "1", "true", "True")
    return None


def extrair_mensagens(dados):
    """Procura mensagens em qualquer formato de JSON que a API devolver."""
    achadas = []

    def andar(no):
        if isinstance(no, list):
            for x in no:
                andar(x)
        elif isinstance(no, dict):
            texto = _texto(no)
            de_mim = _de_mim(no)
            key = no.get("key") if isinstance(no.get("key"), dict) else {}
            mid = key.get("id") or no.get("message_id") or no.get("messageID") or no.get("id")
            if texto and de_mim is not None and mid:
                jid = key.get("remoteJid") or no.get("remoteJid") or no.get("jid") or ""
                fone = no.get("phone") or no.get("to") or re.sub(r"\D", "", jid.split("@")[0])
                achadas.append({
                    "id": str(mid),
                    "de_mim": de_mim,
                    "texto": texto,
                    "fone": str(fone or ""),
                    "nome": no.get("pushName") or no.get("name") or no.get("contact_name") or "",
                })
                return
            for v in no.values():
                andar(v)

    andar(dados)
    return achadas


def eh_chamada(c, texto):
    return any(r.search(texto) for r in c["regex"])


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
        with urllib.request.urlopen(url, timeout=20) as r:
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


def tocar_local(c, frase):
    if not c["som_local"]:
        return
    wav = _arquivo_alarme()
    for _ in range(max(1, c["repeticoes"])):
        if sys.platform.startswith("win"):
            import winsound
            winsound.PlaySound(wav, winsound.SND_FILENAME)
        elif sys.platform == "darwin":
            os.system(f'afplay "{wav}"')
        else:
            os.system(f'aplay -q "{wav}" 2>/dev/null || paplay "{wav}" 2>/dev/null')
    if sys.platform.startswith("win"):
        # Voz do próprio Windows, se houver voz em português instalada.
        seguro = frase.replace("'", "")
        os.system(
            'powershell -NoProfile -Command "Add-Type -AssemblyName System.Speech; '
            "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"$s.Speak('{seguro}')\""
        )
    elif sys.platform == "darwin":
        os.system(f'say "{frase}"')


def avisar(c, frase):
    log("AVISO: " + frase)
    falar_alexa(c, frase)
    tocar_local(c, frase)


def nome_falado(m):
    nome = (m.get("nome") or "").strip()
    if nome and not re.fullmatch(r"[\d+\s-]+", nome):
        return re.sub(r"[^\w\s'.-]", "", nome).strip() or "um cliente"
    if m.get("fone"):
        return "o cliente com final " + " ".join(m["fone"][-4:])
    return "um cliente"


# ---------------------------------------------------------------- laço

def rodar(c):
    estado = carregar_estado()
    primeira = not estado["vistas"]
    vistas = set(estado["vistas"])
    estava_aberta = loja_aberta(c)
    log("Chamador ligado. Loja " + ("aberta." if estava_aberta else "fechada, fico quieto até abrir."))

    while True:
        try:
            msgs = extrair_mensagens(buscar_json(c))
        except (urllib.error.URLError, ValueError, TimeoutError) as e:
            log(f"Não consegui ler o LetsBot: {e}")
            time.sleep(max(30, c["intervalo"]))
            continue

        aberta = loja_aberta(c)
        agora = time.time()
        for m in msgs:
            if m["id"] in vistas:
                continue
            vistas.add(m["id"])
            estado["vistas"].append(m["id"])
            if primeira or not m["de_mim"] or not eh_chamada(c, m["texto"]):
                continue
            cliente = m["fone"] or m["id"]
            if not aberta:
                estado["pendentes"][cliente] = nome_falado(m)
                log(f"Loja fechada, guardei para avisar ao abrir: {nome_falado(m)}")
                continue
            if agora - estado["ultimo_aviso"].get(cliente, 0) < c["intervalo_mesmo_cliente"] * 60:
                continue
            estado["ultimo_aviso"][cliente] = agora
            avisar(c, f"Atenção! {nome_falado(m)} precisa de uma vendedora no WhatsApp.")

        if aberta and not estava_aberta and estado["pendentes"] and c["avisar_pendentes_ao_abrir"]:
            nomes = list(estado["pendentes"].values())
            lista = ", ".join(nomes[:5]) + (f" e mais {len(nomes) - 5}" if len(nomes) > 5 else "")
            avisar(c, f"Bom dia! {len(nomes)} clientes pediram vendedora no WhatsApp enquanto a loja "
                      f"estava fechada: {lista}.")
            estado["pendentes"] = {}
        estava_aberta = aberta
        primeira = False
        salvar_estado(estado)
        time.sleep(c["intervalo"])


def testar(c):
    print("Lendo", c["lb_base"] + c["lb_caminho"], "...")
    try:
        dados = buscar_json(c)
    except urllib.error.HTTPError as e:
        print("ERRO HTTP", e.code, e.read().decode("utf-8", "replace")[:500])
        return
    except urllib.error.URLError as e:
        print("ERRO de conexão:", e)
        return
    print("Resposta (início):")
    print(json.dumps(dados, ensure_ascii=False, indent=1)[:2000])
    msgs = extrair_mensagens(dados)
    print(f"\nMensagens reconhecidas: {len(msgs)}  (do robô/loja: {sum(m['de_mim'] for m in msgs)})")
    for m in msgs[:15]:
        marca = "CHAMADA ->" if m["de_mim"] and eh_chamada(c, m["texto"]) else "          "
        quem = "loja " if m["de_mim"] else "cliente"
        print(marca, quem, m["fone"], "|", m["texto"][:90].replace("\n", " "))
    if not msgs:
        print("Nenhuma mensagem reconhecida. Mande esta tela para o Claude ajustar o leitor.")


if __name__ == "__main__":
    cfg = carregar_config()
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "testar":
        testar(cfg)
    elif cmd == "falar":
        avisar(cfg, "Teste do chamador da Kindo. Se você está ouvindo, está funcionando.")
    else:
        try:
            rodar(cfg)
        except KeyboardInterrupt:
            log("Chamador desligado.")
