# Words-N-Shapes — Anleitung (Deutsch)

> Wortwolken in Formen — offline, in einer einzigen HTML-Datei. Vollständige (englische) Doku inkl. Architektur-Hintergrund: **[README.md](README.md)**.

**[▶ Live-Demo](https://docatprompt.github.io/words-n-shapes/)** · Ein in sich geschlossenes HTML-Werkzeug für Wortwolken mit SVG- und PNG-Export (mit Transparenz). Läuft komplett im Browser — keine Installation, kein Server, keine Netzwerkzugriffe (außer den optionalen Google Fonts).

![Words-N-Shapes — Eingabe, Einstellungen und Vorschau](screenshot.png)

## Sofort ausprobieren

- **Online:** die **[Live-Demo](https://docatprompt.github.io/words-n-shapes/)** öffnen — nichts zu installieren.
- **Offline:** die fertige **[`dist/wordcloud.html`](dist/wordcloud.html)** (oder das Asset im [neuesten Release](https://github.com/DocAtPrompt/words-n-shapes/releases/latest)) herunterladen und **doppelklicken** — sie öffnet sich im Browser und läuft vollständig offline. Es ist eine einzige Datei, die du auch selbst irgendwo hosten kannst.

## Warum zwei Engines?

Wortwolken-Packing ist ein schwieriges Layout-Problem, und keine einzelne Open-Source-Engine kann alles am besten. Words-N-Shapes bringt deshalb **zwei** mit, im Programm umschaltbar:

- **d3-cloud** (Standard) — **SVG**/Vektor, scharfer Druck-/Export, **SVG-Export**, und die **Per-Wort-Bearbeitung** (Auswahl, Farbe, Verschieben/Pinnen, Drehen, Anordnen) sowie Effekte (Schatten/Glühen) leben hier.
- **wordcloud2.js** — Canvas/Raster, dichtere/organischere Optik und **native analytische Formen** für 6 Slugs (Kreis, Raute, Dreieck, Dreieck-vorwärts, Stern, Fünfeck). Pixel werden „gebacken" — keine Live-Per-Wort-Bearbeitung, kein SVG-Export.

**Faustregel:** **d3-cloud** für sauberes Vektor-Ergebnis, SVG-Export oder Feinjustierung einzelner Wörter; **wordcloud2.js**, wenn dir dessen Canvas-Look oder eine native Form besser gefällt. Beide nutzen dieselben Eingaben — einfach umschalten und vergleichen.

## In drei Schritten

1. **Wörter rein** — Text einfügen, eine Vorlage laden oder eine CSV-Datei importieren.
2. **Gestalten** — Schrift, Größenbereich, Form/Maske, Farben und Hintergrund wählen.
3. **„Generieren"**, dann **SVG** oder **PNG** herunterladen.

## Bedienung im Detail

Drei Spalten: **Eingabe** (links), **Einstellungen** (Mitte), **Vorschau** (rechts). Beim ersten Start erscheint eine kleine Demo-Wolke, die bei der ersten Interaktion verschwindet.

### Eingabe (links)
- In die Tabelle tippen/einfügen, oder **„aus Text befüllen"**: Fließtext einfügen → wird zerlegt, Stoppwörter raus, Häufigkeiten werden zu Gewichten.
- Oder **CSV importieren** (`Wort,Gewicht,Gruppe`).
- **Gruppen** geben Wortmengen eigene Farbe/Schrift/Rotation. Eine **Vorlage** legt automatisch eine Gruppe an.

### Einstellungen (Mitte)
Die Abschnitte lassen sich per Klick auf die Überschrift **ein-/ausklappen** (spart Platz). Von oben:
- **Engine** — d3-cloud oder wordcloud2.
- **Farbe & Hintergrund** — Palette/Verlauf, 16er-Farbtafel (Drag & Drop, Klick = Farbe wählen, × = leeren), „Palette aus Bild", sowie die Hintergründe **Fläche** (ganze Vorschau) und **Form** (innerhalb der Maske): transparent / weiß / schwarz / custom.
- **Effekt** — keiner / Schatten / Glühen (nur d3-cloud).
- **Form / Maske** — keine, eingebaute Form oder eigene Datei (siehe unten).
- **Schrift** — Font, Skalierung, Min/Max-Größe, Google-Fonts-Opt-in.
- **Rotation & Layout** — Modus, Anteil, Verteilung, Padding.
- **Rendering** — Ausgabeformat (Standard- + Social-Media-Presets oder custom), PNG-Auflösung.

### Generieren & verfeinern
- **„Generieren"** (oder **Live-Update** für automatisches Neuzeichnen).
- **🎲 Neue Anordnung**; ← / → blättern durch frühere Seeds.
- **Zoom/Pan** in der Vorschau; **„Ganze Form"** zentriert wieder.

### Einzelne Wörter feinjustieren (d3-cloud)
Ein Wort in der Vorschau anklicken (Rahmen + kleine Leiste unter den Zoom-Knöpfen):
- **Farbe** wählen, oder **Auto** zurück zur Palette.
- Wort **ziehen** oder mit **Pfeiltasten** schubsen — das **pinnt** es.
- **Drehung**-Regler zum Neigen.
- Mit **Cmd/Strg-Klick** mehrere Wörter auswählen.
- Klick in die leere Fläche (oder Esc) hebt die Auswahl auf.
- Sobald etwas gepinnt/gedreht ist, erscheint **„Anordnen"** (links neben den Zoom-Knöpfen): lässt die freien Wörter um die fixierten herumfließen.

### Export & speichern
- **SVG herunterladen** (d3-cloud) oder **PNG herunterladen** (1× / 2× / 4×).
- **Speichern** in einen benannten Slot (lebt im Browser) oder **JSON exportieren** für eine portable Datei.

> **Tipp — die Form füllen.** Wie gut die Wörter eine Form füllen, hängt von Anzahl, Länge und dem Größenbereich (Min/Max px) ab — bewusst manuell, damit du die Optik in der Hand hast.
> - **Nicht alle passen** („N von M platziert")? → Max-Größe runter, weniger/kürzere Wörter, größeres Format, oder bei wordcloud2 „Bei Platzmangel verkleinern".
> - **Form bleibt zu leer**? → Min/Max-Größe hoch, mehr Wörter, oder kleineres Format.

## Eigene Masken — und woher

Neben den 24 eingebauten Formen kannst du eine **eigene Maske** laden (Form / Maske → „eigene SVG", oder ein PNG/JPG):

- **Gefülltes** Icon nehmen, **keine Outline.** Eine Maske wirkt über ihre *Fläche*; reine Konturen tragen die Wolke nicht. Die Vorschau zeigt sofort, ob die Form trägt.
- **SVG** (max. ~100 KB): Markup einfügen oder Datei wählen. Auf Icon-Seiten: gefülltes Icon → „SVG kopieren" → einfügen.
- **PNG/JPG**: gefülltes, kontrastreiches Motiv — helle Fläche = außen. Foto/Scan wird per Helligkeit getrennt; bei falscher Richtung **„Invertieren"**.

**Gute Quellen für gefüllte Icons** (im Upload-Bereich verlinkt):

| Quelle | Auswahl |
|---|---|
| [Phosphor Icons](https://phosphoricons.com/) | Variante **fill** |
| [Font Awesome](https://fontawesome.com/search?o=r&s=solid&f=classic) | **solid** |
| [Material Symbols](https://fonts.google.com/icons) | **filled** |
| [Heroicons](https://heroicons.com/) | **solid** |
| [SVG Repo](https://www.svgrepo.com/) | gefüllte Silhouetten |

> ⚠️ **Für selbst geladene Masken bist du selbst verantwortlich.** Icons aus Fremd-Bibliotheken unterliegen der Lizenz ihrer Quelle. Die 24 **eingebauten** Masken sind Eigenerstellung (Public Domain / CC0-äquivalent) und ohne solche Einschränkung.

## Lizenz

MIT (siehe [`LICENSE`](LICENSE)). Eingebettete Dritt-Bibliotheken und Schriften behalten ihre eigenen Lizenzen (`LICENSES/`); zwei Libs sind lokal gepatcht — Details und Begründung in der **[README.md](README.md#local-modifications-to-vendored-libraries)**.
