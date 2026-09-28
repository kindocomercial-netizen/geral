#!/usr/bin/env python3
"""
Gerador de imagens para Instagram usando Nano Banana Pro 2
(Google Gemini 3.1 Flash Image Preview)

Uso:
  python gerar_imagem.py --prompt "..." --formato feed_retrato --resolucao 2K --output foto.png
  python gerar_imagem.py --prompt "..." --imagem_input existente.png --formato story --output editada.png
"""

import argparse
import os
import sys
import base64
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


# Mapeamento de formatos para aspect ratios do Gemini
FORMATOS = {
    "feed_quadrado":  {"aspect_ratio": "1:1",  "desc": "Feed Instagram 1:1 (1080×1080)"},
    "feed_retrato":   {"aspect_ratio": "4:5",  "desc": "Feed Instagram 4:5 (1080×1350) — melhor alcance"},
    "story":          {"aspect_ratio": "9:16", "desc": "Story/Reel 9:16 (1080×1920)"},
    "reel_cover":     {"aspect_ratio": "9:16", "desc": "Reel Cover 9:16 (1080×1920)"},
    "landscape":      {"aspect_ratio": "16:9", "desc": "Landscape 16:9 (1080×608)"},
}

RESOLUCOES = ["1K", "2K", "4K"]


def verificar_api_key():
    """Verifica se a GEMINI_API_KEY está disponível."""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY não encontrada no ambiente.")
        print("   Obtenha sua chave gratuita em: https://aistudio.google.com/apikey")
        print("   Depois rode: export GEMINI_API_KEY='sua-chave-aqui'")
        sys.exit(1)
    return api_key


def instalar_dependencias():
    """Instala dependências se necessário."""
    try:
        import google.genai
    except ImportError:
        print("📦 Instalando google-genai...")
        os.system(f"{sys.executable} -m pip install google-genai pillow --break-system-packages -q")


def gerar_imagem(
    prompt: str,
    formato: str = "feed_retrato",
    resolucao: str = "2K",
    output_path: str = "output.png",
    imagem_input: str = None,
    seed_prompt: str = None,
    quantidade: int = 1,
) -> list[str]:
    """
    Gera ou edita imagem(ns) usando o Nano Banana Pro 2 (Gemini 3.1 Flash Image).

    Args:
        prompt: Descrição da imagem a gerar
        formato: Um de FORMATOS acima
        resolucao: "1K", "2K" ou "4K"
        output_path: Caminho do arquivo de saída (se quantidade > 1, adiciona sufixo)
        imagem_input: Caminho de imagem existente para edição (opcional)
        seed_prompt: Prompt de contexto global para manter consistência entre slides
        quantidade: Quantas variações gerar (1-4)

    Returns:
        Lista de caminhos das imagens geradas
    """
    instalar_dependencias()

    from google import genai
    from google.genai import types

    api_key = verificar_api_key()
    client = genai.Client(api_key=api_key)

    if formato not in FORMATOS:
        print(f"❌ Formato '{formato}' inválido. Escolha: {', '.join(FORMATOS.keys())}")
        sys.exit(1)

    if resolucao not in RESOLUCOES:
        print(f"❌ Resolução '{resolucao}' inválida. Escolha: {', '.join(RESOLUCOES)}")
        sys.exit(1)

    config_formato = FORMATOS[formato]

    # Monta o prompt completo
    prompt_final = prompt
    if seed_prompt:
        prompt_final = f"[Contexto da série: {seed_prompt}]\n\n{prompt}"

    # Adiciona instrução padrão de qualidade
    prompt_final += "\n\nSem texto sobreposto. Sem watermark. Alta qualidade fotográfica."

    print(f"🍌 Nano Banana Pro 2 — gerando imagem...")
    print(f"   Formato: {config_formato['desc']}")
    print(f"   Resolução: {resolucao}")
    print(f"   Modelo: gemini-3.1-flash-image-preview")

    # Configura conteúdo (com ou sem imagem de entrada)
    contents = []

    if imagem_input:
        # Modo edição: inclui imagem existente
        img_path = Path(imagem_input)
        if not img_path.exists():
            print(f"❌ Imagem de entrada não encontrada: {imagem_input}")
            sys.exit(1)

        with open(img_path, "rb") as f:
            img_data = f.read()

        mime_type = "image/jpeg" if img_path.suffix.lower() in [".jpg", ".jpeg"] else "image/png"

        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=img_data, mime_type=mime_type),
                    types.Part.from_text(text=f"Edite esta imagem: {prompt_final}"),
                ]
            )
        ]
        print(f"   Modo: Edição de imagem existente ({img_path.name})")
    else:
        # Modo geração pura
        contents = prompt_final
        print(f"   Modo: Geração text-to-image")

    # Garante que o diretório de output existe
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    arquivos_gerados = []

    for i in range(max(1, quantidade)):
        try:
            response = client.models.generate_content(
                model="gemini-3.1-flash-image-preview",
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                    image_config=types.ImageConfig(
                        aspect_ratio=config_formato["aspect_ratio"],
                        image_size=resolucao,
                    ),
                ),
            )

            # Extrai imagens da resposta
            imagens_da_resposta = []
            texto_resposta = []

            for part in response.candidates[0].content.parts:
                if hasattr(part, "inline_data") and part.inline_data:
                    imagens_da_resposta.append(part.inline_data.data)
                elif hasattr(part, "text") and part.text:
                    texto_resposta.append(part.text)

            if not imagens_da_resposta:
                print(f"⚠️  Nenhuma imagem retornada na tentativa {i+1}.")
                if texto_resposta:
                    print(f"   Resposta de texto: {' '.join(texto_resposta)[:200]}")
                continue

            for j, img_data in enumerate(imagens_da_resposta):
                # Define nome do arquivo de saída
                if quantidade > 1 or len(imagens_da_resposta) > 1:
                    suffix = f"_{i+1}" if j == 0 else f"_{i+1}_{j+1}"
                    nome_arquivo = output_file.stem + suffix + output_file.suffix
                    caminho_saida = output_file.parent / nome_arquivo
                else:
                    caminho_saida = output_file

                # Salva a imagem
                if isinstance(img_data, str):
                    img_bytes = base64.b64decode(img_data)
                else:
                    img_bytes = img_data

                with open(caminho_saida, "wb") as f:
                    f.write(img_bytes)

                arquivos_gerados.append(str(caminho_saida))
                print(f"✅ Imagem salva: {caminho_saida}")

            if texto_resposta:
                print(f"💬 Nota do modelo: {' '.join(texto_resposta)[:300]}")

        except Exception as e:
            print(f"❌ Erro na geração {i+1}: {e}")
            if "SAFETY" in str(e).upper():
                print("   Sugestão: Reformule o prompt para evitar filtros de segurança.")
            elif "API_KEY" in str(e).upper() or "PERMISSION" in str(e).upper():
                print("   Verifique sua GEMINI_API_KEY em: https://aistudio.google.com/apikey")
            raise

    if not arquivos_gerados:
        print("❌ Nenhuma imagem foi gerada. Verifique o prompt e tente novamente.")
        sys.exit(1)

    print(f"\n🎉 {len(arquivos_gerados)} imagem(ns) gerada(s) com sucesso!")
    return arquivos_gerados


def main():
    parser = argparse.ArgumentParser(
        description="Gerador de imagens para Instagram via Nano Banana Pro 2 (Gemini API)"
    )
    parser.add_argument("--prompt", required=True, help="Descrição da imagem")
    parser.add_argument(
        "--formato",
        default="feed_retrato",
        choices=list(FORMATOS.keys()),
        help="Formato do post Instagram"
    )
    parser.add_argument(
        "--resolucao",
        default="2K",
        choices=RESOLUCOES,
        help="Resolução da imagem"
    )
    parser.add_argument(
        "--output",
        default="output.png",
        help="Caminho do arquivo de saída"
    )
    parser.add_argument(
        "--imagem_input",
        help="Imagem existente para editar (modo edição)"
    )
    parser.add_argument(
        "--seed_prompt",
        help="Prompt de contexto global (para consistência entre slides de carrossel)"
    )
    parser.add_argument(
        "--quantidade",
        type=int,
        default=1,
        help="Quantas variações gerar (1-4)"
    )

    args = parser.parse_args()

    arquivos = gerar_imagem(
        prompt=args.prompt,
        formato=args.formato,
        resolucao=args.resolucao,
        output_path=args.output,
        imagem_input=args.imagem_input,
        seed_prompt=args.seed_prompt,
        quantidade=args.quantidade,
    )

    print("\n📁 Arquivos gerados:")
    for f in arquivos:
        print(f"   → {f}")


if __name__ == "__main__":
    main()
