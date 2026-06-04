# Mask-Quellen (Original-Vektoren)

Original-Inkscape-Zeichnungen (A4, `viewBox="0 0 210 297"`) für drei Maskenformen,
in Inkscape von Alexander Erben nachgezeichnet — eigenes Werk.

- `bird.svg`, `leaf.svg`, `apple.svg`

Die **ausgelieferten** Masken liegen in `assets/masks/` und sind aus diesen Quellen
aufbereitet: Pfad extrahiert, Inkscape-Metadaten entfernt, `viewBox` eng auf die
Bounding-Box (+ ~5px Padding) zugeschnitten, damit die Form den Render-Rahmen füllt.

Dieser Ordner liegt **außerhalb** von `assets/masks/` — `build.sh` globt nur
`assets/masks/*.svg` (non-rekursiv), die A4-Originale werden also nicht als Maske
eingelesen. Zuschnitt-Werte siehe `docs/specs/2026-05-30-formen-und-masken.md` §4.
