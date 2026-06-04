# Vendor-Patch: wordcloud2.js Seed-Support

> **Zielversion:** wordcloud2.js **v1.2.3** (MIT, Timothy Chien)
> **Quelle Original:** https://cdn.jsdelivr.net/npm/wordcloud@1.2.3/src/wordcloud2.js
> **Eingespielt:** Phase 5 des Wordcloud-Generators (2026-05-25)
> **Patch-Datei:** [`wordcloud2-seed.patch`](./wordcloud2-seed.patch)

## Motivation

wordcloud2 hat **keine Option** zur Steuerung der internen Zufallsquelle. Reproduzierbare Layouts (gleicher Seed → gleiches Bild) sind ohne Patch unmöglich. Das bricht das UX-Prinzip „nur Farben ändern soll das Layout nicht verschieben", das bei d3-cloud funktioniert.

## Was der Patch macht

Eine Module-Level-Variable `randomFn`, die in `WordCloud(...)` aus `options.random` gesetzt wird. Vier layout-relevante `Math.random()`-Aufrufe gehen über diese Variable.

### Stellen (6 markierte Zeilen)

1. Module-Level, nach `shuffleArray`:
   ```js
   var randomFn = Math.random;
   ```
2. In `WordCloud = function(elements, options)`, am Body-Start:
   ```js
   randomFn = (options && options.random) || Math.random;
   ```
3. `shuffleArray` Z.163: `Math.random()` → `randomFn()`
4. `getRotateDeg` rotateRatio Z.511: `Math.random()` → `randomFn()`
5. `getRotateDeg` rotationSteps Z.522: `Math.random()` → `randomFn()`
6. `getRotateDeg` kontinuierlich Z.525: `Math.random()` → `randomFn()`

Alle markiert mit `// PATCH (Wordcloud-Generator Phase 5)`.

### Was bewusst NICHT gepatcht wird

- **Z.177 `timerId`**: nur Timer-ID, kein Layout-Effekt.
- **Z.365-367 HSL-Zufallsfarben**: nur bei `color: 'random-*'`, wird vom App-Code via `color`-Callback überschrieben — kein Effekt.

## Performance-Folgen

Vernachlässigbar: Funktionsvariable statt direkter `Math.random`-Referenz. Pro Aufruf <10 ns Overhead.

## Re-Apply bei Vendor-Update

```bash
# 1. Neue Version holen
curl -L -o vendor/wordcloud2.min.js https://cdn.jsdelivr.net/npm/wordcloud@<NEUE_VERSION>/src/wordcloud2.js

# 2. Patch anwenden
cd /Users/alexandererben/Tresors/Büro/Claude/wordcloud
patch -p1 < docs/vendor-patches/wordcloud2-seed.patch
```

Falls `patch` wegen verschobener Zeilennummern fehlschlägt: die 4 `Math.random`-Stellen sind über `grep -n "Math.random" vendor/wordcloud2.min.js` schnell zu finden. Pro Stelle prüfen, ob layout-relevant.

## Sanity-Test nach Re-Apply

1. Build: `./build.sh`
2. App im Browser öffnen, Theme laden, Engine auf wordcloud2.
3. Seed = 42, Generate → Wort-Anordnung merken.
4. Reroll (Seed ändert sich) → anderes Bild.
5. Manuell Seed = 42 zurücksetzen, Generate → **identisches Bild** zum ersten Lauf.
6. Bitweise: 2× hintereinander mit Seed = 42 → `currentRender.canvas.toDataURL()` vergleichen → muss identisch sein.

Falls Schritt 5 oder 6 fehlschlägt: eine `Math.random`-Stelle wurde übersehen.

## Warum nicht ein Fork?

Wie beim d3-cloud-Patch: Overkill für ein selbst-deploytes Single-Page-Tool. Bei Bedarf wäre der Patch der natürliche PR-Startpunkt für `timdream/wordcloud2.js`.
