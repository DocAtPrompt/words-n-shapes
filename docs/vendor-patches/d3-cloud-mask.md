# Vendor-Patch: d3-cloud Maskenform-Support

> **Zielversion:** d3-cloud **v1.2.9** (BSD-3, Jason Davies)
> **Quelle Original:** https://cdn.jsdelivr.net/npm/d3-cloud@1.2.9/build/d3.layout.cloud.js
> **Eingespielt:** Phase 4 (2026-05-25, Mask-Setter + board-Vorbefüllung) + Phase 5 (2026-05-31, bounds-Lockerung für mehrteilige Masken + zentriertes Hauptwort)
> **Patch-Datei:** [`d3-cloud-mask.patch`](./d3-cloud-mask.patch) — 3 Hunks, round-trip-verifiziert

---

## Motivation

d3-cloud hat **keine native Mask-API**. Die `cloud.canvas()`-Methode ist nur die Sprite-Generierung für Wort-Kollisions-Tests (Hidden-Canvas), **nicht** ein Maskenform-Canvas für die Layout-Fläche. Wenn man dort ein vorgemaltes Canvas übergibt, wird es bei jedem Layout-Start neu dimensioniert und damit gewipt.

Die tatsächliche Belegungs-Map liegt in einer privaten Variable `board`:

```js
board = zeroArray((size[0] >> 5) * size[1])
```

Das ist ein 1-D-`Int32Array`, das pro 32-Bit-Wort 32 horizontale Pixel packt. Bit gesetzt = blockiert, Bit gelöscht = frei. Wörter prüfen während des Layouts ihre Kollision gegen genau dieses `board`.

**Patch-Idee:** vor dem ersten Wort-Place das `board` mit den blockierten Pixeln einer Mask-Canvas vorbelegen. Wörter umfließen dann die Maske automatisch — ohne dass am Layout-Algorithmus selbst etwas geändert werden muss.

## Was der Patch macht

Vier minimale Eingriffe (zwei Einfügungen Phase 4 + zwei Erweiterungen Phase 5). Patch #4 (zentriertes Hauptwort) ist **nicht** mask-bezogen, lebt aber der Einfachheit halber in derselben Datei/diesem `.patch`.

### 1. Mask-Setter (top-level Variable + Funktion)

```js
var maskCanvas = null;

cloud.mask = function(_) {
  return arguments.length ? (maskCanvas = _, cloud) : maskCanvas;
};
```

Klassischer d3-Setter-Stil (gleich wie `cloud.canvas`). Konvention für die Pixel:
- `alpha > 128` → Pixel blockiert (kein Wort hier)
- `alpha <= 128` → Pixel frei

### 2. board-Vor-Befüllung in `start()`

Nach der Sortier-Map der Wörter, vor der Layout-Schleife:

```js
if (maskCanvas) {
  var sw = size[0] >> 5;
  var mctx = maskCanvas.getContext('2d');
  var mw = maskCanvas.width, mh = maskCanvas.height;
  var imgData = mctx.getImageData(0, 0, mw, mh).data;
  var scaleX = mw / size[0], scaleY = mh / size[1];
  for (var by = 0; by < size[1]; by++) {
    var my = Math.floor(by * scaleY);
    var rowBase = by * sw;
    var dataRow = my * mw * 4;
    for (var bx = 0; bx < size[0]; bx++) {
      var mx = Math.floor(bx * scaleX);
      if (imgData[dataRow + mx * 4 + 3] > 128) {
        board[rowBase + (bx >> 5)] |= 1 << (bx & 31);
      }
    }
  }
}
```

Iteriert über alle Cloud-Pixel (typisch 1200×800 = 960k Pixel, ~50 ms one-shot), liest Mask-Alpha am skaliert-passenden Pixel, setzt das entsprechende Bit. Die Mask-Canvas darf eine andere Auflösung als das Layout haben (`scaleX/scaleY` interpolieren).

### 3. Bounds-Beschränkung bei aktiver Maske lockern (Phase 5, 2026-05-31)

In `place(board, tag, bounds)`, die Akzeptanz-Bedingung für eine Platzierungs-Position:

```js
// vorher:
if (!bounds || collideRects(tag, bounds)) {
// nachher:
if (!bounds || maskCanvas || collideRects(tag, bounds)) {
```

**Warum:** d3-cloud platziert jedes Wort (außer dem ersten) nur dort, wo es die **Bounding-Box aller bisher gesetzten Wörter** überlappt (`collideRects(tag, bounds)`). Das hält normale Wolken kompakt, lässt aber die Wolke als **einen einzigen zusammenhängenden Klumpen** wachsen. Bei einer Maske mit **mehreren getrennten Regionen** (z.B. ein zweiteiliges Buch-Icon, getrennt durch einen blockierten Mittelsteg) füllt sich dann nur die Region, in der das erste Wort landet — der Rest meldet „passte nicht in die Fläche". Welche Region gefüllt wird, hängt am Seed.

Bei aktiver Maske (`maskCanvas` truthy) wird die bounds-Überlappung übersprungen: die Maske begrenzt die Platzierung ohnehin auf die Form, die bounds-Kompaktierung ist überflüssig. Folge: Wörter füllen **alle** freien Regionen der Maske. Verifiziert: zweiteiliges Buch füllt beide Seiten (39 statt 16 Wörter), einteilige Maske (Herz) füllt weiter ausgewogen (kein Regress). Ohne Maske: `maskCanvas` ist null → Bedingung unverändert → null Effekt.

`maskCanvas` ist im selben `cloud()`-Closure deklariert wie `place` → direkt zugänglich.

### 4. Schwerstes Wort zentrieren (Phase 5, 2026-05-31) — nicht mask-bezogen

In `step()`, beim Setzen der Start-Position jedes Worts:

```js
// vorher:
d.x = (size[0] * (random() + .5)) >> 1;
d.y = (size[1] * (random() + .5)) >> 1;
// nachher:
if (i === 0) { d.x = size[0] >> 1; d.y = size[1] >> 1; }   // i===0 = schwerstes (data nach Größe sortiert)
else { d.x = (size[0] * (random() + .5)) >> 1; d.y = (size[1] * (random() + .5)) >> 1; }
```

**Warum:** d3-cloud startet jedes Wort (auch das größte, das zuerst platziert wird) an einer **zufälligen** Position im mittleren Bereich (`(size*(random()+.5))>>1` = 25–75 % der Breite) → das Hauptwort sitzt selten mittig. Der Patch setzt nur das erste (schwerste) Wort auf die exakte Mitte; alle weiteren bleiben zufällig (organisches Layout). Angleichung an wordcloud2 (das zentral startet). `i===0` ist das schwerste Wort, weil `data` zuvor nach Größe absteigend sortiert wird.

## Performance-Folgen

- **Ohne Mask** (also `cloud.mask()` nie aufgerufen, `maskCanvas` bleibt null): `if (maskCanvas)` ist `false`, der Patch hat **null Effekt**. Keine Regression möglich.
- **Mit Mask** (1200×800): ~50 ms zusätzliche Setup-Zeit. Bei den realistischen Wortmengen unserer App (<200 Wörter, ~200–500 ms Gesamt-Layout) im einstelligen Prozent-Bereich.

## Re-Apply bei Vendor-Update

Wenn d3-cloud auf z.B. v1.3.x aktualisiert wird:

```bash
# 1. Neues Original holen
curl -L -o vendor/d3-cloud.js https://cdn.jsdelivr.net/npm/d3-cloud@<NEUE_VERSION>/build/d3.layout.cloud.js

# 2. Patch anwenden
cd /Users/alexandererben/Tresors/Büro/Claude/wordcloud
patch -p1 < docs/vendor-patches/d3-cloud-mask.patch
```

Falls `patch` wegen geänderter Zeilennummern fehlschlägt: die **drei** Stellen sind mit `// PATCH (Wordcloud-Generator Phase 4)` (Mask-Setter + board-Vorbefüllung) bzw. `// PATCH (Wordcloud-Generator Phase 5)` (bounds-Lockerung in `place`) markiert — manuell einfügen ist auch unter 5 Minuten zu machen. Die einzige Kontext-Voraussetzung im Original-Code:
- Variable `cloud = {}` und `canvas = cloudCanvas` müssen noch deklariert werden
- `cloud.start = function() {` muss noch das `board = zeroArray(...)` als lokale Variable haben
- die Wort-Sortier-Map (`.map(...).sort(...)`) muss noch vor `if (timer) clearInterval(timer)` stehen
- `place()` muss noch die Bedingung `if (!bounds || collideRects(tag, bounds))` enthalten (Phase-5-Patch ergänzt `|| maskCanvas`)

Die Datei [`d3-cloud-mask.patch`](./d3-cloud-mask.patch) enthält **alle drei Hunks** (2× Phase 4 + 1× Phase 5) und wurde per Round-Trip gegen das v1.2.9-Original verifiziert: `patch -p1` auf das frische Original erzeugt bitgleich unsere gepatchte `vendor/d3-cloud.js`.

Wenn d3-cloud seine interne Architektur grundlegend ändert (z.B. `board` durch andere Kollisions-Datenstruktur ersetzt), wäre der Patch **nicht mehr direkt anwendbar** — dann müsste neu evaluiert werden, ob/wie eine Mask-Vor-Belegung geht.

## Sanity-Test nach Re-Apply

1. Build: `./build.sh`
2. App im Browser öffnen, Theme laden
3. Form/Maske → Herz wählen → Generieren
4. Erwartung: Wörter füllen die Herzform, „N of M words placed (rest did not fit)"-Meldung sichtbar
5. Form/Maske → keine → Generieren
6. Erwartung: Wörter füllen normales Rechteck, alle platziert
7. (Phase-5-Patch) Mehrteilige SVG einfügen (z.B. zweiteiliges Buch-Icon) → Generieren → Erwartung: **beide** Regionen füllen sich. Ohne den Phase-5-Patch füllt sich nur eine Seite.

Falls der Patch korrekt sitzt, ist Schritt 4 herzförmig. Falls nicht: Schritt 4 zeigt ein normales Rechteck, weil `maskCanvas` zwar gesetzt wurde aber nicht gelesen wird.

## Warum nicht ein „mask"-Branch in einer Fork-Repo?

Wäre die saubere Open-Source-Lösung, ist aber Overkill für ein selbst-deploytes Single-Page-Tool. Der Patch ist ~75 Zeilen an markierten Stellen (3× mask-bezogen + 1× Hauptwort-Zentrierung + Phase-6-Pin-Support), und Re-Apply ist trivial. Falls das Tool jemals upstream-Beiträge motiviert, wäre der Patch der natürliche Startpunkt für einen Pull-Request gegen `jasondavies/d3-cloud`.

## Phase-6-Patch: gepinnte Wörter (`cloud.pinned`)

Für die Per-Wort-Positionierung (Feature 2b): Wörter mit Fixposition.

- Neue Modul-Var `pinnedWords = []` + Setter `cloud.pinned(_)` (neben `cloud.mask`).
- In `cloud.start()`, **nach** dem Masken-Board-Prefill und **vor** `setInterval(step)`: für jedes Pin-Wort ein Tag bauen, `cloudSprite(...)` (Sprite + BBox messen), Position `d.x = pin.x + size/2` (mittenrelative Layout-Koords → Board-Koords), Sprite-Bits **ins Board schreiben** (Bit-Logik **identisch** zum Erfolgszweig von `place()`, nur **ohne** `cloudCollide`-Prüfung → Überlappung erlaubt; In-Bounds-Guard wie `place()` gegen Out-of-Range), in `tags` pushen, `bounds` updaten, `d.x/d.y` zurück auf zentriert.
- Die freien Wörter (`cloud.words()`) laufen danach normal und weichen den belegten Pin-Zellen aus (über `cloudCollide` gegen das Board). `placed` (bei `'end'`) enthält Pins + freie Wörter.
- App-Seite: gepinnte Einträge (`entry.pin = {x,y,rotate}`) → Fix-Liste an `cloud.pinned()`, freie an `cloud.words()`. „Reflow" = re-render mit gleichem Seed.

**Round-Trip-Test:** `cloud.pinned([{text:'X', font:'Impact', size:80, rotate:0, padding:2, x:0, y:0}])` setzen → das Wort sitzt mittig fix, alle anderen weichen aus. Ohne den Phase-6-Patch ist `cloud.pinned` undefiniert (TypeError).
