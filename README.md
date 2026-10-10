# Lichterkette

Eigene Web-App (PWA) zur Steuerung einer Bluetooth-Lichterkette mit **ELK-BLEDOM / MELK**-Controller (z. B. „MELK-OA21 C8", Temu-Lichterkette).

Funktionen: An/Aus, Farbwähler, Farbregler, Vorlagen, Helligkeit, Modi, Geschwindigkeit. Läuft ohne Backend, alles im Browser.

## Technik

- Web Bluetooth (BLE), Service `FFF0`, Characteristic `FFF3` (Write Without Response)
- Pakete mit 9 Bytes: `7E 00 <cmd> ... EF`

| Aktion | Bytes |
|---|---|
| An | `7E 00 04 F0 00 01 FF 00 EF` |
| Aus | `7E 00 04 00 00 00 FF 00 EF` |
| Farbe | `7E 00 05 03 RR GG BB 00 EF` |
| Helligkeit (0–100) | `7E 00 01 XX 00 00 00 00 EF` |
| Geschwindigkeit (0–100) | `7E 00 02 XX 00 00 00 00 EF` |
| Modus (0x80–0x9C) | `7E 00 03 MM 03 00 00 00 EF` |

## Dateien

- `index.html`: die komplette App (HTML, CSS, JS)
- `manifest.json`, `sw.js`: machen die Seite installierbar und offlinefähig
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: App-Icons

## Lokal testen

Web Bluetooth braucht `https` oder `localhost`:

```sh
python3 -m http.server 8000
# dann in Chrome: http://localhost:8000
```

## Veröffentlichen (GitHub Pages)

1. Repository auf GitHub anlegen und pushen
2. Settings → Pages → Branch `main`, Ordner `/ (root)` → Save
3. Nach ca. 1 Minute erreichbar unter `https://<name>.github.io/<repo>/`

## Installieren

- **Android (Chrome):** Seite öffnen → Menü ⋮ → „App installieren" bzw. „Zum Startbildschirm hinzufügen"
- **iPhone:** Safari unterstützt kein Web Bluetooth. Seite im Browser **Bluefy** öffnen. Dort lässt sich die Seite zum Home-Bildschirm hinzufügen.

## Hinweis

Die Modus-Nummern (0x80–0x9C) stammen aus dem bekannten ELK-BLEDOM-Protokoll und sind für diesen Controller noch nicht einzeln geprüft. Die Effekte können je nach Controller-Version abweichen.
