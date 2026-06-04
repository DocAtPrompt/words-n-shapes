#!/usr/bin/env bash
# Konkateniert Template, CSS, Stopwortlisten, Themen, Paletten, Vendor-Libraries,
# WebFonts (base64) und App-Code zu einer einzelnen self-contained HTML-Datei
# unter dist/wordcloud.html.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

python3 - "$ROOT" <<'PY'
import sys, json, base64, pathlib

root = pathlib.Path(sys.argv[1])
out = root / 'dist' / 'wordcloud.html'
out.parent.mkdir(parents=True, exist_ok=True)

def read_text(rel):
    return (root / rel).read_text(encoding='utf-8')

# ----- Themen aggregieren -----
themes = {}
themes_dir = root / 'data' / 'themes'
if themes_dir.exists():
    for f in sorted(themes_dir.glob('*.json')):
        data = json.loads(f.read_text(encoding='utf-8'))
        themes[data['id']] = { 'name': data['name'], 'words': data['words'] }
themes_js = (
    '(function(W){W.themes = ' + json.dumps(themes, ensure_ascii=False)
    + ';})(window.WC = window.WC || {});'
)

# ----- Paletten -----
palettes_path = root / 'data' / 'palettes.json'
palettes = json.loads(palettes_path.read_text(encoding='utf-8')) if palettes_path.exists() else {}
palettes_js = (
    '(function(W){W.palettes = ' + json.dumps(palettes, ensure_ascii=False)
    + ';})(window.WC = window.WC || {});'
)

# ----- Masken (SVG-Slugs) -----
# Lädt alle SVG-Dateien aus assets/masks/ und legt sie als window.WC.masks ab,
# Schlüssel = Dateiname ohne .svg-Endung.
masks = {}
masks_dir = root / 'assets' / 'masks'
if masks_dir.exists():
    for f in sorted(masks_dir.glob('*.svg')):
        masks[f.stem] = f.read_text(encoding='utf-8')
masks_js = (
    '(function(W){W.masks = ' + json.dumps(masks, ensure_ascii=False)
    + ';})(window.WC = window.WC || {});'
)

# ----- Fonts als base64 in @font-face -----
FONT_FAMILIES = {
    'pacifico.woff2':            'Pacifico',
    'lobster.woff2':             'Lobster',
    'bebas-neue.woff2':          'Bebas Neue',
    'playfair-display.woff2':    'Playfair Display',
    'anton.woff2':               'Anton',
    'fjalla-one.woff2':          'Fjalla One',
    'caveat.woff2':              'Caveat',
    'permanent-marker.woff2':    'Permanent Marker',
    'press-start-2p.woff2':      'Press Start 2P',
    'cinzel.woff2':              'Cinzel',
    'special-elite.woff2':       'Special Elite',
    'shadows-into-light.woff2':  'Shadows Into Light',
    'architects-daughter.woff2': 'Architects Daughter',
    'crimson-text.woff2':        'Crimson Text',
    'roboto-slab.woff2':         'Roboto Slab',
    'righteous.woff2':           'Righteous',
    'russo-one.woff2':           'Russo One',
}
fonts_css_lines = []
fonts_dir = root / 'assets' / 'fonts'
for fname, family in FONT_FAMILIES.items():
    p = fonts_dir / fname
    if not p.exists():
        print(f"Warnung: Font fehlt: {p}", file=sys.stderr)
        continue
    b64 = base64.b64encode(p.read_bytes()).decode('ascii')
    fonts_css_lines.append(
        f"@font-face {{ font-family: '{family}'; font-style: normal; "
        f"font-weight: 400; font-display: swap; "
        f"src: url(data:font/woff2;base64,{b64}) format('woff2'); }}"
    )
fonts_block = "\n".join(fonts_css_lines)

# ----- Favicon: SVG → base64-data-URI -----
favicon_path = root / 'assets' / 'favicon.svg'
favicon_data_uri = ''
if favicon_path.exists():
    favicon_b64 = base64.b64encode(favicon_path.read_bytes()).decode('ascii')
    favicon_data_uri = f'data:image/svg+xml;base64,{favicon_b64}'
else:
    print(f"Warnung: Favicon fehlt: {favicon_path}", file=sys.stderr)

# ----- Template laden und Platzhalter ersetzen -----
template = read_text('wordcloud.template.html')

replacements = {
    '<!--STYLES-->':           read_text('src/styles.css'),
    '<!--FONTS-->':            fonts_block,
    '<!--STOPWORDS-DE-->':     read_text('src/stopwords-de.js'),
    '<!--STOPWORDS-EN-->':     read_text('src/stopwords-en.js'),
    '<!--THEMES-->':           themes_js,
    '<!--PALETTES-->':         palettes_js,
    '<!--MASKS-->':            masks_js,
    '<!--FAVICON-->':          favicon_data_uri,
    '<!--LIB-D3-DISPATCH-->':  read_text('vendor/d3-dispatch.min.js'),
    '<!--LIB-D3-CLOUD-->':     read_text('vendor/d3-cloud.js'),
    '<!--LIB-WORDCLOUD2-->':   read_text('vendor/wordcloud2.min.js'),
    '<!--APP-->':              read_text('src/app.js'),
}

missing = [k for k in replacements if k not in template]
if missing:
    print(f"Warnung: Platzhalter fehlen im Template: {missing}", file=sys.stderr)

for k, v in replacements.items():
    template = template.replace(k, v)

out.write_text(template, encoding='utf-8')

size = out.stat().st_size
print(f"Build OK -> {out}")
print(f"  Groesse: {size:,} Bytes ({size/1024:.1f} KB)")
print(f"  Themen:   {len(themes)}")
print(f"  Paletten: {len(palettes)}")
print(f"  Masken:   {len(masks)}")
print(f"  Fonts:    {len(fonts_css_lines)}")
PY
