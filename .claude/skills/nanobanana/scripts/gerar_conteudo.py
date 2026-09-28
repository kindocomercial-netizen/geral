#!/usr/bin/env python3
"""
Gerador de legendas, hashtags e CTAs para Instagram
Usa Gemini texto (gemini-2.5-flash) via Google AI API

Uso:
  python gerar_conteudo.py --tema "skincare sustentável" --tom inspiracional --cta "Salva pra depois"
"""

import argparse
import os
from pathlib import Path
import sys
import json

def _carregar_env():
    """Lê GEMINI_API_KEY de um arquivo .env na pasta atual, se não estiver no ambiente."""
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        return
    env = Path.cwd() / ".env"
    if env.exists():
        for linha in env.read_text(encoding="utf-8").splitlines():
            k, _, v = linha.partition("=")
            if k.strip() in ("GEMINI_API_KEY", "GOOGLE_API_KEY") and v.strip():
                os.environ[k.strip()] = v.strip().strip('"').strip("'")


_carregar_env()



TONS_VALIDOS = [
    "inspiracional", "informativo", "divertido", "vendas",
    "educativo", "emocional", "provocativo", "storytelling"
]

FORMATOS_POST = ["feed", "story", "carrossel", "reel"]


def verificar_api_key():
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY não encontrada no ambiente.")
        print("   Obtenha sua chave gratuita em: https://aistudio.google.com/apikey")
        sys.exit(1)
    return api_key


def instalar_dependencias():
    try:
        import google.genai
    except ImportError:
        print("📦 Instalando google-genai...")
        os.system(f"{sys.executable} -m pip install google-genai --break-system-packages -q")


def gerar_conteudo(
    tema: str,
    tom: str = "inspiracional",
    formato_post: str = "feed",
    cta: str = None,
    num_hashtags: int = 20,
    idioma: str = "pt-BR",
    contexto_marca: str = None,
    num_opcoes: int = 1,
) -> dict:
    """
    Gera legenda + hashtags otimizados para Instagram.

    Args:
        tema: Assunto ou descrição do post
        tom: Tom da legenda (inspiracional, informativo, divertido, etc.)
        formato_post: feed, story, carrossel, reel
        cta: Call-to-action desejado (ex: "Salva pra depois", "Comenta abaixo")
        num_hashtags: Quantidade de hashtags (recomendado: 15-25)
        idioma: Idioma da legenda (pt-BR, en-US, es-ES)
        contexto_marca: Informações sobre a marca/perfil para personalização
        num_opcoes: Quantas variações de legenda gerar

    Returns:
        Dict com 'legendas' (lista) e 'hashtags' (lista) e 'dicas'
    """
    instalar_dependencias()

    from google import genai

    api_key = verificar_api_key()
    client = genai.Client(api_key=api_key)

    # Monta prompt contextualizado
    contexto_marca_str = f"\n\nContexto da marca: {contexto_marca}" if contexto_marca else ""
    cta_str = f"\nCTA obrigatório no final: '{cta}'" if cta else "\nEscolha o CTA mais adequado."
    opcoes_str = f"Gere {num_opcoes} variação(ões) de legenda." if num_opcoes > 1 else "Gere 1 legenda."

    instrucoes_formato = {
        "feed": "Legenda para post de feed: 150-300 palavras, parágrafo de abertura poderoso, corpo com valor real, CTA claro. Use 2-3 emojis estratégicos para quebra visual.",
        "story": "Texto curto para story: máximo 2 linhas, direto e impactante. CTA com swipe up ou 'Responda aqui'.",
        "carrossel": "Legenda de carrossel: comece com 'Arrasta pra ver →'. Texto que complemente os slides sem repetir. Foco em curiosidade e valor.",
        "reel": "Legenda de Reel: primeiras 2 linhas são o que aparece sem expandir — faça valer. Use 'Assiste até o final' ou similar como gancho.",
    }

    prompt_sistema = f"""Você é um especialista em copywriting para Instagram com profundo
conhecimento do algoritmo, psicologia do scroll e criação de conteúdo que engaja.

Tom solicitado: {tom}
Formato: {formato_post}
Idioma: {idioma}
{instrucoes_formato.get(formato_post, instrucoes_formato['feed'])}
{contexto_marca_str}

Regras de ouro:
- Primeira linha deve PARAR o scroll (pergunta, afirmação provocativa, número, ou promessa)
- Use espaços entre parágrafos — leitura mobile precisa de respiração
- Seja específico, não genérico — "aumente 40% seu engajamento" > "melhore seu engajamento"
- O CTA deve ser natural, não forçado
- Hashtags: mix de grande alcance (>500k posts) + nicho (<50k posts) + médias (50k-500k)
- Sem hashtags irrelevantes ou spam

{opcoes_str}
{cta_str}

Tema do post: {tema}

Responda EXATAMENTE neste formato JSON:
{{
  "legendas": [
    {{
      "versao": 1,
      "abertura": "primeira linha de impacto",
      "corpo": "texto completo da legenda com espaçamentos",
      "cta": "call to action usado",
      "caracteres": 0
    }}
  ],
  "hashtags": {{
    "grandes": ["lista", "de", "hashtags", "com", "mais", "de", "500k"],
    "medias": ["hashtags", "entre", "50k", "e", "500k"],
    "nicho": ["hashtags", "especificas", "abaixo", "de", "50k"]
  }},
  "dicas_postagem": {{
    "melhor_horario": "sugestão de horário baseado no tipo de conteúdo",
    "dia_semana": "dia(s) recomendados",
    "primeiro_comentario": "sugestão de o que fixar nos comentários",
    "observacoes": "outras dicas relevantes"
  }}
}}"""

    print(f"✍️  Gerando conteúdo para Instagram...")
    print(f"   Tema: {tema}")
    print(f"   Tom: {tom} | Formato: {formato_post} | Idioma: {idioma}")

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt_sistema,
        )

        texto = response.text.strip()

        # Remove markdown code blocks se presentes
        if texto.startswith("```"):
            linhas = texto.split("\n")
            texto = "\n".join(linhas[1:-1] if linhas[-1] == "```" else linhas[1:])

        resultado = json.loads(texto)

        # Calcula contagem de caracteres
        for legenda in resultado.get("legendas", []):
            corpo = legenda.get("corpo", "")
            legenda["caracteres"] = len(corpo)

        return resultado

    except json.JSONDecodeError as e:
        # Fallback: retorna o texto bruto se o JSON falhar
        print(f"⚠️  Resposta não veio em JSON — retornando texto bruto.")
        return {
            "legendas": [{"versao": 1, "corpo": response.text, "cta": cta or ""}],
            "hashtags": {"grandes": [], "medias": [], "nicho": []},
            "dicas_postagem": {}
        }
    except Exception as e:
        print(f"❌ Erro ao gerar conteúdo: {e}")
        raise


def formatar_saida(resultado: dict) -> str:
    """Formata o resultado para exibição amigável."""
    linhas = []

    linhas.append("=" * 60)
    linhas.append("📝 LEGENDAS GERADAS")
    linhas.append("=" * 60)

    for legenda in resultado.get("legendas", []):
        if legenda.get("versao", 1) > 1 or len(resultado.get("legendas", [])) > 1:
            linhas.append(f"\n— Versão {legenda.get('versao', 1)} —")
        linhas.append(f"\n{legenda.get('corpo', '')}")
        linhas.append(f"\n[{legenda.get('caracteres', 0)} caracteres]")
        linhas.append("")

    # Hashtags
    hashtags = resultado.get("hashtags", {})
    todas_hashtags = (
        hashtags.get("grandes", []) +
        hashtags.get("medias", []) +
        hashtags.get("nicho", [])
    )

    if todas_hashtags:
        linhas.append("=" * 60)
        linhas.append("🏷️  HASHTAGS")
        linhas.append("=" * 60)
        hashtags_formatadas = " ".join(
            f"#{h.lstrip('#')}" for h in todas_hashtags
        )
        linhas.append(hashtags_formatadas)
        linhas.append(f"\n[{len(todas_hashtags)} hashtags]")

    # Dicas
    dicas = resultado.get("dicas_postagem", {})
    if dicas:
        linhas.append("\n" + "=" * 60)
        linhas.append("💡 DICAS DE POSTAGEM")
        linhas.append("=" * 60)
        if dicas.get("melhor_horario"):
            linhas.append(f"⏰ Horário: {dicas['melhor_horario']}")
        if dicas.get("dia_semana"):
            linhas.append(f"📅 Dia: {dicas['dia_semana']}")
        if dicas.get("primeiro_comentario"):
            linhas.append(f"📌 Primeiro comentário: {dicas['primeiro_comentario']}")
        if dicas.get("observacoes"):
            linhas.append(f"📎 Obs: {dicas['observacoes']}")

    return "\n".join(linhas)


def main():
    parser = argparse.ArgumentParser(
        description="Gerador de legendas e hashtags para Instagram via Gemini"
    )
    parser.add_argument("--tema", required=True, help="Tema ou assunto do post")
    parser.add_argument(
        "--tom",
        default="inspiracional",
        choices=TONS_VALIDOS,
        help="Tom da legenda"
    )
    parser.add_argument(
        "--formato",
        default="feed",
        choices=FORMATOS_POST,
        help="Formato do post"
    )
    parser.add_argument("--cta", help="Call-to-action desejado")
    parser.add_argument("--hashtags", type=int, default=20, help="Quantidade de hashtags")
    parser.add_argument("--idioma", default="pt-BR", help="Idioma (pt-BR, en-US, etc.)")
    parser.add_argument("--marca", help="Contexto da marca/perfil")
    parser.add_argument("--opcoes", type=int, default=1, help="Quantas variações de legenda")
    parser.add_argument("--json", action="store_true", help="Saída em JSON puro")
    parser.add_argument("--output", help="Salvar resultado em arquivo")

    args = parser.parse_args()

    resultado = gerar_conteudo(
        tema=args.tema,
        tom=args.tom,
        formato_post=args.formato,
        cta=args.cta,
        num_hashtags=args.hashtags,
        idioma=args.idioma,
        contexto_marca=args.marca,
        num_opcoes=args.opcoes,
    )

    if args.json:
        saida = json.dumps(resultado, ensure_ascii=False, indent=2)
    else:
        saida = formatar_saida(resultado)

    print(saida)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(saida)
        print(f"\n💾 Salvo em: {args.output}")


if __name__ == "__main__":
    main()
