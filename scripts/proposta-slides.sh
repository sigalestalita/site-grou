#!/usr/bin/env bash
# Gera os slides de uma proposta (PDF exportado do Google Slides) em webp de 1920 px de largura.
#
#   scripts/proposta-slides.sh <deck.pdf> <pasta>
#
# <pasta> é a pasta pública dos slides, por exemplo assets/propostas/3f9c…/ (use um nome
# aleatório e difícil de adivinhar: openssl rand -hex 12). Grava 01.webp, 02.webp, … e
# mostra o número de páginas, que vai na coluna "paginas" da proposta.
# Para atualizar um deck: exporte de novo (Arquivo › Fazer download › PDF, ou
#   curl -sSL -o deck.pdf "https://docs.google.com/presentation/d/<ID>/export/pdf")
# e rode este script na mesma pasta. Precisa de pdftoppm (poppler) e Python com Pillow.
set -euo pipefail
PDF="${1:?uso: $0 <deck.pdf> <pasta>}"
PASTA="${2:?uso: $0 <deck.pdf> <pasta>}"
LARGURA=1920
QUALIDADE=84
command -v pdftoppm >/dev/null || { echo "falta o pdftoppm (poppler-utils)"; exit 1; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$PASTA"
rm -f "$PASTA"/[0-9][0-9].webp
pdftoppm -png -scale-to-x "$LARGURA" -scale-to-y -1 "$PDF" "$TMP/p"
python3 -I - "$TMP" "$PASTA" "$QUALIDADE" <<'PY'
import sys, glob, os
from PIL import Image
tmp, pasta, q = sys.argv[1], sys.argv[2], int(sys.argv[3])
arqs = sorted(glob.glob(os.path.join(tmp, 'p-*.png')), key=lambda a: int(a.rsplit('-', 1)[1].split('.')[0]))
for n, a in enumerate(arqs, 1):
    Image.open(a).convert('RGB').save(os.path.join(pasta, '%02d.webp' % n), 'WEBP', quality=q, method=6)
print(len(arqs), 'páginas gravadas em', pasta)
PY
du -sh "$PASTA"
