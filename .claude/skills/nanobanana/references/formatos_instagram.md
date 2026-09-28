# Especificações Técnicas — Formatos Instagram

## Feed Posts

| Formato | Dimensão | Aspect Ratio | Uso ideal |
|---------|----------|--------------|-----------|
| Quadrado | 1080×1080px | 1:1 | Fotos de produto, citações |
| Retrato (recomendado) | 1080×1350px | 4:5 | **Maior alcance no feed** |
| Paisagem | 1080×608px | 1.91:1 | Fotos amplas, paisagens |

**Tamanho máximo de arquivo:** 8 MB (imagem)
**Formatos aceitos:** JPG, PNG

## Stories e Reels

| Formato | Dimensão | Aspect Ratio | Observação |
|---------|----------|--------------|------------|
| Story foto | 1080×1920px | 9:16 | Zona segura: evitar 250px no topo e fundo |
| Reel capa | 1080×1920px | 9:16 | Mesma dimensão do Story |
| Reel vídeo | 1080×1920px | 9:16 | Duração: 15s a 90s |

## Carrossel

- **Dimensão recomendada:** 1080×1350px (4:5) — melhor para o feed
- **Número de slides:** máximo 20, ótimo entre 5-10
- **Todos os slides devem ter o mesmo formato** (não misture 1:1 com 4:5)
- **Primeiro slide:** é o mais importante — determina se alguém swipa

## Configurações no Gemini API

```python
# Feed retrato (mais alcance)
aspect_ratio="4:5", image_size="2K"

# Story/Reel
aspect_ratio="9:16", image_size="2K"

# Feed quadrado
aspect_ratio="1:1", image_size="2K"
```

## Dicas de Qualidade

- **2K** é suficiente para 99% dos casos (equilibra qualidade × custo)
- **4K** só vale para impressões ou zoom extremo
- Sempre salve em PNG para edição posterior, JPG para publicação final
- O Instagram comprime imagens ao fazer upload — suba na maior qualidade possível
