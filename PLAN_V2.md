# ARISE V2 — Plan de refonte (game design + roadmap)

> Réponse aux 5 axes de Mathieu : visuels, boucle addictive, intégrations réelles,
> architecture, inspiration Dofus. Critère de pondération partout : **ratio
> investissement temps / complétion des objectifs réels**.

---

## 1. Architecture : décision (axe 4)

**Verdict : on garde la web app Next.js. Pas d'Unreal, pas de Godot.**

Raisonnement par le ratio temps/objectif :

| Option | Temps avant d'être utilisable | Ce que ça apporte à tes objectifs réels |
|---|---|---|
| Web app actuelle (enrichie) | 0 — déjà en prod, utilisée chaque jour | Tout : c'est l'outil qui marche |
| Phaser/PixiJS intégré à la web app | Quelques jours ciblés | Effets visuels riches là où ça compte |
| Godot/Unity (mini-jeu dédié) | 2-4 mois de refonte complète | Rien de plus pour la boucle réelle, perte du push, du cron, de la DB, du multi-écran |
| Unreal Engine | 6+ mois, pipeline 3D | Contre-productif : l'outil deviendrait le projet |

Arguments décisifs :

1. **Ton "jeu" n'a pas de gameplay temps réel.** Pas de déplacement, pas de combat simulé, pas de physique. C'est un jeu de **gestion/progression** (comme l'interface de Dofus hors combat) : exactement le domaine où le web excelle.
2. **L'app vit dans ta poche.** La validation de quête se fait dans la vraie vie, souvent sur iPhone. Une web app (→ PWA installable) est disponible partout instantanément ; un exécutable Unreal ne l'est pas.
3. **Toute l'infra existante sert la boucle réelle** : push, cron de pénalités, Prisma, Traefik. Un moteur de jeu jetterait tout ça.
4. **Le plafond visuel du web est largement suffisant** pour du pixel-art amélioré : canvas, WebGL via PixiJS, particules, shaders CSS. Dead Cells-like dans un navigateur, c'est faisable — on n'a même pas besoin d'aller si loin.

**Évolution retenue :** web app + PWA iPhone (⚠ vérifié : **manifest + service worker déjà en place** — il reste seulement à ajouter une `apple-touch-icon` PNG, iOS ignorant les icônes SVG) + **couche canvas/PixiJS ponctuelle** pour les moments forts (loot, rank-up). L'énergie économisée va dans les axes 1-2-3.

---

## 2. Analyse Dofus → transposition ARISE (axe 5)

Systèmes Dofus passés au crible. Colonne "verdict" = transposable en solo/vie réelle
en gardant l'âme Solo Leveling, pondéré par l'effort.

| Système Dofus | Ce qui le rend addictif | Verdict ARISE |
|---|---|---|
| **Panoplies** (set bonus) | Collection dirigée : chaque pièce manquante devient un but | ✅ **À faire — impact majeur** |
| **Almanax** (bonus + offrande du jour) | Rendez-vous quotidien, rareté du bonus du jour | ✅ **À faire — quasi gratuit** (le thème du jour existe déjà) |
| **Idoles** (difficulté choisie = plus de gains) | Le joueur fixe son propre défi, sentiment de maîtrise | ✅ **À faire — parfait pour la vie réelle** |
| **Forgemagie** (runes, sacrifice d'items) | Optimisation infinie, gamble contrôlé | ✅ **À faire** — remplace la vente bête de doublons |
| **Élevage** (dragodindes/montiliers) | Créature qui dépend de ta régularité (tamagotchi) | ✅ **À faire — hook émotionnel puissant** |
| **Chasses au trésor** | Objectif surprise, récompense variable | ✅ Version "Portes" : quêtes surprises quotidiennes |
| **Succès/Ornements** | Complétion, affichage social | ✅ Déjà en place (22 succès) — enrichir l'affichage |
| **Donjons à clés/boss** | Jalon dramatisé | ✅ Déjà en place — ajouter des "boss" nommés avec lore |
| **Métiers 1-200** | Progression parallèle par domaine | ✅ Déjà en place (9 attributs) — rien à faire |
| **Événements saisonniers** | FOMO positif, renouvellement | ✅ Version "Failles" mensuelles |
| **Kolizéum / ladder PvP** | Compétition | ⚠️ Adapté en **ladder contre soi-même** (records personnels, semaines notées S/A/B) |
| **HDV / économie de marché** | Spéculation | ❌ Sans intérêt en solo |
| **Guildes / alliances** | Social | ❌ Hors périmètre (mono-joueur assumé) |

### 2.1 Panoplies (le plus gros levier)

Regrouper le catalogue LPC en **panoplies nommées façon Solo Leveling** (ex. *Panoplie
du Monarque des Ombres*, *Set du Porteur de Fardeau*, *Tenue de l'Éveillé*). Chaque
panoplie = 3-5 pièces avec un **bonus de set croissant** (2 pièces : +3% XP ; pièces
complètes : +10% XP +5% loot + aura visuelle sur l'avatar).

Effet boucle : chaque loot est évalué ("il me manque les bottes du set !") → le loot
aléatoire devient une **collection dirigée** → chaque quête validée est un ticket vers
la pièce manquante. C'est LE mécanisme qui fait ouvrir Dofus tous les jours.

### 2.2 Almanax d'ARISE

Chaque jour réel a : un **bonus du jour** (ex. mardi : +50% XP FOR — fusionne avec le
`dayTheme` existant) + une **offrande du jour** : une micro-action précise et variable
("valide 3 quêtes avant midi", "fais ta quête JAR aujourd'hui"). Offrande accomplie →
**Méréon** (nouvelle monnaie de collection, plafonnée) échangeable contre des
cosmétiques exclusifs au **Temple de l'Almanax** (page calendrier avec lore).

### 2.3 Idoles → "Serments"

Avant de commencer sa journée, le joueur peut prêter des **Serments** (contraintes
auto-imposées) : *Serment de l'Aube* (tout valider avant 20h), *Serment du Moine* (zéro
protection de série active), *Serment du Berserker* (+1 quête obligatoire). Chaque
serment actif = **multiplicateur d'XP/or/loot** ce jour-là. Échec du serment = petite
pénalité. C'est l'équivalent exact des idoles : la difficulté choisie paie.

### 2.4 Forgemagie → l'Atelier des Ombres

Aujourd'hui : vendre les doublons + `+N`. Demain : **briser** un doublon → extraire des
**Runes** (type selon le slot : rune d'XP, d'or, de loot). Appliquer une rune sur un
item : succès (stat exo ajoutée) / neutre / échec (la rune est perdue) avec probabilités
affichées. Gamble contrôlé, sans toucher à l'équilibre : les bonus restent bornés.

### 2.5 Élevage → l'Ombre-compagnon

Fidèle à Solo Leveling : Sung Jin-Woo relève des **ombres**. Le joueur possède une
**Ombre** (créature pixel-art, 3-4 stades d'évolution). Elle se **nourrit de ta
régularité** : chaque jour où toutes les quêtes obligatoires sont validées, elle gagne
de l'Essence. Elle évolue par paliers (7/30/90 jours cumulés). Si tu rates, elle ne
meurt pas (pas de punition destructrice) mais **s'assombrit** visuellement et cesse de
donner son petit bonus passif. Hook émotionnel : on ne valide plus pour soi, on valide
*aussi* pour elle.

### 2.6 Chasses au trésor → les Portes

Comme dans Solo Leveling, des **Portes** apparaissent aléatoirement (1 chance sur 3
chaque matin, notifiée par push : *"Une Porte de rang D s'est ouverte"*). Une Porte =
une micro-épreuve surprise du jour tirée d'un pool que tu configures (10 pompes bonus,
15 min de lecture supplémentaire, ranger un tiroir…) avec **timer de 24h** et récompense
généreuse. Rareté variable (Porte rouge = rare, gros loot). C'est le "surprise et
délice" qui casse la routine.

---

## 3. La boucle addictive (axe 2)

Trois boucles imbriquées, chacune avec son hook. Règle d'or conservée : **la seule
"dépense" demandée est un comportement réel positif** — l'addiction est dirigée vers
tes objectifs, jamais contre toi.

### Boucle courte (la minute) — le "juice"
1. Action réelle → ouverture de l'app (PWA, 2 s) → validation.
2. **Récompense variable** : XP fixe + or + jet de loot + (nouveau) jet de rune +
   progression de panoplie visible. Le cerveau adore l'incertitude du "qu'est-ce que
   je vais tirer ?" (ratio variable = le plus puissant des renforcements).
3. **Pity timer** (nouveau) : compteur caché qui garantit un item rare/épique au bout
   de N validations sans drop — évite la frustration des mauvaises séries.
4. Feedback maximal : son, particules, carte d'item qui se retourne (voir axe visuel).

### Boucle moyenne (le jour / la semaine) — le rendez-vous
- **Matin** : push "Le Système" → Almanax du jour + éventuelle Porte + choix des
  Serments. = rituel d'ouverture (30 s) qui engage la journée.
- **Journée** : validations au fil de l'eau + auto-validations (axe 3) qui créent des
  "cadeaux surprises" (tu ouvres l'app, les pas sont déjà comptés, loot en attente).
- **Soir** : résumé du tick + état de l'Ombre + série.
- **Semaine** : hebdos existantes + **note de semaine S/A/B/C** (ladder contre
  soi-même) affichée dans les Stats, avec récompense si tu bats ta meilleure semaine.

### Boucle longue (le mois / la saison) — le sens
- Rangs et Histoire Principale (existant, déjà solide).
- **Failles mensuelles** (événement à durée limitée : un mini-donjon thématique avec
  cosmétique exclusif du mois — FOMO doux, renouvelle l'intérêt).
- Évolution de l'Ombre (7/30/90 jours) et complétion des panoplies.

### Garde-fous (pour que l'addiction reste saine)
- Jamais de récompense pour du temps d'écran, uniquement pour des actions réelles.
- Pénalités bornées (système actuel conservé), l'Ombre ne meurt jamais.
- Le pity timer et les protections de série évitent l'effet "spirale d'échec".

---

## 4. Intégrations réelles (axe 3)

**Découverte clé : Apple Health est déjà ton hub.** Ta balance connectée y écrit ton
poids (via son app), ton app calories y écrit tes kcal, l'iPhone y écrit tes pas. Il
suffit donc d'**un seul pont** Apple Health → VPS, pas d'une intégration par service.

### Pipeline retenu (effort ~1-2 jours)
1. **App [Health Auto Export](https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069)** (iOS, abonnement Premium requis pour les
   automations) : exporte 150+ métriques en JSON par **POST automatique** vers une URL
   ([doc REST API](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/), [format des payloads](https://github.com/Lybron/health-auto-export)).
2. **Nouvelle route `POST /api/integrations/health`** sur ton VPS, sécurisée par header
   secret (même patron que `x-system-secret`). Elle parse pas / kcal / poids / sommeil
   et les stocke dans une nouvelle table `HealthSample (date, metric, value)`.
3. **Nouveau type de quête `auto`** : `metricKey` + `threshold` (ex. `steps ≥ 8000`).
   Le tick (et la réception du POST) valide automatiquement la quête → XP/loot comme
   une validation manuelle, avec push *"Le Système a détecté : 8 432 pas. Quête
   accomplie."* — l'effet "le Système me voit" est très Solo Leveling.
4. **Objectifs métriques branchés** : un objectif `metric` (poids 86→80 kg) peut
   pointer vers `metricKey: weight` → `currentValue` se met à jour tout seul depuis la
   balance. Zéro saisie manuelle.

Limite connue : iOS n'autorise l'export que téléphone déverrouillé → la synchro se fait
au fil de tes utilisations du téléphone, ce qui suffit largement pour un rythme quotidien.

### Option complémentaire (plus tard, si besoin de temps réel)
[API Withings](https://developer.withings.com/) directe avec webhook vers le VPS (pesée → notification instantanée).
Utile seulement si le passage par Apple Health se révèle trop lent. Effort : ~1 jour.

### Anti-triche
Aucun : tu es seul joueur et le seul perdant en cas de triche. Le design assume la
bonne foi (comme aujourd'hui pour la validation manuelle).

---

## 5. Plan visuel — pixel-art amélioré (axe 1)

Direction : rester 100% LPC/pixel-art (cohérence, gratuité, licences CC-BY-SA déjà
créditées) mais passer d'une UI "fiche" à une UI "jeu". Par ordre d'impact :

### 5.1 Cartes d'item façon Dofus (impact maximal, effort faible)
Chaque item a une **carte** : cadre coloré par rareté (avec texture et coins ouvragés),
vignette LPC, nom stylé, stats, **ligne de lore** (1 phrase générée une fois et stockée),
appartenance à sa panoplie avec pièces possédées (3/5). Le loot n'affiche plus un toast
mais une **carte qui se retourne** avec son et particules selon la rareté (pluie dorée
pour légendaire). → C'est ce qui donne "envie de looter".

### 5.2 Avatar animé (effort moyen)
⚠ Vérifié dans le repo : `public/lpc/*` ne contient que des **frames uniques 64×64**
(la frame idle découpée), pas les spritesheets complètes. Les sheets multi-frames
(marche, idle, cast) existent en amont (Universal LPC Spritesheet Generator, mêmes
licences CC-BY-SA) : il faudra régénérer les assets des items possédés avec 2-4 frames
par slot, puis animer l'avatar du Statut (idle respirant, célébration au level-up). **Auras de panoplie complète** et aura
par rang (F = rien … S = flammes violettes du Monarque) en calque additif.

### 5.3 Le Système comme personnage (effort faible)
Toutes les fenêtres importantes passent par le **panneau Système** (existant) mais avec
une **frappe machine à écrire + son**, coins holographiques animés, et un ton narratif
constant (*"Vous avez accompli la quête journalière. Récompenses attribuées."*).
Écrans de cérémonie plein écran pour : rank-up (existant, à enrichir), évolution de
l'Ombre, panoplie complétée, record de semaine battu.

### 5.4 Ambiance globale (effort faible, en continu)
Fond animé subtil (particules de poussière violette), glow renforcé sur les éléments
interactifs, curseur personnalisé, jauges avec effet liquide, transitions de page.
PixiJS uniquement si les particules CSS montrent leurs limites.

### 5.5 L'Ombre-compagnon (asset à créer)
3-4 sprites d'évolution (base LPC monsters ou pixel-art généré puis retouché : loup
d'ombre → garou → monarque). Idle animé 2-3 frames suffit.

---

## 6. Roadmap (pondérée temps / impact)

> **✅ STATUT : les 6 phases ont été implémentées** (voir HANDOFF.md §11 pour le détail
> technique). Reste côté utilisateur : commit + push + `docker compose up -d --build`,
> puis configurer Health Auto Export sur l'iPhone (Config → 📡 Intégrations).
> Reste côté dev (plus tard) : spritesheets LPC multi-frames pour l'avatar animé.

| Phase | Contenu | Effort estimé | Impact boucle |
|---|---|---|---|
| **P1 — Le pont réel** | Route `/api/integrations/health` + table `HealthSample` + quêtes `auto` + objectifs métriques auto + config Health Auto Export | 1-2 sessions | ★★★★★ (le réel valide tout seul) |
| **P2 — Le loot désirable** | Panoplies + bonus de set + cartes d'item + cérémonie de loot + pity timer | 2-3 sessions | ★★★★★ (collection dirigée) |
| **P3 — Le rendez-vous quotidien** | Almanax (bonus+offrande+Méréons+Temple) + Portes surprises + Serments | 2 sessions | ★★★★☆ (rituel du matin) |
| **P4 — L'attachement** | Ombre-compagnon (sprites, essence, évolutions, cérémonies) | 1-2 sessions | ★★★★☆ (hook émotionnel) |
| **P5 — La profondeur** | Forgemagie/runes + note de semaine S/A/B + Failles mensuelles | 2 sessions | ★★★☆☆ |
| **P6 — Le polish** | Icône PWA iOS (le reste de la PWA existe déjà) + avatar animé (régénération des sheets LPC) + auras + ambiance + machine à écrire Système | 2 sessions (étalable) | ★★★☆☆ (démultiplie le reste) |

Ordre pensé pour que **chaque phase soit utile seule** : P1 réduit la friction (moins de
saisie = plus d'adhérence), P2 rend chaque validation excitante, P3 crée le rituel, P4
l'attachement, P5-P6 entretiennent la durée.

### Nouvelles tables / champs Prisma anticipés
`HealthSample`, `Quest.metricKey/threshold` (+type `auto`), `SetBonus` (ou catalogue
statique dans `src/lib/sets.ts` — préférable, cohérent avec `cosmetics.ts`),
`Hunter.mereons`, `Hunter.shadowJson` (essence, stade), `Gate` (portes surprises),
`Oath` (serments du jour — ou JSON sur Hunter), `WeekScore`. Tout en nullable/défaut
→ compatible `prisma db push` sans risque.

---

## Sources (intégrations)
- [Health Auto Export — REST API](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/) · [App Store](https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069) · [Format des exports (GitHub)](https://github.com/Lybron/health-auto-export)
- Exemples de pipelines self-hosted : [apple-health-ingester](https://github.com/irvinlim/apple-health-ingester) · [FastAPI + InfluxDB + Grafana](https://github.com/po4yka/apple-health-export-automation-backup)
- [Withings Developer API](https://developer.withings.com/) · [Webhook poids (tutoriel)](https://dev.to/gutsav/webhook-your-weight-with-withings-api-1okk)
- Yazio/MyFitnessPal écrivent les calories dans Apple Health : [Yazio](https://help.yazio.com/hc/en-us/articles/360018833998-Yazio-and-Apple-Health) · [MyFitnessPal](https://personifyhealth.zendesk.com/hc/en-us/articles/28080143823003-How-to-connect-MyFitnessPal-to-Apple-Health)
