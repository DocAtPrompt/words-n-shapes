(function (W) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COLOR_AUTO = 'auto';
  const FONT_AUTO = 'auto';
  // Mögliche Werte für group.paletteMode
  const PALETTE_MODE_AUTO = 'auto';
  const PALETTE_MODE_COLOR = 'color';
  const PALETTE_MODE_GRADIENT = 'gradient';
  // Default-Verlauf für neue Gruppen, bis der User eigene Werte setzt
  const DEFAULT_GROUP_GRADIENT = { from: '#ff006e', via: '#888888', to: '#00d4ff', useVia: false };

  // Phase-4-Defaults (Engine, Maske, Rotation, wordcloud2-Optionen).
  // Werden in state.engine/mask/wc2 gehalten und in Snapshot persistiert.
  // (rotDistribution lebt ausschließlich im DOM via #cfg-rot-distribution, siehe
  // State-vs-DOM-Block über const state = {)
  const DEFAULT_ENGINE = 'd3-cloud';
  const VALID_ENGINES = ['d3-cloud', 'wordcloud2'];
  const DEFAULT_GROUP_ROTATION = {
    mode: 'auto',                  // 'auto' = folgt globaler Rotation; sonst einer der 12 Presets
    rotMin: -45, rotMax: 45,
    rotShare: 30,
    rotDistribution: 'random',
  };
  const DEFAULT_WC2 = {
    gridSize: 8,
    ellipticity: 0.65,
    shrinkToFit: false,
    useNativeShapes: true,
  };

  // Standard-Rendergröße — gilt als Default für Width/Height-Inputs und als
  // Bezugsfläche für die Auto-Skalierung der Fontgröße beim Preset-Wechsel.
  const DEFAULT_RENDER_SIZE = { width: 1200, height: 800 };
  // Stroke-Width des Vorschau-Rahmens (makeBoundsRect) skaliert mit Breite / Divisor.
  const BOUNDS_STROKE_DIVISOR = 600;

  const ALL_STOPWORDS = new Set([
    ...(W.stopwordsDE || []),
    ...(W.stopwordsEN || [])
  ]);

  const FONT_GROUPS = [
    { group: 'Systemfonts', i18nKey: 'fontgroup.system', items: [
      { value: 'Impact, sans-serif',                       label: 'Impact' },
      { value: 'Georgia, serif',                           label: 'Georgia' },
      { value: 'Helvetica, Arial, sans-serif',             label: 'Helvetica' },
      { value: '"Times New Roman", Times, serif',          label: 'Times' },
      { value: '"Courier New", Courier, monospace',        label: 'Courier' },
      { value: 'sans-serif',                               label: 'sans-serif' },
      { value: 'serif',                                    label: 'serif' },
      { value: 'monospace',                                label: 'monospace' }
    ]},
    { group: 'Mitgelieferte WebFonts', i18nKey: 'fontgroup.web', items: [
      { value: '"Pacifico", cursive',                      label: 'Pacifico' },
      { value: '"Lobster", cursive',                       label: 'Lobster' },
      { value: '"Bebas Neue", sans-serif',                 label: 'Bebas Neue' },
      { value: '"Playfair Display", serif',                label: 'Playfair Display' },
      { value: '"Anton", sans-serif',                      label: 'Anton' },
      { value: '"Fjalla One", sans-serif',                 label: 'Fjalla One' },
      { value: '"Caveat", cursive',                        label: 'Caveat' },
      { value: '"Permanent Marker", cursive',              label: 'Permanent Marker' },
      { value: '"Press Start 2P", monospace',              label: 'Press Start 2P' },
      { value: '"Cinzel", serif',                          label: 'Cinzel' },
      { value: '"Special Elite", monospace',               label: 'Special Elite' },
      { value: '"Shadows Into Light", cursive',            label: 'Shadows Into Light' },
      { value: '"Architects Daughter", cursive',           label: 'Architects Daughter' },
      { value: '"Crimson Text", serif',                    label: 'Crimson Text' },
      { value: '"Roboto Slab", serif',                     label: 'Roboto Slab' },
      { value: '"Righteous", sans-serif',                  label: 'Righteous' },
      { value: '"Russo One", sans-serif',                  label: 'Russo One' }
    ]}
  ];

  // ============ State ============

  // ============ i18n ============
  const I18N = {
    de: {
      'app.title':        'Words-N-Shapes',
      'meta.description': 'Wortwolken in Form bringen — Wörter füllen Maskenformen, ganz im Browser.',
      'input.heading': 'Eingabe',
      'input.template.label': 'Vorlage laden:',
      'input.template.empty': '— eigene Eingabe —',
      'input.addEntry': '+ Eintrag',
      'input.fillFromText': '+ aus Text befüllen…',
      'input.importCsv': 'CSV importieren',
      'input.exportCsv': 'CSV exportieren',
      'input.clearList': 'Liste leeren',
      'tooltip.listEmpty': 'Wortliste ist bereits leer.',
      'table.header.word': 'Wort',
      'table.header.weight': 'Gewicht',
      'table.header.group': 'Gruppe',
      'table.empty': 'Keine Einträge — über die Knöpfe oben hinzufügen.',
      'groups.heading': 'Gruppen',
      'groups.new': '+ Neue Gruppe',
      'groups.clearAll': 'Alle leeren',
      'tooltip.groupsOnlyOne': 'Nur eine Gruppe übrig — nichts zu leeren.',
      'storage.heading': 'Meine Kreationen',
      'storage.subtitle': 'Slots leben im Browser · JSON-Dateien sind portabel',
      'storage.currentRender': 'Aktueller Render:',
      'storage.downloadHint': 'Aktuelle Vorschau als Bild herunterladen:',
      'storage.exportSvg': 'SVG herunterladen',
      'storage.exportSvg.title': 'Aktuelle Vorschau als SVG-Vektorgrafik speichern',
      'storage.exportPng': 'PNG herunterladen',
      'storage.exportPng.title': 'Aktuelle Vorschau als PNG-Pixelbild speichern',
      'storage.copyImage':       'Bild kopieren',
      'storage.copyImage.title': 'Aktuelle Vorschau als PNG in die Zwischenablage kopieren',
      'msg.imageCopied':         'In Zwischenablage kopiert ✓',
      'msg.copyFailed':          'Kopieren nicht möglich — nutze stattdessen „PNG herunterladen".',
      'storage.saveSlot': '+ Speichern',
      'storage.saveSlot.title': 'Aktuellen Stand als neuen Slot speichern',
      'storage.importJson': 'JSON importieren',
      'storage.importJson.title': 'Aus .wcloud.json-Datei laden',
      'storage.exportJson': 'JSON exportieren',
      'storage.exportJson.title': 'Aktuellen Stand als .wcloud.json speichern',
      'storage.empty': 'Noch keine gespeicherten Kreationen.',
      'storage.action.load': 'Laden',
      'storage.action.rename': 'Umbenennen',
      'storage.action.duplicate': 'Dup',
      'storage.action.delete.title': 'Slot löschen',
      'config.heading': 'Einstellungen',
      'config.filters': 'Befüll-Filter',
      'config.filters.hint': ' (wirken beim „aus Text befüllen")',
      'config.stopwords': 'Stopwörter aktiv (DE+EN)',
      'config.customStopwords': 'Zusätzlich ausschließen:',
      'config.customStopwords.placeholder': 'komma- oder zeilengetrennt',
      'config.minCount': 'Mindesthäufigkeit:',
      'config.minLength': 'Mindestlänge:',
      'config.colorBg': 'Farbe & Hintergrund',
      'config.effect': 'Effekt',
      'config.effect.none': 'Keiner',
      'config.effect.shadow': 'Schatten',
      'config.effect.glow': 'Glühen',
      'config.effect.color': 'Farbe',
      'config.effect.strength': 'Stärke',
      'config.effect.engineHint': 'Effekte nur mit d3-cloud.',
      'config.palette': 'Palette:',
      'config.paletteCustomLabel': 'Custom (modifiziert)',
      'config.paletteGradientLabel': 'Verlauf (von bis)',
      'config.currentPalette': 'Aktuelle Palette · Klick auf Tafel: Farbe wählen · × leert · Drag & Drop sortiert',
      'config.clearAll': 'Alle leeren',
      'config.paletteFromImage':       'Palette aus Bild',
      'config.paletteFromImage.title': 'Farbpalette aus einem Bild extrahieren (8 Farben)',
      'msg.paletteFromImage':          'Palette aus Bild übernommen ({n} Farben).',
      'msg.paletteImageFailed':        'Keine Farben aus dem Bild gewinnbar.',
      'config.gradient.label': 'Verlauf von → (via) → bis',
      'config.gradient.useVia': 'Via-Farbe verwenden',
      'config.gradient.wordHigh': 'wichtigstes Wort',
      'config.gradient.wordLow': 'unwichtigstes Wort',
      'config.bg.canvas': 'Fläche:',
      'config.bg.form': 'Form:',
      'config.bg.transparent': 'transparent',
      'config.bg.white': 'weiß',
      'config.bg.black': 'schwarz',
      'config.bg.custom': 'custom',
      'config.font': 'Schrift',
      'config.font.label': 'Font:',
      'config.scale': 'Skalierung:',
      'config.scale.sqrt': 'sqrt (Standard)',
      'config.scale.linear': 'linear',
      'config.scale.log': 'log',
      'config.sizeMin': 'Min. Größe (px):',
      'config.sizeMax': 'Max. Größe (px):',
      'config.rotLayout': 'Rotation & Layout',
      'config.rotMode': 'Modus:',
      'config.rotMode.group.singleH': '— nur waagerecht —',
      'config.rotMode.group.skew':    '— mit einer Schräge / Vertikale —',
      'config.rotMode.group.sym':     '— symmetrisch —',
      'config.rotMode.group.steps':   '— diskrete Stufen —',
      'config.rotMode.group.free':    '— frei —',
      'config.rotMode.horizontal': 'nur waagerecht',
      'config.rotMode.h+up45':     'waagerecht + ⤴ 45°',
      'config.rotMode.h+down45':   'waagerecht + ⤵ -45°',
      'config.rotMode.h+up90':     'waagerecht + ↑ 90°',
      'config.rotMode.h+down90':   'waagerecht + ↓ -90°',
      'config.rotMode.cross-45':   'X-Form (±45°)',
      'config.rotMode.cross-90':   'T-Form (±90°)',
      'config.rotMode.diagonal':   'diagonal (±45°)',
      'config.rotMode.steps-15':   '15°-Stufen',
      'config.rotMode.steps-30':   '30°-Stufen',
      'config.rotMode.steps-45':   '45°-Stufen',
      'config.rotMode.free':       'freie Winkel',
      'config.rotMin': 'Min Winkel (°):',
      'config.rotMax': 'Max Winkel (°):',
      'config.rotShare': 'Anteil rotiert (%):',
      'config.rotDistribution': 'Verteilung:',
      'config.rotDistribution.random':   'zufällig',
      'config.rotDistribution.heaviest': 'nur die schwersten',
      'config.rotDistribution.lightest': 'nur die leichtesten',
      'config.rotMinMax.disabledTip': 'Min/Max wirken nur bei „freien Winkeln".',
      'config.padding': 'Padding (px):',
      'config.spiral': 'Spirale:',
      'config.spiral.archimedean': 'archimedisch',
      'config.spiral.rectangular': 'rechteckig',
      'config.engineHeading': 'Engine',
      'config.engine.d3-cloud':   'd3-cloud (Standard, Spiralalgorithmus)',
      'config.engine.wordcloud2': 'wordcloud2.js (mehr Formen, Canvas-basiert)',
      'config.wc2.gridSize':    'Raster-Auflösung:',
      'config.wc2.ellipticity': 'Stauchung:',
      'config.wc2.shrinkToFit': 'Bei Platzmangel verkleinern',
      'config.wc2.useNativeShapes':      'Native Formen verwenden',
      'config.wc2.useNativeShapes.hint': 'Bei diesen Formen nutzt wordcloud2 seine analytische Berechnung statt der SVG-Silhouette: Kreis, Raute, Dreieck, Dreieck (rechts), Stern, Pentagon. Schneller, leicht andere Geometrie.',
      'config.wc2.note':        'SVG-Export, Per-Gruppe-Rotation und Per-Gruppe-Padding sind bei wordcloud2 nicht verfügbar.',
      'config.maskHeading': 'Form / Maske',
      'config.mask.none': 'keine (Rechteck)',
      'config.mask.slug': 'eingebaute Form',
      'config.mask.svg':  'Eigene Form: SVG oder Bild',
      'config.mask.upload':     'Datei wählen…',
      'config.mask.uploadHint': 'Max. 100 KB. Inhalt: gefüllte Form auf transparentem Hintergrund (sonst wird die Form als „Negativ" interpretiert).',
      'config.mask.remove':     'Entfernen',
      'config.mask.svgIntro':       'Eigenes SVG als Maske. Tipp: auf einer Icon-Seite ein gefülltes Icon wählen → „SVG kopieren" → unten einfügen.',
      'config.mask.svgOutlineWarn': 'Outline-Icons (nur Kontur) taugen nicht als Maske — die Vorschau zeigt sofort, ob die Form trägt.',
      'config.mask.svgSources':     'Quellen:',
      'config.mask.svgLicenseNote': 'ⓘ Selbst geladene Icons unterliegen den Lizenzen ihrer Quelle — bitte beachten.',
      'config.mask.paste':          'Aus Zwischenablage einfügen',
      'config.mask.pasteAreaHint':  'Hier klicken und mit ⌘V / Strg+V einfügen',
      'mask.pastedLabel':           '(eingefügt)',
      'config.mask.invert':         'Invertieren (hell/dunkel tauschen)',
      'config.mask.imageHint':      'Oder ein Bild (PNG/JPG): gefülltes, kontrastreiches Motiv — helle Fläche = außen. Foto/Scan wird per Helligkeit getrennt; bei falscher Richtung „Invertieren".',
      'msg.svgTooLarge':  'SVG zu groß ({size} KB) — max. {max} KB.',
      'msg.svgInvalid':   'Datei ist kein gültiges SVG.',
      'msg.clipboardDenied': 'Zwischenablage konnte nicht gelesen werden. Tipp: ins Einfügefeld klicken und mit ⌘V / Strg+V einfügen.',
      'msg.clipboardEmpty':  'Zwischenablage enthält keinen Text.',
      'msg.clipboardImageHint': 'Bild erkannt — bitte ins Einfügefeld klicken und mit ⌘V / Strg+V einfügen.',
      'msg.imageTooLarge':      'Bild zu groß ({size} MB) — max. {max} MB.',
      'msg.imageInvalid':       'Datei ist kein lesbares Bild.',
      'mask.slug.circle':           'Kreis',
      'mask.slug.diamond':          'Raute',
      'mask.slug.triangle':         'Dreieck',
      'mask.slug.triangle-forward': 'Dreieck (rechts)',
      'mask.slug.pentagon':         'Pentagon',
      'mask.slug.hexagon':          'Hexagon',
      'mask.slug.star':             'Stern',
      'mask.slug.heart':            'Herz',
      'mask.slug.cloud':            'Wolke',
      'mask.slug.leaf':             'Blatt',
      'mask.slug.tree':             'Baum',
      'mask.slug.flower':           'Blüte',
      'mask.slug.bird':             'Vogel',
      'mask.slug.butterfly':        'Schmetterling',
      'mask.slug.paw':              'Pfote',
      'mask.slug.mountain':         'Berg',
      'mask.slug.house':            'Haus',
      'mask.slug.speech':           'Sprechblase',
      'mask.slug.apple':            'Apfel',
      'mask.slug.cup':              'Tasse',
      'mask.slug.suitcase':         'Koffer',
      'mask.slug.bulb':             'Glühbirne',
      'mask.slug.gear':             'Zahnrad',
      'mask.slug.donut':            'Donut',
      'config.rendering': 'Rendering',
      'config.preset': 'Preset:',
      'config.preset.format32': '1200×800 — Querformat 3:2',
      'config.preset.square': '1080×1080 — Instagram-Post (quadratisch)',
      'config.preset.fullhd': '1920×1080 — Full HD',
      'config.preset.a4p': '2480×3508 — A4 Hochformat',
      'config.preset.a4l': '3508×2480 — A4 Querformat',
      'config.preset.story':     '1080×1920 — Story/Reel/TikTok',
      'config.preset.pinterest': '1000×1500 — Pinterest',
      'config.preset.fblink':    '1200×630 — Facebook/LinkedIn-Link',
      'config.preset.youtube':   '1280×720 — YouTube-Thumbnail',
      'config.preset.group.standard': 'Standard',
      'config.preset.group.social':   'Social Media',
      'config.preset.custom': 'Custom…',
      'config.width': 'Breite (px):',
      'config.height': 'Höhe (px):',
      'config.pngScale': 'PNG-Auflösung:',
      'ui.generate': 'Generieren',
      'ui.reroll': '🎲 Neue Anordnung',
      'ui.reroll.title': 'Neue zufällige Anordnung — alle Wörter werden anders platziert',
      'seedNav.undo.title': 'Vorherigen Seed laden (Cmd/Ctrl+Z)',
      'seedNav.redo.title': 'Nächsten Seed laden (Cmd/Ctrl+Shift+Z)',
      'ui.autoUpdate': 'Live-Update bei Änderungen',
      'ui.autoUpdate.title': 'Bei Konfig-Änderung automatisch neu rendern (kann bei vielen Wörtern laggen)',
      'preview.heading': 'Vorschau',
      'fill.heading': 'Aus Text befüllen',
      'fill.target': 'Zielgruppe:',
      'fill.mode': 'Modus:',
      'fill.mode.freitext': 'Freitext (tokenisieren + zählen)',
      'fill.mode.csv': 'Wort+Gewicht-Liste (CSV)',
      'fill.text': 'Text:',
      'fill.text.placeholder': 'Hier Text einfügen…',
      'fill.cancel': 'Abbrechen',
      'fill.apply': 'Auswerten & hinzufügen',
      'groupEdit.heading': 'Gruppe bearbeiten',
      'groupEdit.name': 'Name:',
      'groupEdit.color': 'Farbe:',
      'groupEdit.colorAuto': 'auf „auto" zurücksetzen',
      'groupEdit.colorHeading': 'Farbe der Gruppe:',
      'groupEdit.mode.auto': 'Automatisch (folgt globaler Palette)',
      'groupEdit.mode.color': 'Einzelfarbe',
      'groupEdit.mode.gradient': 'Verlauf (innerhalb der Gruppe)',
      'groupEdit.gradient.useVia': 'Via-Farbe verwenden',
      'groupEdit.font': 'Font:',
      'groupEdit.rotHeading': 'Rotation der Gruppe:',
      'groupEdit.rot.auto': 'Automatisch (folgt globaler Rotation)',
      'groupEdit.sizeFactor': 'Größenfaktor:',
      'groupEdit.paddingBonus': 'Padding-Bonus (px):',
      'groupEdit.paddingHint.wc2': 'Per-Gruppe-Padding wird von wordcloud2 nicht unterstützt — gilt nur bei d3-cloud-Engine.',
      'groupEdit.rotHint.wc2': 'Per-Gruppe-Rotation greift bei wordcloud2 nicht — globale Rotation gilt.',
      'groupEdit.delete': 'Gruppe löschen',
      'groupEdit.close': 'Schließen',
      'fontgroup.system': 'Systemfonts',
      'fontgroup.web': 'Mitgelieferte WebFonts',
      'fontgroup.google': 'Google Fonts',
      'config.googleFonts': 'Google Fonts',
      'config.googleFonts.hint': ' (Internet erforderlich)',
      'config.googleFonts.offline': 'offline',
      'config.googleFonts.enable': 'Google Fonts aktivieren',
      'config.googleFonts.placeholder': 'Font-Name (z.B. Sacramento, Lora, Fira Sans)',
      'config.googleFonts.add': '+ Hinzufügen',
      'config.googleFonts.note': 'Eingegebene Namen wie auf fonts.google.com geschrieben. Beim Hinzufügen wird der Font geladen und im Font-Dropdown verfügbar.',
      'gf.status.loading': 'wird geladen…',
      'gf.status.ready': 'geladen',
      'gf.status.failed': 'fehlgeschlagen — offline?',
      'gf.tooltip.remove': 'Font entfernen',
      'msg.gfDuplicate': 'Font „{name}" ist bereits hinzugefügt.',
      'msg.gfLoaded': 'Google Font „{name}" geladen.',
      'msg.gfFailed': 'Google Font „{name}" konnte nicht geladen werden (offline?).',
      'auto': 'auto',
      'msg.ready': 'Bereit. Über „+ aus Text befüllen…" oder „+ Eintrag" Wörter hinzufügen.',
      'msg.d3Failed': 'd3-cloud konnte nicht geladen werden.',
      'msg.layoutRunning': 'Layout läuft bereits, bitte warten.',
      'msg.layoutCalc': 'Layout wird berechnet ({n} Wörter)…',
      'msg.layoutStatus': 'Layout läuft…',
      'msg.placed': '{n} Wörter platziert.',
      'a11y.cloudLabel': 'Wortwolke aus {n} Wörtern',
      'preview.zoomIn': 'Vergrößern',
      'preview.zoomOut': 'Verkleinern',
      'preview.fitForm': 'Ganze Form',
      'preview.toggleGuides': 'Silhouette',
      'preview.toggleGuides.title': 'Platzhalter-Silhouette ein-/ausblenden',
      'preview.viewTools': 'Ansicht',
      'selWord.color': 'Farbe',
      'selWord.auto': 'Auto',
      'selWord.unpin': 'Pin lösen',
      'selWord.rotation': 'Drehung',
      'selWord.countSelected': '{n} ausgewählt',
      'preview.arrange': 'Anordnen',
      'preview.arrange.title': 'Freie Wörter um die Pins anordnen',
      'msg.placedPartial': '{n} von {total} Wörtern platziert (Rest passte nicht in die Fläche).',
      'msg.layoutFailed': 'Layout konnte keine Wörter platzieren — versuche kleinere Größen oder weniger Wörter.',
      'msg.noWords': 'Keine Wörter zum Rendern.',
      'msg.noEntries': 'Keine gültigen Einträge — bitte erst Wörter hinzufügen.',
      'msg.sizeError': 'Min. Größe muss kleiner als Max. Größe sein.',
      'msg.generateFirst': 'Erst Wordcloud generieren.',
      'msg.pngFailed': 'PNG-Export fehlgeschlagen.',
      'msg.pngRasterFailed': 'PNG-Export fehlgeschlagen (SVG konnte nicht gerastert werden).',
      'msg.svgUnavailableCanvas': 'SVG-Export ist mit der wordcloud2-Engine nicht verfügbar (Canvas-basiert). Nutze stattdessen den PNG-Export oder wechsle auf d3-cloud.',
      'msg.fillEmpty': 'Befüllung leer — bitte Text einfügen.',
      'msg.entriesAdded': '{n} Einträge hinzugefügt.',
      'msg.entriesImported': '{n} Einträge importiert.',
      'msg.themeLoaded': 'Thema „{name}" geladen ({count} Einträge in Gruppe „{group}").',
      'msg.fileLoaded': 'Datei in Gruppe „{group}" geladen: {name} ({len} Zeichen).',
      'msg.fileError': 'Datei konnte nicht gelesen werden: {msg}',
      'msg.snapshotIncompat': 'Datenformat unbekannt oder Version inkompatibel.',
      'msg.slotFull': 'Speichern fehlgeschlagen (LocalStorage voll?): {msg}',
      'msg.slotReadError': 'Slot konnte nicht gelesen werden.',
      'msg.slotNotFound': 'Slot nicht gefunden.',
      'msg.slotLoaded': 'Slot „{name}" geladen.',
      'msg.slotSaved': 'Slot „{name}" gespeichert.',
      'msg.slotDuplicated': 'Slot dupliziert.',
      'msg.jsonExported': 'Stand als JSON exportiert.',
      'msg.jsonImported': '„{name}" importiert und als Slot gespeichert.',
      'msg.jsonInvalid': 'Datei ist kein gültiges JSON.',
      'msg.csvParseError': 'CSV-Fehler in Zeile {line}: {detail}',
      'msg.csvError.UNCLOSED_QUOTE': 'Unbeendetes Anführungszeichen — bitte schließendes " ergänzen.',
      'msg.csvError.JUNK_AFTER_QUOTE': 'Unerwartete Zeichen nach schließendem Anführungszeichen — nach " sind nur Komma oder Zeilenende erlaubt.',
      'msg.csvSkipped': ' {total} Zeile(n) übersprungen (ungültiges Gewicht: {weight}, leeres Wort: {empty}).',
      'msg.listCleared': 'Wortliste geleert ({n} Einträge entfernt).',
      'msg.groupsCleared': '{n} Gruppe(n) entfernt — Einträge in „{default}" übernommen.',
      'confirm.clearList': 'Alle {n} Einträge entfernen? Gruppen bleiben erhalten.',
      'confirm.clearGroups': 'Alle {n} Gruppen außer „{default}" löschen? Einträge wandern in „{default}".',
      'prompt.newGroup': 'Name der neuen Gruppe:',
      'prompt.newGroup.default': 'Gruppe {n}',
      'prompt.renameGroup': 'Gruppe umbenennen:',
      'prompt.slotName': 'Name für diesen Slot:',
      'prompt.slotName.default': 'Wordcloud {date}',
      'prompt.renameSlot': 'Neuer Name:',
      'confirm.deleteGroup': 'Gruppe „{name}" löschen? Einträge dieser Gruppe werden der ersten anderen Gruppe zugeordnet.',
      'confirm.clearPalette': 'Alle Tafeln leeren?',
      'confirm.deleteSlot': 'Slot „{name}" wirklich löschen?',
      'group.tooltip.name': 'Klick: aktiv setzen. Doppelklick: umbenennen.',
      'group.tooltip.chip': 'Klick: bearbeiten (Name, Farbe, Font, Löschen)',
      'group.tooltip.delete': 'Gruppe löschen',
      'group.tooltip.delEntry': 'Eintrag entfernen',
      'slot.duplicate': '{name} (Kopie)',
      'palette.slot.clear': 'Tafel leeren',
      'credits.button':        'Credits & Lizenzen',
      'credits.heading':       'Credits & Lizenzen',
      'credits.intro':         'Dieser Wordcloud-Generator nutzt folgende Drittsoftware und Schriften:',
      'credits.vendors':       'Bibliotheken',
      'credits.d3CloudPatched':'— mit lokalem Patch für Maskenform-Support (inkl. mehrteilige Masken) und Per-Wort-Pinning',
      'credits.wc2Patched':    '— mit lokalem Patch für Seed-Reproduzierbarkeit',
      'credits.fonts':         'Schriften',
      'credits.fontsOfl':      '14 WebFonts unter SIL Open Font License 1.1: Pacifico, Lobster, Bebas Neue, Playfair Display, Anton, Fjalla One, Caveat, Press Start 2P, Cinzel, Shadows Into Light, Architects Daughter, Crimson Text, Righteous, Russo One.',
      'credits.fontsApache':   '3 WebFonts unter Apache License 2.0: Permanent Marker, Special Elite, Roboto Slab.',
      'credits.masks':         'Maskenformen',
      'credits.masksOwn':      '24 SVG-Silhouetten — Eigenerstellung, Public Domain (CC0-äquivalent).',
      'credits.masksLoaded':   'Selbst geladene oder eingefügte SVGs (z. B. aus Icon-Bibliotheken) unterliegen den Lizenzen ihrer jeweiligen Quelle und liegen in der Verantwortung des Nutzers.',
      'credits.about':         'Entwicklung',
      'credits.developed':     'Entwickelt mit Hilfe von Anthropic Claude (Claude Code).',
      'credits.licensesNote':  'Vollständige Lizenztexte: LICENSES/-Verzeichnis im Quellcode. Patch-Details (Änderungen an d3-cloud & wordcloud2): docs/vendor-patches/.',
      'credits.close':         'Schließen',
    },
    en: {
      'app.title':        'Words-N-Shapes',
      'meta.description': 'Shaping word clouds — words fill mask shapes, entirely in the browser.',
      'input.heading': 'Input',
      'input.template.label': 'Load template:',
      'input.template.empty': '— custom input —',
      'input.addEntry': '+ Entry',
      'input.fillFromText': '+ Fill from text…',
      'input.importCsv': 'Import CSV',
      'input.exportCsv': 'Export CSV',
      'input.clearList': 'Clear list',
      'tooltip.listEmpty': 'Word list is already empty.',
      'table.header.word': 'Word',
      'table.header.weight': 'Weight',
      'table.header.group': 'Group',
      'table.empty': 'No entries — add via the buttons above.',
      'groups.heading': 'Groups',
      'groups.new': '+ New group',
      'groups.clearAll': 'Clear all',
      'tooltip.groupsOnlyOne': 'Only one group left — nothing to clear.',
      'storage.heading': 'My creations',
      'storage.subtitle': 'Slots live in the browser · JSON files are portable',
      'storage.currentRender': 'Current render:',
      'storage.downloadHint': 'Download current preview as image:',
      'storage.exportSvg': 'Download SVG',
      'storage.exportSvg.title': 'Save current preview as SVG vector graphic',
      'storage.exportPng': 'Download PNG',
      'storage.exportPng.title': 'Save current preview as PNG raster image',
      'storage.copyImage':       'Copy image',
      'storage.copyImage.title': 'Copy the current preview as PNG to the clipboard',
      'msg.imageCopied':         'Copied to clipboard ✓',
      'msg.copyFailed':          'Could not copy — use "Download PNG" instead.',
      'storage.saveSlot': '+ Save',
      'storage.saveSlot.title': 'Save current state as new slot',
      'storage.importJson': 'Import JSON',
      'storage.importJson.title': 'Load from .wcloud.json file',
      'storage.exportJson': 'Export JSON',
      'storage.exportJson.title': 'Save current state as .wcloud.json',
      'storage.empty': 'No saved creations yet.',
      'storage.action.load': 'Load',
      'storage.action.rename': 'Rename',
      'storage.action.duplicate': 'Dup',
      'storage.action.delete.title': 'Delete slot',
      'config.heading': 'Settings',
      'config.filters': 'Fill filters',
      'config.filters.hint': ' (applied during „Fill from text")',
      'config.stopwords': 'Stop words active (DE+EN)',
      'config.customStopwords': 'Additionally exclude:',
      'config.customStopwords.placeholder': 'comma- or line-separated',
      'config.minCount': 'Minimum count:',
      'config.minLength': 'Minimum length:',
      'config.colorBg': 'Color & background',
      'config.effect': 'Effect',
      'config.effect.none': 'None',
      'config.effect.shadow': 'Shadow',
      'config.effect.glow': 'Glow',
      'config.effect.color': 'Color',
      'config.effect.strength': 'Strength',
      'config.effect.engineHint': 'Effects only with d3-cloud.',
      'config.palette': 'Palette:',
      'config.paletteCustomLabel': 'Custom (modified)',
      'config.paletteGradientLabel': 'Gradient (from to)',
      'config.currentPalette': 'Current palette · Click tile: choose color · × clears · Drag & Drop sorts',
      'config.clearAll': 'Clear all',
      'config.paletteFromImage':       'Palette from image',
      'config.paletteFromImage.title': 'Extract a color palette from an image (8 colors)',
      'msg.paletteFromImage':          'Palette extracted from image ({n} colors).',
      'msg.paletteImageFailed':        'Could not extract colors from the image.',
      'config.gradient.label': 'Gradient from → (via) → to',
      'config.gradient.useVia': 'Use via color',
      'config.gradient.wordHigh': 'most important word',
      'config.gradient.wordLow': 'least important word',
      'config.bg.canvas': 'Canvas:',
      'config.bg.form': 'Mask:',
      'config.bg.transparent': 'transparent',
      'config.bg.white': 'white',
      'config.bg.black': 'black',
      'config.bg.custom': 'custom',
      'config.font': 'Font',
      'config.font.label': 'Font:',
      'config.scale': 'Scaling:',
      'config.scale.sqrt': 'sqrt (default)',
      'config.scale.linear': 'linear',
      'config.scale.log': 'log',
      'config.sizeMin': 'Min size (px):',
      'config.sizeMax': 'Max size (px):',
      'config.rotLayout': 'Rotation & Layout',
      'config.rotMode': 'Mode:',
      'config.rotMode.group.singleH': '— horizontal only —',
      'config.rotMode.group.skew':    '— with a tilt / vertical —',
      'config.rotMode.group.sym':     '— symmetric —',
      'config.rotMode.group.steps':   '— discrete steps —',
      'config.rotMode.group.free':    '— free —',
      'config.rotMode.horizontal': 'horizontal only',
      'config.rotMode.h+up45':     'horizontal + ⤴ 45°',
      'config.rotMode.h+down45':   'horizontal + ⤵ -45°',
      'config.rotMode.h+up90':     'horizontal + ↑ 90°',
      'config.rotMode.h+down90':   'horizontal + ↓ -90°',
      'config.rotMode.cross-45':   'X-shape (±45°)',
      'config.rotMode.cross-90':   'T-shape (±90°)',
      'config.rotMode.diagonal':   'diagonal (±45°)',
      'config.rotMode.steps-15':   '15° steps',
      'config.rotMode.steps-30':   '30° steps',
      'config.rotMode.steps-45':   '45° steps',
      'config.rotMode.free':       'free angles',
      'config.rotMin': 'Min angle (°):',
      'config.rotMax': 'Max angle (°):',
      'config.rotShare': 'Rotated share (%):',
      'config.rotDistribution': 'Distribution:',
      'config.rotDistribution.random':   'random',
      'config.rotDistribution.heaviest': 'heaviest only',
      'config.rotDistribution.lightest': 'lightest only',
      'config.rotMinMax.disabledTip': 'Min/Max only apply for „free angles".',
      'config.padding': 'Padding (px):',
      'config.spiral': 'Spiral:',
      'config.spiral.archimedean': 'archimedean',
      'config.spiral.rectangular': 'rectangular',
      'config.engineHeading': 'Engine',
      'config.engine.d3-cloud':   'd3-cloud (default, spiral algorithm)',
      'config.engine.wordcloud2': 'wordcloud2.js (more shapes, canvas-based)',
      'config.wc2.gridSize':    'Grid resolution:',
      'config.wc2.ellipticity': 'Squashing:',
      'config.wc2.shrinkToFit': 'Shrink to fit',
      'config.wc2.useNativeShapes':      'Use native shapes',
      'config.wc2.useNativeShapes.hint': 'With these shapes, wordcloud2 uses its analytical calculation instead of the SVG silhouette: Circle, Diamond, Triangle, Triangle (right), Star, Pentagon. Faster, slightly different geometry.',
      'config.wc2.note':        'SVG export, per-group rotation and per-group padding are not available with wordcloud2.',
      'config.maskHeading': 'Shape / Mask',
      'config.mask.none': 'none (rectangle)',
      'config.mask.slug': 'built-in shape',
      'config.mask.svg':  'Own shape: SVG or image',
      'config.mask.upload':     'Choose file…',
      'config.mask.uploadHint': 'Max. 100 KB. Content: filled shape on transparent background (otherwise the shape is interpreted as a „negative").',
      'config.mask.remove':     'Remove',
      'config.mask.svgIntro':       'Use your own SVG as a mask. Tip: on an icon site pick a filled icon → "Copy SVG" → paste below.',
      'config.mask.svgOutlineWarn': 'Outline icons (stroke only) do not work as a mask — the preview shows immediately whether the shape holds.',
      'config.mask.svgSources':     'Sources:',
      'config.mask.svgLicenseNote': 'ⓘ Icons you load yourself are subject to the licenses of their source — please respect them.',
      'config.mask.paste':          'Paste from clipboard',
      'config.mask.pasteAreaHint':  'Click here and paste with ⌘V / Ctrl+V',
      'mask.pastedLabel':           '(pasted)',
      'config.mask.invert':         'Invert (swap light/dark)',
      'config.mask.imageHint':      'Or an image (PNG/JPG): a filled, high-contrast motif — light area = outside. Photos/scans are split by brightness; if the direction is wrong use "Invert".',
      'msg.svgTooLarge':  'SVG too large ({size} KB) — max. {max} KB.',
      'msg.svgInvalid':   'File is not a valid SVG.',
      'msg.clipboardDenied': 'Could not read the clipboard. Tip: click the paste field and use ⌘V / Ctrl+V.',
      'msg.clipboardEmpty':  'Clipboard contains no text.',
      'msg.clipboardImageHint': 'Image detected — please click the paste field and use ⌘V / Ctrl+V.',
      'msg.imageTooLarge':      'Image too large ({size} MB) — max. {max} MB.',
      'msg.imageInvalid':       'File is not a readable image.',
      'mask.slug.circle':           'Circle',
      'mask.slug.diamond':          'Diamond',
      'mask.slug.triangle':         'Triangle',
      'mask.slug.triangle-forward': 'Triangle (right)',
      'mask.slug.pentagon':         'Pentagon',
      'mask.slug.hexagon':          'Hexagon',
      'mask.slug.star':             'Star',
      'mask.slug.heart':            'Heart',
      'mask.slug.cloud':            'Cloud',
      'mask.slug.leaf':             'Leaf',
      'mask.slug.tree':             'Tree',
      'mask.slug.flower':           'Flower',
      'mask.slug.bird':             'Bird',
      'mask.slug.butterfly':        'Butterfly',
      'mask.slug.paw':              'Paw',
      'mask.slug.mountain':         'Mountain',
      'mask.slug.house':            'House',
      'mask.slug.speech':           'Speech bubble',
      'mask.slug.apple':            'Apple',
      'mask.slug.cup':              'Cup',
      'mask.slug.suitcase':         'Suitcase',
      'mask.slug.bulb':             'Light bulb',
      'mask.slug.gear':             'Gear',
      'mask.slug.donut':            'Donut',
      'config.rendering': 'Rendering',
      'config.preset': 'Preset:',
      'config.preset.format32': '1200×800 — landscape 3:2',
      'config.preset.square': '1080×1080 — Instagram post (square)',
      'config.preset.fullhd': '1920×1080 — Full HD',
      'config.preset.a4p': '2480×3508 — A4 portrait',
      'config.preset.a4l': '3508×2480 — A4 landscape',
      'config.preset.story':     '1080×1920 — Story/Reel/TikTok',
      'config.preset.pinterest': '1000×1500 — Pinterest',
      'config.preset.fblink':    '1200×630 — Facebook/LinkedIn link',
      'config.preset.youtube':   '1280×720 — YouTube thumbnail',
      'config.preset.group.standard': 'Standard',
      'config.preset.group.social':   'Social media',
      'config.preset.custom': 'Custom…',
      'config.width': 'Width (px):',
      'config.height': 'Height (px):',
      'config.pngScale': 'PNG resolution:',
      'ui.generate': 'Generate',
      'ui.reroll': '🎲 New arrangement',
      'ui.reroll.title': 'New random arrangement — all words placed differently',
      'seedNav.undo.title': 'Load previous seed (Cmd/Ctrl+Z)',
      'seedNav.redo.title': 'Load next seed (Cmd/Ctrl+Shift+Z)',
      'ui.autoUpdate': 'Live update on changes',
      'ui.autoUpdate.title': 'Auto-rerender on config change (may lag with many words)',
      'preview.heading': 'Preview',
      'fill.heading': 'Fill from text',
      'fill.target': 'Target group:',
      'fill.mode': 'Mode:',
      'fill.mode.freitext': 'Free text (tokenize + count)',
      'fill.mode.csv': 'Word+weight list (CSV)',
      'fill.text': 'Text:',
      'fill.text.placeholder': 'Paste text here…',
      'fill.cancel': 'Cancel',
      'fill.apply': 'Evaluate & add',
      'groupEdit.heading': 'Edit group',
      'groupEdit.name': 'Name:',
      'groupEdit.color': 'Color:',
      'groupEdit.colorAuto': 'reset to „auto"',
      'groupEdit.colorHeading': 'Group color:',
      'groupEdit.mode.auto': 'Automatic (follows global palette)',
      'groupEdit.mode.color': 'Single color',
      'groupEdit.mode.gradient': 'Gradient (within the group)',
      'groupEdit.gradient.useVia': 'Use via color',
      'groupEdit.font': 'Font:',
      'groupEdit.rotHeading': 'Group rotation:',
      'groupEdit.rot.auto': 'Automatic (follows global rotation)',
      'groupEdit.sizeFactor': 'Size factor:',
      'groupEdit.paddingBonus': 'Padding bonus (px):',
      'groupEdit.paddingHint.wc2': 'Per-group padding is not supported by wordcloud2 — only effective with d3-cloud engine.',
      'groupEdit.rotHint.wc2': 'Per-group rotation has no effect with wordcloud2 — global rotation applies.',
      'groupEdit.delete': 'Delete group',
      'groupEdit.close': 'Close',
      'fontgroup.system': 'System fonts',
      'fontgroup.web': 'Bundled web fonts',
      'fontgroup.google': 'Google Fonts',
      'config.googleFonts': 'Google Fonts',
      'config.googleFonts.hint': ' (requires internet)',
      'config.googleFonts.offline': 'offline',
      'config.googleFonts.enable': 'Enable Google Fonts',
      'config.googleFonts.placeholder': 'Font name (e.g. Sacramento, Lora, Fira Sans)',
      'config.googleFonts.add': '+ Add',
      'config.googleFonts.note': 'Type names as on fonts.google.com. Adding loads the font and makes it available in the font dropdown.',
      'gf.status.loading': 'loading…',
      'gf.status.ready': 'loaded',
      'gf.status.failed': 'failed — offline?',
      'gf.tooltip.remove': 'Remove font',
      'msg.gfDuplicate': 'Font „{name}" is already added.',
      'msg.gfLoaded': 'Google Font „{name}" loaded.',
      'msg.gfFailed': 'Google Font „{name}" could not be loaded (offline?).',
      'auto': 'auto',
      'msg.ready': 'Ready. Use „+ Fill from text…" or „+ Entry" to add words.',
      'msg.d3Failed': 'd3-cloud could not be loaded.',
      'msg.layoutRunning': 'Layout already running, please wait.',
      'msg.layoutCalc': 'Calculating layout ({n} words)…',
      'msg.layoutStatus': 'Layout running…',
      'msg.placed': '{n} words placed.',
      'a11y.cloudLabel': 'Word cloud of {n} words',
      'preview.zoomIn': 'Zoom in',
      'preview.zoomOut': 'Zoom out',
      'preview.fitForm': 'Fit form',
      'preview.toggleGuides': 'Silhouette',
      'preview.toggleGuides.title': 'Toggle placeholder silhouette',
      'preview.viewTools': 'View',
      'selWord.color': 'Color',
      'selWord.auto': 'Auto',
      'selWord.unpin': 'Unpin',
      'selWord.rotation': 'Rotation',
      'selWord.countSelected': '{n} selected',
      'preview.arrange': 'Arrange',
      'preview.arrange.title': 'Arrange free words around the pins',
      'msg.placedPartial': '{n} of {total} words placed (rest did not fit).',
      'msg.layoutFailed': 'Layout could not place words — try smaller sizes or fewer words.',
      'msg.noWords': 'No words to render.',
      'msg.noEntries': 'No valid entries — please add words first.',
      'msg.sizeError': 'Min size must be smaller than max size.',
      'msg.generateFirst': 'Generate wordcloud first.',
      'msg.pngFailed': 'PNG export failed.',
      'msg.pngRasterFailed': 'PNG export failed (SVG could not be rasterized).',
      'msg.svgUnavailableCanvas': 'SVG export is not available with the wordcloud2 engine (canvas-based). Use PNG export instead, or switch to d3-cloud.',
      'msg.fillEmpty': 'Fill empty — please insert text.',
      'msg.entriesAdded': '{n} entries added.',
      'msg.entriesImported': '{n} entries imported.',
      'msg.themeLoaded': 'Theme „{name}" loaded ({count} entries in group „{group}").',
      'msg.fileLoaded': 'File loaded into group „{group}": {name} ({len} chars).',
      'msg.fileError': 'File could not be read: {msg}',
      'msg.snapshotIncompat': 'Unknown data format or incompatible version.',
      'msg.slotFull': 'Save failed (LocalStorage full?): {msg}',
      'msg.slotReadError': 'Slot could not be read.',
      'msg.slotNotFound': 'Slot not found.',
      'msg.slotLoaded': 'Slot „{name}" loaded.',
      'msg.slotSaved': 'Slot „{name}" saved.',
      'msg.slotDuplicated': 'Slot duplicated.',
      'msg.jsonExported': 'State exported as JSON.',
      'msg.jsonImported': '„{name}" imported and saved as slot.',
      'msg.jsonInvalid': 'File is not valid JSON.',
      'msg.csvParseError': 'CSV error on line {line}: {detail}',
      'msg.csvError.UNCLOSED_QUOTE': 'Unterminated quoted field — please add the closing ".',
      'msg.csvError.JUNK_AFTER_QUOTE': 'Unexpected characters after closing quote — only comma or end of line allowed after ".',
      'msg.csvSkipped': ' {total} row(s) skipped (invalid weight: {weight}, empty word: {empty}).',
      'msg.listCleared': 'Word list cleared ({n} entries removed).',
      'msg.groupsCleared': '{n} group(s) removed — entries moved to „{default}".',
      'confirm.clearList': 'Remove all {n} entries? Groups will be kept.',
      'confirm.clearGroups': 'Delete all {n} groups except „{default}"? Entries will be moved into „{default}".',
      'prompt.newGroup': 'Name of new group:',
      'prompt.newGroup.default': 'Group {n}',
      'prompt.renameGroup': 'Rename group:',
      'prompt.slotName': 'Name for this slot:',
      'prompt.slotName.default': 'Wordcloud {date}',
      'prompt.renameSlot': 'New name:',
      'confirm.deleteGroup': 'Delete group „{name}"? Its entries will be reassigned to the first other group.',
      'confirm.clearPalette': 'Clear all tiles?',
      'confirm.deleteSlot': 'Really delete slot „{name}"?',
      'group.tooltip.name': 'Click: set active. Double-click: rename.',
      'group.tooltip.chip': 'Click: edit (name, color, font, delete)',
      'group.tooltip.delete': 'Delete group',
      'group.tooltip.delEntry': 'Remove entry',
      'slot.duplicate': '{name} (copy)',
      'palette.slot.clear': 'Clear tile',
      'credits.button':        'Credits & Licenses',
      'credits.heading':       'Credits & Licenses',
      'credits.intro':         'This Wordcloud Generator uses the following third-party software and fonts:',
      'credits.vendors':       'Libraries',
      'credits.d3CloudPatched':'— with local patch for mask support (incl. multi-region masks) and per-word pinning',
      'credits.wc2Patched':    '— with local patch for seed reproducibility',
      'credits.fonts':         'Fonts',
      'credits.fontsOfl':      '14 web fonts under SIL Open Font License 1.1: Pacifico, Lobster, Bebas Neue, Playfair Display, Anton, Fjalla One, Caveat, Press Start 2P, Cinzel, Shadows Into Light, Architects Daughter, Crimson Text, Righteous, Russo One.',
      'credits.fontsApache':   '3 web fonts under Apache License 2.0: Permanent Marker, Special Elite, Roboto Slab.',
      'credits.masks':         'Mask shapes',
      'credits.masksOwn':      '24 SVG silhouettes — original work, public domain (CC0-equivalent).',
      'credits.masksLoaded':   'SVGs you load or paste yourself (e.g. from icon libraries) are subject to the licenses of their respective source and remain the responsibility of the user.',
      'credits.about':         'Development',
      'credits.developed':     'Built with help from Anthropic Claude (Claude Code).',
      'credits.licensesNote':  'Full license texts: LICENSES/ directory. Patch details (changes to d3-cloud & wordcloud2): docs/vendor-patches/.',
      'credits.close':         'Close',
    },
  };

  let currentLang = 'de';

  function t(key, vars) {
    const tbl = I18N[currentLang] || I18N.de;
    let s = tbl[key] != null ? tbl[key] : (I18N.de[key] != null ? I18N.de[key] : key);
    if (vars) {
      for (const k in vars) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      }
    }
    return s;
  }

  function applyLanguage(lang) {
    currentLang = (lang === 'en' || lang === 'de') ? lang : 'de';
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const tr = t(key);
      if (el.tagName === 'META') {
        el.setAttribute('content', tr);
      } else {
        el.textContent = tr;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-label]').forEach(el => {
      el.label = t(el.dataset.i18nLabel);
    });
    // Lang-Switch-Highlight
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang));
    try { localStorage.setItem('wordcloud:lang', currentLang); } catch (e) {}
    // Dynamische Stellen refreshen
    if (typeof renderEntriesTable === 'function') renderEntriesTable();
    if (typeof renderGroupChips === 'function') renderGroupChips();
    if (typeof renderSlotList === 'function') renderSlotList();
    if (typeof updateSelectedWordPanel === 'function') updateSelectedWordPanel();
    // Dropdowns mit übersetzten Optionen
    refreshTranslatableDropdowns();
  }

  function refreshTranslatableDropdowns() {
    // Palette-Dropdown: Sonderoptionen + Preset-Namen je Sprache
    const pal = document.getElementById('cfg-palette');
    if (pal) {
      Array.from(pal.options).forEach(opt => {
        if (opt.value === '__custom__') opt.textContent = t('config.paletteCustomLabel');
        else if (opt.value === '__gradient__') opt.textContent = t('config.paletteGradientLabel');
        else if (W.palettes && W.palettes[opt.value] && W.palettes[opt.value].name) {
          opt.textContent = W.palettes[opt.value].name[currentLang] || W.palettes[opt.value].name.de;
        }
      });
    }
    // Theme-Dropdown: Preset-Namen je Sprache (leere „eigene Eingabe"-Option wird via data-i18n behandelt)
    const themeSel = document.getElementById('cfg-theme');
    if (themeSel && W.themes) {
      Array.from(themeSel.options).forEach(opt => {
        const th = W.themes[opt.value];
        if (th && th.name) opt.textContent = th.name[currentLang] || th.name.de;
      });
    }
    // Font-Dropdowns komplett neu mit aktualisierten Labels
    if (typeof refreshFontDropdown === 'function') refreshFontDropdown();
    if (typeof refreshGroupEditorFontDropdown === 'function') refreshGroupEditorFontDropdown();
    // Google-Font-Liste neu rendern (Status-Texte)
    if (typeof renderGoogleFontList === 'function') renderGoogleFontList();
    // Rotation-Min/Max-Tooltip auf neuer Sprache
    if (typeof refreshRotationVisibility === 'function') refreshRotationVisibility();
    // Mask-Gallery-Tooltips auf neuer Sprache neu aufbauen
    if (typeof populateMaskGallery === 'function') { populateMaskGallery(); refreshMaskUiFromState(); }
  }

  function detectInitialLanguage() {
    try {
      const saved = localStorage.getItem('wordcloud:lang');
      if (saved === 'de' || saved === 'en') return saved;
    } catch (e) {}
    const sys = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (sys === 'de') return 'de';
    return 'en';
  }

  const PALETTE_BASE_SLOTS = 16; // Standard: 2 Reihen × 8. Bei >16 Farben automatisch auf 24.

  // =========================================================================
  // State vs. DOM — Source-of-Truth-Konvention
  // =========================================================================
  // Diese App hat ZWEI Source-of-Truth-Regionen:
  //
  //   1) state.* — gepflegt durch UI-Listener bei Änderungen.
  //      Inhalt: groups, entries, customPalette, googleFonts(Enabled),
  //              engine, mask, wc2.* (inkl. useNativeShapes).
  //      Wird in captureState() direkt aus state gelesen.
  //
  //   2) DOM-Inputs (#cfg-*) — die Inputs selbst SIND die Wahrheit.
  //      Inhalt: rotMode, rotMin, rotMax, rotShare, rotDistribution, padding,
  //              spiral, seed, font, scale, sizeMin, sizeMax, width, height,
  //              palette-Auswahl, gradient-Picker-Werte, background-Choice.
  //      Wird pro Render via readConfig() aus DOM gelesen.
  //      Wird in captureState() unter snap.config / snap.gradient / … aus DOM gelesen.
  //
  // Regel: KEINE Schatten-Felder in state.* anlegen, die parallel zu DOM-Inputs
  // existieren. Wer ein Schatten-Feld pflegen will, MUSS auch einen UI-Listener
  // schreiben, der es bei jeder UI-Änderung aktualisiert — sonst entsteht Drift
  // (siehe vergangener Bug mit state.rotDistribution, gefixed in
  // docs/specs/2026-05-25-snapshot-drift.md).
  // =========================================================================
  const state = {
    groups: [],
    entries: [],
    lastUsedGroupId: null,
    nextGroupCounter: 1,
    nextEntryCounter: 1,
    customPalette: new Array(PALETTE_BASE_SLOTS).fill(null),
    googleFonts: [],          // ['Sacramento', 'Lora', ...]
    googleFontsEnabled: false,
    // Phase 4 — werden in P4-8 ans UI gebunden, bis dahin Default-Werte
    engine: DEFAULT_ENGINE,
    mask: null,                                    // null | { type: 'slug'|'svg', value, filename? }
    wc2: { ...DEFAULT_WC2 },
  };

  function ensurePaletteCapacity(needed) {
    const target = needed > PALETTE_BASE_SLOTS ? 24 : PALETTE_BASE_SLOTS;
    while (state.customPalette.length < target) state.customPalette.push(null);
    if (state.customPalette.length > target) state.customPalette.length = target;
  }

  function loadPresetIntoCustomPalette(palette) {
    const colors = (palette && palette.colors) || [];
    ensurePaletteCapacity(colors.length);
    for (let i = 0; i < state.customPalette.length; i++) {
      state.customPalette[i] = i < colors.length ? colors[i] : null;
    }
  }

  // Extrahiert eine Palette aus einem Bild per Median-Cut. Rein: gibt Hex-Array (≤ count).
  function extractPaletteFromImage(img, count) {
    count = count || 8;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const scale = Math.min(1, 100 / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0, w, h);
    const d = cx.getImageData(0, 0, w, h).data;
    const px = [];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;                 // transparente Pixel überspringen
      px.push([d[i], d[i + 1], d[i + 2]]);
    }
    if (!px.length) return [];

    let boxes = [px];
    // Median-Cut: bis count Boxen oder keine teilbare Box mehr.
    while (boxes.length < count) {
      let bi = -1, bestRange = -1, bestCh = 0;
      for (let k = 0; k < boxes.length; k++) {
        const box = boxes[k];
        if (box.length < 2) continue;
        for (let ch = 0; ch < 3; ch++) {
          let mn = 255, mx = 0;
          for (let p = 0; p < box.length; p++) { const v = box[p][ch]; if (v < mn) mn = v; if (v > mx) mx = v; }
          const range = mx - mn;
          if (range > bestRange) { bestRange = range; bi = k; bestCh = ch; }
        }
      }
      if (bi < 0) break;                            // nichts mehr teilbar
      const box = boxes[bi];
      box.sort((a, b) => a[bestCh] - b[bestCh]);
      const mid = box.length >> 1;
      boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
    }

    const colors = boxes.map(box => {
      let r = 0, g = 0, b = 0;
      for (let p = 0; p < box.length; p++) { r += box[p][0]; g += box[p][1]; b += box[p][2]; }
      const n = box.length;
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    });
    // nach Helligkeit sortieren (dunkel → hell)
    colors.sort((a, b) => (0.299*a[0]+0.587*a[1]+0.114*a[2]) - (0.299*b[0]+0.587*b[1]+0.114*b[2]));
    const toHex = v => v.toString(16).padStart(2, '0');
    return colors.map(c2 => '#' + toHex(c2[0]) + toHex(c2[1]) + toHex(c2[2]));
  }

  // Lädt eine Bild-Datei, extrahiert 8 Farben und übernimmt sie in die Custom-Palette.
  function applyPaletteFromImageFile(file) {
    if (!file || !(file.type && file.type.startsWith('image/'))) { setMessage(t('msg.imageInvalid'), 'error'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const colors = extractPaletteFromImage(img, 8);
      if (!colors.length) { setMessage(t('msg.paletteImageFailed'), 'error'); return; }
      loadPresetIntoCustomPalette({ colors });
      markPaletteCustom();
      renderInlinePalette();
      scheduleAutoUpdate();
      setMessage(t('msg.paletteFromImage', { n: colors.length }));
    };
    img.onerror = () => { URL.revokeObjectURL(url); setMessage(t('msg.imageInvalid'), 'error'); };
    img.src = url;
  }

  function newGroupId() { return 'g' + (state.nextGroupCounter++); }
  function newEntryId() { return 'e' + (state.nextEntryCounter++); }
  function findGroup(id) { return state.groups.find(g => g.id === id); }
  function findEntry(id) { return state.entries.find(e => e.id === id); }
  function findGroupByName(name) {
    const n = (name || '').trim().toLowerCase();
    return n ? state.groups.find(g => g.name.toLowerCase() === n) : null;
  }

  function addGroup(name, opts) {
    const g = {
      id: newGroupId(),
      name: name || 'Gruppe ' + state.groups.length,
      color: (opts && opts.color) || COLOR_AUTO,
      font: (opts && opts.font) || FONT_AUTO,
      paletteMode: PALETTE_MODE_AUTO,
      gradient: { ...DEFAULT_GROUP_GRADIENT },
      rotation: { ...DEFAULT_GROUP_ROTATION },
      padding: null,             // null = kein Override
      sizeFactor: 1.0,           // 1.0 = kein Override
    };
    state.groups.push(g);
    state.lastUsedGroupId = g.id;
    return g;
  }

  // Stellt sicher, dass eine Gruppe (z.B. aus altem v1-Snapshot) alle aktuellen
  // Felder hat. Fehlende Felder werden mit Defaults gefüllt.
  // Migration aus v1: wenn paletteMode fehlt, leiten wir aus dem alten color-Feld ab.
  function normalizeGroupShape(g) {
    if (!g.paletteMode) {
      g.paletteMode = (g.color && g.color !== COLOR_AUTO) ? PALETTE_MODE_COLOR : PALETTE_MODE_AUTO;
    }
    if (!g.gradient || typeof g.gradient !== 'object') {
      g.gradient = { ...DEFAULT_GROUP_GRADIENT };
    } else {
      g.gradient = {
        from:   g.gradient.from   || DEFAULT_GROUP_GRADIENT.from,
        via:    g.gradient.via    || DEFAULT_GROUP_GRADIENT.via,
        to:     g.gradient.to     || DEFAULT_GROUP_GRADIENT.to,
        useVia: !!g.gradient.useVia,
      };
    }
    // Phase-4-Felder
    if (!g.rotation || typeof g.rotation !== 'object') {
      g.rotation = { ...DEFAULT_GROUP_ROTATION };
    } else {
      g.rotation = {
        mode:            g.rotation.mode || DEFAULT_GROUP_ROTATION.mode,
        rotMin:          typeof g.rotation.rotMin === 'number' ? g.rotation.rotMin : DEFAULT_GROUP_ROTATION.rotMin,
        rotMax:          typeof g.rotation.rotMax === 'number' ? g.rotation.rotMax : DEFAULT_GROUP_ROTATION.rotMax,
        rotShare:        typeof g.rotation.rotShare === 'number' ? g.rotation.rotShare : DEFAULT_GROUP_ROTATION.rotShare,
        rotDistribution: g.rotation.rotDistribution || DEFAULT_GROUP_ROTATION.rotDistribution,
      };
    }
    if (g.padding !== null && typeof g.padding !== 'number') g.padding = null;
    if (typeof g.sizeFactor !== 'number' || g.sizeFactor <= 0) g.sizeFactor = 1.0;
    return g;
  }

  // Defensive Defaults für die Top-Level-Felder des Snapshots, die in Phase 4
  // ergänzt wurden. Wird im restoreState aufgerufen.
  function normalizeConfigShape(snap) {
    const out = {};
    out.engine = VALID_ENGINES.indexOf(snap.engine) >= 0 ? snap.engine : DEFAULT_ENGINE;
    out.mask = (snap.mask && typeof snap.mask === 'object' && (snap.mask.type === 'slug' || snap.mask.type === 'svg' || snap.mask.type === 'image') && typeof snap.mask.value === 'string')
      ? { type: snap.mask.type, value: snap.mask.value, filename: snap.mask.filename || null }
      : null;
    const wc2 = (snap.wc2 && typeof snap.wc2 === 'object') ? snap.wc2 : {};
    out.wc2 = {
      gridSize:    typeof wc2.gridSize === 'number' ? wc2.gridSize : DEFAULT_WC2.gridSize,
      ellipticity: typeof wc2.ellipticity === 'number' ? wc2.ellipticity : DEFAULT_WC2.ellipticity,
      shrinkToFit: !!wc2.shrinkToFit,
      useNativeShapes: typeof wc2.useNativeShapes === 'boolean' ? wc2.useNativeShapes : true,
    };
    return out;
  }

  function deleteGroup(id) {
    if (state.groups.length <= 1) return false;
    // Einträge dieser Gruppe → Default-Gruppe
    const fallback = state.groups.find(g => g.id !== id);
    state.entries.forEach(e => { if (e.groupId === id) e.groupId = fallback.id; });
    const idx = state.groups.findIndex(g => g.id === id);
    state.groups.splice(idx, 1);
    if (state.lastUsedGroupId === id) state.lastUsedGroupId = fallback.id;
    return true;
  }

  function addEntry(text, weight, groupId) {
    const gid = groupId || state.lastUsedGroupId || (state.groups[0] && state.groups[0].id);
    const e = { id: newEntryId(), text: text || '', weight: weight != null ? weight : 1, groupId: gid };
    state.entries.push(e);
    if (gid) state.lastUsedGroupId = gid;
    return e;
  }

  function removeEntry(id) {
    const idx = state.entries.findIndex(e => e.id === id);
    if (idx >= 0) state.entries.splice(idx, 1);
  }

  // ============ Tokenisierung & Stopwort-Filter (für Befüll-Dialog) ============

  function tokenize(text) {
    return text
      .toLowerCase()
      .split(/[^\p{L}\p{N}'\-]+/u)
      .filter(Boolean)
      .map(t => t.replace(/^[-']+|[-']+$/g, ''))
      .filter(Boolean);
  }

  function parseCustomStopwords(text) {
    return new Set(
      text.split(/[,\n\r;]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
    );
  }

  function buildFromFreitext(text, opts) {
    const tokens = tokenize(text);
    const filtered = tokens.filter(t => {
      if (t.length < opts.minLength) return false;
      if (opts.stopwordsOn && ALL_STOPWORDS.has(t)) return false;
      if (opts.customStopwords.has(t)) return false;
      return true;
    });
    const counts = new Map();
    for (const t of filtered) counts.set(t, (counts.get(t) || 0) + 1);
    const result = [];
    counts.forEach((count, txt) => {
      if (count >= opts.minCount) result.push({ text: txt, weight: count });
    });
    return result.sort((a, b) => b.weight - a.weight);
  }

  // RFC-4180-konformer CSV-Parser (State Machine).
  // Versteht: durch Anführungszeichen gequotete Felder, doppelte „"" als escapter Quote,
  // Felder mit Kommas und Zeilenumbrüchen innerhalb von Quotes.
  // Wirft CSVParseError({code, line}) bei strukturellen Fehlern.
  function parseCSVRows(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let fieldStart = true;     // sind wir am Anfang eines Felds?
    let line = 1;
    let quoteOpenLine = 0;     // wo die offene Quote begonnen hat (für Fehlerreport)
    let i = 0;
    const len = text.length;

    while (i < len) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {            // escaper Doppelquote
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;                     // Quote schließt
          i++;
          const next = text[i];
          if (next != null && next !== ',' && next !== '\n' && next !== '\r') {
            throw new CSVParseError('JUNK_AFTER_QUOTE', line);
          }
          continue;
        }
        if (ch === '\n') line++;
        field += ch;
        i++;
        continue;
      }

      // außerhalb Quotes
      if (ch === '"' && fieldStart) {
        inQuotes = true;
        quoteOpenLine = line;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(field);
        field = '';
        fieldStart = true;
        i++;
        continue;
      }
      if (ch === '\r') { i++; continue; }      // CR ignorieren (CRLF wird zu LF)
      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        fieldStart = true;
        line++;
        i++;
        continue;
      }
      field += ch;
      fieldStart = false;
      i++;
    }

    if (inQuotes) throw new CSVParseError('UNCLOSED_QUOTE', quoteOpenLine);

    // Letztes Feld / letzte Zeile
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function CSVParseError(code, line) {
    this.name = 'CSVParseError';
    this.code = code;
    this.line = line;
    this.message = code + ' at line ' + line;
  }
  CSVParseError.prototype = Object.create(Error.prototype);

  function buildFromCSV(text, opts) {
    const rows = parseCSVRows(text);    // wirft bei Strukturfehlern
    const result = [];
    const skipped = { invalidWeight: 0, emptyWord: 0 };
    for (const fields of rows) {
      const word = (fields[0] || '').trim();
      if (!word && fields.length <= 1) continue;       // leere Zeile
      if (word.startsWith('#')) continue;              // Kommentarzeile
      if (!word) { skipped.emptyWord++; continue; }    // Datenzeile, aber Wort fehlt
      const weight = fields.length > 1 ? parseFloat((fields[1] || '').trim()) : 1;
      if (!isFinite(weight) || weight <= 0) { skipped.invalidWeight++; continue; }
      const groupNameRaw = fields.length > 2 ? (fields[2] || '').trim() : '';
      result.push({ text: word, weight: weight, groupName: groupNameRaw });
    }
    return { rows: result, skipped };
  }

  // ============ HSL-Interpolation ============

  function hexToHsl(hex) {
    let h = (hex || '#000000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hh = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      hh = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) hh = (b - r) / d + 2;
      else                hh = (r - g) / d + 4;
      hh /= 6;
    }
    return { h: hh, s, l };
  }

  function hslToHex(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function interpolateHSL(fromHex, toHex, t) {
    const a = hexToHsl(fromHex);
    const b = hexToHsl(toHex);
    let dh = b.h - a.h;
    if (dh >  0.5) dh -= 1;
    if (dh < -0.5) dh += 1;
    const h = (a.h + dh * t + 1) % 1;
    const s = a.s + t * (b.s - a.s);
    const l = a.l + t * (b.l - a.l);
    return hslToHex(h, s, l);
  }

  // ============ Google Fonts (Opt-in) ============

  function googleFontCssUrl(family) {
    return 'https://fonts.googleapis.com/css2?family='
      + encodeURIComponent(family.trim()).replace(/%20/g, '+')
      + '&display=swap';
  }
  function googleFontFontFamilyValue(family) {
    return '"' + family.trim() + '", sans-serif';
  }
  function googleFontLinkId(family) {
    return 'gf-link-' + family.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function ensureGoogleFontLink(family) {
    return new Promise((resolve, reject) => {
      const id = googleFontLinkId(family);
      const existing = document.getElementById(id);
      if (existing) { resolve(true); return; }
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = googleFontCssUrl(family);
      link.onload = () => resolve(true);
      link.onerror = () => reject(new Error('CSS load failed'));
      document.head.appendChild(link);
    });
  }
  function removeGoogleFontLink(family) {
    const link = document.getElementById(googleFontLinkId(family));
    if (link) link.remove();
  }

  async function loadGoogleFont(family) {
    // Strategie 1: CSS holen, woff2-URLs parsen, jede Datei als FontFace direkt laden.
    // Funktioniert auch unter file://, weil gstatic.com CORS für * erlaubt.
    try {
      const cssUrl = googleFontCssUrl(family);
      const cssResp = await fetch(cssUrl, { mode: 'cors' });
      if (!cssResp.ok) throw new Error('CSS HTTP ' + cssResp.status);
      const css = await cssResp.text();
      const urls = Array.from(css.matchAll(/url\((https?:\/\/[^)]+\.woff2?)\)/g)).map(m => m[1]);
      if (urls.length === 0) throw new Error('Keine Font-URL im CSS');
      let added = 0;
      for (const url of urls) {
        try {
          const face = new FontFace(family, 'url(' + url + ')');
          await face.load();
          document.fonts.add(face);
          added++;
        } catch (e) {
          // Einzelne subsets dürfen scheitern, solange wenigstens einer klappt
        }
      }
      if (added === 0) throw new Error('Keine FontFace geladen');
      // Zusätzlich auch <link> einfügen, damit @font-face-Regeln im DOM bekannt sind
      // (für andere subsets/weights bei Bedarf)
      try { await ensureGoogleFontLink(family); } catch (e) { /* ignorierbar */ }
      return true;
    } catch (e) {
      // Strategie 2: Klassisches <link>-Verfahren (für Sonderbrowser)
      try {
        await ensureGoogleFontLink(family);
        await new Promise(r => setTimeout(r, 200));
        if (document.fonts && document.fonts.load) {
          const loaded = await document.fonts.load('16px "' + family + '"');
          if (loaded.length > 0) return true;
        }
      } catch (e2) { /* fall through */ }
      return false;
    }
  }

  async function addGoogleFont(family) {
    family = (family || '').trim();
    if (!family) return;
    if (state.googleFonts.some(f => f.toLowerCase() === family.toLowerCase())) {
      setMessage(t('msg.gfDuplicate', { name: family }), 'error');
      return;
    }
    state.googleFonts.push(family);
    renderGoogleFontList(family, 'loading');
    refreshFontDropdown();
    refreshGroupEditorFontDropdown();
    const ok = await loadGoogleFont(family);
    if (ok) {
      renderGoogleFontList();
      refreshFontDropdown();
      refreshGroupEditorFontDropdown();
      // Frisch geladenen Font direkt aktiv setzen
      const fontSel = document.getElementById('cfg-font');
      if (fontSel) fontSel.value = googleFontFontFamilyValue(family);
      setMessage(t('msg.gfLoaded', { name: family }));
      scheduleAutoUpdate();
    } else {
      renderGoogleFontList(family, 'failed');
      setMessage(t('msg.gfFailed', { name: family }), 'error');
    }
  }

  function removeGoogleFont(family) {
    state.googleFonts = state.googleFonts.filter(f => f !== family);
    removeGoogleFontLink(family);
    renderGoogleFontList();
    refreshFontDropdown();
    refreshGroupEditorFontDropdown();
    scheduleAutoUpdate();
  }

  function renderGoogleFontList(highlightFamily, highlightStatus) {
    const list = document.getElementById('google-font-list');
    if (!list) return;
    list.innerHTML = '';
    state.googleFonts.forEach(family => {
      const chip = document.createElement('div');
      chip.className = 'google-font-chip';
      const nameWrap = document.createElement('span');
      const nm = document.createElement('span'); nm.className = 'gf-name'; nm.textContent = family;
      nm.style.fontFamily = googleFontFontFamilyValue(family);
      const st = document.createElement('span'); st.className = 'gf-status';
      let statusKey = 'gf.status.ready';
      if (family === highlightFamily) {
        if (highlightStatus === 'loading') statusKey = 'gf.status.loading';
        if (highlightStatus === 'failed')  { statusKey = 'gf.status.failed'; chip.classList.add('error'); }
      }
      st.textContent = ' · ' + t(statusKey);
      nameWrap.appendChild(nm); nameWrap.appendChild(st);
      chip.appendChild(nameWrap);
      const del = document.createElement('button');
      del.className = 'gf-remove'; del.type = 'button';
      del.textContent = '×';
      del.title = t('gf.tooltip.remove');
      del.addEventListener('click', () => removeGoogleFont(family));
      chip.appendChild(del);
      list.appendChild(chip);
    });
  }

  function updateOfflineBadge() {
    const badge = document.getElementById('gf-offline-badge');
    if (!badge) return;
    const offline = (typeof navigator !== 'undefined') && navigator.onLine === false;
    badge.hidden = !(offline && state.googleFontsEnabled);
  }

  function setGoogleFontsEnabled(on) {
    state.googleFontsEnabled = !!on;
    const panel = document.getElementById('cfg-google-fonts-panel');
    if (panel) panel.hidden = !state.googleFontsEnabled;
    updateOfflineBadge();
    refreshFontDropdown();
    refreshGroupEditorFontDropdown();
    // Wenn eingeschaltet: alle gespeicherten Fonts erneut sicherstellen (Link)
    if (state.googleFontsEnabled) {
      state.googleFonts.forEach(f => ensureGoogleFontLink(f));
    }
  }

  function initGoogleFonts() {
    const toggle = document.getElementById('cfg-google-fonts-on');
    toggle.checked = state.googleFontsEnabled;
    document.getElementById('cfg-google-fonts-panel').hidden = !state.googleFontsEnabled;
    toggle.addEventListener('change', () => setGoogleFontsEnabled(toggle.checked));
    document.getElementById('btn-add-google-font').addEventListener('click', () => {
      const inp = document.getElementById('google-font-input');
      const family = inp.value.trim();
      if (!family) return;
      addGoogleFont(family);
      inp.value = '';
    });
    document.getElementById('google-font-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-google-font').click(); }
    });
    window.addEventListener('online',  updateOfflineBadge);
    window.addEventListener('offline', updateOfflineBadge);
    renderGoogleFontList();
    updateOfflineBadge();
  }

  // ============ Skalierung & Rotation ============

  function makeScaleFn(method, minW, maxW, sizeMin, sizeMax) {
    if (maxW === minW) return () => (sizeMin + sizeMax) / 2;
    let lo, hi;
    if (method === 'linear') {
      lo = minW; hi = maxW;
      return (w) => sizeMin + ((w - lo) / (hi - lo)) * (sizeMax - sizeMin);
    }
    if (method === 'log') {
      const offset = minW <= 0 ? 1 - minW : 0;
      lo = Math.log(minW + offset);
      hi = Math.log(maxW + offset);
      return (w) => sizeMin + ((Math.log(w + offset) - lo) / (hi - lo)) * (sizeMax - sizeMin);
    }
    lo = Math.sqrt(minW); hi = Math.sqrt(maxW);
    return (w) => sizeMin + ((Math.sqrt(w) - lo) / (hi - lo)) * (sizeMax - sizeMin);
  }

  // 12 Rotation-Presets in vier Optgroups. Werte sind die diskreten Winkel in Grad.
  // 'free' ist Sonderfall (kontinuierlich zwischen rotMin/rotMax) und nicht hier.
  // 'hv' bleibt als Alias für 'cross-90' für Snapshot-Migration aus alter Phase 3.
  const ROTATION_ANGLES_BY_MODE = {
    'horizontal': [0],
    'h+up45':     [0, 45],
    'h+down45':   [0, -45],
    'h+up90':     [0, 90],
    'h+down90':   [0, -90],
    'cross-45':   [-45, 0, 45],
    'cross-90':   [-90, 0, 90],
    'diagonal':   [-45, 45],
    'steps-15':   [-90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90],
    'steps-30':   [-90, -60, -30, 0, 30, 60, 90],
    'steps-45':   [-90, -45, 0, 45, 90],
    'hv':         [-90, 0, 90],   // Legacy-Alias für 'cross-90'
  };

  // Erzeugt eine Winkel-Funktion: rufst sie ohne Argumente auf, kriegst einen Grad-Wert
  // entsprechend dem rotMode. Bei 'free' kontinuierlich, sonst aus der Stufen-Liste.
  function makeAngleFn(mode, rotMin, rotMax, rand) {
    rand = rand || Math.random;
    if (mode === 'free') {
      let lo = rotMin, hi = rotMax;
      if (lo > hi) { const tmp = lo; lo = hi; hi = tmp; }
      return () => lo + rand() * (hi - lo);
    }
    const angles = ROTATION_ANGLES_BY_MODE[mode] || [0];
    return () => angles[Math.floor(rand() * angles.length)];
  }

  // Bestimmt vor dem Layout, welche Wort-IDs rotieren dürfen.
  // 'random':   zufälliges Sample mit sharePct als Wahrscheinlichkeit
  // 'heaviest': top sharePct% nach Gewicht
  // 'lightest': bottom sharePct% nach Gewicht
  // Rückgabe: Set von Wort-IDs (die rotieren dürfen). Wort nicht im Set → horizontal.
  function decideRotationTargets(words, distribution, sharePct, rand) {
    rand = rand || Math.random;
    if (sharePct >= 100) return new Set(words.map(w => w.id));
    if (sharePct <= 0)   return new Set();
    const N = Math.max(1, Math.round(words.length * sharePct / 100));
    if (distribution === 'heaviest') {
      return new Set([...words].sort((a, b) => b.weight - a.weight).slice(0, N).map(w => w.id));
    }
    if (distribution === 'lightest') {
      return new Set([...words].sort((a, b) => a.weight - b.weight).slice(0, N).map(w => w.id));
    }
    // 'random': N zufällige Wörter (deterministisch via Seed)
    const indices = words.map((_, i) => i);
    // Fisher-Yates-Shuffle mit PRNG
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
    }
    return new Set(indices.slice(0, N).map(i => words[i].id));
  }

  // Seedbarer PRNG (mulberry32) — gleicher Seed → identische Anordnung
  function makePRNG(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ============ Render ============

  let currentRender = null;
  let currentLayoutHandle = null;   // { promise, cancel } während ein Layout läuft
  let stageDimTimer = null;          // setTimeout-Handle für verzögertes Dimmen (100 ms)

  // Archimedische Spirale ~1.5 Umdrehungen, Mittelpunkt (28,28), Radius bis 24.
  // Wird einmalig beim Init in das Spinner-SVG-Path-Element geschrieben.
  function generateSpiralPath() {
    const cx = 28, cy = 28;
    const steps = 80;
    const maxTheta = 3 * Math.PI;
    const b = 24 / maxTheta;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * maxTheta;
      const r = b * theta;
      const x = (cx + r * Math.cos(theta)).toFixed(2);
      const y = (cy + r * Math.sin(theta)).toFixed(2);
      d += (i === 0 ? 'M ' : ' L ') + x + ' ' + y;
    }
    return d;
  }

  function initLayoutSpinner() {
    const path = document.getElementById('layout-spinner-path');
    if (path) path.setAttribute('d', generateSpiralPath());
  }

  // ============ Engine-Interface ============
  // Jede Engine implementiert: layout(words, cfg, maskCanvas) → { promise, cancel }
  // - words: [{ text, size, groupId, font }]  (size schon skaliert, font schon resolved)
  // - cfg:   { width, height, padding, spiral, font, prng, rotateFn }
  // - maskCanvas: HTMLCanvasElement | null (Phase 4.9 — bis dahin immer null)
  // - promise: resolved mit placed[] oder rejected mit Error('cancelled')
  // - cancel(): idempotent, brichab das laufende Layout

  // Jede Engine resolved mit { kind, … }:
  //   kind 'placed' → { kind: 'placed', placed: [...] }   (SVG-Pipeline via drawWords)
  //   kind 'canvas' → { kind: 'canvas', canvas: HTMLCanvasElement }   (Canvas-Pipeline)
  const D3CloudEngine = {
    name: 'd3-cloud',
    layout(words, cfg, maskCanvas) {
      let cancelled = false;
      const promise = new Promise((resolve, reject) => {
        const layout = d3.layout.cloud()
          .size([cfg.width, cfg.height])
          .words(words)
          // Per-Wort-Padding: globales cfg.padding plus optionaler Gruppen-Bonus
          .padding(d => cfg.padding + (d.groupPaddingBonus || 0))
          .rotate(cfg.rotateFn)
          .font(d => d.font || cfg.font)
          .fontSize(d => d.size)
          .spiral(cfg.spiral)
          .random(cfg.prng)
          .on('end', placed => {
            if (cancelled) reject(new Error('cancelled'));
            else resolve({ kind: 'placed', placed });
          });
        if (maskCanvas) layout.mask(maskCanvas);
        if (cfg.pinned && cfg.pinned.length) layout.pinned(cfg.pinned);
        layout.start();
      });
      return { promise, cancel: () => { cancelled = true; } };
    },
  };

  // Mapping unserer rotMode-Werte auf wordcloud2-Parameter (min/maxRotation in Radiant,
  // rotationSteps zur Quantisierung). 'free' bekommt rotationSteps=0 (kontinuierlich).
  function mapRotationToWordcloud2(mode, rotMin, rotMax) {
    const deg2rad = d => d * Math.PI / 180;
    if (mode === 'free') {
      return { minRotation: deg2rad(rotMin), maxRotation: deg2rad(rotMax), rotationSteps: 0 };
    }
    const angles = ROTATION_ANGLES_BY_MODE[mode] || [0];
    const lo = Math.min(...angles);
    const hi = Math.max(...angles);
    return { minRotation: deg2rad(lo), maxRotation: deg2rad(hi), rotationSteps: angles.length };
  }

  const Wordcloud2Engine = {
    name: 'wordcloud2',
    layout(words, cfg, maskCanvas) {
      let cancelled = false;
      // Canvas: bei Maske wird das vorbemalte Canvas direkt verwendet (clearCanvas: false).
      // Bei eigenem Canvas: Dimensionen setzen. Bei Mask-Canvas: NICHT antasten —
      // canvas.width = … würde die Mask-Pixel löschen.
      const canvas = maskCanvas || document.createElement('canvas');
      if (!maskCanvas) {
        canvas.width = cfg.width;
        canvas.height = cfg.height;
      }

      const rotMap = mapRotationToWordcloud2(cfg.rotMode, cfg.rotMin, cfg.rotMax);
      const wc2 = cfg.wc2 || DEFAULT_WC2;

      // Farben vorab pro Wort-ID auflösen (gruppenlokal, falls Verlauf)
      // — wordcloud2 zeichnet nicht in unserer Reihenfolge, deshalb Map per ID.
      const colorByWordId = new Map();
      // Gruppen-Index/Total für Verlaufsfarben vorberechnen
      const groupCounts = new Map();
      words.forEach(w => groupCounts.set(w.groupId, (groupCounts.get(w.groupId) || 0) + 1));
      const groupSeen = new Map();
      words.forEach((w, gi) => {
        const idx = groupSeen.get(w.groupId) || 0;
        groupSeen.set(w.groupId, idx + 1);
        const color = colorForWord(w, cfg.paletteSpec, gi, words.length, idx, groupCounts.get(w.groupId));
        colorByWordId.set(w.id, color);
      });

      // Mask-Pixel sichern, bevor WordCloud das Canvas überschreibt.
      // Wird im Post-Process für die Innen/Außen-Unterscheidung gebraucht.
      const maskImgData = maskCanvas
        ? maskCanvas.getContext('2d').getImageData(0, 0, maskCanvas.width, maskCanvas.height)
        : null;

      const promise = new Promise((resolve, reject) => {
        const onStop = () => {
          canvas.removeEventListener('wordcloudstop', onStop);
          if (cancelled) { reject(new Error('cancelled')); return; }
          // Bei aktiver Maske: Pixelklassen anhand der gesicherten Mask-Alpha auflösen.
          //   außen (maskAlpha=255) + opak-schwarz  → Canvas-BG (oder transparent)
          //   innen (maskAlpha=0)   + transparent   → Form-BG (oder unverändert transparent)
          // Wort-Pixel (nicht-rein-schwarz / bereits gefärbt) bleiben unangetastet.
          if (maskCanvas) {
            const ctx2 = canvas.getContext('2d');
            const imgData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            const m = maskImgData.data;
            const canvasBg = parseColorToRGB(cfg.bgCanvas);  // {r,g,b} oder null (transparent)
            const formBg = parseColorToRGB(cfg.bgForm);
            // 1) Wort-Ebene isolieren: außerhalb der Maske (von buildMaskCanvas opak-schwarz
            //    vorbelegt) auf transparent setzen — dort stehen keine Wörter, nur die
            //    Blockade. Innen bleibt unverändert: Wörter inkl. der teil-transparenten
            //    Anti-Aliasing-Kanten.
            for (let i = 0; i < d.length; i += 4) {
              if (m[i + 3] === 255) d[i + 3] = 0;
            }
            ctx2.putImageData(imgData, 0, 0);
            // 2) Hintergrund-Ebene bauen: außen Canvas-BG, innen Form-BG (opak, oder
            //    transparent wenn keine Farbe gewählt).
            const bgImg = ctx2.createImageData(canvas.width, canvas.height);
            const b = bgImg.data;
            for (let i = 0; i < d.length; i += 4) {
              const col = (m[i + 3] === 255) ? canvasBg : formBg;
              if (col) { b[i] = col.r; b[i + 1] = col.g; b[i + 2] = col.b; b[i + 3] = 255; }
            }
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
            bgCanvas.getContext('2d').putImageData(bgImg, 0, 0);
            // 3) Hintergrund HINTER die Wörter komponieren (destination-over) — so mischen
            //    sich die teil-transparenten Wortkanten mit der BG-Farbe statt mit dem
            //    hellen Seiten-Hintergrund (behebt den weißen Saum auf farbigem/schwarzem BG).
            ctx2.globalCompositeOperation = 'destination-over';
            ctx2.drawImage(bgCanvas, 0, 0);
            ctx2.globalCompositeOperation = 'source-over';
          }
          resolve({ kind: 'canvas', canvas });
        };
        canvas.addEventListener('wordcloudstop', onStop);

        WordCloud(canvas, {
          list: words.map(w => [w.text, w.size, w]),
          weightFactor: 1,                                  // size ist schon skaliert
          fontFamily: cfg.font,
          gridSize: wc2.gridSize,
          ellipticity: wc2.ellipticity,
          shrinkToFit: wc2.shrinkToFit,
          // Mask-Canvas: shape ignorieren (Canvas-Inhalt gewinnt).
          // Native-Slug-Maske: cfg.maskShape überstimmt User-Cluster-Form.
          // Sonst: User-Wahl aus Engine-Optionen.
          shape: maskCanvas ? undefined : (cfg.maskShape || 'circle'),
          clearCanvas: !maskCanvas,
          // Bei aktiver Maske MUSS bgColor transparent sein, damit wc2's bgPixel-Test
          // unsere Konvention (inside=transparent=free) korrekt erkennt.
          // Sonst (kein Mask, voller Hintergrund): User-Wahl, sonst transparent.
          backgroundColor: maskCanvas
            ? 'rgba(0,0,0,0)'
            : ((cfg.bgCanvas && cfg.bgCanvas !== 'transparent') ? cfg.bgCanvas : 'rgba(0,0,0,0)'),
          minRotation: rotMap.minRotation,
          maxRotation: rotMap.maxRotation,
          rotationSteps: rotMap.rotationSteps,
          rotateRatio: cfg.rotShare / 100,
          // Farbe pro Wort aus unserer Vorberechnung
          color: (text, weight, fontSize, distance, theta, extras) => {
            const wordObj = extras && extras[0];
            return (wordObj && colorByWordId.get(wordObj.id)) || '#333';
          },
          random: cfg.prng,
        });
      });

      return {
        promise,
        cancel: () => {
          cancelled = true;
          try { WordCloud.stop(); } catch (e) {}
        },
      };
    },
  };

  const ENGINES = { 'd3-cloud': D3CloudEngine, 'wordcloud2': Wordcloud2Engine };

  function makeBoundsRect(w, h) {
    const sw = Math.max(2, Math.round(w / BOUNDS_STROKE_DIVISOR));
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'cloud-bounds-preview');
    r.setAttribute('x', sw / 2);
    r.setAttribute('y', sw / 2);
    r.setAttribute('width', w - sw);
    r.setAttribute('height', h - sw);
    r.setAttribute('fill', 'none');
    r.setAttribute('stroke', '#555');
    r.setAttribute('stroke-width', String(sw));
    r.setAttribute('stroke-dasharray', sw * 3 + ' ' + sw * 2);
    r.setAttribute('pointer-events', 'none');
    return r;
  }

  // Wandelt eine BG-Farbwahl in {r,g,b} um. 'transparent' → null.
  // Akzeptiert '#rgb' und '#rrggbb' (die einzigen Formen aus getBackground).
  function parseColorToRGB(colorString) {
    if (!colorString || colorString === 'transparent') return null;
    let hex = colorString.trim();
    if (hex[0] === '#') hex = hex.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some(n => isNaN(n))) return null;
    return { r, g, b };
  }

  // Gibt eine <g class="cloud-bounds-preview"> mit der Maskenform als gestrichelte
  // Outline zurück, skaliert auf w×h. Wird beim Export entfernt (gleiche Klasse).
  // Konvertiert alle Kind-Elemente des Mask-SVG zu stroke-only mit dasharray.
  // Raster-Layer: füllt `color` und beschränkt es per Masken-Canvas auf innen/außen.
  // op='destination-out' → color nur in der Form (free=transparent bleibt); 'destination-in' → nur außen.
  // Rückgabe: <image>-Element (Stencil-Canvas als Data-URL), volle Render-Größe, oder null.
  function stencilLayerImage(w, h, color, maskCanvas, op) {
    if (!maskCanvas) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = op;       // gegen maskCanvas (blockiert=opak schwarz)
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const url = c.toDataURL('image/png');
    const el = document.createElementNS(SVG_NS, 'image');
    el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
    el.setAttribute('href', url);
    el.setAttribute('x', '0'); el.setAttribute('y', '0');
    el.setAttribute('width', String(w)); el.setAttribute('height', String(h));
    el.setAttribute('pointer-events', 'none');
    return el;
  }

  function makeMaskSilhouette(w, h, maskCanvas) {
    // Dezente, gefüllte Silhouette der Maskenform als Vorschau-Guide (beim Export
    // via .cloud-bounds-preview entfernt). Für slug/svg: verschmolzene Füllung von
    // makeMaskFillLayer + GRUPPEN-Opacity (keine Naht-Aufsummierung). Für Raster:
    // Stencil-<image> aus der Masken-Canvas.
    const g = makeMaskFillLayer(w, h, '#555', maskCanvas);
    if (!g) return null;
    g.setAttribute('class', 'cloud-bounds-preview');
    g.setAttribute('opacity', '0.16');
    return g;
  }

  // Wie makeMaskSilhouette, aber gefüllt: zeichnet die Mask-Form als Vollfläche
  // in fillColor (Form-BG-Layer). Gleiche Letterbox-Geometrie wie die Silhouette,
  // damit Fill und Outline deckungsgleich sind. Rückgabe: <g> oder null.
  function makeMaskFillLayer(w, h, fillColor, maskCanvas) {
    if (!state.mask) return null;
    if (state.mask.type === 'image') return stencilLayerImage(w, h, fillColor, maskCanvas, 'destination-out');
    let svgStr = null;
    if (state.mask.type === 'slug') svgStr = (window.WC && window.WC.masks) ? window.WC.masks[state.mask.value] : null;
    else if (state.mask.type === 'svg') svgStr = state.mask.value;
    if (!svgStr) return null;
    let doc;
    try { doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml'); }
    catch (e) { return null; }
    const innerSvg = doc.documentElement;
    if (!innerSvg || innerSvg.nodeName.toLowerCase() !== 'svg') return null;
    const viewBox = (innerSvg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
    const [vbX, vbY, vbW, vbH] = viewBox;

    const fit = fitLetterbox(vbW, vbH, w, h);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${fit.offsetX - vbX * fit.scale}, ${fit.offsetY - vbY * fit.scale}) scale(${fit.scale}, ${fit.scale})`);
    g.setAttribute('pointer-events', 'none');
    Array.from(innerSvg.children).forEach(child => {
      const clone = child.cloneNode(true);
      [clone, ...clone.querySelectorAll('*')].forEach(el => {
        // style.setProperty mit 'important' schlägt mitkopierte Inline-styles
        // (style="fill:…") und <style>/Klassen der Quell-SVG — setAttribute('fill')
        // allein verliert in der CSS-Kaskade gegen einen Inline-style.
        el.style.setProperty('fill', fillColor, 'important');
        el.style.setProperty('stroke', 'none', 'important');
        el.removeAttribute('stroke');
        el.removeAttribute('stroke-width');
        el.removeAttribute('stroke-dasharray');
      });
      g.appendChild(clone);
    });
    return g;
  }

  // Canvas-BG-Ebene. Ohne Maske: volle Fläche. Mit Maske: via SVG-<mask> auf den
  // Außenbereich der Form beschränkt — so bleibt das Form-Innere frei, und ein
  // transparenter Form-BG „stanzt" die Canvas-Farbe aus (unabhängige Regionen,
  // konsistent mit dem wordcloud2-Pfad). Rückgabe: <rect> oder DocumentFragment.
  function makeCanvasBgLayer(w, h, canvasColor, maskCanvas) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', canvasColor);
    if (!state.mask) return rect;
    if (state.mask.type === 'image') return stencilLayerImage(w, h, canvasColor, maskCanvas, 'destination-in') || rect;
    // Form schwarz einfärben → in der <mask> ausgeblendet (Luminanz 0 = unsichtbar).
    const shapeG = makeMaskFillLayer(w, h, '#000');
    if (!shapeG) return rect;
    const frag = document.createDocumentFragment();
    const defs = document.createElementNS(SVG_NS, 'defs');
    const mask = document.createElementNS(SVG_NS, 'mask');
    mask.setAttribute('id', 'wc-canvas-outside');
    const showRect = document.createElementNS(SVG_NS, 'rect');
    showRect.setAttribute('width', '100%');
    showRect.setAttribute('height', '100%');
    showRect.setAttribute('fill', '#fff');   // weiß = sichtbar (außerhalb der Form)
    mask.appendChild(showRect);
    mask.appendChild(shapeG);                // schwarze Form = ausgeblendet (innen frei)
    defs.appendChild(mask);
    rect.setAttribute('mask', 'url(#wc-canvas-outside)');
    frag.appendChild(defs);
    frag.appendChild(rect);
    return frag;
  }

  function renderEmptyBoundsPreview() {
    // Zeigt einen leeren Vorschau-Rahmen (gestricheltes Rechteck oder Mask-Silhouette)
    // in der konfigurierten Render-Größe — visuelles Feedback, wo die Cloud erscheinen wird.
    if (currentRender) return;
    const w = parseInt(document.getElementById('cfg-width').value, 10) || DEFAULT_RENDER_SIZE.width;
    const h = parseInt(document.getElementById('cfg-height').value, 10) || DEFAULT_RENDER_SIZE.height;
    const stage = document.getElementById('stage');
    if (!stage) return;
    stage.innerHTML = '';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    // Bei aktiver Maske: gestrichelte Silhouette nur bei transparentem Form-BG;
    // bei farbigem Form-BG die gefüllte Form zeigen (sonst wäre die Vorschau leer
    // bzw. die Strichlinie redundant). Ohne Maske: Standard-Bounds-Rechteck.
    if (state.mask) {
      if (state.mask.type === 'image') {
        // Matte direkt als dezente Silhouette einbetten (Form opak schwarz auf transparent).
        const im = document.createElementNS(SVG_NS, 'image');
        im.setAttributeNS('http://www.w3.org/1999/xlink', 'href', state.mask.value);
        im.setAttribute('href', state.mask.value);
        im.setAttribute('x', '0'); im.setAttribute('y', '0');
        im.setAttribute('width', String(w)); im.setAttribute('height', String(h));
        im.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        im.setAttribute('opacity', '0.16');
        im.setAttribute('class', 'cloud-bounds-preview');
        im.setAttribute('pointer-events', 'none');
        svg.appendChild(im);
      } else if (getBackground('form') === 'transparent') {
        const silhouette = makeMaskSilhouette(w, h);
        if (silhouette) svg.appendChild(silhouette);
      } else {
        const fill = makeMaskFillLayer(w, h, getBackground('form'));
        if (fill) svg.appendChild(fill);
      }
    } else {
      svg.appendChild(makeBoundsRect(w, h));
    }
    stage.appendChild(svg);
  }

  // Vor dem Layout: benötigte Fonts laden, damit die Mess-Metriken stimmen.
  // d3-cloud misst Wortgrößen in einem Hidden-Canvas — wenn die WebFont
  // noch nicht geladen ist, fällt der Browser auf einen Fallback zurück,
  // dessen Metriken vom späteren Rendering abweichen → Überlappungen.
  async function preloadLayoutFonts(words, cfg) {
    if (!document.fonts || !document.fonts.load) return;
    const neededFonts = new Set([cfg.font]);
    state.groups.forEach(g => { if (g.font && g.font !== FONT_AUTO) neededFonts.add(g.font); });
    try {
      await Promise.all([...neededFonts].map(f => document.fonts.load('16px ' + f)));
    } catch (e) { /* still proceed */ }
  }

  // ============ Masken ============

  // Berechnet aspect-ratio-erhaltende Skalierung (Letterbox / „contain"):
  // Form-viewBox wird zentriert in w×h eingepasst, ohne Verzerrung.
  function fitLetterbox(vbW, vbH, w, h) {
    const scale = Math.min(w / vbW, h / vbH);
    const drawW = vbW * scale;
    const drawH = vbH * scale;
    const offsetX = (w - drawW) / 2;
    const offsetY = (h - drawH) / 2;
    return { scale, drawW, drawH, offsetX, offsetY };
  }

  // Parst das viewBox-Attribut eines SVG-Strings.
  // Rückgabe: { x, y, w, h } oder null bei fehlendem/ungültigem viewBox.
  function parseSvgViewBox(svgStr) {
    const m = svgStr.match(/viewBox\s*=\s*["']([^"']+)["']/);
    if (!m) return null;
    const parts = m[1].split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some(n => !isFinite(n))) return null;
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  }

  // Rendert SVG-String in ein Canvas. Konvention danach: Alpha invertiert,
  // d.h. gemalte Form-Pixel → transparent (= freier Platz), un-gemalte Pixel
  // → opakes Schwarz (= blockiert).
  // Funktioniert mit d3-cloud (alpha>0 = blockiert) UND wordcloud2
  // (backgroundColor='rgba(0,0,0,0)' → bgPixel transparent → transparent=free).
  async function buildMaskCanvas(mask, w, h) {
    if (!mask) return null;
    let svgStr = null, imgSrc = null;
    if (mask.type === 'slug') svgStr = (window.WC && window.WC.masks) ? window.WC.masks[mask.value] : null;
    else if (mask.type === 'svg') svgStr = mask.value;
    else if (mask.type === 'image') imgSrc = mask.value;   // Matte-Data-URL (Form opak, außen transparent)
    if (!svgStr && !imgSrc) return null;

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    await new Promise((resolve, reject) => {
      const img = new Image();
      let url = null;
      if (svgStr) { const blob = new Blob([svgStr], { type: 'image/svg+xml' }); url = URL.createObjectURL(blob); }
      img.onload = () => {
        // Letterbox: SVG nach viewBox, Bild nach natürlichen Maßen.
        const vb = svgStr ? (parseSvgViewBox(svgStr) || { w: 100, h: 100 }) : { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
        const fit = fitLetterbox(vb.w, vb.h, w, h);
        ctx.drawImage(img, fit.offsetX, fit.offsetY, fit.drawW, fit.drawH);
        if (url) URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = (e) => { if (url) URL.revokeObjectURL(url); reject(e); };
      img.src = url || imgSrc;
    });

    // Alpha invertieren: gemalt (Form) → frei, frei → blockiert (opakes Schwarz)
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) { data[i + 3] = 0; }
      else { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255; }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // Max. SVG-Upload-Größe (hart). Größere Dateien werden mit Fehlermeldung abgelehnt.
  const MASK_SVG_MAX_BYTES = 100 * 1024;

  // Raster-Masken: Roh-Datei-Limit (gegen versehentliche Riesen-Dateien) + Downscale-Kante.
  const MASK_IMAGE_MAX_BYTES = 10 * 1024 * 1024;   // 10 MB roh
  const MASK_IMAGE_MAX_EDGE = 1000;                // px, Längskante der gespeicherten Matte

  // Slugs, die wordcloud2 nativ als `shape:` kann — schneller als Canvas-Mask.
  // Variante B: bei wc2 + Slug ∈ dieses Set verwenden wir native shape, sonst Canvas-Mask.
  // d3-cloud nutzt immer Canvas-Mask (hat keine native shape API).
  const WC2_NATIVE_SHAPES = new Set([
    'circle', 'diamond', 'triangle', 'triangle-forward', 'star', 'pentagon'
  ]);

  // Reihenfolge der eingebauten Slugs für die Gallery-UI
  const MASK_SLUGS_ORDER = [
    'circle', 'diamond', 'triangle', 'triangle-forward', 'pentagon', 'hexagon', 'star', 'heart',
    'cloud', 'leaf', 'tree', 'flower', 'bird', 'butterfly', 'paw', 'mountain',
    'house', 'speech', 'apple', 'cup', 'suitcase', 'bulb', 'gear', 'donut',
  ];

  function populateMaskGallery() {
    const grid = document.getElementById('cfg-mask-gallery');
    if (!grid || !window.WC || !window.WC.masks) return;
    grid.innerHTML = '';
    MASK_SLUGS_ORDER.forEach(slug => {
      const svgStr = window.WC.masks[slug];
      if (!svgStr) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mask-thumb';
      btn.dataset.slug = slug;
      btn.title = t('mask.slug.' + slug);
      btn.setAttribute('aria-label', t('mask.slug.' + slug));
      btn.innerHTML = svgStr;
      btn.addEventListener('click', () => {
        state.mask = { type: 'slug', value: slug };
        refreshMaskUiFromState();
        scheduleAutoUpdate();
      });
      grid.appendChild(btn);
    });
  }

  function refreshMaskUiFromState() {
    // Mode primär aus state.mask, aber im SVG-Fall ist state.mask zunächst null,
    // der Radio steht trotzdem schon auf 'svg' (User hat geklickt) — also vom
    // aktuellen Radio nachlesen, wenn state.mask leer.
    let mode;
    if (state.mask) {
      mode = state.mask.type;
    } else {
      const checked = document.querySelector('input[name="cfg-mask-mode"]:checked');
      mode = checked ? checked.value : 'none';
    }
    // 'image' nutzt dieselbe UI-Spur wie 'svg' (Radio "Eigene Form: SVG oder Bild").
    const uiMode = (mode === 'image') ? 'svg' : mode;
    const r = document.querySelector('input[name="cfg-mask-mode"][value="' + uiMode + '"]');
    if (r) r.checked = true;
    const gallery = document.getElementById('cfg-mask-gallery');
    if (gallery) gallery.hidden = (uiMode !== 'slug');
    // Active-Highlight im Gallery
    if (gallery) {
      gallery.querySelectorAll('.mask-thumb').forEach(thumb => {
        thumb.classList.toggle('active', uiMode === 'slug' && state.mask && thumb.dataset.slug === state.mask.value);
      });
    }
    // Upload-Block + Filename-Anzeige (svg UND image teilen sich diesen Block)
    const upload = document.getElementById('cfg-mask-upload');
    if (upload) upload.hidden = (uiMode !== 'svg');
    const fnWrap = document.getElementById('cfg-mask-filename');
    const fnText = document.getElementById('cfg-mask-filename-text');
    if (fnWrap && fnText) {
      const hasFile = ((mode === 'svg' || mode === 'image') && state.mask && state.mask.value);
      fnWrap.hidden = !hasFile;
      fnText.textContent = hasFile ? (state.mask.filename || '—') : '';
    }
    // Invertieren-Checkbox nur bei Raster-Maske
    const invRow = document.getElementById('cfg-mask-invert-row');
    if (invRow) invRow.hidden = !(state.mask && state.mask.type === 'image');
    // Form-BG-Reihe nur sichtbar, wenn eine Maske aktiv ist (Spec §2.2)
    const formBgRow = document.getElementById('cfg-bg-form-row');
    if (formBgRow) formBgRow.hidden = (state.mask === null);
    // Silhouetten-Toggle nur bei aktiver Maske bedienbar
    if (typeof refreshGuidesToggleState === 'function') refreshGuidesToggleState();
    // Bei leerem Stage Vorschau-Silhouette neu zeichnen
    if (!currentRender && typeof renderEmptyBoundsPreview === 'function') {
      renderEmptyBoundsPreview();
    }
  }

  // Reduziert ein geladenes Bild auf eine Alpha-Matte: Form = opak schwarz, außen = transparent.
  // Quelle: echte Transparenz (≥1% der Pixel alpha<250) → Alpha; sonst 50%-Luminanzschwelle
  // (dunkel = Form). invert kehrt Figur/Grund um. Liefert ein Canvas (downscaled).
  function deriveMaskMatte(img, invert) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const scale = Math.min(1, MASK_IMAGE_MAX_EDGE / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
    const src = document.createElement('canvas'); src.width = w; src.height = h;
    const sctx = src.getContext('2d');
    sctx.drawImage(img, 0, 0, w, h);
    const data = sctx.getImageData(0, 0, w, h).data;

    // Hat das Bild echte Transparenz?
    let transparentPx = 0;
    const limit = (w * h) * 0.01;
    for (let i = 3; i < data.length; i += 4) { if (data[i] < 250) { transparentPx++; if (transparentPx > limit) break; } }
    const useAlpha = transparentPx > limit;

    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const octx = out.getContext('2d');
    const matte = octx.createImageData(w, h);
    const m = matte.data;
    for (let i = 0; i < data.length; i += 4) {
      let isShape;
      if (useAlpha) isShape = data[i + 3] >= 128;
      else {
        const L = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        isShape = L < 128;   // dunkel = Form (Default)
      }
      if (invert) isShape = !isShape;
      if (isShape) { m[i] = 0; m[i + 1] = 0; m[i + 2] = 0; m[i + 3] = 255; }  // opak schwarz = Form
    }
    octx.putImageData(matte, 0, 0);
    return out;
  }

  // Lädt eine Bild-Datei, leitet die Matte ab und setzt sie als Maske.
  function applyMaskImageFile(file) {
    if (!file) return;
    if (file.size > MASK_IMAGE_MAX_BYTES) {
      setMessage(t('msg.imageTooLarge', { size: (file.size / 1048576).toFixed(1), max: Math.floor(MASK_IMAGE_MAX_BYTES / 1048576) }), 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const matte = deriveMaskMatte(img, false);
        state.mask = { type: 'image', value: matte.toDataURL('image/png'), filename: file.name };
        const invEl = document.getElementById('cfg-mask-invert'); if (invEl) invEl.checked = false;
        refreshMaskUiFromState();
        scheduleAutoUpdate();
      } catch (err) { setMessage(t('msg.fileError', { msg: err.message }), 'error'); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); setMessage(t('msg.imageInvalid'), 'error'); };
    img.src = url;
  }

  // Invertiert die gespeicherte Matte (Form↔außen) — vertauscht Alpha. Braucht kein Original.
  function invertMaskMatte() {
    if (!state.mask || state.mask.type !== 'image') return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height); const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] >= 128) { d[i + 3] = 0; }                                   // war Form → außen
        else { d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255; }           // war außen → Form
      }
      ctx.putImageData(id, 0, 0);
      state.mask.value = c.toDataURL('image/png');
      refreshMaskUiFromState();
      scheduleAutoUpdate();
    };
    img.src = state.mask.value;
  }

  // Gemeinsamer Eingang für SVG-Masken aus Datei, Button oder Einfügefeld.
  // label = Anzeige im Filename-Feld (Dateiname oder synthetisch, z.B. "(eingefügt)").
  // Validierung wie beim bisherigen Upload: Byte-Grenze + DOMParser-Sanity.
  // Gibt true bei Erfolg zurück.
  function applyMaskSvgText(text, label) {
    if (text == null) return false;
    const bytes = new Blob([text]).size;
    if (bytes > MASK_SVG_MAX_BYTES) {
      setMessage(t('msg.svgTooLarge', { size: Math.ceil(bytes / 1024), max: Math.floor(MASK_SVG_MAX_BYTES / 1024) }), 'error');
      return false;
    }
    let doc;
    try { doc = new DOMParser().parseFromString(text, 'image/svg+xml'); }
    catch (err) { setMessage(t('msg.svgInvalid'), 'error'); return false; }
    if (!doc.documentElement || doc.documentElement.nodeName.toLowerCase() !== 'svg' ||
        doc.getElementsByTagName('parsererror').length > 0) {
      setMessage(t('msg.svgInvalid'), 'error');
      return false;
    }
    state.mask = { type: 'svg', value: text, filename: label };
    refreshMaskUiFromState();
    scheduleAutoUpdate();
    return true;
  }

  function initMaskUI() {
    populateMaskGallery();
    document.querySelectorAll('input[name="cfg-mask-mode"]').forEach(r => {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        if (r.value === 'none') {
          state.mask = null;
        } else if (r.value === 'slug') {
          if (!state.mask || state.mask.type !== 'slug') {
            state.mask = { type: 'slug', value: MASK_SLUGS_ORDER[0] };
          }
        } else if (r.value === 'svg') {
          // Mask bleibt null bis der User eine Datei wählt — Hinweis ist sichtbar.
          if (state.mask && state.mask.type !== 'svg') state.mask = null;
        }
        refreshMaskUiFromState();
        scheduleAutoUpdate();
      });
    });

    // Upload-Button → File-Input
    document.getElementById('btn-mask-upload').addEventListener('click', () => {
      document.getElementById('cfg-mask-file').click();
    });
    document.getElementById('cfg-mask-file').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';  // erlauben, dieselbe Datei erneut zu wählen
      if (!file) return;
      if (file.type && file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
        applyMaskImageFile(file);
        return;
      }
      try {
        const text = await file.text();
        applyMaskSvgText(text, file.name);
      } catch (err) {
        setMessage(t('msg.fileError', { msg: err.message }), 'error');
      }
    });

    // Button → Clipboard-Text lesen. Greift in Chrome/Edge/Safari per User-Geste
    // (ggf. mit Permission-Prompt). In Firefox-Webseiten ist readText() nicht
    // verfügbar → catch-Zweig verweist auf das ⌘V-Einfügefeld.
    document.getElementById('btn-mask-paste').addEventListener('click', async () => {
      let text;
      try { text = await navigator.clipboard.readText(); }
      catch (err) { setMessage(t('msg.clipboardDenied'), 'error'); return; }
      if (!text || !text.trim()) { setMessage(t('msg.clipboardImageHint'), 'error'); return; }
      applyMaskSvgText(text, t('mask.pastedLabel'));
    });

    // ⌘V/Strg+V-Einfügefeld — browserübergreifender Fallback.
    document.getElementById('cfg-mask-paste-area').addEventListener('paste', (e) => {
      const dt = e.clipboardData || window.clipboardData;
      const imgItem = dt && dt.files && Array.from(dt.files).find(f => f.type.startsWith('image/') && f.type !== 'image/svg+xml');
      if (imgItem) { e.preventDefault(); applyMaskImageFile(imgItem); return; }
      const text = dt.getData('text/plain');
      e.preventDefault();
      if (text && text.trim()) applyMaskSvgText(text, t('mask.pastedLabel'));
      else setMessage(t('msg.clipboardEmpty'), 'error');
    });

    // Entfernen-× → zurück zu 'none'
    document.getElementById('btn-mask-remove').addEventListener('click', () => {
      state.mask = null;
      refreshMaskUiFromState();
      scheduleAutoUpdate();
    });

    // Invertieren (nur Raster-Maske): tauscht die Matte Form↔außen.
    document.getElementById('cfg-mask-invert').addEventListener('change', () => {
      invertMaskMatte();
    });

    refreshMaskUiFromState();
  }

  async function render(words, cfg) {
    // Schon laufendes Layout abbrechen — neuere Parameter gewinnen
    if (currentLayoutHandle) currentLayoutHandle.cancel();
    arrangePending = false; refreshArrangeButton();

    if (!words.length) {
      setMessage(t('msg.noWords'), 'error');
      currentRender = null;
      clearStage();
      return;
    }

    await preloadLayoutFonts(words, cfg);

    const maxW = Math.max(...words.map(w => w.weight));
    const minW = Math.min(...words.map(w => w.weight));
    const scaleFn = makeScaleFn(cfg.scaleMethod, minW, maxW, cfg.sizeMin, cfg.sizeMax);
    const prng = makePRNG(cfg.seed);

    // Globale Rotation-Konfig (Default für Gruppen mit mode='auto')
    const globalRot = {
      mode: cfg.rotMode,
      rotMin: cfg.rotMin,
      rotMax: cfg.rotMax,
      rotShare: cfg.rotShare,
      rotDistribution: cfg.rotDistribution,
    };

    // Wörter pro Gruppe aufteilen, dann pro Gruppe die effektive Rotation-Config
    // auflösen und die rotierenden IDs bestimmen.
    const wordsByGroup = new Map();
    words.forEach(w => {
      if (!wordsByGroup.has(w.groupId)) wordsByGroup.set(w.groupId, []);
      wordsByGroup.get(w.groupId).push(w);
    });
    const rotatingIds = new Set();
    const angleFnByGroup = new Map();
    wordsByGroup.forEach((groupWords, groupId) => {
      const g = findGroup(groupId);
      const rotCfg = (g && g.rotation && g.rotation.mode !== 'auto') ? g.rotation : globalRot;
      const targets = decideRotationTargets(groupWords, rotCfg.rotDistribution, rotCfg.rotShare, prng);
      targets.forEach(id => rotatingIds.add(id));
      angleFnByGroup.set(groupId, makeAngleFn(rotCfg.mode, rotCfg.rotMin, rotCfg.rotMax, prng));
    });

    const rotateFn = (d) => {
      if (d.fixedRotation != null) return d.fixedRotation;
      const fn = angleFnByGroup.get(d.groupId);
      return fn ? fn() : 0;
    };

    // Engine-Auswahl: state.engine ist source-of-truth; cfg.engine als fallback.
    const engineName = state.engine || cfg.engine || 'd3-cloud';
    // Padding-Bonus pro Gruppe gilt nur bei d3-cloud (wordcloud2 hat keine
    // Per-Wort-Padding-API). Bei wc2 ignorieren wir das Override.
    const respectPadding = engineName !== 'wordcloud2';

    // Pro-Wort-Resolving: Font, Größenfaktor, Padding-Bonus, fixedRotation.
    // Engine kennt state.groups nicht — alles muss am Wort kleben.
    // Stabile Farb-/Gruppen-Indizes (Gewichts-Rang) — unabhängig von der Platzierungs-
    // Reihenfolge, damit ein gepinntes Wort (im placed-Array vorgezogen) seine Farbe behält.
    const colorTotal = words.length;
    const grpCount = new Map();
    words.forEach(w => grpCount.set(w.groupId, (grpCount.get(w.groupId) || 0) + 1));
    const grpSeen = new Map();
    words.forEach((w, idx) => {
      w._colorIndex = idx;
      const k = grpSeen.get(w.groupId) || 0;
      w._groupIndex = k; grpSeen.set(w.groupId, k + 1);
      w._groupTotal = grpCount.get(w.groupId);
    });

    // Per-Wort-Pins (2b): gepinnte Wörter gehen als Fix-Liste an die Engine, der Rest frei.
    const usePins = (engineName !== 'wordcloud2');
    const freeSource = usePins ? words.filter(w => !w.pin) : words;
    const pinnedSource = usePins ? words.filter(w => w.pin) : [];
    const layoutWords = freeSource.map(w => {
      const g = findGroup(w.groupId);
      const sizeFactor = (g && typeof g.sizeFactor === 'number' && g.sizeFactor > 0) ? g.sizeFactor : 1;
      const paddingBonus = (respectPadding && g && typeof g.padding === 'number' && g.padding > 0) ? g.padding : 0;
      return {
        id: w.id,
        color: w.color || null,
        text: w.text,
        size: scaleFn(w.weight) * sizeFactor,
        groupId: w.groupId,
        font: fontForWord(w, cfg.font),
        fixedRotation: rotatingIds.has(w.id) ? null : 0,
        groupPaddingBonus: paddingBonus,
        colorIndex: w._colorIndex, colorTotal, groupIndex: w._groupIndex, groupTotal: w._groupTotal,
      };
    });
    const pinnedLayout = pinnedSource.map(w => {
      const g = findGroup(w.groupId);
      const sizeFactor = (g && typeof g.sizeFactor === 'number' && g.sizeFactor > 0) ? g.sizeFactor : 1;
      const paddingBonus = (respectPadding && g && typeof g.padding === 'number' && g.padding > 0) ? g.padding : 0;
      return {
        id: w.id,
        color: w.color || null,
        text: w.text,
        size: scaleFn(w.weight) * sizeFactor,
        groupId: w.groupId,
        font: fontForWord(w, cfg.font),
        padding: cfg.padding + paddingBonus,
        rotate: (w.pin && typeof w.pin.rotate === 'number') ? w.pin.rotate : 0,
        x: w.pin.x, y: w.pin.y,
        colorIndex: w._colorIndex, colorTotal, groupIndex: w._groupIndex, groupTotal: w._groupTotal,
      };
    });

    setMessage(t('msg.layoutCalc', { n: words.length }));
    showStatus(t('msg.layoutStatus'));

    // Layout-UX: verzögertes Dimmen + rotierende Spirale. Bei Start: bestehenden
    // Dim-Timer killen, falls noch von letztem Lauf aktiv, dann neuen 100-ms-Timer.
    const stage = document.getElementById('stage');
    if (stageDimTimer) clearTimeout(stageDimTimer);
    stage.classList.remove('computing');
    stageDimTimer = setTimeout(() => stage.classList.add('computing'), 100);

    const engineCfg = {
      width: cfg.width, height: cfg.height,
      padding: cfg.padding,
      spiral: cfg.spiral,
      font: cfg.font,
      prng: prng,
      rotateFn: rotateFn,
      // Für wordcloud2:
      rotMode: cfg.rotMode,
      rotMin: cfg.rotMin,
      rotMax: cfg.rotMax,
      rotShare: cfg.rotShare,
      pinned: pinnedLayout,
      wc2: state.wc2,
      paletteSpec: cfg.paletteSpec,
      bgCanvas: cfg.bgCanvas,
      bgForm:   cfg.bgForm,
    };

    const engine = ENGINES[engineName] || ENGINES['d3-cloud'];
    // Variante-B-Mapping: bei wordcloud2 + Slug ∈ native shapes verwenden wir wc2's
    // analytische `shape:`-Funktion statt eines Canvas. Schneller, gleiches visuelles Ergebnis.
    const useNativeWc2Shape = engineName === 'wordcloud2'
      && state.wc2.useNativeShapes
      && state.mask && state.mask.type === 'slug'
      && WC2_NATIVE_SHAPES.has(state.mask.value);

    let maskCanvas = null;
    if (state.mask && !useNativeWc2Shape) {
      try { maskCanvas = await buildMaskCanvas(state.mask, cfg.width, cfg.height); }
      catch (e) { /* Maske ungültig → ignorieren, normales Layout */ }
    }
    // Wenn native: wir geben den slug-Wert via engineCfg.maskShape weiter,
    // damit die Engine den nativen wc2-shape direkt nutzt.
    engineCfg.maskShape = useNativeWc2Shape ? state.mask.value : null;
    const handle = engine.layout(layoutWords, engineCfg, maskCanvas);
    currentLayoutHandle = handle;

    // UI-Cleanup wird nur ausgeführt, wenn dieses Layout das aktuelle ist —
    // sonst hat ein neueres render() die UX schon übernommen.
    const cleanupUi = () => {
      clearTimeout(stageDimTimer); stageDimTimer = null;
      stage.classList.remove('computing');
      hideStatus();
    };

    try {
      const result = await handle.promise;
      if (currentLayoutHandle !== handle) return;   // überholt
      currentLayoutHandle = null;
      cleanupUi();
      if (result.kind === 'canvas') {
        showCanvasInStage(result.canvas, words.length, cfg, { suppressSilhouette: useNativeWc2Shape }, maskCanvas);
      } else {
        drawWords(result.placed, words.length, cfg, maskCanvas);
      }
    } catch (e) {
      if (currentLayoutHandle !== handle) return;   // überholt
      currentLayoutHandle = null;
      // Cancelled → stiller Abbruch (kein UI-Reset, neues Layout läuft schon)
      if (!e || e.message !== 'cancelled') {
        cleanupUi();
        setMessage(t('msg.layoutFailed'), 'error');
      }
    }
  }

  function preloadAllWebFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const fonts = FONT_GROUPS.flatMap(g => g.items.map(i => i.value));
    fonts.forEach(f => { document.fonts.load('16px ' + f).catch(() => {}); });
  }

  function fontForWord(d, globalFont) {
    const g = findGroup(d.groupId);
    if (g && g.font && g.font !== FONT_AUTO) return g.font;
    return globalFont;
  }

  // Berechnet die HSL-Verlaufsfarbe für Position t∈[0,1], optional mit Via-Stop.
  function gradientColorAt(grad, t) {
    if (grad.useVia && grad.via) {
      if (t < 0.5) return interpolateHSL(grad.from, grad.via, t * 2);
      return interpolateHSL(grad.via, grad.to, (t - 0.5) * 2);
    }
    return interpolateHSL(grad.from, grad.to, t);
  }

  function colorForWord(d, paletteSpec, globalIndex, totalCount, groupIndex, groupTotal) {
    if (d.color) return d.color;   // Per-Wort-Override schlägt Gruppe + Palette (gilt d3 & wc2)
    const g = findGroup(d.groupId);
    // Pro-Gruppe Override hat Vorrang vor globaler Palette
    if (g) {
      if (g.paletteMode === PALETTE_MODE_GRADIENT && g.gradient) {
        const tg = groupTotal > 1 ? groupIndex / (groupTotal - 1) : 0;
        return gradientColorAt(g.gradient, tg);
      }
      if (g.paletteMode === PALETTE_MODE_COLOR && g.color && g.color !== COLOR_AUTO) {
        return g.color;
      }
    }
    // Globale Palette
    if (paletteSpec.type === 'gradient') {
      const t = totalCount > 1 ? globalIndex / (totalCount - 1) : 0;
      return gradientColorAt({ from: paletteSpec.from, via: paletteSpec.via, to: paletteSpec.to, useVia: !!paletteSpec.via }, t);
    }
    const cols = paletteSpec.colors || ['#333'];
    return cols[globalIndex % cols.length];
  }

  function drawWords(placed, totalIn, cfg, maskCanvas) {
    clearStage();

    if (placed.length === 0) {
      setMessage(t('msg.layoutFailed'), 'error');
      currentRender = null;
      return;
    }

    if (placed.length < totalIn) {
      setMessage(t('msg.placedPartial', { n: placed.length, total: totalIn }));
    } else {
      setMessage(t('msg.placed', { n: placed.length }));
    }

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('width', cfg.width);
    svg.setAttribute('height', cfg.height);
    svg.setAttribute('viewBox', `0 0 ${cfg.width} ${cfg.height}`);

    // Layer 1: Canvas-BG. Bei aktiver Maske auf den Außenbereich der Form beschränkt
    // (makeCanvasBgLayer), damit transparenter Form-BG die Canvas-Farbe ausstanzt.
    if (cfg.bgCanvas !== 'transparent') {
      svg.appendChild(makeCanvasBgLayer(cfg.width, cfg.height, cfg.bgCanvas, maskCanvas));
    }

    // Layer 2: Form-BG (nur bei aktiver Maske, nicht transparent)
    if (state.mask && cfg.bgForm !== 'transparent') {
      const fillLayer = makeMaskFillLayer(cfg.width, cfg.height, cfg.bgForm, maskCanvas);
      if (fillLayer) svg.appendChild(fillLayer);
    }

    // Layer 3: Vorschau-Rahmen (beim Export entfernt). Bei aktiver Maske nur die
    // gestrichelte Silhouette UND nur bei transparentem Form-BG (bei farbigem
    // Form-BG ist die Form sichtbar, die Strichlinie wäre redundant).
    // Ohne Maske: Standard-Bounds-Rechteck.
    if (state.mask) {
      if (cfg.bgForm === 'transparent') {
        const silhouette = makeMaskSilhouette(cfg.width, cfg.height, maskCanvas);
        if (silhouette) svg.appendChild(silhouette);
      }
    } else {
      svg.appendChild(makeBoundsRect(cfg.width, cfg.height));
    }

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${cfg.width / 2}, ${cfg.height / 2})`);

    // Farben über stabile, am Wort hängende Indizes (Gewichts-Rang) vergeben — NICHT über
    // die placed-Reihenfolge, sonst ändert ein Pin (im placed vorgezogen) die Farbe.
    const pinnedIdSet = new Set(state.entries.filter(e => e.pin).map(e => e.id));
    placed.forEach((w, i) => {
      const ci = (w.colorIndex != null) ? w.colorIndex : i;
      const ct = (w.colorTotal != null) ? w.colorTotal : placed.length;
      const gi = (w.groupIndex != null) ? w.groupIndex : 0;
      const gt = (w.groupTotal != null) ? w.groupTotal : 1;
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('transform', `translate(${w.x}, ${w.y}) rotate(${w.rotate})`);
      text.setAttribute('font-family', fontForWord(w, cfg.font));
      text.setAttribute('font-size', w.size + 'px');
      const autoFill = colorForWord(Object.assign({}, w, { color: null }), cfg.paletteSpec, ci, ct, gi, gt);
      text.setAttribute('fill', w.color || autoFill);
      text.dataset.entryId = w.id;
      text.dataset.autoFill = autoFill;   // für „Auto"-Reset ohne Re-Layout
      text.textContent = w.text;
      g.appendChild(text);
      if (pinnedIdSet.has(w.id)) {
        const marker = document.createElementNS(SVG_NS, 'circle');
        marker.setAttribute('class', 'word-pin-marker');
        marker.setAttribute('data-entry-id', w.id);
        marker.setAttribute('cx', w.x); marker.setAttribute('cy', w.y);
        marker.setAttribute('r', 3.5);
        text.setAttribute('data-pinned', '1');
        g.appendChild(marker);
      }
    });

    const eff = makeEffectFilter(cfg);
    if (eff) {
      svg.insertBefore(eff.defs, svg.firstChild);
      g.setAttribute('filter', `url(#${eff.id})`);
    }
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('a11y.cloudLabel', { n: placed.length }));
    svg.appendChild(g);
    document.getElementById('stage').appendChild(svg);

    currentRender = { kind: 'svg', svg, width: cfg.width, height: cfg.height, background: cfg.bgCanvas };
  }

  // wordcloud2-Output: Canvas direkt im Stage anzeigen, optional Silhouette als Overlay.
  // opts.suppressSilhouette: true → keine Silhouette-Outline (bei nativem wc2-Shape,
  // weil die Cloud die volle Fläche nutzt und die Silhouette nicht zur Form passt).
  function showCanvasInStage(canvas, totalIn, cfg, opts, maskCanvas) {
    clearStage();
    setMessage(t('msg.placed', { n: totalIn }));
    // Wrapper für Canvas + optionalem Silhouette-Overlay
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.style.display = 'inline-block';
    wrap.style.maxWidth = '100%';
    wrap.style.maxHeight = '100%';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    canvas.style.width = 'auto';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    canvas.style.position = 'relative';
    canvas.style.zIndex = '1';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('a11y.cloudLabel', { n: totalIn }));
    wrap.appendChild(canvas);
    // Silhouette (gefüllte Form-Tönung) HINTER den Canvas legen. Unterdrückt bei
    // nativem wc2-Shape ODER bei farbigem Form-BG (Form sichtbar → Guide redundant).
    // Der Canvas (z-index 1) ist im Form-Inneren ohne Wort transparent, sodass die
    // dezente Tönung dort durchscheint, ohne die Wörter zu überlagern.
    const suppressSil = (opts && opts.suppressSilhouette) || (cfg.bgForm !== 'transparent');
    const silhouette = suppressSil ? null : makeMaskSilhouette(cfg.width, cfg.height, maskCanvas);
    if (silhouette) {
      const bg = document.createElementNS(SVG_NS, 'svg');
      bg.setAttribute('xmlns', SVG_NS);
      bg.setAttribute('viewBox', `0 0 ${cfg.width} ${cfg.height}`);
      bg.style.position = 'absolute';
      bg.style.inset = '0';
      bg.style.width = '100%';
      bg.style.height = '100%';
      bg.style.zIndex = '0';
      bg.style.pointerEvents = 'none';
      bg.appendChild(silhouette);
      wrap.appendChild(bg);
    }
    document.getElementById('stage').appendChild(wrap);
    currentRender = { kind: 'canvas', canvas, width: cfg.width, height: cfg.height, background: cfg.bgCanvas };
  }

  // ============ Export ============

  function serializeRenderSvgForExport() {
    // Klon des aktuellen SVG ohne Hilfsrahmen (.cloud-bounds-preview)
    const cloned = currentRender.svg.cloneNode(true);
    cloned.querySelectorAll('.cloud-bounds-preview, .word-pin-marker, .word-selection').forEach(el => el.remove());
    return new XMLSerializer().serializeToString(cloned);
  }

  function exportSVG() {
    if (!currentRender) { setMessage(t('msg.generateFirst'), 'error'); return; }
    if (currentRender.kind !== 'svg') {
      // wordcloud2 rendert in Canvas — kein nativer SVG-Export verfügbar.
      setMessage(t('msg.svgUnavailableCanvas'), 'error');
      return;
    }
    const xml = serializeRenderSvgForExport();
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, 'wordcloud.svg');
  }

  // Erzeugt einen PNG-Blob der aktuellen Cloud in `scale`-facher Auflösung. cb(blob|null).
  // Von PNG-Download UND Zwischenablage-Kopieren geteilt (DRY).
  function renderPngBlob(scale, cb) {
    // Fälle mit eigener Meldung (kein Render / Raster-Fehler) rufen cb NICHT,
    // damit die Caller nicht mit msg.pngFailed überschreiben. cb feuert nur mit
    // dem toBlob-Ergebnis (Blob oder null).
    if (!currentRender) { setMessage(t('msg.generateFirst'), 'error'); return; }
    const w = currentRender.width * scale;
    const h = currentRender.height * scale;
    // Canvas-Pfad: bestehendes Canvas direkt skaliert dumpen.
    if (currentRender.kind === 'canvas') {
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      out.getContext('2d').drawImage(currentRender.canvas, 0, 0, w, h);
      out.toBlob(cb, 'image/png');
      return;
    }
    // SVG-Pfad: SVG via Image rastern, dann als PNG dumpen.
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const xml = serializeRenderSvgForExport();
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(cb, 'image/png');
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      setMessage(t('msg.pngRasterFailed'), 'error');
    };
    img.src = url;
  }

  function exportPNG() {
    const scale = parseInt(document.getElementById('cfg-png-scale').value, 10) || 1;
    renderPngBlob(scale, blob => {
      if (!blob) { setMessage(t('msg.pngFailed'), 'error'); return; }
      downloadBlob(blob, 'wordcloud.png');
    });
  }

  // Kopiert die aktuelle Cloud als PNG in die Zwischenablage (clipboard.write/ClipboardItem).
  function copyPNGToClipboard() {
    const scale = parseInt(document.getElementById('cfg-png-scale').value, 10) || 1;
    renderPngBlob(scale, async blob => {
      if (!blob) { setMessage(t('msg.pngFailed'), 'error'); return; }
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setMessage(t('msg.imageCopied'));
      } catch (err) {
        setMessage(t('msg.copyFailed'), 'error');
      }
    });
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ============ UI helpers ============

  function setMessage(text, kind) {
    const el = document.getElementById('messages');
    el.textContent = text || '';
    el.classList.toggle('error', kind === 'error');
  }
  function showStatus(text) { const el = document.getElementById('stage-status'); el.textContent = text; el.hidden = false; }
  function hideStatus()     { document.getElementById('stage-status').hidden = true; }
  // =========================================================================
  // Vorschau-Ansicht: Zoom / Pan / „Ganze Form" / Silhouetten-Toggle.
  // Rein visuell — transform sitzt auf #stage, currentRender/Export unberührt.
  // Session-Zustand, kein Snapshot-Touch. Siehe docs/specs/2026-06-01-vorschau-zoom-pan.md
  // =========================================================================
  const VIEW_MIN = 1, VIEW_MAX = 8;
  let view = { scale: 1, tx: 0, ty: 0 };

  function applyView() {
    const stage = document.getElementById('stage');
    if (stage) stage.style.transform = 'translate(' + view.tx + 'px,' + view.ty + 'px) scale(' + view.scale + ')';
    const lbl = document.getElementById('zoom-level');
    if (lbl) lbl.textContent = Math.round(view.scale * 100) + ' %';
  }

  function fitView() {
    view = { scale: 1, tx: 0, ty: 0 };
    applyView();
  }

  // Zoom auf Punkt (mx,my) relativ zum Stage-Mittelpunkt (CSS-px, untransformiert).
  function zoomViewAt(factor, mx, my) {
    const s0 = view.scale;
    const s1 = Math.max(VIEW_MIN, Math.min(VIEW_MAX, s0 * factor));
    if (s1 === s0) return;
    if (s1 === VIEW_MIN) { fitView(); return; }
    const r = s1 / s0;
    view.tx = mx - r * (mx - view.tx);
    view.ty = my - r * (my - view.ty);
    view.scale = s1;
    applyView();
  }

  function stageCenterOffset(clientX, clientY) {
    const wrap = document.querySelector('.stage-wrap');
    const rect = wrap.getBoundingClientRect();
    return { mx: clientX - (rect.left + rect.width / 2), my: clientY - (rect.top + rect.height / 2) };
  }

  function initStageViewport() {
    const wrap = document.querySelector('.stage-wrap');
    if (!wrap) return;

    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const { mx, my } = stageCenterOffset(e.clientX, e.clientY);
      zoomViewAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, mx, my);
    }, { passive: false });

    let panning = false, startX = 0, startY = 0, startTx = 0, startTy = 0, downTarget = null, moved = false, downMeta = false;
    let dragWordId = null, dragWordEl = null, dragStartLX = 0, dragStartLY = 0;
    wrap.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.stage-toolbars')) return;
      if (e.target.closest('#selected-word-panel')) return;
      if (e.target.closest('#stage-status')) return;
      moved = false; downTarget = e.target; downMeta = (e.metaKey || e.ctrlKey);
      const wordEl = e.target.closest ? e.target.closest('text[data-entry-id]') : null;
      if (wordEl) {
        dragWordId = wordEl.dataset.entryId; dragWordEl = wordEl;
        const tr = (wordEl.getAttribute('transform') || '').match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
        dragStartLX = tr ? parseFloat(tr[1]) : 0; dragStartLY = tr ? parseFloat(tr[2]) : 0;
      } else { dragWordId = null; dragWordEl = null; }
      panning = true; startX = e.clientX; startY = e.clientY; startTx = view.tx; startTy = view.ty;
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!panning) return;
      if (!moved && (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4)) {
        moved = true; if (!dragWordId) wrap.classList.add('panning');
      }
      if (!moved) return;
      if (dragWordId) {
        const sc = stageLayoutScale();
        const lx = dragStartLX + (e.clientX - startX) / sc, ly = dragStartLY + (e.clientY - startY) / sc;
        if (dragWordEl) {
          const rotM = (dragWordEl.getAttribute('transform') || '').match(/rotate\([^)]*\)/);
          dragWordEl.setAttribute('transform', 'translate(' + lx + ', ' + ly + ')' + (rotM ? ' ' + rotM[0] : ''));
          renderSelectionRects();
        }
      } else {
        view.tx = startTx + (e.clientX - startX); view.ty = startTy + (e.clientY - startY); applyView();
      }
    });
    const endPan = (e) => {
      if (!panning) return;
      panning = false; wrap.classList.remove('panning');
      try { wrap.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (dragWordId && moved) {
        const sc = stageLayoutScale();
        const lx = dragStartLX + (e.clientX - startX) / sc, ly = dragStartLY + (e.clientY - startY) / sc;
        selectOnly(dragWordId);
        pinWordAt(dragWordId, lx, ly);
      } else if (!moved) {
        const textEl = downTarget && downTarget.closest ? downTarget.closest('text[data-entry-id]') : null;
        if (textEl) { const id = textEl.dataset.entryId; if (downMeta) toggleInSelection(id); else selectOnly(id); }
        else { deselectAll(); }
      }
      dragWordId = null; dragWordEl = null;
    };
    wrap.addEventListener('pointerup', endPan);
    wrap.addEventListener('pointercancel', endPan);

    document.getElementById('btn-zoom-in').addEventListener('click', () => zoomViewAt(1.25, 0, 0));
    document.getElementById('btn-zoom-out').addEventListener('click', () => zoomViewAt(1 / 1.25, 0, 0));
    document.getElementById('btn-zoom-fit').addEventListener('click', fitView);

    const guides = document.getElementById('cfg-show-guides');
    if (guides) {
      guides.addEventListener('change', () => wrap.classList.toggle('guides-hidden', !guides.checked));
    }
    refreshGuidesToggleState();

    applyView();
  }

  // Silhouetten-Toggle nur bei aktiver Maske bedienbar — ohne Maske gibt es keine
  // Silhouette; dann ausgegraut + auf „an" (Standard, Hilfslinien sichtbar) fixiert.
  function refreshGuidesToggleState() {
    const cb = document.getElementById('cfg-show-guides');
    if (!cb) return;
    const hasMask = !!state.mask;
    cb.disabled = !hasMask;
    if (!hasMask) cb.checked = true;
    const wrap = document.querySelector('.stage-wrap');
    if (wrap) wrap.classList.toggle('guides-hidden', !cb.checked);
  }

  // =========================================================================
  // Per-Wort-Auswahl (Set) — Klick = eins, Cmd/Strg-Klick = mehrere, Shift = Bereich (Tabelle).
  // Farbe/Auto wirken auf alle Markierten; Pin/Position nur bei Einzel-Auswahl.
  // Reflow nur auf Wunsch (#btn-arrange). d3-cloud-only. Transient (kein Snapshot).
  // Siehe docs/specs/2026-06-03-mehrfachauswahl-farbe.md
  // =========================================================================
  let selectedIds = new Set();
  let lastClickedRowId = null;

  function firstSelected() { const it = selectedIds.values().next(); return it.done ? null : it.value; }
  function wordTextEl(id) { return document.querySelector('#stage svg text[data-entry-id="' + id + '"]'); }

  let _hexCtx = null;
  function toHexColor(c) {
    if (!c) return null;
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    if (!_hexCtx) { const cv = document.createElement('canvas'); cv.width = cv.height = 1; _hexCtx = cv.getContext('2d'); }
    _hexCtx.fillStyle = '#000'; _hexCtx.fillStyle = c;
    const v = _hexCtx.fillStyle;
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
  }
  function currentWordColor(id) {
    const e = state.entries.find(x => x.id === id);
    if (e && e.color) return e.color;
    const tx = wordTextEl(id);
    return tx ? (tx.dataset.autoFill || tx.getAttribute('fill')) : null;
  }

  function renderSelectionRects() {
    document.querySelectorAll('#stage .word-selection').forEach(r => r.remove());
    selectedIds.forEach(id => {
      const text = wordTextEl(id);
      if (!text) return;
      let bb; try { bb = text.getBBox(); } catch (e) { return; }
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('class', 'word-selection');
      rect.setAttribute('x', bb.x - 2); rect.setAttribute('y', bb.y - 2);
      rect.setAttribute('width', bb.width + 4); rect.setAttribute('height', bb.height + 4);
      const tr = text.getAttribute('transform'); if (tr) rect.setAttribute('transform', tr);
      text.parentNode.appendChild(rect);
    });
  }

  function updateSelectedWordPanel() {
    const panel = document.getElementById('selected-word-panel');
    if (!panel) return;
    const n = selectedIds.size;
    if (n === 0) { panel.hidden = true; return; }
    const head = document.getElementById('sel-word-head');
    if (n === 1) {
      const e = state.entries.find(x => x.id === firstSelected());
      if (!e) { panel.hidden = true; return; }
      if (head) head.hidden = true;
    } else if (head) {
      head.hidden = false;
      head.textContent = t('selWord.countSelected', { n: n });
    }
    const inp = document.getElementById('sel-word-color');
    if (inp) {
      const cols = [...selectedIds].map(id => toHexColor(currentWordColor(id)));
      const allSame = cols.length > 0 && cols.every(c => c && c === cols[0]);
      if (allSame) { inp.classList.remove('mixed'); inp.value = cols[0]; }
      else { inp.classList.add('mixed'); }
    }
    const unpin = document.getElementById('sel-word-unpin');
    if (unpin) { const e = (n === 1) ? state.entries.find(x => x.id === firstSelected()) : null; unpin.hidden = !(e && e.pin); }
    const rotRow = document.getElementById('sel-word-rotation-row');
    if (rotRow) {
      if (n === 1) {
        const e = state.entries.find(x => x.id === firstSelected());
        let ang = 0;
        if (e && e.pin && typeof e.pin.rotate === 'number') ang = e.pin.rotate;
        else { const tx = wordTextEl(firstSelected()); const m = tx ? (tx.getAttribute('transform') || '').match(/rotate\(([-\d.]+)/) : null; if (m) ang = Math.round(parseFloat(m[1])); }
        const rinp = document.getElementById('sel-word-rotation'); if (rinp) rinp.value = ang;
        const rval = document.getElementById('sel-word-rotation-val'); if (rval) rval.textContent = ang + '°';
        rotRow.hidden = false;
      } else { rotRow.hidden = true; }
    }
    panel.hidden = false;
  }

  function refreshSelectionUI() {
    renderSelectionRects();
    document.querySelectorAll('#entries-tbody tr').forEach(tr => {
      if (tr.dataset.entryId) tr.classList.toggle('row-selected', selectedIds.has(tr.dataset.entryId));
    });
    updateSelectedWordPanel();
  }

  function setSelection(ids) { selectedIds = new Set(ids); refreshSelectionUI(); }
  function selectOnly(id) { setSelection(id ? [id] : []); }
  function toggleInSelection(id) { if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id); refreshSelectionUI(); }
  function deselectAll() { selectedIds.clear(); refreshSelectionUI(); }
  function selectRowRange(toId) {
    const ids = state.entries.map(e => e.id);
    const a = ids.indexOf(lastClickedRowId), b = ids.indexOf(toId);
    if (a < 0 || b < 0) { toggleInSelection(toId); lastClickedRowId = toId; return; }
    const lo = Math.min(a, b), hi = Math.max(a, b);
    for (let i = lo; i <= hi; i++) selectedIds.add(ids[i]);
    lastClickedRowId = toId; refreshSelectionUI();
  }

  function applyWordColor(color) {
    selectedIds.forEach(id => {
      const e = state.entries.find(x => x.id === id); if (!e) return;
      e.color = color;
      const tx = wordTextEl(id); if (tx) tx.setAttribute('fill', color);
    });
    const inp = document.getElementById('sel-word-color'); if (inp) inp.classList.remove('mixed');
    renderEntriesTable(); refreshSelectionUI();
  }
  function resetWordColor() {
    selectedIds.forEach(id => {
      const e = state.entries.find(x => x.id === id); if (!e) return;
      e.color = null;
      const tx = wordTextEl(id); if (tx && tx.dataset.autoFill) tx.setAttribute('fill', tx.dataset.autoFill);
    });
    renderEntriesTable(); refreshSelectionUI(); updateSelectedWordPanel();
  }

  function updateWordPinMarker(id) {
    const old = document.querySelector('#stage svg .word-pin-marker[data-entry-id="' + id + '"]');
    if (old) old.remove();
    const text = wordTextEl(id); if (!text) return;
    const e = state.entries.find(x => x.id === id);
    if (e && e.pin) {
      const tr = (text.getAttribute('transform') || '').match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
      const x = tr ? parseFloat(tr[1]) : 0, y = tr ? parseFloat(tr[2]) : 0;
      const marker = document.createElementNS(SVG_NS, 'circle');
      marker.setAttribute('class', 'word-pin-marker');
      marker.setAttribute('data-entry-id', id);
      marker.setAttribute('cx', x); marker.setAttribute('cy', y); marker.setAttribute('r', 3.5);
      text.setAttribute('data-pinned', '1');
      text.parentNode.appendChild(marker);
    } else {
      text.removeAttribute('data-pinned');
    }
  }

  function pinWordAt(id, layoutX, layoutY) {
    const e = state.entries.find(x => x.id === id); if (!e) return;
    const text = wordTextEl(id);
    let rot = 0; if (text) { const m = (text.getAttribute('transform') || '').match(/rotate\(([-\d.]+)/); if (m) rot = parseFloat(m[1]); }
    e.pin = { x: Math.round(layoutX), y: Math.round(layoutY), rotate: rot };
    arrangePending = true;
    updateWordPinMarker(id);
    renderEntriesTable(); refreshSelectionUI(); refreshArrangeButton();
  }
  function setWordRotation(deg) {
    const id = firstSelected(); if (!id) return;
    const e = state.entries.find(x => x.id === id); if (!e) return;
    const text = wordTextEl(id);
    let x = 0, y = 0;
    if (e.pin) { x = e.pin.x; y = e.pin.y; }
    else if (text) { const tr = (text.getAttribute('transform') || '').match(/translate\(([-\d.]+),\s*([-\d.]+)\)/); if (tr) { x = parseFloat(tr[1]); y = parseFloat(tr[2]); } }
    e.pin = { x: Math.round(x), y: Math.round(y), rotate: deg };
    if (text) text.setAttribute('transform', 'translate(' + x + ', ' + y + ') rotate(' + deg + ')');
    arrangePending = true;
    updateWordPinMarker(id); renderSelectionRects(); renderEntriesTable(); refreshArrangeButton();
    const val = document.getElementById('sel-word-rotation-val'); if (val) val.textContent = deg + '°';
  }

  function unpinSelected() {
    const id = firstSelected(); const e = id ? state.entries.find(x => x.id === id) : null;
    if (!e || !e.pin) return;
    e.pin = null;
    arrangePending = true;
    updateWordPinMarker(id);
    renderEntriesTable(); refreshSelectionUI(); refreshArrangeButton();
  }
  let arrangePending = false;   // transient: eine Neuanordnung steht aus
  function refreshArrangeButton() {
    const btn = document.getElementById('btn-arrange');
    if (btn) btn.hidden = !(arrangePending && state.entries.some(e => e.pin));
  }

  // =========================================================================
  // Klappbare Einstellungs-Abschnitte + Start-Animation
  // Siehe docs/specs/2026-06-04-panel-klappbar-startanimation.md
  // =========================================================================
  const PANEL_COLLAPSE_KEY = 'wordcloud:panelCollapse';
  const PANEL_SECTIONS = ['engine', 'color', 'effect', 'mask', 'font', 'rotation', 'rendering'];
  const PANEL_SECTION_BY_I18N = {
    'config.engineHeading': 'engine',
    'config.colorBg': 'color',
    'config.effect': 'effect',
    'config.maskHeading': 'mask',
    'config.font': 'font',
    'config.rotLayout': 'rotation',
    'config.rendering': 'rendering',
  };
  // Default beim allerersten Start: alle zu außer „Farbe & Hintergrund".
  const PANEL_DEFAULT_COLLAPSE = { engine: true, color: false, effect: true, mask: true, font: true, rotation: true, rendering: true };
  let panelCollapseState = null;

  function loadPanelCollapseState() {
    let stored = {};
    try { const raw = localStorage.getItem(PANEL_COLLAPSE_KEY); if (raw) stored = JSON.parse(raw) || {}; } catch (e) { stored = {}; }
    const out = {};
    PANEL_SECTIONS.forEach(s => { out[s] = (typeof stored[s] === 'boolean') ? stored[s] : PANEL_DEFAULT_COLLAPSE[s]; });
    return out;
  }

  function savePanelCollapseState() {
    try { localStorage.setItem(PANEL_COLLAPSE_KEY, JSON.stringify(panelCollapseState)); } catch (e) {}
  }

  // Endzustand wird IMMER synchron per Klasse gesetzt (Layout sofort korrekt, nie „stuck").
  // Die Faltung ist nur kosmetisch über die Web Animations API — fällt am Boot der
  // Welcome-Render den Main-Thread blockiert, schnappt der Abschnitt einfach (kein Hängenbleiben).
  function applyCollapsed(section, collapsed, animate) {
    const fs = document.querySelector('.config-panel fieldset[data-section="' + section + '"]');
    if (!fs) return;
    const btn = fs.querySelector('.fs-toggle');
    if (btn) btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const body = fs.querySelector('.fs-body');
    const from = (animate && body) ? body.getBoundingClientRect().height : null;
    fs.classList.toggle('collapsed', collapsed);   // Ruhezustand (CSS: 0 bzw. auto) sofort
    if (body) body.style.height = '';
    if (animate && body && typeof body.animate === 'function') {
      const to = body.getBoundingClientRect().height;
      if (Math.abs(from - to) > 0.5) {
        body.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 280, easing: 'ease' });
      }
    }
  }

  function setCollapsed(section, collapsed, persist) {
    applyCollapsed(section, collapsed, true);
    if (panelCollapseState) panelCollapseState[section] = collapsed;
    if (persist !== false) savePanelCollapseState();
  }

  function initPanelCollapse() {
    const panel = document.querySelector('.config-panel');
    if (!panel) return;
    // Struktur aufbauen: data-section + Legende→Button + Inhalt in .fs-body > .fs-body-inner.
    panel.querySelectorAll(':scope > fieldset').forEach(fs => {
      const legend = fs.querySelector(':scope > legend');
      if (!legend) return;
      const key = legend.getAttribute('data-i18n');
      const section = PANEL_SECTION_BY_I18N[key];
      if (!section) return;
      fs.dataset.section = section;
      // Legende → Button (data-i18n auf Titel-Span umziehen, damit applyLanguage weiter greift)
      const title = document.createElement('span');
      title.setAttribute('data-i18n', key);
      title.textContent = legend.textContent;
      legend.removeAttribute('data-i18n');
      legend.textContent = '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fs-toggle';
      btn.setAttribute('aria-expanded', 'true');
      const chev = document.createElement('span');
      chev.className = 'fs-chevron';
      chev.setAttribute('aria-hidden', 'true');
      btn.appendChild(chev);
      btn.appendChild(title);
      legend.appendChild(btn);
      // Inhalt nach der Legende einwickeln
      const body = document.createElement('div'); body.className = 'fs-body';
      const inner = document.createElement('div'); inner.className = 'fs-body-inner';
      let node = legend.nextSibling;
      while (node) { const next = node.nextSibling; inner.appendChild(node); node = next; }
      body.appendChild(inner);
      fs.appendChild(body);
      btn.addEventListener('click', () => {
        setCollapsed(section, !fs.classList.contains('collapsed'), true);
      });
    });

    panelCollapseState = loadPanelCollapseState();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      PANEL_SECTIONS.forEach(s => applyCollapsed(s, panelCollapseState[s], false));
      return;
    }
    // Start-Effekt: erst alle offen, dann von oben nach unten die zu-Abschnitte falten (~1 s).
    PANEL_SECTIONS.forEach(s => applyCollapsed(s, false, false));
    const toCollapse = PANEL_SECTIONS.filter(s => panelCollapseState[s]);
    const stagger = Math.floor(1000 / Math.max(1, toCollapse.length));
    toCollapse.forEach((s, i) => { setTimeout(() => applyCollapsed(s, true, true), i * stagger); });
  }

  function initWordSelection() {
    const inp = document.getElementById('sel-word-color');
    if (inp) inp.addEventListener('input', () => applyWordColor(inp.value));
    const auto = document.getElementById('sel-word-color-auto'); if (auto) auto.addEventListener('click', resetWordColor);
    const unpinBtn = document.getElementById('sel-word-unpin'); if (unpinBtn) unpinBtn.addEventListener('click', unpinSelected);
    const rotInp = document.getElementById('sel-word-rotation');
    if (rotInp) rotInp.addEventListener('input', () => setWordRotation(parseInt(rotInp.value, 10) || 0));
    const rotReset = document.getElementById('sel-word-rotation-reset');
    if (rotReset) rotReset.addEventListener('click', () => { const r = document.getElementById('sel-word-rotation'); if (r) r.value = 0; setWordRotation(0); });
    const arrangeBtn = document.getElementById('btn-arrange'); if (arrangeBtn) arrangeBtn.addEventListener('click', () => reflow(firstSelected()));
    let arrowTimer = null;
    document.addEventListener('keydown', (e) => {
      if (selectedIds.size === 0) return;
      if (e.key === 'Escape') { e.preventDefault(); deselectAll(); return; }
      if (selectedIds.size !== 1) return;
      const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!arrows[e.key]) return;
      if (document.activeElement && /input|textarea|select/i.test(document.activeElement.tagName)) return;
      e.preventDefault();
      const id = firstSelected();
      const step = e.shiftKey ? 10 : 1;
      const text = wordTextEl(id);
      const tr = text ? (text.getAttribute('transform') || '').match(/translate\(([-\d.]+),\s*([-\d.]+)\)/) : null;
      const e0 = state.entries.find(x => x.id === id);
      const baseX = e0 && e0.pin ? e0.pin.x : (tr ? parseFloat(tr[1]) : 0);
      const baseY = e0 && e0.pin ? e0.pin.y : (tr ? parseFloat(tr[2]) : 0);
      const nx = baseX + arrows[e.key][0] * step, ny = baseY + arrows[e.key][1] * step;
      if (text) { const rotM = (text.getAttribute('transform') || '').match(/rotate\([^)]*\)/); text.setAttribute('transform', 'translate(' + nx + ', ' + ny + ')' + (rotM ? ' ' + rotM[0] : '')); }
      if (e0) { let rot = 0; if (text) { const m = (text.getAttribute('transform') || '').match(/rotate\(([-\d.]+)/); if (m) rot = parseFloat(m[1]); } e0.pin = { x: Math.round(nx), y: Math.round(ny), rotate: rot }; }
      updateWordPinMarker(id); renderSelectionRects();
      arrangePending = true;
      clearTimeout(arrowTimer); arrowTimer = setTimeout(() => { renderEntriesTable(); refreshSelectionUI(); refreshArrangeButton(); }, 150);
    });
  }

  function reflow(reselectId) {
    const cfg = readConfig();
    if (cfg.sizeMin >= cfg.sizeMax) return;
    const words = state.entries
      .filter(e => e.text && e.text.trim() && e.weight > 0)
      .map(e => ({ id: e.id, text: e.text, weight: e.weight, groupId: e.groupId, color: e.color || null, pin: e.pin || null }))
      .sort((a, b) => b.weight - a.weight);
    if (words.length === 0) { clearStage(); currentRender = null; return; }
    const p = render(words, cfg);
    Promise.resolve(p).then(() => { if (reselectId && state.entries.find(e => e.id === reselectId)) selectOnly(reselectId); });
  }

  function stageLayoutScale() {
    const svg = document.querySelector('#stage svg');
    if (!svg) return 1;
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal.width : (parseFloat(svg.getAttribute('width')) || 1);
    const shown = svg.getBoundingClientRect().width;
    return (shown && vb) ? (shown / vb) : 1;
  }

  function clearStage()     { document.getElementById('stage').innerHTML = ''; if (typeof deselectAll === 'function') deselectAll(); }

  function getBackground(layer) {
    // layer: 'canvas' oder 'form'
    const swatchesEl = document.getElementById(`cfg-bg-${layer}-swatches`);
    const active = swatchesEl ? swatchesEl.querySelector('.bg-swatch.active') : null;
    const choice = active ? active.dataset.bg : 'transparent';
    if (choice === 'transparent') return 'transparent';
    if (choice === 'white')       return '#ffffff';
    if (choice === 'black')       return '#000000';
    if (choice === 'custom')      return document.getElementById(`bg-${layer}-custom-color`).value || (layer === 'form' ? '#ffffff' : '#222244');
    return 'transparent';
  }

  function getPaletteSpec() {
    const id = document.getElementById('cfg-palette').value;
    if (id === '__gradient__') {
      const useVia = document.getElementById('cfg-palette-grad-use-via').checked;
      return {
        type: 'gradient',
        from: document.getElementById('cfg-palette-grad-from').value || '#000000',
        via:  useVia ? (document.getElementById('cfg-palette-grad-via').value || '#888888') : null,
        to:   document.getElementById('cfg-palette-grad-to').value   || '#ffffff',
      };
    }
    // Alle Vordefinierten und „Custom" greifen auf die Tafel-Palette zu (sie wurde beim
    // Auswählen des Presets gefüllt). Tafel-Edits gehen sofort in den Render.
    const cols = state.customPalette.filter(c => !!c);
    return { type: 'static', colors: cols.length ? cols : ['#333'] };
  }

  // ============ Custom-Palette: Inline-Editor mit Drag & Drop ============

  function markPaletteCustom() {
    const sel = document.getElementById('cfg-palette');
    if (sel && sel.value !== '__custom__' && sel.value !== '__gradient__') {
      sel.value = '__custom__';
    }
  }

  function renderInlinePalette() {
    const grid = document.getElementById('inline-palette-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const slotCount = state.customPalette.length;
    for (let i = 0; i < slotCount; i++) {
      const slot = document.createElement('div');
      const col = state.customPalette[i];
      slot.className = 'palette-slot' + (col ? '' : ' empty');
      slot.draggable = true;
      slot.dataset.idx = String(i);

      const fill = document.createElement('div');
      fill.className = 'slot-fill';
      if (col) fill.style.background = col;
      slot.appendChild(fill);

      const inp = document.createElement('input');
      inp.type = 'color';
      inp.value = col || '#888888';
      inp.addEventListener('input', () => {
        state.customPalette[i] = inp.value;
        // NICHT re-rendern — sonst wird der offene Color-Picker zerstört.
        // Nur das aktuelle Tafel-Element inkrementell updaten.
        fill.style.background = inp.value;
        slot.classList.remove('empty');
        markPaletteCustom();
        scheduleAutoUpdate();
      });
      slot.appendChild(inp);

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'slot-clear';
      clearBtn.textContent = '×';
      clearBtn.title = t('palette.slot.clear');
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.customPalette[i] = null;
        markPaletteCustom();
        renderInlinePalette();
        scheduleAutoUpdate();
      });
      slot.appendChild(clearBtn);

      const idx = document.createElement('span');
      idx.className = 'slot-idx';
      idx.textContent = (i + 1).toString();
      slot.appendChild(idx);

      // Drag & Drop
      slot.addEventListener('dragstart', (e) => {
        slot.classList.add('dragging');
        e.dataTransfer.setData('text/plain', String(i));
        e.dataTransfer.effectAllowed = 'move';
      });
      slot.addEventListener('dragend', () => {
        slot.classList.remove('dragging');
        document.querySelectorAll('.palette-slot').forEach(s => s.classList.remove('drop-target'));
      });
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slot.classList.add('drop-target');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('drop-target'));
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const to = i;
        if (isNaN(from) || from === to) return;
        moveCustomSlot(from, to);
        markPaletteCustom();
        renderInlinePalette();
        scheduleAutoUpdate();
      });

      grid.appendChild(slot);
    }
  }

  function moveCustomSlot(from, to) {
    const arr = state.customPalette;
    const val = arr[from];
    arr.splice(from, 1);
    arr.splice(to, 0, val);
    while (arr.length < 16) arr.push(null);
    if (arr.length > 16) arr.length = 16;
  }

  // ============ Verlauf-Vorschau (mit optionalem Via) ============

  function updateGradientPreview() {
    const el = document.getElementById('gradient-preview');
    if (!el) return;
    const from = document.getElementById('cfg-palette-grad-from').value;
    const to   = document.getElementById('cfg-palette-grad-to').value;
    const useVia = document.getElementById('cfg-palette-grad-use-via').checked;
    const via  = document.getElementById('cfg-palette-grad-via').value;
    const stops = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      let c;
      if (useVia) {
        if (t < 0.5) c = interpolateHSL(from, via, t * 2);
        else         c = interpolateHSL(via, to, (t - 0.5) * 2);
      } else {
        c = interpolateHSL(from, to, t);
      }
      stops.push(c + ' ' + (t * 100) + '%');
    }
    el.style.background = `linear-gradient(to right, ${stops.join(', ')})`;
  }

  // =========================================================================
  // Effekte (Schatten/Glühen) — nur d3-cloud. Beide = ein feDropShadow.
  // =========================================================================
  // Liest aktiven Effekt + Parameter aus dem DOM, skaliert mit der Render-Größe.
  // Bei wordcloud2 immer null (Effekt greift nicht, doppelte Absicherung zur UI).
  function effectParams(cfg) {
    if ((state.engine || 'd3-cloud') === 'wordcloud2') return null;
    const checked = document.querySelector('input[name="cfg-effect"]:checked');
    const type = checked ? checked.value : 'none';
    if (type !== 'shadow' && type !== 'glow') return null;
    const minDim = Math.min(cfg.width, cfg.height);
    if (type === 'shadow') {
      const s = Math.max(0, Math.min(100, parseInt(document.getElementById('cfg-effect-shadow-strength').value, 10) || 0));
      const d = Math.round(s / 100 * 0.015 * minDim);
      return { type, dx: d, dy: d, blur: d, color: document.getElementById('cfg-effect-shadow-color').value, opacity: 0.55 };
    }
    const s = Math.max(0, Math.min(100, parseInt(document.getElementById('cfg-effect-glow-strength').value, 10) || 0));
    const blur = Math.round(s / 100 * 0.025 * minDim);
    return { type, dx: 0, dy: 0, blur, color: document.getElementById('cfg-effect-glow-color').value, opacity: 0.9 };
  }

  // Baut ein <defs><filter>feDropShadow</filter></defs> aus cfg.effect. null wenn kein Effekt.
  function makeEffectFilter(cfg) {
    const p = cfg.effect;
    if (!p) return null;
    const id = 'wc-effect';
    const defs = document.createElementNS(SVG_NS, 'defs');
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('x', '-25%');
    filter.setAttribute('y', '-25%');
    filter.setAttribute('width', '150%');
    filter.setAttribute('height', '150%');
    const ds = document.createElementNS(SVG_NS, 'feDropShadow');
    ds.setAttribute('dx', p.dx);
    ds.setAttribute('dy', p.dy);
    ds.setAttribute('stdDeviation', p.blur);
    ds.setAttribute('flood-color', p.color);
    ds.setAttribute('flood-opacity', p.opacity);
    filter.appendChild(ds);
    defs.appendChild(filter);
    return { defs, id };
  }

  function readConfig() {
    const cfg = {
      paletteSpec: getPaletteSpec(),
      font: document.getElementById('cfg-font').value,
      scaleMethod: document.getElementById('cfg-scale').value,
      sizeMin: parseInt(document.getElementById('cfg-size-min').value, 10) || 14,
      sizeMax: parseInt(document.getElementById('cfg-size-max').value, 10) || 96,
      width: parseInt(document.getElementById('cfg-width').value, 10) || DEFAULT_RENDER_SIZE.width,
      height: parseInt(document.getElementById('cfg-height').value, 10) || DEFAULT_RENDER_SIZE.height,
      bgCanvas: getBackground('canvas'),
      bgForm:   getBackground('form'),
      rotMode: document.getElementById('cfg-rot-mode').value,
      rotMin: parseInt(document.getElementById('cfg-rot-min').value, 10) || 0,
      rotMax: parseInt(document.getElementById('cfg-rot-max').value, 10) || 0,
      rotShare: Math.max(0, Math.min(100, parseInt(document.getElementById('cfg-rot-share').value, 10) || 0)),
      rotDistribution: document.getElementById('cfg-rot-distribution').value || 'random',
      padding: Math.max(0, Math.min(20, parseInt(document.getElementById('cfg-padding').value, 10) || 0)),
      spiral: document.getElementById('cfg-spiral').value || 'archimedean',
      seed: Math.max(1, parseInt(document.getElementById('cfg-seed').value, 10) || 1),
    };
    cfg.effect = effectParams(cfg);
    return cfg;
  }

  function readFillFilters() {
    return {
      stopwordsOn: document.getElementById('cfg-stopwords-on').checked,
      customStopwords: parseCustomStopwords(document.getElementById('cfg-custom-stopwords').value),
      minCount: Math.max(1, parseInt(document.getElementById('cfg-min-count').value, 10) || 1),
      minLength: Math.max(1, parseInt(document.getElementById('cfg-min-length').value, 10) || 1),
    };
  }

  // =========================================================================
  // Seed-History (Session-only, Module-Level)
  // =========================================================================
  // Stack der gesehenen Seeds in chronologischer Reihenfolge, Undo/Redo via
  // Cursor. Klassisches Texteditor-Verhalten: ein neuer Seed nach Undo
  // verwirft den Forward-Branch. Session-only — kein Snapshot-Touch.
  let seedHistory = [];        // chronologisches Array von Seed-Integers
  let seedHistoryCursor = -1;  // Index in seedHistory; -1 = leer (vor erstem Eintrag)

  // Push am Cursor, mit Truncation des Forward-Branches.
  // Frühe Rückkehr wenn aktueller Seed schon der History-Eintrag am Cursor ist
  // (verhindert Duplikate bei Undo/Redo-Reload via loadSeedFromHistory).
  function pushSeedToHistory(seed) {
    if (seedHistoryCursor >= 0 && seedHistory[seedHistoryCursor] === seed) return;
    seedHistory.length = seedHistoryCursor + 1;  // Truncate forward branch
    seedHistory.push(seed);
    seedHistoryCursor = seedHistory.length - 1;
    refreshSeedNavButtons();
  }

  function seedHistoryUndo() {
    if (seedHistoryCursor <= 0) return;
    seedHistoryCursor--;
    loadSeedFromHistory();
  }

  function seedHistoryRedo() {
    if (seedHistoryCursor >= seedHistory.length - 1) return;
    seedHistoryCursor++;
    loadSeedFromHistory();
  }

  function loadSeedFromHistory() {
    document.getElementById('cfg-seed').value = String(seedHistory[seedHistoryCursor]);
    refreshSeedNavButtons();
    generate();  // generate() ruft pushSeedToHistory; durch ===-Check kein Duplikat
  }

  function refreshSeedNavButtons() {
    const undo = document.getElementById('btn-seed-undo');
    const redo = document.getElementById('btn-seed-redo');
    if (undo) undo.disabled = seedHistoryCursor <= 0;
    if (redo) redo.disabled = seedHistoryCursor >= seedHistory.length - 1;
  }

  function generate() {
    welcomeShowing = false;   // ein echter Render löst die Welcome-Cloud ab
    const cfg = readConfig();
    pushSeedToHistory(cfg.seed);
    if (cfg.sizeMin >= cfg.sizeMax) {
      setMessage(t('msg.sizeError'), 'error');
      return;
    }
    const words = state.entries
      .filter(e => e.text && e.text.trim() && e.weight > 0)
      .map(e => ({ id: e.id, text: e.text, weight: e.weight, groupId: e.groupId, color: e.color || null, pin: e.pin || null }))
      .sort((a, b) => b.weight - a.weight);
    if (words.length === 0) {
      setMessage(t('msg.noEntries'), 'error');
      clearStage();
      currentRender = null;
      return;
    }
    render(words, cfg);
  }

  // =========================================================================
  // Welcome-Cloud (Erststart) — echte d3-cloud-Render-Cloud, display-only.
  // Erscheint nur bei leerem Frischstart, verschwindet beim ersten echten Wort.
  // Berührt state.entries/Snapshot NICHT. Siehe docs/specs/2026-05-31-welcome-cloud.md
  // =========================================================================
  const WELCOME_SEED = 27;  // fester Seed → reproduzierbar schönes, kompaktes Layout (über Seed-Sweep auf höchste Packdichte / geringstes Ausfransen für die 24-Wort-Liste gewählt)
  const WELCOME_WORDS = {
    de: [
      { text: 'Willkommen', weight: 100 },
      { text: 'Wortwolke', weight: 80 },
      { text: 'Formen', weight: 72 },
      { text: 'Farben', weight: 66 },
      { text: 'Schriften', weight: 60 },
      { text: 'Verläufe', weight: 56 },
      { text: 'Masken', weight: 52 },
      { text: 'Vorlagen', weight: 48 },
      { text: 'Layout', weight: 46 },
      { text: 'Export', weight: 44 },
      { text: 'Drehung', weight: 42 },
      { text: 'Größe', weight: 40 },
      { text: 'Gruppen', weight: 38 },
      { text: 'Stil', weight: 36 },
      { text: 'Vorschau', weight: 34 },
      { text: 'kreativ', weight: 32 },
      { text: 'offline', weight: 30 },
      { text: 'Open Source', weight: 28 },
      { text: 'kostenlos', weight: 26 },
      { text: 'Anlässe', weight: 24 },
      { text: 'Poster', weight: 22 },
      { text: 'SVG', weight: 20 },
      { text: 'PNG', weight: 18 },
      { text: 'deine Wörter', weight: 16 },
    ],
    en: [
      { text: 'Welcome', weight: 100 },
      { text: 'word cloud', weight: 80 },
      { text: 'shapes', weight: 72 },
      { text: 'colors', weight: 66 },
      { text: 'fonts', weight: 60 },
      { text: 'gradients', weight: 56 },
      { text: 'masks', weight: 52 },
      { text: 'templates', weight: 48 },
      { text: 'layout', weight: 46 },
      { text: 'export', weight: 44 },
      { text: 'rotation', weight: 42 },
      { text: 'size', weight: 40 },
      { text: 'groups', weight: 38 },
      { text: 'style', weight: 36 },
      { text: 'preview', weight: 34 },
      { text: 'creative', weight: 32 },
      { text: 'offline', weight: 30 },
      { text: 'open source', weight: 28 },
      { text: 'free', weight: 26 },
      { text: 'occasions', weight: 24 },
      { text: 'poster', weight: 22 },
      { text: 'SVG', weight: 20 },
      { text: 'PNG', weight: 18 },
      { text: 'your words', weight: 16 },
    ],
  };
  let welcomeShowing = false;

  function renderWelcomeCloud() {
    const cfg = readConfig();      // Defaults beim Frischstart
    cfg.seed = WELCOME_SEED;       // fester Seed (überschreibt NUR die cfg-Kopie, nicht das DOM-Feld)
    // Dichte-Tuning NUR für die Welcome-Cloud (cfg-Kopie, DOM unberührt):
    cfg.padding = 0;               // dichteste Packung
    cfg.sizeMin = 18;              // kleine Wörter füllen Lücken, ohne winzig zu werden
    cfg.sizeMax = 104;             // große Wörter füllen die Fläche
    const lang = (currentLang === 'en') ? 'en' : 'de';
    const groupId = state.lastUsedGroupId || (state.groups[0] && state.groups[0].id);
    const words = WELCOME_WORDS[lang].map((w, i) => ({
      id: 'welcome_' + i, text: w.text, weight: w.weight, groupId: groupId,
    }));
    welcomeShowing = true;
    // render() ist async und zeichnet nach await; danach die freundliche Bereit-Meldung
    // wiederherstellen (statt „N Wörter platziert").
    Promise.resolve(render(words, cfg)).then(() => {
      if (welcomeShowing) setMessage(t('msg.ready'));
    });
  }

  function dismissWelcomeCloud() {
    if (!welcomeShowing) return;
    welcomeShowing = false;
    currentRender = null;   // Welcome-Render ist nicht mehr „aktuell" — sonst unterdrückt
                            // renderEmptyBoundsPreview() (Guard `if (currentRender) return`) die Leer-Vorschau.
    clearStage();
    renderEmptyBoundsPreview();
  }

  // ============ Tabelle: Render & Edit ============

  function updateClearListButton() {
    const btn = document.getElementById('btn-clear-list');
    if (btn) btn.disabled = state.entries.length === 0;
  }

  function renderEntriesTable() {
    if (welcomeShowing && state.entries.length > 0) dismissWelcomeCloud();
    updateClearListButton();
    const tbody = document.getElementById('entries-tbody');
    tbody.innerHTML = '';
    if (state.entries.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'entries-empty';
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = t('table.empty');
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    state.entries.forEach(e => {
      const tr = document.createElement('tr');
      tr.dataset.entryId = e.id;
      tr.classList.toggle('row-selected', selectedIds.has(e.id));
      if (e.pin && e.color) tr.classList.add('row-mark-pincolor');
      else if (e.pin) tr.classList.add('row-mark-pin');
      else if (e.color) { tr.classList.add('row-mark-color'); tr.style.setProperty('--row-flag', e.color); }
      tr.addEventListener('mousedown', (ev) => {
        if (ev.target.closest('input, select, textarea, button')) return;  // normales Bearbeiten
        if (ev.metaKey || ev.ctrlKey) { ev.preventDefault(); toggleInSelection(e.id); lastClickedRowId = e.id; }
        else if (ev.shiftKey) { ev.preventDefault(); selectRowRange(e.id); }
      });

      // Wort
      const tdText = document.createElement('td');
      const inpText = document.createElement('input');
      inpText.type = 'text';
      inpText.className = 'entry-text';
      inpText.value = e.text;
      inpText.addEventListener('input', () => {
        e.text = inpText.value;
        scheduleAutoUpdate();
      });
      tdText.appendChild(inpText);
      tr.appendChild(tdText);

      // Gewicht
      const tdWeight = document.createElement('td');
      const inpWeight = document.createElement('input');
      inpWeight.type = 'number';
      inpWeight.min = '0';
      inpWeight.step = '1';
      inpWeight.className = 'entry-weight';
      inpWeight.value = e.weight;
      inpWeight.addEventListener('input', () => {
        const v = parseFloat(inpWeight.value);
        e.weight = isFinite(v) && v > 0 ? v : 1;
        scheduleAutoUpdate();
      });
      tdWeight.appendChild(inpWeight);
      tr.appendChild(tdWeight);

      // Gruppe
      const tdGroup = document.createElement('td');
      const selGroup = document.createElement('select');
      selGroup.className = 'entry-group';
      state.groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        selGroup.appendChild(opt);
      });
      selGroup.value = e.groupId;
      selGroup.addEventListener('change', () => {
        e.groupId = selGroup.value;
        state.lastUsedGroupId = selGroup.value;
        scheduleAutoUpdate();
      });
      tdGroup.appendChild(selGroup);
      tr.appendChild(tdGroup);

      // Löschen
      const tdDel = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'row-del';
      delBtn.textContent = '×';
      delBtn.title = t('group.tooltip.delEntry');
      delBtn.addEventListener('click', () => {
        removeEntry(e.id);
        renderEntriesTable();
        scheduleAutoUpdate();
      });
      tdDel.appendChild(delBtn);
      tr.appendChild(tdDel);

      tbody.appendChild(tr);
    });
    if (typeof refreshArrangeButton === 'function') refreshArrangeButton();
  }

  // ============ Gruppen-Chips & Editor ============

  function renderGroupChips() {
    updateClearGroupsButton();
    const wrap = document.getElementById('group-chips');
    wrap.innerHTML = '';
    const protectedId = state.groups[0] ? state.groups[0].id : null;
    state.groups.forEach((g, idx) => {
      const chip = document.createElement('span');
      chip.className = 'group-chip';
      chip.title = t('group.tooltip.chip');
      const dot = document.createElement('span');
      dot.className = 'chip-dot' + (g.color === COLOR_AUTO ? ' auto' : '');
      if (g.color !== COLOR_AUTO) dot.style.background = g.color;
      chip.appendChild(dot);
      const nameSpan = document.createElement('span');
      nameSpan.textContent = g.name + ' (' + state.entries.filter(e => e.groupId === g.id).length + ')';
      chip.appendChild(nameSpan);
      chip.addEventListener('click', () => openGroupEditor(g.id));
      // × nur an Nicht-Default-Chips
      if (g.id !== protectedId) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'chip-del';
        del.textContent = '×';
        del.title = t('group.tooltip.delete');
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (!confirm(t('confirm.deleteGroup', { name: g.name }))) return;
          if (deleteGroup(g.id)) {
            renderGroupChips();
            renderEntriesTable();
            scheduleAutoUpdate();
          }
        });
        chip.appendChild(del);
      }
      wrap.appendChild(chip);
    });
  }

  let editingGroupId = null;

  function openGroupEditor(id) {
    const g = findGroup(id);
    if (!g) return;
    normalizeGroupShape(g); // falls altes Snapshot-Format
    editingGroupId = id;
    refreshGroupEditorFontDropdown();
    document.getElementById('group-edit-name').value = g.name;
    document.getElementById('group-edit-color').value = (g.color && g.color !== COLOR_AUTO) ? g.color : '#888888';
    document.getElementById('group-edit-font').value = g.font;
    document.getElementById('group-edit-delete').disabled = state.groups.length <= 1;
    // Verlauf-Picker mit Werten aus der Gruppe vorbelegen
    document.getElementById('group-edit-grad-from').value    = g.gradient.from;
    document.getElementById('group-edit-grad-via').value     = g.gradient.via;
    document.getElementById('group-edit-grad-to').value      = g.gradient.to;
    document.getElementById('group-edit-grad-use-via').checked = g.gradient.useVia;
    document.getElementById('group-edit-grad-via').disabled    = !g.gradient.useVia;
    // Farbmodus-Radio + Picker-Sichtbarkeit
    const modeRadio = document.querySelector('input[name="group-edit-mode"][value="' + g.paletteMode + '"]');
    if (modeRadio) modeRadio.checked = true;
    updateGroupEditorVisibility(g.paletteMode);
    // Rotation-Felder
    const rotModeSel = document.getElementById('group-edit-rot-mode');
    rotModeSel.value = g.rotation.mode;
    document.getElementById('group-edit-rot-min').value   = g.rotation.rotMin;
    document.getElementById('group-edit-rot-max').value   = g.rotation.rotMax;
    document.getElementById('group-edit-rot-share').value = g.rotation.rotShare;
    document.getElementById('group-edit-rot-distribution').value = g.rotation.rotDistribution;
    updateGroupEditorRotVisibility();
    // Größenfaktor + Padding-Bonus
    const sizeFactorInp = document.getElementById('group-edit-size-factor');
    sizeFactorInp.value = g.sizeFactor;
    document.getElementById('group-edit-size-factor-val').textContent = Number(g.sizeFactor).toFixed(1) + '×';
    const paddingInp = document.getElementById('group-edit-padding');
    paddingInp.value = (typeof g.padding === 'number') ? g.padding : 0;
    document.getElementById('group-edit-padding-val').textContent = paddingInp.value;
    // Padding + Rotation ausgrauen bei wordcloud2
    const isWc2 = (state.engine === 'wordcloud2');
    paddingInp.disabled = isWc2;
    document.getElementById('group-edit-padding-hint').hidden = !isWc2;
    [
      document.getElementById('group-edit-rot-mode'),
      document.getElementById('group-edit-rot-share'),
      document.getElementById('group-edit-rot-distribution'),
      document.getElementById('group-edit-rot-min'),
      document.getElementById('group-edit-rot-max'),
    ].forEach(el => { if (el) el.disabled = isWc2; });
    document.getElementById('group-edit-rot-hint').hidden = !isWc2;
    rememberDialogTrigger();
    document.getElementById('group-editor').hidden = false;
    focusFirstInDialog(document.getElementById('group-editor'));
  }

  function updateGroupEditorVisibility(mode) {
    document.getElementById('group-edit-color-row').hidden    = mode !== PALETTE_MODE_COLOR;
    document.getElementById('group-edit-gradient-row').hidden = mode !== PALETTE_MODE_GRADIENT;
  }

  function updateGroupEditorRotVisibility() {
    const rotMode = document.getElementById('group-edit-rot-mode').value;
    const detail = document.getElementById('group-edit-rot-detail');
    const minmaxRow = document.getElementById('group-edit-rot-minmax-row');
    detail.hidden = (rotMode === 'auto');
    minmaxRow.hidden = (rotMode !== 'free');
  }

  function closeGroupEditor() {
    document.getElementById('group-editor').hidden = true;
    editingGroupId = null;
    restoreDialogFocus();
  }

  function applyGroupEdits() {
    const g = findGroup(editingGroupId);
    if (!g) return;
    const newName = document.getElementById('group-edit-name').value.trim();
    if (newName) g.name = newName;
    g.font = document.getElementById('group-edit-font').value;
    // Farbe wird live im color-Picker-Event aktualisiert; hier nichts zu tun
    renderGroupChips();
    renderEntriesTable();
    scheduleAutoUpdate();
  }

  // ============ Befüll-Dialog ============

  function openFillDialog() {
    rememberDialogTrigger();
    const sel = document.getElementById('fill-target-group');
    sel.innerHTML = '';
    state.groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      sel.appendChild(opt);
    });
    if (state.lastUsedGroupId) sel.value = state.lastUsedGroupId;
    document.getElementById('fill-text').value = '';
    document.getElementById('fill-dialog').hidden = false;
    setTimeout(() => document.getElementById('fill-text').focus(), 50);
  }

  function closeFillDialog() { document.getElementById('fill-dialog').hidden = true; restoreDialogFocus(); }

  function applyFill() {
    const targetId = document.getElementById('fill-target-group').value;
    const mode = document.getElementById('fill-mode').value;
    const text = document.getElementById('fill-text').value;
    if (!text.trim()) { setMessage(t('msg.fillEmpty'), 'error'); return; }
    const filters = readFillFilters();
    let parsed;
    let skipped = null;
    if (mode === 'freitext') {
      parsed = buildFromFreitext(text, filters);
    } else {
      let csvResult;
      try { csvResult = buildFromCSV(text, filters); }
      catch (err) {
        if (err instanceof CSVParseError) {
          const detail = t('msg.csvError.' + err.code);
          setMessage(t('msg.csvParseError', { line: err.line, detail }), 'error');
          return;
        }
        throw err;
      }
      skipped = csvResult.skipped;
      parsed = csvResult.rows.map(r => {
        let gid = targetId;
        if (r.groupName) {
          const existing = findGroupByName(r.groupName);
          if (existing) gid = existing.id;
          else { const g = addGroup(r.groupName); gid = g.id; }
        }
        return { text: r.text, weight: r.weight, groupId: gid };
      });
    }
    let added = 0;
    parsed.forEach(p => {
      const gid = p.groupId || targetId;
      addEntry(p.text, p.weight, gid);
      added++;
    });
    state.lastUsedGroupId = targetId;
    renderEntriesTable();
    renderGroupChips();
    closeFillDialog();
    let message = t('msg.entriesAdded', { n: added });
    if (skipped && (skipped.invalidWeight || skipped.emptyWord)) {
      message += t('msg.csvSkipped', {
        total: skipped.invalidWeight + skipped.emptyWord,
        weight: skipped.invalidWeight,
        empty: skipped.emptyWord,
      });
    }
    setMessage(message);
    scheduleAutoUpdate();
  }

  // ============ CSV Import / Export ============

  function exportCSV() {
    const lines = ['wort,gewicht,gruppe'];
    state.entries.forEach(e => {
      const g = findGroup(e.groupId);
      const groupName = g ? g.name : '';
      const safeText = /[,"\n]/.test(e.text) ? '"' + e.text.replace(/"/g, '""') + '"' : e.text;
      const safeGroup = /[,"\n]/.test(groupName) ? '"' + groupName.replace(/"/g, '""') + '"' : groupName;
      lines.push(`${safeText},${e.weight},${safeGroup}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, 'wordcloud-eintraege.csv');
  }

  function importCSVText(text) {
    const filters = readFillFilters(); // Filter-Settings ignoriert hier; CSV-Import filtert nicht (nur weight>0)
    let csvResult;
    try { csvResult = buildFromCSV(text, filters); }
    catch (err) {
      if (err instanceof CSVParseError) {
        const detail = t('msg.csvError.' + err.code);
        setMessage(t('msg.csvParseError', { line: err.line, detail }), 'error');
        return;
      }
      throw err;
    }
    let added = 0;
    csvResult.rows.forEach(r => {
      let gid = state.lastUsedGroupId || (state.groups[0] && state.groups[0].id);
      if (r.groupName) {
        const existing = findGroupByName(r.groupName);
        if (existing) gid = existing.id;
        else { const g = addGroup(r.groupName); gid = g.id; }
      }
      addEntry(r.text, r.weight, gid);
      added++;
    });
    renderEntriesTable();
    renderGroupChips();
    let message = t('msg.entriesImported', { n: added });
    const sk = csvResult.skipped;
    if (sk.invalidWeight || sk.emptyWord) {
      message += t('msg.csvSkipped', {
        total: sk.invalidWeight + sk.emptyWord,
        weight: sk.invalidWeight,
        empty: sk.emptyWord,
      });
    }
    setMessage(message);
    scheduleAutoUpdate();
  }

  // Sortierbare Spaltenköpfe der Eingabe-Tabelle. Reine Anzeige-Sortierung von
  // state.entries (kein Re-Generate; Cloud-Form ist reihenfolge-unabhängig). Klick
  // auf denselben Kopf toggelt die Richtung. Session-only (kein Snapshot-Touch).
  let entriesSortCol = null;
  const entriesSortDir = { text: 1, weight: -1, group: 1 };   // Default: Wort A→Z, Gewicht absteigend, Gruppe nach Reihenfolge
  function sortEntriesBy(col) {
    if (entriesSortCol === col) entriesSortDir[col] *= -1;     // erneuter Klick → Richtung umkehren
    entriesSortCol = col;
    const dir = entriesSortDir[col];
    if (state.entries.length >= 2) {
      const gi = id => state.groups.findIndex(g => g.id === id);
      state.entries.sort((a, b) => {
        let cmp;
        if (col === 'text') cmp = a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
        else if (col === 'weight') cmp = a.weight - b.weight;
        else { cmp = gi(a.groupId) - gi(b.groupId); if (cmp === 0) return b.weight - a.weight; }  // Gruppe: sekundär Gewicht absteigend
        return cmp * dir;
      });
    }
    [['text', 'th-text'], ['weight', 'th-weight'], ['group', 'th-group']].forEach(([c, id]) => {
      const th = document.getElementById(id);
      if (th) th.setAttribute('aria-sort', c === col ? (dir === 1 ? 'ascending' : 'descending') : 'none');
    });
    renderEntriesTable();
  }

  function clearList() {
    const n = state.entries.length;
    if (n === 0) return;                       // Sicherheitsnetz (Button ist disabled)
    if (!confirm(t('confirm.clearList', { n }))) return;
    state.entries = [];
    renderEntriesTable();                      // setzt auch updateClearListButton()
    renderGroupChips();                        // Gruppen-Counts gehen auf 0
    currentRender = null;
    clearStage();
    renderEmptyBoundsPreview();
    setMessage(t('msg.listCleared', { n }));
  }

  function updateClearGroupsButton() {
    const btn = document.getElementById('btn-clear-groups');
    if (btn) btn.disabled = state.groups.length <= 1;
  }

  function clearGroups() {
    if (state.groups.length <= 1) return;      // Sicherheitsnetz
    const protectedGroup = state.groups[0];
    const n = state.groups.length - 1;
    if (!confirm(t('confirm.clearGroups', { n, default: protectedGroup.name }))) return;
    // deleteGroup() reparented Einträge an die jeweils erste andere Gruppe — solange wir
    // von hinten löschen, landet alles in der protected (state.groups[0]).
    for (let i = state.groups.length - 1; i >= 1; i--) {
      deleteGroup(state.groups[i].id);
    }
    renderGroupChips();                        // setzt auch updateClearGroupsButton()
    renderEntriesTable();                      // Group-Dropdowns refreshen
    setMessage(t('msg.groupsCleared', { n, default: protectedGroup.name }));
    scheduleAutoUpdate();
  }

  // ============ Init: Dropdowns ============

  function initThemeDropdown() {
    const sel = document.getElementById('cfg-theme');
    if (!W.themes) return;
    Object.entries(W.themes).forEach(([id, theme]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = theme.name[currentLang] || theme.name.de;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      const theme = W.themes[sel.value];
      if (!theme) return;
      // Lege Gruppe mit Themen-Namen an (oder verwende existierende)
      const themeName = theme.name[currentLang] || theme.name.de;
      let g = findGroupByName(themeName);
      if (!g) g = addGroup(themeName);
      // Wortliste nach UI-Sprache auflösen; flache Liste (z.B. vornamen) = sprachneutral.
      const wlist = Array.isArray(theme.words) ? theme.words : (theme.words[currentLang] || theme.words.de || []);
      wlist.forEach(w => addEntry(w.text, w.weight, g.id));
      state.lastUsedGroupId = g.id;
      renderEntriesTable();
      renderGroupChips();
      setMessage(t('msg.themeLoaded', { name: themeName, count: wlist.length, group: g.name }));
      sel.value = '';
      scheduleAutoUpdate();
    });
  }

  function initPaletteDropdown() {
    const sel = document.getElementById('cfg-palette');
    if (!W.palettes) return;
    Object.entries(W.palettes).forEach(([id, p]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = p.name[currentLang] || p.name.de;
      if (id === 'set2') opt.selected = true;
      sel.appendChild(opt);
    });
    const sep = document.createElement('option');
    sep.disabled = true; sep.textContent = '──────────';
    sel.appendChild(sep);
    const c = document.createElement('option'); c.value = '__custom__'; c.textContent = t('config.paletteCustomLabel'); sel.appendChild(c);
    const gd = document.createElement('option'); gd.value = '__gradient__'; gd.textContent = t('config.paletteGradientLabel'); sel.appendChild(gd);

    const customRow = document.getElementById('cfg-palette-custom-row');
    const gradRow   = document.getElementById('cfg-palette-gradient-row');

    sel.addEventListener('change', () => {
      const id = sel.value;
      if (id === '__gradient__') {
        customRow.classList.add('disabled');
        gradRow.hidden = false;
        updateGradientPreview();
      } else {
        customRow.classList.remove('disabled');
        gradRow.hidden = true;
        if (id !== '__custom__' && W.palettes && W.palettes[id]) {
          loadPresetIntoCustomPalette(W.palettes[id]);
          renderInlinePalette();
        }
      }
      scheduleAutoUpdate();
    });

    // Default: Set2 in die Tafeln laden
    if (W.palettes && W.palettes['set2']) {
      loadPresetIntoCustomPalette(W.palettes['set2']);
    }
    customRow.classList.remove('disabled');
    gradRow.hidden = true;

    // Verlauf: Picker und Via-Toggle
    const fromInp = document.getElementById('cfg-palette-grad-from');
    const viaInp  = document.getElementById('cfg-palette-grad-via');
    const toInp   = document.getElementById('cfg-palette-grad-to');
    const useVia  = document.getElementById('cfg-palette-grad-use-via');
    fromInp.addEventListener('input', updateGradientPreview);
    viaInp.addEventListener('input', updateGradientPreview);
    toInp.addEventListener('input', updateGradientPreview);
    useVia.addEventListener('change', () => {
      viaInp.disabled = !useVia.checked;
      // Beim ersten Aktivieren: Via auf Mittelpunkt zwischen Von und Bis vorschlagen
      if (useVia.checked && viaInp.value === '#ffffff') {
        viaInp.value = interpolateHSL(fromInp.value, toInp.value, 0.5);
      }
      updateGradientPreview();
      scheduleAutoUpdate();
    });

    // „Alle leeren": Tafeln entleeren, Dropdown auf Custom
    document.getElementById('btn-palette-clear-all').addEventListener('click', () => {
      if (!confirm(t('confirm.clearPalette'))) return;
      state.customPalette = new Array(state.customPalette.length).fill(null);
      markPaletteCustom();
      renderInlinePalette();
      scheduleAutoUpdate();
    });

    // „Palette aus Bild": Datei wählen → 8 Farben extrahieren → in Custom-Palette
    document.getElementById('btn-palette-from-image').addEventListener('click', () => {
      document.getElementById('palette-image-file').click();
    });
    document.getElementById('palette-image-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) applyPaletteFromImageFile(file);
    });

    renderInlinePalette();
    updateGradientPreview();
  }

  function refreshFontDropdown() {
    const sel = document.getElementById('cfg-font');
    if (!sel) return;
    const previousValue = sel.value;
    sel.innerHTML = '';
    FONT_GROUPS.forEach(group => {
      const og = document.createElement('optgroup');
      og.label = t(group.i18nKey);
      group.items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.value;
        opt.textContent = item.label;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
    if (state.googleFonts.length > 0) {
      const og = document.createElement('optgroup');
      og.label = t('fontgroup.google');
      state.googleFonts.forEach(family => {
        const opt = document.createElement('option');
        opt.value = googleFontFontFamilyValue(family);
        opt.textContent = family;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    }
    if (previousValue && Array.from(sel.options).some(o => o.value === previousValue)) {
      sel.value = previousValue;
    } else {
      sel.value = 'Impact, sans-serif';
    }
  }
  function initFontDropdown() { refreshFontDropdown(); }

  function refreshGroupEditorFontDropdown() {
    const sel = document.getElementById('group-edit-font');
    if (!sel) return;
    const previousValue = sel.value;
    sel.innerHTML = '';
    const optAuto = document.createElement('option');
    optAuto.value = FONT_AUTO; optAuto.textContent = t('auto');
    sel.appendChild(optAuto);
    FONT_GROUPS.forEach(group => {
      const og = document.createElement('optgroup');
      og.label = t(group.i18nKey);
      group.items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.value;
        opt.textContent = item.label;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
    if (state.googleFonts.length > 0) {
      const og = document.createElement('optgroup');
      og.label = t('fontgroup.google');
      state.googleFonts.forEach(family => {
        const opt = document.createElement('option');
        opt.value = googleFontFontFamilyValue(family);
        opt.textContent = family;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    }
    if (previousValue && Array.from(sel.options).some(o => o.value === previousValue)) {
      sel.value = previousValue;
    } else {
      sel.value = FONT_AUTO;
    }
  }

  function refreshRotationVisibility() {
    const modeSel = document.getElementById('cfg-rot-mode');
    const minmaxRow = document.getElementById('cfg-rot-minmax-row');
    const minInp = document.getElementById('cfg-rot-min');
    const maxInp = document.getElementById('cfg-rot-max');
    if (!modeSel || !minmaxRow) return;
    const isFree = modeSel.value === 'free';
    minmaxRow.hidden = !isFree;
    // Eingaben bleiben enabled (heute schon eh nur sichtbar bei 'free'), aber
    // Tooltip-Hint für späteres Per-Gruppen-Modal-Reuse setzen.
    if (minInp) minInp.title = isFree ? '' : t('config.rotMinMax.disabledTip');
    if (maxInp) maxInp.title = isFree ? '' : t('config.rotMinMax.disabledTip');
  }

  function initRotationUI() {
    const modeSel = document.getElementById('cfg-rot-mode');
    modeSel.addEventListener('change', refreshRotationVisibility);
    refreshRotationVisibility();
  }

  // ============ Engine-Switch + Engine-Optionen ============

  function refreshEngineOptionsVisibility() {
    const isWc2 = state.engine === 'wordcloud2';
    document.getElementById('cfg-engine-options-d3cloud').hidden = isWc2;
    document.getElementById('cfg-engine-options-wc2').hidden     = !isWc2;
    // Wenn Gruppen-Modal offen: Padding-Bonus-Slider entsprechend anpassen
    const padInp  = document.getElementById('group-edit-padding');
    const padHint = document.getElementById('group-edit-padding-hint');
    if (padInp && padHint) {
      padInp.disabled  = isWc2;
      padHint.hidden   = !isWc2;
    }
    // Rotations-Inputs im Gruppen-Modal bei wc2 deaktivieren
    const rotInputs = [
      document.getElementById('group-edit-rot-mode'),
      document.getElementById('group-edit-rot-share'),
      document.getElementById('group-edit-rot-distribution'),
      document.getElementById('group-edit-rot-min'),
      document.getElementById('group-edit-rot-max'),
    ];
    rotInputs.forEach(el => { if (el) el.disabled = isWc2; });
    const rotHint = document.getElementById('group-edit-rot-hint');
    if (rotHint) rotHint.hidden = !isWc2;
    // SVG-Export bei wc2 nicht möglich (Canvas-basiert) → Button ausgrauen + Tooltip
    const svgBtn = document.getElementById('btn-export-svg');
    if (svgBtn) {
      svgBtn.disabled = isWc2;
      // Bei d3-cloud: Original-Tooltip aus dem i18n-Title-Attribut wiederherstellen
      const origTitleKey = svgBtn.dataset.i18nTitle;
      svgBtn.title = isWc2 ? t('msg.svgUnavailableCanvas') : (origTitleKey ? t(origTitleKey) : '');
    }
    // Effekt-Block: nur d3-cloud → bei wc2 deaktivieren + Hinweis
    refreshEffectUiForEngine();
  }

  function syncEngineUiFromState() {
    // Engine-Radio
    const radio = document.querySelector('input[name="cfg-engine"][value="' + state.engine + '"]');
    if (radio) radio.checked = true;
    // wc2-Knöpfe
    const gs = document.getElementById('cfg-wc2-grid-size');
    if (gs) {
      gs.value = state.wc2.gridSize;
      document.getElementById('cfg-wc2-grid-size-val').textContent = String(state.wc2.gridSize);
    }
    const el = document.getElementById('cfg-wc2-ellipticity');
    if (el) {
      el.value = state.wc2.ellipticity;
      document.getElementById('cfg-wc2-ellipticity-val').textContent = Number(state.wc2.ellipticity).toFixed(2);
    }
    const sh = document.getElementById('cfg-wc2-shrink-to-fit');
    if (sh) sh.checked = !!state.wc2.shrinkToFit;
    const uns = document.getElementById('cfg-wc2-use-native-shapes');
    if (uns) uns.checked = !!state.wc2.useNativeShapes;
    refreshEngineOptionsVisibility();
  }

  // Effekt-Reihen je nach gewähltem Effekt-Typ ein-/ausblenden.
  function refreshEffectRows() {
    const checked = document.querySelector('input[name="cfg-effect"]:checked');
    const type = checked ? checked.value : 'none';
    const shadowRow = document.getElementById('cfg-effect-shadow-row');
    const glowRow = document.getElementById('cfg-effect-glow-row');
    if (shadowRow) shadowRow.hidden = type !== 'shadow';
    if (glowRow) glowRow.hidden = type !== 'glow';
  }

  // Effekte greifen nur in d3-cloud → bei wordcloud2 Controls deaktivieren + Hinweis.
  function refreshEffectUiForEngine() {
    const isWc2 = state.engine === 'wordcloud2';
    const fs = document.getElementById('cfg-effect-fieldset');
    if (!fs) return;
    fs.querySelectorAll('input').forEach(el => { el.disabled = isWc2; });
    fs.classList.toggle('is-disabled', isWc2);
    const hint = document.getElementById('cfg-effect-engine-hint');
    if (hint) hint.hidden = !isWc2;
  }

  function initEffectUI() {
    document.querySelectorAll('input[name="cfg-effect"]').forEach(r => {
      r.addEventListener('change', () => { refreshEffectRows(); scheduleAutoUpdate(); });
    });
    ['cfg-effect-shadow-color', 'cfg-effect-shadow-strength', 'cfg-effect-glow-color', 'cfg-effect-glow-strength'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', scheduleAutoUpdate);
    });
    refreshEffectRows();
    refreshEffectUiForEngine();
  }

  function initEngineUI() {
    // Radios: state.engine wechseln, Sichtbarkeit aktualisieren, neu rendern
    document.querySelectorAll('input[name="cfg-engine"]').forEach(r => {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        state.engine = r.value;
        refreshEngineOptionsVisibility();
        scheduleAutoUpdate();
      });
    });
    // wordcloud2-spezifische Knöpfe → state.wc2 + Live-Update
    const gs = document.getElementById('cfg-wc2-grid-size');
    const gsVal = document.getElementById('cfg-wc2-grid-size-val');
    gs.addEventListener('input', () => {
      state.wc2.gridSize = parseInt(gs.value, 10) || DEFAULT_WC2.gridSize;
      gsVal.textContent = String(state.wc2.gridSize);
      scheduleAutoUpdate();
    });
    const el = document.getElementById('cfg-wc2-ellipticity');
    const elVal = document.getElementById('cfg-wc2-ellipticity-val');
    el.addEventListener('input', () => {
      state.wc2.ellipticity = parseFloat(el.value) || DEFAULT_WC2.ellipticity;
      elVal.textContent = Number(state.wc2.ellipticity).toFixed(2);
      scheduleAutoUpdate();
    });
    document.getElementById('cfg-wc2-shrink-to-fit').addEventListener('change', (e) => {
      state.wc2.shrinkToFit = !!e.target.checked;
      scheduleAutoUpdate();
    });
    document.getElementById('cfg-wc2-use-native-shapes').addEventListener('change', (e) => {
      state.wc2.useNativeShapes = e.target.checked;
      scheduleAutoUpdate();
    });
    syncEngineUiFromState();
  }

  function initBgSwatches() {
    ['canvas', 'form'].forEach(layer => {
      const swArr = [...document.querySelectorAll(`#cfg-bg-${layer}-swatches .bg-swatch`)];
      const customInput = document.getElementById(`bg-${layer}-custom-color`);
      const customFill = document.getElementById(`bg-${layer}-custom-fill`);
      // Radiogroup-Semantik: aria-checked + roving tabindex auf der aktiven Tafel.
      const setActive = (sw) => {
        swArr.forEach(s => {
          const on = s === sw;
          s.classList.toggle('active', on);
          s.setAttribute('aria-checked', on ? 'true' : 'false');
          s.tabIndex = on ? 0 : -1;
        });
      };
      swArr.forEach((sw, i) => {
        sw.setAttribute('role', 'radio');
        const isActive = sw.classList.contains('active');
        sw.setAttribute('aria-checked', isActive ? 'true' : 'false');
        sw.tabIndex = isActive ? 0 : -1;
        const choose = () => {
          setActive(sw);
          if (sw.dataset.bg === 'custom') customInput.click();
          scheduleAutoUpdate();
        };
        sw.addEventListener('click', choose);
        sw.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault(); const n = swArr[(i + 1) % swArr.length]; n.focus(); setActive(n); scheduleAutoUpdate();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault(); const p = swArr[(i - 1 + swArr.length) % swArr.length]; p.focus(); setActive(p); scheduleAutoUpdate();
          }
        });
      });
      // Custom-Color-Input nicht als eigener Tab-Stopp — wird über die Tafel (Enter) geöffnet.
      if (customInput) customInput.tabIndex = -1;
      customInput.addEventListener('input', () => {
        customFill.style.background = customInput.value;
        const customSw = swArr.find(s => s.dataset.bg === 'custom');
        if (customSw) setActive(customSw);
        scheduleAutoUpdate();
      });
    });
  }

  function rescaleFontSizesForFormat() {
    const w = parseInt(document.getElementById('cfg-width').value, 10) || DEFAULT_RENDER_SIZE.width;
    const h = parseInt(document.getElementById('cfg-height').value, 10) || DEFAULT_RENDER_SIZE.height;
    // Skalierungsfaktor relativ zur Basisfläche (geometric mean der Fläche)
    const baseArea = DEFAULT_RENDER_SIZE.width * DEFAULT_RENDER_SIZE.height;
    const factor = Math.sqrt((w * h) / baseArea);
    const newMin = Math.max(6, Math.round(14 * factor));
    const newMax = Math.max(newMin + 10, Math.round(96 * factor));
    document.getElementById('cfg-size-min').value = newMin;
    document.getElementById('cfg-size-max').value = newMax;
  }

  function initSizePresetUI() {
    const sel = document.getElementById('cfg-size-preset');
    sel.addEventListener('change', () => {
      if (sel.value === 'custom') return;
      const m = sel.value.match(/^(\d+)x(\d+)$/);
      if (!m) return;
      document.getElementById('cfg-width').value = m[1];
      document.getElementById('cfg-height').value = m[2];
      // Fontgrößen-Defaults ans neue Format anpassen
      rescaleFontSizesForFormat();
      renderEmptyBoundsPreview();
      fitView();
    });
    ['cfg-width', 'cfg-height'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        const w = document.getElementById('cfg-width').value;
        const h = document.getElementById('cfg-height').value;
        const presetVal = `${w}x${h}`;
        const opt = Array.from(sel.options).find(o => o.value === presetVal);
        sel.value = opt ? presetVal : 'custom';
        renderEmptyBoundsPreview();
        fitView();
      });
    });
  }

  function initEntryButtons() {
    document.getElementById('btn-add-entry').addEventListener('click', () => {
      addEntry('', 1, state.lastUsedGroupId);
      renderEntriesTable();
      renderGroupChips();
      const tbody = document.getElementById('entries-tbody');
      const lastInput = tbody.querySelector('tr:last-child .entry-text');
      if (lastInput) lastInput.focus();
    });

    document.getElementById('btn-fill-from-text').addEventListener('click', openFillDialog);
    document.getElementById('btn-fill-cancel').addEventListener('click', closeFillDialog);
    document.getElementById('btn-fill-apply').addEventListener('click', applyFill);

    document.getElementById('btn-import-csv').addEventListener('click', () => {
      document.getElementById('file-input').click();
    });
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-clear-list').addEventListener('click', clearList);
    document.querySelector('#th-text .th-sort').addEventListener('click', () => sortEntriesBy('text'));
    document.querySelector('#th-weight .th-sort').addEventListener('click', () => sortEntriesBy('weight'));
    document.querySelector('#th-group .th-sort').addEventListener('click', () => sortEntriesBy('group'));

    document.getElementById('file-input').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        importCSVText(text);
      } catch (err) {
        setMessage(t('msg.fileError', { msg: err.message }), 'error');
      } finally {
        e.target.value = '';
      }
    });

    document.getElementById('btn-new-group').addEventListener('click', () => {
      const name = prompt(t('prompt.newGroup'), t('prompt.newGroup.default', { n: state.groups.length + 1 }));
      if (!name || !name.trim()) return;
      const g = addGroup(name.trim());
      renderGroupChips();
      renderEntriesTable(); // Dropdown in jeder Zeile braucht neue Option
      openGroupEditor(g.id);
    });

    document.getElementById('btn-clear-groups').addEventListener('click', clearGroups);
  }

  function initGroupEditor() {
    refreshGroupEditorFontDropdown();
    document.getElementById('group-edit-close').addEventListener('click', () => {
      applyGroupEdits();
      closeGroupEditor();
    });
    document.getElementById('group-edit-name').addEventListener('input', applyGroupEdits);
    document.getElementById('group-edit-font').addEventListener('change', applyGroupEdits);

    // Farbmodus-Radios: schalten Sichtbarkeit + setzen Modus an der Gruppe
    document.querySelectorAll('input[name="group-edit-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const g = findGroup(editingGroupId);
        if (!g || !radio.checked) return;
        g.paletteMode = radio.value;
        // Wenn Modus 'color' aktiviert, aber Farbe noch 'auto' war: aktuellen Picker-Wert übernehmen
        if (g.paletteMode === PALETTE_MODE_COLOR && (!g.color || g.color === COLOR_AUTO)) {
          g.color = document.getElementById('group-edit-color').value;
        }
        updateGroupEditorVisibility(g.paletteMode);
        renderGroupChips();
        scheduleAutoUpdate();
      });
    });

    // Einzelfarb-Picker: nur live wenn Modus = color
    document.getElementById('group-edit-color').addEventListener('input', () => {
      const g = findGroup(editingGroupId);
      if (!g) return;
      g.color = document.getElementById('group-edit-color').value;
      if (g.paletteMode === PALETTE_MODE_COLOR) {
        renderGroupChips();
        scheduleAutoUpdate();
      }
    });

    // Verlauf-Picker: live in g.gradient schreiben
    const gradFromInp = document.getElementById('group-edit-grad-from');
    const gradViaInp  = document.getElementById('group-edit-grad-via');
    const gradToInp   = document.getElementById('group-edit-grad-to');
    const gradUseVia  = document.getElementById('group-edit-grad-use-via');
    function writeGradient() {
      const g = findGroup(editingGroupId);
      if (!g) return;
      g.gradient.from   = gradFromInp.value;
      g.gradient.via    = gradViaInp.value;
      g.gradient.to     = gradToInp.value;
      g.gradient.useVia = gradUseVia.checked;
      gradViaInp.disabled = !gradUseVia.checked;
      if (g.paletteMode === PALETTE_MODE_GRADIENT) scheduleAutoUpdate();
    }
    gradFromInp.addEventListener('input', writeGradient);
    gradViaInp .addEventListener('input', writeGradient);
    gradToInp  .addEventListener('input', writeGradient);
    gradUseVia .addEventListener('change', writeGradient);

    // Rotation-Felder live in g.rotation schreiben
    const rotModeSel  = document.getElementById('group-edit-rot-mode');
    const rotMinInp   = document.getElementById('group-edit-rot-min');
    const rotMaxInp   = document.getElementById('group-edit-rot-max');
    const rotShareInp = document.getElementById('group-edit-rot-share');
    const rotDistSel  = document.getElementById('group-edit-rot-distribution');
    function writeRotation() {
      const g = findGroup(editingGroupId);
      if (!g) return;
      g.rotation.mode            = rotModeSel.value;
      g.rotation.rotMin          = parseInt(rotMinInp.value, 10) || 0;
      g.rotation.rotMax          = parseInt(rotMaxInp.value, 10) || 0;
      g.rotation.rotShare        = Math.max(0, Math.min(100, parseInt(rotShareInp.value, 10) || 0));
      g.rotation.rotDistribution = rotDistSel.value;
      updateGroupEditorRotVisibility();
      scheduleAutoUpdate();
    }
    rotModeSel .addEventListener('change', writeRotation);
    rotMinInp  .addEventListener('input',  writeRotation);
    rotMaxInp  .addEventListener('input',  writeRotation);
    rotShareInp.addEventListener('input',  writeRotation);
    rotDistSel .addEventListener('change', writeRotation);

    // Größenfaktor + Padding-Bonus live an die Gruppe schreiben
    const sizeFactorInp = document.getElementById('group-edit-size-factor');
    const sizeFactorVal = document.getElementById('group-edit-size-factor-val');
    sizeFactorInp.addEventListener('input', () => {
      const g = findGroup(editingGroupId);
      if (!g) return;
      const v = parseFloat(sizeFactorInp.value) || 1;
      g.sizeFactor = v;
      sizeFactorVal.textContent = v.toFixed(1) + '×';
      scheduleAutoUpdate();
    });
    const paddingInp = document.getElementById('group-edit-padding');
    const paddingVal = document.getElementById('group-edit-padding-val');
    paddingInp.addEventListener('input', () => {
      const g = findGroup(editingGroupId);
      if (!g) return;
      const v = parseInt(paddingInp.value, 10) || 0;
      g.padding = v > 0 ? v : null;
      paddingVal.textContent = String(v);
      scheduleAutoUpdate();
    });

    document.getElementById('group-edit-delete').addEventListener('click', () => {
      const g = findGroup(editingGroupId);
      if (!g) return;
      if (state.groups.length <= 1) return;
      if (!confirm(t('confirm.deleteGroup', { name: g.name }))) return;
      deleteGroup(g.id);
      renderGroupChips();
      renderEntriesTable();
      closeGroupEditor();
      scheduleAutoUpdate();
    });
  }

  function initButtons() {
    document.getElementById('btn-generate').addEventListener('click', generate);
    document.getElementById('btn-export-svg').addEventListener('click', exportSVG);
    document.getElementById('btn-export-png').addEventListener('click', exportPNG);
    document.getElementById('btn-copy-png').addEventListener('click', copyPNGToClipboard);
    document.getElementById('btn-reroll').addEventListener('click', () => {
      const newSeed = Math.floor(Math.random() * 2147483646) + 1;
      document.getElementById('cfg-seed').value = newSeed;
      generate();
    });
    document.getElementById('btn-seed-undo').addEventListener('click', seedHistoryUndo);
    document.getElementById('btn-seed-redo').addEventListener('click', seedHistoryRedo);
    initCreditsDialog();
    initDialogA11y();
    initSeedHistoryKeyboard();
  }

  function initSeedHistoryKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Nur Cmd/Ctrl+Z (mit/ohne Shift)
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      // Fokus-Schutz: nicht intervenieren, wenn ein Eingabefeld aktiv ist
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable)) return;
      e.preventDefault();
      if (e.shiftKey) seedHistoryRedo();
      else seedHistoryUndo();
    });
  }

  // ===== Dialog-A11y: Fokus merken/zurückgeben, Esc + Tab-Fokusfalle =====
  let dialogTrigger = null;
  function rememberDialogTrigger() { dialogTrigger = document.activeElement; }
  function restoreDialogFocus() {
    const el = dialogTrigger; dialogTrigger = null;
    if (el && typeof el.focus === 'function') { try { el.focus(); } catch (e) { /* ignore */ } }
  }
  const DIALOG_FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function focusFirstInDialog(dlg) {
    if (!dlg) return;
    const first = dlg.querySelector(DIALOG_FOCUSABLE);
    if (first) setTimeout(() => { try { first.focus(); } catch (e) { /* ignore */ } }, 30);
  }
  function trapDialogTab(dlg, e) {
    const f = [...dlg.querySelectorAll(DIALOG_FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function initDialogA11y() {
    document.addEventListener('keydown', (e) => {
      const open = document.querySelector('.dialog-backdrop:not([hidden])');
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (open.id === 'fill-dialog') closeFillDialog();
        else if (open.id === 'group-editor') closeGroupEditor();
        else { open.hidden = true; restoreDialogFocus(); }
      } else if (e.key === 'Tab') {
        trapDialogTab(open, e);
      }
    });
  }

  function initCreditsDialog() {
    const dlg = document.getElementById('credits-dialog');
    const open = () => { rememberDialogTrigger(); dlg.hidden = false; focusFirstInDialog(dlg); };
    const close = () => { dlg.hidden = true; restoreDialogFocus(); };
    document.getElementById('btn-credits').addEventListener('click', open);
    document.getElementById('btn-credits-close').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  }

  // ============ Live-Update ============

  let autoUpdateEnabled = false;
  let autoUpdateTimer = null;

  function scheduleAutoUpdate() {
    if (!autoUpdateEnabled) return;
    // layoutRunning-Guard entfernt — render() bricht laufendes Layout selbst ab
    clearTimeout(autoUpdateTimer);
    autoUpdateTimer = setTimeout(generate, 250);
  }

  function initAutoUpdate() {
    const checkbox = document.getElementById('cfg-auto-update');
    checkbox.addEventListener('change', () => {
      autoUpdateEnabled = checkbox.checked;
      if (autoUpdateEnabled) generate();
    });
    const skip = new Set(['cfg-auto-update', 'file-input']);
    document.querySelectorAll('.config-panel input, .config-panel select, .config-panel textarea').forEach(el => {
      if (skip.has(el.id)) return;
      el.addEventListener('input', scheduleAutoUpdate);
      el.addEventListener('change', scheduleAutoUpdate);
    });
  }

  // ============ Speicher / Slots / JSON ============

  const LS_INDEX_KEY  = 'wordcloud:slot-index';
  const LS_SLOT_PREFIX = 'wordcloud:slot:';
  const LS_LAST_KEY   = 'wordcloud:last-slot';
  const SNAPSHOT_VERSION = 1;

  function captureState() {
    return {
      version: SNAPSHOT_VERSION,
      savedAt: Date.now(),
      entries: state.entries.map(e => ({ text: e.text, weight: e.weight, groupId: e.groupId, color: e.color || null, pin: e.pin || null })),
      groups:  state.groups.map(g => ({
        id: g.id, name: g.name, color: g.color, font: g.font,
        paletteMode: g.paletteMode,
        gradient: g.gradient ? { ...g.gradient } : undefined,
        rotation: g.rotation ? { ...g.rotation } : undefined,
        padding: g.padding,
        sizeFactor: g.sizeFactor,
      })),
      customPalette: [...state.customPalette],
      googleFontsEnabled: state.googleFontsEnabled,
      googleFonts: [...state.googleFonts],
      // Phase-4-Top-Level-Config (defensive Defaults beim Lesen via normalizeConfigShape)
      engine: state.engine,
      mask: state.mask ? { ...state.mask } : null,
      wc2: { ...state.wc2 },
      paletteId: document.getElementById('cfg-palette').value,
      gradient: {
        from:   document.getElementById('cfg-palette-grad-from').value,
        via:    document.getElementById('cfg-palette-grad-via').value,
        to:     document.getElementById('cfg-palette-grad-to').value,
        useVia: document.getElementById('cfg-palette-grad-use-via').checked,
      },
      background: {
        canvas: {
          choice: document.querySelector('#cfg-bg-canvas-swatches .bg-swatch.active')?.dataset.bg || 'transparent',
          custom: document.getElementById('bg-canvas-custom-color').value,
        },
        form: {
          choice: document.querySelector('#cfg-bg-form-swatches .bg-swatch.active')?.dataset.bg || 'transparent',
          custom: document.getElementById('bg-form-custom-color').value,
        },
      },
      filters: {
        stopwordsOn:     document.getElementById('cfg-stopwords-on').checked,
        customStopwords: document.getElementById('cfg-custom-stopwords').value,
        minCount:        document.getElementById('cfg-min-count').value,
        minLength:       document.getElementById('cfg-min-length').value,
      },
      config: {
        font:        document.getElementById('cfg-font').value,
        scaleMethod: document.getElementById('cfg-scale').value,
        sizeMin:     document.getElementById('cfg-size-min').value,
        sizeMax:     document.getElementById('cfg-size-max').value,
        width:       document.getElementById('cfg-width').value,
        height:      document.getElementById('cfg-height').value,
        sizePreset:  document.getElementById('cfg-size-preset').value,
        pngScale:    document.getElementById('cfg-png-scale').value,
        rotMode:         document.getElementById('cfg-rot-mode').value,
        rotMin:          document.getElementById('cfg-rot-min').value,
        rotMax:          document.getElementById('cfg-rot-max').value,
        rotShare:        document.getElementById('cfg-rot-share').value,
        rotDistribution: document.getElementById('cfg-rot-distribution').value,
        padding:     document.getElementById('cfg-padding').value,
        spiral:      document.getElementById('cfg-spiral').value,
        seed:        document.getElementById('cfg-seed').value,
        effect:               (function () { const c = document.querySelector('input[name="cfg-effect"]:checked'); return c ? c.value : 'none'; })(),
        effectShadowColor:    document.getElementById('cfg-effect-shadow-color').value,
        effectShadowStrength: document.getElementById('cfg-effect-shadow-strength').value,
        effectGlowColor:      document.getElementById('cfg-effect-glow-color').value,
        effectGlowStrength:   document.getElementById('cfg-effect-glow-strength').value,
      },
    };
  }

  function setUIValue(id, val) {
    if (val == null) return;
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function restoreState(snap) {
    if (!snap || snap.version !== SNAPSHOT_VERSION) {
      setMessage(t('msg.snapshotIncompat'), 'error');
      return false;
    }
    // Gruppen + Einträge — normalizeGroupShape füllt fehlende Felder (paletteMode,
    // gradient, rotation, padding, sizeFactor) bei alten Snapshots aus Defaults.
    state.groups = (snap.groups || []).map(g => normalizeGroupShape({
      id: g.id, name: g.name, color: g.color, font: g.font,
      paletteMode: g.paletteMode,
      gradient: g.gradient,
      rotation: g.rotation,
      padding: g.padding,
      sizeFactor: g.sizeFactor,
    }));
    // Phase-4-Top-Level-Config: defensive Defaults via normalizeConfigShape
    const normCfg = normalizeConfigShape(snap);
    state.engine = normCfg.engine;
    state.mask = normCfg.mask;
    state.wc2 = normCfg.wc2;
    // UI an neuen State anpassen (Engine-Radio + wc2-Optionen + Modal-Padding + Mask)
    if (typeof syncEngineUiFromState === 'function') syncEngineUiFromState();
    if (typeof refreshMaskUiFromState === 'function') refreshMaskUiFromState();
    state.entries = (snap.entries || []).map((e, i) => ({ id: 'e_' + (i + 1), text: e.text, weight: e.weight, groupId: e.groupId, color: e.color || null, pin: e.pin || null }));
    state.lastUsedGroupId = state.groups[0] ? state.groups[0].id : null;
    state.nextGroupCounter = state.groups.length + 1;
    state.nextEntryCounter = state.entries.length + 1;
    // customPalette
    if (Array.isArray(snap.customPalette)) {
      state.customPalette = snap.customPalette.slice(0);
      while (state.customPalette.length < PALETTE_BASE_SLOTS) state.customPalette.push(null);
    }
    // Google Fonts
    // Zuerst alte Links entfernen
    state.googleFonts.forEach(f => removeGoogleFontLink(f));
    state.googleFonts = Array.isArray(snap.googleFonts) ? snap.googleFonts.slice(0) : [];
    state.googleFontsEnabled = !!snap.googleFontsEnabled;
    const gfToggle = document.getElementById('cfg-google-fonts-on');
    if (gfToggle) gfToggle.checked = state.googleFontsEnabled;
    const gfPanel = document.getElementById('cfg-google-fonts-panel');
    if (gfPanel) gfPanel.hidden = !state.googleFontsEnabled;
    if (state.googleFontsEnabled) {
      state.googleFonts.forEach(f => loadGoogleFont(f));
    }
    renderGoogleFontList();
    refreshFontDropdown();
    refreshGroupEditorFontDropdown();
    updateOfflineBadge();
    // Config
    if (snap.config) {
      Object.entries({
        'cfg-font':         snap.config.font,
        'cfg-scale':        snap.config.scaleMethod,
        'cfg-size-min':     snap.config.sizeMin,
        'cfg-size-max':     snap.config.sizeMax,
        'cfg-width':        snap.config.width,
        'cfg-height':       snap.config.height,
        'cfg-size-preset':  snap.config.sizePreset,
        'cfg-png-scale':    snap.config.pngScale,
        // Legacy-Migration: alter Wert 'hv' (Phase 3) → neuer Preset 'cross-90'
        'cfg-rot-mode':         snap.config.rotMode === 'hv' ? 'cross-90' : snap.config.rotMode,
        'cfg-rot-min':          snap.config.rotMin,
        'cfg-rot-max':          snap.config.rotMax,
        'cfg-rot-share':        snap.config.rotShare,
        'cfg-rot-distribution': snap.config.rotDistribution || 'random',
        'cfg-padding':      snap.config.padding,
        'cfg-spiral':       snap.config.spiral,
        'cfg-seed':         snap.config.seed,
      }).forEach(([id, val]) => setUIValue(id, val));
    }
    // Effekt (Radio + Parameter; DOM-led, keine Migration — fehlend → 'none')
    if (snap.config) {
      setUIValue('cfg-effect-shadow-color', snap.config.effectShadowColor);
      setUIValue('cfg-effect-shadow-strength', snap.config.effectShadowStrength);
      setUIValue('cfg-effect-glow-color', snap.config.effectGlowColor);
      setUIValue('cfg-effect-glow-strength', snap.config.effectGlowStrength);
      const effType = snap.config.effect || 'none';
      const effRadio = document.querySelector('input[name="cfg-effect"][value="' + effType + '"]');
      if (effRadio) effRadio.checked = true;
      if (typeof refreshEffectRows === 'function') refreshEffectRows();
      if (typeof refreshEffectUiForEngine === 'function') refreshEffectUiForEngine();
    }
    if (snap.paletteId) setUIValue('cfg-palette', snap.paletteId);
    if (snap.gradient) {
      setUIValue('cfg-palette-grad-from', snap.gradient.from);
      setUIValue('cfg-palette-grad-via',  snap.gradient.via);
      setUIValue('cfg-palette-grad-to',   snap.gradient.to);
      document.getElementById('cfg-palette-grad-use-via').checked = !!snap.gradient.useVia;
      document.getElementById('cfg-palette-grad-via').disabled = !snap.gradient.useVia;
    }
    if (snap.background) {
      ['canvas', 'form'].forEach(layer => {
        const layerSnap = snap.background[layer];
        if (!layerSnap) return;
        const target = layerSnap.choice || 'transparent';
        document.querySelectorAll(`#cfg-bg-${layer}-swatches .bg-swatch`).forEach(s => {
          const on = s.dataset.bg === target;
          s.classList.toggle('active', on);
          s.setAttribute('aria-checked', on ? 'true' : 'false');
          s.tabIndex = on ? 0 : -1;
        });
        if (layerSnap.custom) {
          document.getElementById(`bg-${layer}-custom-color`).value = layerSnap.custom;
          document.getElementById(`bg-${layer}-custom-fill`).style.background = layerSnap.custom;
        }
      });
    }
    if (snap.filters) {
      document.getElementById('cfg-stopwords-on').checked = !!snap.filters.stopwordsOn;
      document.getElementById('cfg-custom-stopwords').value = snap.filters.customStopwords || '';
      setUIValue('cfg-min-count',  snap.filters.minCount);
      setUIValue('cfg-min-length', snap.filters.minLength);
    }
    // Sichtbarkeiten aktualisieren
    document.getElementById('cfg-palette-custom-row').classList.toggle('disabled', snap.paletteId === '__gradient__');
    document.getElementById('cfg-palette-gradient-row').hidden = snap.paletteId !== '__gradient__';
    // Rotation Min/Max-Row + Disabling neu setzen anhand des restorten Modus
    if (typeof refreshRotationVisibility === 'function') refreshRotationVisibility();
    // UI neu rendern
    renderEntriesTable();
    renderGroupChips();
    renderInlinePalette();
    updateGradientPreview();
    generate();
    return true;
  }

  function loadSlotIndex() {
    try { return JSON.parse(localStorage.getItem(LS_INDEX_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveSlotIndex(idx) {
    localStorage.setItem(LS_INDEX_KEY, JSON.stringify(idx));
  }
  function newSlotId() { return 'slot-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }

  function saveCurrentToSlot(name) {
    const id = newSlotId();
    const snap = captureState();
    try {
      localStorage.setItem(LS_SLOT_PREFIX + id, JSON.stringify(snap));
    } catch (e) {
      setMessage(t('msg.slotFull', { msg: e.message }), 'error');
      return null;
    }
    const idx = loadSlotIndex();
    idx.unshift({ id, name, savedAt: snap.savedAt });
    saveSlotIndex(idx);
    localStorage.setItem(LS_LAST_KEY, id);
    return id;
  }

  function loadSlot(id) {
    let snap;
    try { snap = JSON.parse(localStorage.getItem(LS_SLOT_PREFIX + id)); }
    catch (e) { setMessage(t('msg.slotReadError'), 'error'); return false; }
    if (!snap) { setMessage(t('msg.slotNotFound'), 'error'); return false; }
    if (!restoreState(snap)) return false;
    localStorage.setItem(LS_LAST_KEY, id);
    return true;
  }

  function deleteSlot(id) {
    localStorage.removeItem(LS_SLOT_PREFIX + id);
    saveSlotIndex(loadSlotIndex().filter(s => s.id !== id));
    if (localStorage.getItem(LS_LAST_KEY) === id) localStorage.removeItem(LS_LAST_KEY);
  }

  function renameSlot(id, newName) {
    const idx = loadSlotIndex();
    const slot = idx.find(s => s.id === id);
    if (!slot) return;
    slot.name = newName;
    saveSlotIndex(idx);
  }

  function duplicateSlot(id, newName) {
    const raw = localStorage.getItem(LS_SLOT_PREFIX + id);
    if (!raw) return null;
    const newId = newSlotId();
    localStorage.setItem(LS_SLOT_PREFIX + newId, raw);
    const idx = loadSlotIndex();
    idx.unshift({ id: newId, name: newName, savedAt: Date.now() });
    saveSlotIndex(idx);
    return newId;
  }

  function renderSlotList() {
    const list = document.getElementById('slot-list');
    list.innerHTML = '';
    const idx = loadSlotIndex();
    if (idx.length === 0) {
      const row = document.createElement('div');
      row.className = 'slot-row empty';
      row.textContent = t('storage.empty');
      list.appendChild(row);
      return;
    }
    idx.forEach(slot => {
      const row = document.createElement('div');
      row.className = 'slot-row';
      const meta = document.createElement('div');
      meta.className = 'slot-meta';
      const name = document.createElement('span'); name.className = 'slot-name'; name.textContent = slot.name;
      const date = document.createElement('span'); date.className = 'slot-date'; date.textContent = new Date(slot.savedAt).toLocaleString();
      meta.appendChild(name); meta.appendChild(date);
      row.appendChild(meta);
      const load = document.createElement('button'); load.className = 'slot-action'; load.textContent = 'Laden';
      load.addEventListener('click', () => { if (loadSlot(slot.id)) setMessage(t('msg.slotLoaded', { name: slot.name })); });
      row.appendChild(load);
      const rename = document.createElement('button'); rename.className = 'slot-action'; rename.textContent = 'Umbenennen';
      rename.addEventListener('click', () => {
        const nn = prompt(t('prompt.renameSlot'), slot.name);
        if (nn && nn.trim()) { renameSlot(slot.id, nn.trim()); renderSlotList(); }
      });
      row.appendChild(rename);
      const dup = document.createElement('button'); dup.className = 'slot-action'; dup.textContent = 'Dup';
      dup.addEventListener('click', () => {
        const dupId = duplicateSlot(slot.id, t('slot.duplicate', { name: slot.name }));
        if (dupId) { renderSlotList(); setMessage(t('msg.slotDuplicated')); }
      });
      row.appendChild(dup);
      const del = document.createElement('button'); del.className = 'slot-action del'; del.textContent = '×';
      del.title = 'Slot löschen';
      del.addEventListener('click', () => {
        if (!confirm(t('confirm.deleteSlot', { name: slot.name }))) return;
        deleteSlot(slot.id); renderSlotList();
      });
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function exportJSON() {
    const snap = captureState();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `wordcloud-${date}.wcloud.json`);
    setMessage(t('msg.jsonExported'));
  }

  function importJSONText(text, sourceName) {
    let snap;
    try { snap = JSON.parse(text); }
    catch (e) { setMessage(t('msg.jsonInvalid'), 'error'); return; }
    if (!restoreState(snap)) return;
    // Optional: als neuen Slot anlegen
    const name = (sourceName || 'Importiert').replace(/\.[^.]+$/, '');
    saveCurrentToSlot(name);
    renderSlotList();
    setMessage(t('msg.jsonImported', { name }));
  }

  function initStorage() {
    document.getElementById('btn-save-slot').addEventListener('click', () => {
      const name = prompt(t('prompt.slotName'), t('prompt.slotName.default', { date: new Date().toLocaleDateString() }));
      if (!name || !name.trim()) return;
      const id = saveCurrentToSlot(name.trim());
      if (id) { renderSlotList(); setMessage(t('msg.slotSaved', { name })); }
    });
    document.getElementById('btn-export-json').addEventListener('click', exportJSON);
    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('json-file-input').click();
    });
    document.getElementById('json-file-input').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        importJSONText(text, file.name);
      } catch (err) {
        setMessage(t('msg.fileError', { msg: err.message }), 'error');
      } finally { e.target.value = ''; }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof d3 === 'undefined' || !d3.layout || !d3.layout.cloud) {
      setMessage(t('msg.d3Failed'), 'error');
      return;
    }
    const def = addGroup('Default');
    state.lastUsedGroupId = def.id;

    preloadAllWebFonts();
    initLayoutSpinner();
    document.getElementById('cfg-seed').value = Math.floor(Math.random() * 2147483646) + 1;
    initThemeDropdown();
    initPaletteDropdown();
    initFontDropdown();
    initRotationUI();
    initEngineUI();
    initEffectUI();
    initMaskUI();
    initBgSwatches();
    initSizePresetUI();
    initStageViewport();
    initWordSelection();
    initEntryButtons();
    initGroupEditor();
    initButtons();
    initAutoUpdate();
    initGoogleFonts();
    initStorage();
    initPanelCollapse();

    renderEntriesTable();
    renderGroupChips();
    renderSlotList();
    renderEmptyBoundsPreview();

    // Sprache anwenden (auch dropdown-Optionen, dynamische Strings) — nach allen Inits
    applyLanguage(detectInitialLanguage());
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.addEventListener('click', () => applyLanguage(b.dataset.lang));
    });

    // Letzten Slot automatisch laden, falls vorhanden
    const lastId = localStorage.getItem(LS_LAST_KEY);
    let loadedSlot = false;
    if (lastId && localStorage.getItem(LS_SLOT_PREFIX + lastId)) {
      try { loadSlot(lastId); loadedSlot = true; } catch (e) { /* ignore */ }
    }

    setMessage(t('msg.ready'));
    // Nur bei wirklich frischem Start (kein Slot geladen): Begrüßungs-Cloud zeigen.
    if (!loadedSlot) renderWelcomeCloud();
  });

})(window.WC = window.WC || {});
