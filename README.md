# Antarctic Dash

Een 3D obstakel-run in de browser. Je rent over het pakijs van Antarctica en moet
zo ver mogelijk komen: springen over ijsblokken en gletsjerspleten, glijden onder
ijsbruggen door, duiken om pinguïns opzij te maaien en van baan wisselen om
alles te ontwijken wat je niet aankunt.

Gebouwd met [Three.js](https://threejs.org). **Geen build-stap, geen npm** — het
zijn gewone HTML/CSS/JS-bestanden die je rechtstreeks op GitHub Pages kunt zetten.

---

## Spelen

| Actie | Toets | Touch |
|---|---|---|
| Ontwijken (baan wisselen) | `A` / `D` of `←` / `→` | veeg opzij |
| Springen | `W` / `Spatie` / `↑` | veeg omhoog of tik |
| Dubbele sprong | nog een keer `W` in de lucht | nogmaals omhoog vegen |
| Glijden | `S` / `↓` | veeg omlaag |
| Duiken | `Shift` / `E` | veeg omlaag terwijl je in de lucht hangt |
| Pauze | `P` / `Esc` | knop rechtsboven |

**Het verschil tussen glijden en duiken is belangrijk:**

* **Glijden** maakt je laag — dat is de enige manier om onder ijsbruggen,
  ijsrichels en ijspegels door te komen.
* **Duiken** in de lucht smakt je keihard naar beneden en gaat direct over in een
  glijbeweging. Nodig als een sneeuwschans je omhoog schiet en er meteen een
  ijsbrug aankomt.
* **Duiken** op de grond is een voorwaartse duik: je gaat kort sneller, ligt laag
  én je maait pinguïns opzij in plaats van er tegenaan te knallen. Dat levert
  punten op. Tegen ijs helpt duiken níét.

Je hebt drie levens. Een vis levert punten op, een schild vangt één klap op.
Hoe verder je komt, hoe sneller je gaat en hoe gemener de obstakels.

## Credits en de shop

Elke vis die je onderweg vangt is na afloop **één credit** waard. Breek je een
run af via het menu, dan krijg je de vis van die run gewoon mee — je raakt hem
alleen kwijt als je het tabblad sluit.

In de shop (knop op het hoofdmenu, of direct vanaf het eindscherm) geef je die
credits uit aan kleding in vier categorieën: **hoofddeksels, shirts, broeken en
schoenen**. Wat je koopt trek je meteen aan; daarna wissel je vrij tussen alles
wat je bezit. Je poppetje staat in de shop naast het menu te draaien, dus je
ziet direct wat je aanhebt.

Van elke categorie heb je één stuk gratis. Credits, bezit en wat je aanhebt
blijven bewaard in je browser.

## Lokaal draaien

ES-modules werken niet via `file://`, dus je hebt een kleine webserver nodig:

```bash
python -m http.server 5173
```

Daarna open je <http://localhost:5173>. Met Node in plaats van Python:

```bash
npx serve .
```

## Op GitHub zetten

### Zonder git (via de website)

1. Maak op <https://github.com/new> een nieuwe repository, bijvoorbeeld
   `antarctic-dash`.
2. Klik op **uploading an existing file** en sleep de héle inhoud van deze map
   het venster in — dus `index.html`, en de mappen `css`, `src` en `vendor`.
   Maak je een zip? Die pakt GitHub *niet* uit; sleep de losse bestanden.
3. Commit.

> Het bestand `.nojekyll` is verborgen in Windows Verkenner. Zet in Verkenner
> **Beeld → Weergeven → Verborgen items** aan, anders mist hij bij het slepen.

### Met git

```bash
git init
git add .
git commit -m "Antarctic Dash - level 1"
git branch -M main
git remote add origin https://github.com/<gebruiker>/antarctic-dash.git
git push -u origin main
```

### Online zetten

Daarna in de repository: **Settings → Pages → Source: Deploy from a branch →
`main` / `/ (root)`**. Na een minuutje staat het spel op
`https://<gebruiker>.github.io/antarctic-dash/`.

Three.js staat bewust mee in `vendor/` in de repository, zodat het spel ook
werkt zonder internetverbinding en zonder installatiestap.

Wil je een licentie toevoegen? Dat gaat het makkelijkst via GitHub zelf:
**Add file → Create new file → `LICENSE`** — GitHub biedt dan een keuzelijst aan
en vult je naam automatisch in.

---

## Hoe het in elkaar zit

```
index.html              schermen, HUD en de importmap voor Three.js
css/style.css           alles buiten het 3D-beeld
vendor/three.module.js  Three.js r169 (meegeleverd)
src/
  main.js               startpunt
  config.js             natuurkunde en constanten die voor élk level gelden
  outfits.js            kledingcatalogus, credits en wat je bezit
  player.js             de poolreiziger: rennen, springen, glijden, duiken
  engine/
    game.js             scène, camera, spelregels, de lus
    input.js            toetsenbord, swipes en schermknoppen
    hud.js              tellers, levens, schermen
    audio.js            geluid, live gesynthetiseerd (geen audiobestanden)
  world/
    props.js            alle 3D-modellen, procedureel opgebouwd
    track.js            grond, decor, lucht, poollicht, sneeuwval
    obstacles.js        spawnen, bewegen, botsen, opruimen
    particles.js        sneeuwstuifjes
  levels/
    index.js            levelregister
    antarctica.js       LEVEL 1 — alle leveldata
```

De engine kent geen enkel obstakel bij naam. Alles wat een level eigen maakt
staat in één databestand.

## Een nieuw level toevoegen

1. Kopieer `src/levels/antarctica.js` naar bijvoorbeeld `woestijn.js`.
2. Pas aan:
   * `id`, `name`, `tagline`
   * `colors` — de hele sfeer hangt hieraan (lucht, grond, ijs, rots, speler)
   * `fog` en `light` — mist en zonstand
   * `speed` — `start`, `max` en `ramp` (over hoeveel meter je naar `max` klimt)
   * `progression` — op welke afstand een nieuwe moeilijkheidstrap opengaat
   * `obstacles` — welke obstakels bestaan en hoe groot hun hitbox is
   * `patterns` — in welke combinaties ze verschijnen
3. Zet het level in de lijst in `src/levels/index.js`.
4. Testen kan direct met `?level=woestijn` achter de URL.

Bestaat er nog geen model voor je nieuwe obstakel? Zet er een bouwer voor in
`src/world/props.js` (een methode die een `THREE.Object3D` teruggeeft) en verwijs
er vanuit het level naar met `builder: 'jouwBouwer'`.

### Obstakelsoorten

| `kind` | Betekenis | Hoe kom je erlangs |
|---|---|---|
| `solid` | massief | springen of ontwijken |
| `overhead` | hangt in de lucht | glijden of ontwijken |
| `pit` | gat in de grond | springen |
| `creature` | levend wezen | ontwijken, springen of wégduiken |
| `ramp` | schans | eroverheen, je wordt gelanceerd |
| `pickup` | oppakken | vis of schild |

Elk patroon is zo opgezet dat er altijd minstens één doorgang is. Blokkeer nooit
alle drie de banen met `solid` op dezelfde `z`.

## Een kledingstuk toevoegen

Zet een regel bij in de juiste lijst in `src/outfits.js`:

```js
{ id: 'beanie-groen', name: 'Groene muts', price: 90,
  style: 'beanie', note: 'Optioneel regeltje eronder.',
  colors: { main: 0x2fa85c, trim: 0xe8f5ec } },
```

`style` bepaalt de *vorm*, `colors` de kleuren. Bestaande vormen:

| Categorie | Beschikbare `style` |
|---|---|
| `hat` | `hood`, `beanie`, `cap`, `ushanka`, `helmet`, `crown` |
| `shirt` | `plain`, `striped` |
| `pants` | `normal`, `puffy`, `shorts` |
| `shoes` | `boots`, `snowshoes`, `skates` |

Wil je een nieuwe vórm? Voeg een `case` toe aan `buildHat()` of `buildShoe()`
in `src/world/props.js`. Die functies geven een rijtje meshes terug dat in de
"mount" van het poppetje wordt gehangen; de rest gaat vanzelf.

Prijzen zijn in credits (= gevangen visjes). Zet `CREDITS_PER_FISH` in
`src/config.js` hoger als sparen te traag voelt.

## Sleutelen aan het gevoel

De meeste knoppen zitten in `src/config.js`:

* `GRAVITY` / `JUMP_V` — hoe hoog en hoe lang je zweeft
* `SLIDE_TIME` — hoe lang je laag blijft
* `DIVE_TIME`, `DIVE_IFRAMES`, `DIVE_BOOST` — het duikvenster
* `LANE_X` — de drie banen
* `HITBOX` — hoe groot je bent in elke houding
* `SCORE` — wat punten oplevert

Snelheid en moeilijkheid staan per level in het levelbestand, niet hier.

## Nog te doen

- [ ] Level 2 en verder (woestijn, jungle, stad …)
- [ ] Een doorlopende soundtrack
- [ ] Meer pinguïnsoorten met ander gedrag
- [ ] Complete outfits als set, met een korting
- [ ] Iets om credits aan uit te geven dat het spélen verandert
      (bijvoorbeeld een extra leven of een langere schildduur)
