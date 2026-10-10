# Lichterkette

Eigene Web-App (PWA) für Bluetooth-Lichterketten mit **ELK-BLEDOM / MELK**-Controller (getestet mit „MELK-OA21 C8“). Läuft komplett im Browser, ohne Backend und ohne Build-Schritt.

**Funktionen:** An/Aus, Weißtöne (Kelvin), Farben, Favoriten, Helligkeit, Effekte, Zeitplan
(Licht an bei Sonnenuntergang, Licht aus bei Sonnenaufgang), automatisches Verbinden, installierbar auf dem Homescreen.

## Für welche Lichterkette ist das?

Gebaut und getestet für eine **Bluetooth-LED-Lichterkette**, deren **Controller** sich per Bluetooth als
**`MELK-OA21 C8`** meldet. Auf die Lichterkette selbst kommt es nicht an, sondern auf den Controller. Er gehört zur weit
verbreiteten **ELK-BLEDOM**-Familie, auf der viele günstige „App-gesteuerte“ LED-Streifen und Lichterketten basieren.

Deine Lichterkette funktioniert wahrscheinlich, wenn Folgendes zutrifft:

- Sie wird per Handy-App über Bluetooth gesteuert (nicht WLAN) und erscheint in einem Bluetooth-Scanner wie nRF Connect
  mit einem Namen, der mit `MELK`, `ELK`, `LEDBLE` oder `Triones` beginnt.
- Der Scanner zeigt den Service `0xFFF0` mit einer beschreibbaren Characteristic `0xFFF3`.

Andere Controller dieser Familie nutzen für manche Befehle andere Bytes. Die Befehle sind für das Profil **MELK-OA21**
geschrieben (siehe [docs/PROTOCOL.md](docs/PROTOCOL.md)). Wenn deine sich anders verhält, eröffne bitte ein Issue mit dem
Bluetooth-Namen deines Controllers.

## Schnellstart

Web Bluetooth braucht `https` oder `localhost`.

```sh
npm install        # nur für Tests, Lint und Formatierung nötig
npm start          # lokaler Server auf http://localhost:8000 (oder: python3 -m http.server 8000)
```

Dann in Chrome (Android oder Desktop) `http://localhost:8000` öffnen. Auf dem iPhone funktioniert Safari nicht, dort den
Browser **Bluefy** nutzen.

| Befehl           | Zweck                               |
| ---------------- | ----------------------------------- |
| `npm test`       | Unit-Tests (Node, ohne Browser)     |
| `npm run lint`   | ESLint                              |
| `npm run format` | Prettier (`format:check` prüft nur) |

## Projektstruktur

```
index.html          Markup (kein Inline-CSS oder -JS)
css/styles.css      alle Stile
js/
  main.js           Einstiegspunkt: verdrahtet die Teile
  config.js         feste Werte: Bluetooth-UUIDs, Ort, Toleranzen, Farben, Effekte
  protocol.js       baut die Bluetooth-Pakete (rein)
  bluetooth.js      Verbindung, Auto-Connect, Wiederverbinden (ChainConnection)
  write-queue.js    Sendewarteschlange mit Pause und „letzter Wert gewinnt“
  schedule.js       Zeitplan: Alarme, Sonnenzeit, Abgleich mit der Kette
  sun.js            Sonnenauf-/-untergang (rein, offline)
  color.js          Farbumrechnungen, Kelvin → RGB (rein)
  state.js          kleiner beobachtbarer Zustand (Farbe, Kelvin, Effekt, An/Aus)
  storage.js        localStorage-Wrapper und alle Schlüssel
  util.js
  ui/               Oberflächen-Module, je eines pro Bereich der Seite
test/               Unit-Tests (node:test)
docs/PROTOCOL.md    Bluetooth-Protokoll und was davon geprüft ist
sw.js, manifest.json, icons/   PWA: Offline-Cache, Installierbarkeit
```

## Wie die Teile zusammenspielen

```
          ┌──────────── main.js ────────────┐
          │                                  │
  ui/* ───┼──▶ lightState (state.js)         │   Oberfläche liest/schreibt den Zustand
   │      │                                  │
   │ send │                                  │
   ▼      ▼                                  ▼
 ChainConnection (bluetooth.js) ◀── Schedule (schedule.js)
   │  └─ WriteQueue (write-queue.js)            │  Alarme, Uhr, Sonnenzeit
   ▼                                            ▼
 Pakete aus protocol.js                  sun.js / config.js
```

- **Reine Logik** (`protocol`, `color`, `sun`, `schedule`-Hilfsfunktionen) hängt weder von DOM noch von Bluetooth ab und
  ist durch Tests abgedeckt.
- **`ChainConnection`** kapselt Web Bluetooth. Die Oberfläche kennt nur die Ereignisse `status` und `connectionchange`
  und die Methode `send(bytes, key)`.
- **`ui/*`**: jedes Modul hat eine `initX(deps)`-Funktion, bekommt seine Abhängigkeiten übergeben und rendert aus
  `lightState`. Es gibt keine globalen Variablen.
- **Zustand der Kette:** Der Controller meldet nichts zurück. Die App zeigt, was sie zuletzt gesendet hat, und speichert
  das in `localStorage` (Schlüssel in `storage.js`, nicht umbenennen, sonst gehen Einstellungen verloren).

## Zeitplan (Sonnenzeit)

Die Kette kennt nur feste Alarmzeiten. Die App rechnet die Sonnenzeit für den Ort in `config.js` (`LOCATION`) aus und
schickt sie als Alarm. Beim Öffnen, beim Verbinden und alle 30 Minuten prüft sie, ob die Zeit um mehr als 10 Minuten
(`SCHEDULE_TOLERANCE_MIN`) von der zuletzt gesendeten abweicht, und sendet dann neu. Dasselbe gilt für die Uhr der Kette
(Zeitumstellung). Die Sonnenzeit wandert im Herbst und Frühling etwa 2 Minuten pro Tag, die App sollte also
mindestens einmal pro Woche geöffnet werden.

## Veröffentlichen

Statische Dateien, jeder Hoster mit https genügt.

- **Vercel:** Repository importieren, Framework „Other“, kein Build-Befehl, Output-Verzeichnis `.`
- **GitHub Pages:** Settings → Pages → Branch `main`, Ordner `/ (root)`

Nach Änderungen an Dateien in `js/`, `css/` oder `icons/` muss die Liste `PRECACHE` in `sw.js` passen
(`npm test` prüft das). Bei größeren Änderungen `CACHE_VERSION` erhöhen.

## Installieren

- **Android (Chrome):** Seite öffnen → Menü ⋮ → „App installieren“
- **iPhone:** Seite in **Bluefy** öffnen und zum Home-Bildschirm hinzufügen

Koppeln musst du in der Umgebung, in der du die App danach nutzt: Eine installierte App und ein normaler Browser-Tab
merken sich Geräte getrennt. Das Auswahlfenster erscheint nur beim ersten Koppeln, danach verbindet sich die App von selbst.

## Problembehebung: Kette wird nicht gefunden

1. **Alle anderen Apps schließen, die mit der Kette sprechen** (Original-App, zweites Handy). Der Controller nimmt nur
   eine Verbindung gleichzeitig an und sendet währenddessen kein Signal.
2. **Kette kurz vom Strom nehmen** (ca. 10 Sekunden), damit sie wieder sichtbar wird.
3. **Bluetooth für den Browser erlauben** (iPhone: Einstellungen → Bluefy → Bluetooth). Nicht in den
   System-Bluetooth-Einstellungen koppeln, die App nutzt die Geräteliste des Browsers.
4. Auf Android/Desktop unter „Verbinden“ auf **„Kette nicht in der Liste? Alle Geräte zeigen“** tippen. Das listet alle
   Bluetooth-Geräte statt nur bekannter Controller. Taucht die Kette dort unter anderem Namen auf, bitte ein Issue mit dem
   Namen eröffnen. (Auf dem iPhone mit Bluefy zeigt die Liste immer alle Geräte, weil Bluefy die Kette mit Filter nicht
   anzeigt. Such nach `MELK-OA21 C8`.)

## Bekannte Einschränkungen

- Mit der echten Kette bestätigt sind bisher nur die **Farbbefehle**. An/Aus, Helligkeit, Effekte, Uhr und Alarme sind
  aus dem Protokoll abgeleitet und nur gegen simulierte Bytes getestet (siehe [docs/PROTOCOL.md](docs/PROTOCOL.md)).
- Weekday-Bitreihenfolge der Alarme (Bit 0 = Montag) und Sonntag = 7 in der Uhr sind angenommen.
- Auto-Connect klappt nur, solange die App geöffnet ist, und braucht Chrome mit `getDevices()`. Ob Bluefy das kann, ist ungeprüft.
- Die Kette verbindet sich nur mit einer App gleichzeitig. Vorher die Original-App beenden.
