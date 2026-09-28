#!/usr/bin/env python3
"""
Gerador de carrosséis completos para Instagram
Gera múltiplos slides com consistência visual via Nano Banana Pro 2 (Gemini Image)
+ Legenda e hashtags via Gemini texto

Uso:
  python gerar_carrossel.py \
    --tema "5 erros de skincare que todo mundo comete" \
    --slides 7 \
    --estilo "clean minimalista fundo branco" \
    --output_dir /sessions/.../mnt/outputs/carrossel/
"""

import argparse
import os
import sys
import json
from pathlib import Path

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



# Framework de 7 slides de alta performance
ESTRUTURA_CARROSSEL = {
    "hook": {
        "posicao": 1,
        "tipo": "Hook (para o scroll)",
        "descricao": "Primeira imagem — deve gerar curiosidade imediata. Problema relatable ou promessa forte.",
    },
    "contexto": {
        "posicao": 2,
        "tipo": "Contexto / Problema",
        "descricao": "Aprofunda o problema ou por que isso importa. Cria identificação.",
    },
    "valor_1": {
        "posicao": 3,
        "tipo": "Valor #1",
        "descricao": "Primeiro ponto de valor. Seja específico e acionável.",
    },
    "valor_2": {
        "posicao": 4,
        "tipo": "Valor #2",
        "descricao": "Segundo ponto. Pode ser exemplo, dado ou dica prática.",
    },
    "valor_3": {
        "posicao": 5,
        "tipo": "Valor #3",
        "descricao": "Terceiro ponto. Varie o formato (lista, antes/depois, comparação).",
    },
    "insight": {
        "posicao": 6,
        "tipo": "Insight / Twist",
        "descricao": "O ponto mais surpreendente ou contraintuitivo. Mantém o swipe.",
    },
    "cta": {
        "posicao": 7,
        "tipo": "CTA Final",
        "descricao": "Slide de fechamento: salvar, comentar, seguir ou link na bio.",
    },
}


def instalar_dependencias():
    try:
        import google.genai
    except ImportError:
        print("📦 Instalando google-genai...")
        os.system(f"{sys.executable} -m pip install google-genai pillow --break-system-packages -q")


def verificar_api_key():
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY não encontrada. Obtenha em: https://aistudio.google.com/apikey")
        sys.exit(1)
    return api_key


def planejar_slides(tema: str, num_slides: int, estilo: str, idioma: str) -> list[dict]:
    """
    Usa Gemini texto para planejar os prompts de cada slide mantendo consistência visual.
    Retorna lista de dicts com {titulo, prompt_imagem, texto_slide, posicao}
    """
    instalar_dependencias()
    from google import genai

    api_key = verificar_api_key()
    client = genai.Client(api_key=api_key)

    estrutura_str = "\n".join([
        f"Slide {v['posicao']}: {v['tipo']} — {v['descricao']}"
        for v in list(ESTRUTURA_CARROSSEL.values())[:num_slides]
    ])

    prompt = f"""Você é um estrategista de conteúdo para Instagram especializado em carrosséis virais.

Tema do carrossel: {tema}
Número de slides: {num_slides}
Estilo visual: {estilo}
Idioma: {idioma}

Estrutura a seguir:
{estrutura_str}

Para cada slide, crie:
1. Um prompt de imagem em inglês (para o modelo Gemini Image) que:
   - Seja coerente com o estilo visual definido
   - Não inclua texto na imagem
   - Descreva a cena, iluminação, ângulo e mood
   - Mantenha consistência visual entre todos os slides

2. Um texto curto para sobrepor na imagem (máx 8 palavras, impactante, em {idioma})

3. Um título interno para identificação

Responda EXATAMENTE neste formato JSON:
{{
  "seed_visual": "descrição do estilo visual consistente para todos os slides",
  "slides": [
    {{
      "posicao": 1,
      "tipo": "Hook",
      "titulo": "título interno",
      "prompt_imagem": "detailed image generation prompt in English, no text in image, {estilo} style",
      "texto_slide": "texto curto para sobrepor na imagem",
      "nota": "por que este slide funciona"
    }}
  ]
}}"""

    print(f"🧠 Planejando estrutura do carrossel...")

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    texto = response.text.strip()
    if texto.startswith("```"):
        linhas = texto.split("\n")
        texto = "\n".join(linhas[1:-1] if linhas[-1] == "```" else linhas[1:])

    plano = json.loads(texto)
    print(f"✅ Plano criado: {len(plano['slides'])} slides")
    return plano


def gerar_carrossel(
    tema: str,
    num_slides: int = 7,
    estilo: str = "clean minimalist white background",
    output_dir: str = "carrossel",
    resolucao: str = "2K",
    idioma: str = "pt-BR",
) -> dict:
    """
    Gera um carrossel completo para Instagram.

    Args:
        tema: Assunto do carrossel
        num_slides: Número de slides (recomendado: 5-10)
        estilo: Estilo visual consistente
        output_dir: Diretório para salvar os slides
        resolucao: Resolução das imagens
        idioma: Idioma dos textos

    Returns:
        Dict com caminhos das imagens, textos e metadados
    """
    from gerar_imagem import gerar_imagem

    # Garante que o número de slides está dentro do range
    num_slides = max(3, min(10, num_slides))

    # Cria diretório de output
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"\n🎠 CARROSSEL INSTAGRAM — {tema}")
    print(f"   {num_slides} slides | Estilo: {estilo} | Resolução: {resolucao}")
    print("=" * 60)

    # 1. Planeja os slides
    plano = planejar_slides(tema, num_slides, estilo, idioma)
    seed_visual = plano.get("seed_visual", estilo)

    # Salva o plano
    with open(output_path / "plano_carrossel.json", "w", encoding="utf-8") as f:
        json.dump(plano, f, ensure_ascii=False, indent=2)

    # 2. Gera imagens slide a slide
    slides_gerados = []

    for slide in plano["slides"]:
        pos = slide["posicao"]
        tipo = slide["tipo"]
        prompt = slide["prompt_imagem"]
        texto = slide.get("texto_slide", "")

        print(f"\n📸 Slide {pos}/{num_slides}: {tipo}")
        print(f"   Texto: {texto}")

        nome_arquivo = f"slide_{pos:02d}_{tipo.lower().replace(' ', '_')}.png"
        caminho_saida = str(output_path / nome_arquivo)

        try:
            arquivos = gerar_imagem(
                prompt=prompt,
                formato="feed_retrato",  # 4:5 para carrossel
                resolucao=resolucao,
                output_path=caminho_saida,
                seed_prompt=seed_visual,
            )

            slides_gerados.append({
                **slide,
                "arquivo": arquivos[0] if arquivos else None,
            })

        except Exception as e:
            print(f"⚠️  Erro no slide {pos}: {e}")
            slides_gerados.append({
                **slide,
                "arquivo": None,
                "erro": str(e),
            })

    # 3. Gera legenda para o carrossel
    print(f"\n✍️  Gerando legenda e hashtags...")

    script_dir = Path(__file__).parent
    sys.path.insert(0, str(script_dir))

    try:
        from gerar_conteudo import gerar_conteudo
        conteudo = gerar_conteudo(
            tema=tema,
            tom="educativo",
            formato_post="carrossel",
            cta="Arrasta pra ver →",
            idioma=idioma,
        )
    except Exception as e:
        print(f"⚠️  Erro ao gerar conteúdo: {e}")
        conteudo = {}

    # 4. Salva resultado final
    resultado = {
        "tema": tema,
        "num_slides": num_slides,
        "estilo": estilo,
        "seed_visual": seed_visual,
        "slides": slides_gerados,
        "conteudo": conteudo,
        "output_dir": str(output_path),
    }

    with open(output_path / "resultado_carrossel.json", "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    # 5. Relatório final
    slides_ok = sum(1 for s in slides_gerados if s.get("arquivo"))
    slides_erro = num_slides - slides_ok

    print(f"\n{'=' * 60}")
    print(f"🎉 CARROSSEL GERADO!")
    print(f"   ✅ {slides_ok} slides com sucesso")
    if slides_erro:
        print(f"   ⚠️  {slides_erro} slides com erro")
    print(f"   📁 Salvo em: {output_path}")
    print(f"   📋 Plano: {output_path}/plano_carrossel.json")

    return resultado


def main():
    parser = argparse.ArgumentParser(
        description="Gerador de carrosséis completos para Instagram"
    )
    parser.add_argument("--tema", required=True, help="Tema do carrossel")
    parser.add_argument("--slides", type=int, default=7, help="Número de slides (3-10)")
    parser.add_argument(
        "--estilo",
        default="clean minimalist white background, editorial photography",
        help="Estilo visual consistente"
    )
    parser.add_argument(
        "--output_dir",
        default="carrossel_output",
        help="Diretório de saída"
    )
    parser.add_argument("--resolucao", default="2K", choices=["1K", "2K", "4K"])
    parser.add_argument("--idioma", default="pt-BR")

    args = parser.parse_args()

    resultado = gerar_carrossel(
        tema=args.tema,
        num_slides=args.slides,
        estilo=args.estilo,
        output_dir=args.output_dir,
        resolucao=args.resolucao,
        idioma=args.idioma,
    )

    print(f"\n📁 Arquivos gerados em: {resultado['output_dir']}")


if __name__ == "__main__":
    main()
