# ARISE — Le Système · Document de passation (handoff IA)

> Ce fichier explique le projet à une IA (ou un dev) qui reprend le code à froid :
> le but, le game design, l'architecture, le modèle de données, les systèmes,
> les conventions et les pièges. Lis-le en entier avant de coder.

---

## 1. Le but (vision)

**ARISE — Le Système** est une web-app personnelle qui transforme la vie réelle de
son propriétaire (Mathieu) en RPG façon **Solo Leveling**. L'idée centrale :

> **Lier les mécaniques de jeu à un vrai changement de comportement dans la vie réelle**,
> via une boucle **Action → Succès → Récompense**.

L'utilisateur accomplit des actions concrètes (sport, lecture, épargne, jardinage…),
les valide dans l'app, gagne de l'XP, monte ses compétences, ses niveaux, ses rangs,
débloque de l'équipement, des skins, des titres et des récompenses réelles qu'il s'est
lui-même fixées. « Le Système » (comme dans Solo Leveling) est le narrateur/moteur.

C'est un **outil solo, mono-utilisateur** (un seul `Hunter` en base), auto-hébergé.
Priorité au **plaisir de jouer** et à l'**adhérence réelle**, pas à la complexité gratuite.

---

## 2. Game design — les briques et leurs rôles

Chaque objet du jeu a un rôle **distinct et complémentaire** (ne pas les confondre) :

- **Attributs (9 compétences de vie)** — les stats RPG, montées par l'XP des quêtes :
  `FOR` Force · `VIT` Vitalité · `INT` Intelligence · `VOL` Volonté · `FIN` Finances ·
  `FAM` Famille · `TRA` Travail · `JAR` Jardinage · `ART` Artisanat.
- **Quêtes journalières** — le *moteur* quotidien : comportements répétables qu'on contrôle.
  Chaque validation donne XP (attributs + niveau global) + or + chance de loot.
- **Missions hebdomadaires** (`Weekly`) — checklist qui se réinitialise chaque semaine.
- **Aventures = Objectifs hiérarchiques** — le *tableau de bord* du sens :
  **Quête Principale** (long terme, 6-12 mois) → **Chapitres** (moyen, ~3 mois) →
  **Quêtes courtes** (court, ~1 mois). Une quête courte se complète en **checklist**,
  ou en **hebdo**, ou en **mensuel** ; ou c'est un **compteur** de validations, ou une
  **métrique** (valeur départ→cible : poids, épargne…).
- **Donjons** — les *jalons-preuve* : épreuves ponctuelles (checklist d'étapes).
  Deux types : *libres* (à tout moment) et *de passage de rang* (verrouillés par le gate).
- **Histoire Principale** — l'ascension de **rang** (F → SS Elite). Affichée sur le Statut.
- **Économie** — `or` (gagné en quêtes/donjons) et `Éclats ✦` (`shards`, gagnés en donjon
  et passage de rang). Boutique : consommables, cosmétiques exclusifs, atelier, récompenses réelles.
- **Succès / Titres** — 22 succès à paliers ; certains débloquent des skins exclusifs + un
  **titre équipable** affiché sur la fiche.
- **Personnage** — avatar pixel-art LPC (calques 64×64), équipement à effets, personnalisation.

**Boucle canonique :** Action réelle → valider la quête → XP/or/loot → l'objectif avance →
palier atteint (donjon) → récompense (or → plaisir réel, ou skin/titre) → progression de rang.

---

## 3. Stack & architecture

- **Next.js 14** (App Router, TypeScript), **React 18**. Composants clients (`"use client"`).
- **Prisma 5** ORM + **SQLite** (fichier, `DATABASE_URL`). Un seul `Hunter`.
- **Tailwind 3** avec thème custom `system-*` (voir `tailwind.config.ts`) + `globals.css`
  (glow, keyframes d'animations, utilitaire `.cards` masonry, police Orbitron).
- **web-push** (VAPID) pour les notifications ; `PushSub` en base.
- Pas de state manager : chaque page fetch ses routes `/api/*` et gère son state React.
- Logique de jeu **pure et testable** isolée dans `src/lib/*` (progression, loot, effects,
  achievements, consumables, cosmetics, date) → testée dans `test/*.ts` (via `tsx`).

### Déploiement (VPS auto-hébergé, domaine matthomelab.tech)

- **Docker multi-stage** : base `node:22-slim` + `apt-get install openssl` (⚠ Alpine échoue
  sur la détection OpenSSL de Prisma). Le Dockerfile fait `COPY package.json ./` **uniquement**
  (le `package-lock.json` généré sous Windows casse `npm install`), et `rm -f package-lock.json`
  avant `prisma generate && npm run build`.
- **Traefik** en reverse proxy (labels : entrypoint `websecure`, certresolver `letsencrypt`).
  Pas de Caddy (port 80 déjà pris par Traefik du homelab).
- `prisma db push` applique le schéma au démarrage du conteneur (pas de migrations versionnées).
- **Cron** externe → `POST /api/system/tick` sécurisé par header `x-system-secret`
  (bascule de journée, pénalités, notifications). `/api/system/remind` pour les rappels.

### Workflow de dev (important)

Le dossier de travail **EST** le dépôt git (`Matt-Botelho/arise`, public). L'IA **écrit
directement** dans les fichiers. Mathieu **commit via GitHub Desktop puis push**, et sur le
VPS fait `git pull && docker compose up -d --build`. L'IA ne commit pas elle-même.

---

## 4. Modèle de données (Prisma — `prisma/schema.prisma`)

Tout pend d'un unique **`Hunter`** (`prisma.hunter.findFirst()` partout).

- **Hunter** — `rank`, `hp/maxHp`, `mp/maxMp`, `gold`, `shards`, `title`, `streak`,
  `globalLevel`/`globalXp`, `penaltyIntensity`, `dayRolloverHour`, `timezone`,
  `dayThemeJson`, `sfxEnabled`, `consumablesJson`, `buffsJson`, `lastRollover`,
  `appearanceJson`, `equippedJson`, `onboarded`. Relations vers tout le reste.
- **Attribute** — `code`, `name`, `icon`, `color`, `level`, `xp`, `order`. `@@unique([hunterId, code])`. 9 lignes (une par attribut).
- **Quest** — quête journalière : `title`, `type` (`daily`/`rankup`), `attributeCodes` (JSON string), `baseXp`, `difficulty` (E..S), `isMandatory`, `objectiveId?` (lien vers un objectif compteur), `themedDay?`, `active`.
- **QuestLog** — une complétion : `date` (jour de jeu), `xpAwarded`. `@@unique([questId, date])` = **1 validation par quête par jour**.
- **Weekly** — mission hebdo checklist : `stepsJson`, `attributeCodes`, `baseXp`, `weekKey` (reset), `status`.
- **Objective** — **arbre d'aventure** : `parentId` (self-relation `ObjectiveTree`, `onDelete: SetNull`), `horizon` (`long`/`moyen`/`court`), `kind` (`count`/`metric`/`checklist`), `targetCount`, `baseXp`, `recurrence` (`once`/`week`/`month`), `stepsJson`, `periodKey`/`lastRewardKey` (reset+reward des récurrents), `metricUnit`/`startValue`/`targetValue`/`currentValue`, `status`.
- **Dungeon** — `stepsJson`, `attributeCodes`, `rewardXp`, `rank`, `isRankUp`, `targetRank?`, `status` (`active`/`cleared`).
- **Reward** — récompense réelle : `title`, `cost` (or), `icon` (emoji), `redeemedAt?`.
- **InventoryItem** — `itemKey` (clé LPC), `qty`, `plus` (niveau d'amélioration). `@@unique([hunterId, itemKey])`.
- **Title** — succès/titre débloqué : `key`, `name`, `icon`. `@@unique([hunterId, key])`. Le titre *équipé* est `Hunter.title` (string).
- **Penalty** — historique des pénalités : `date`, `reason`, `hpLost`, `xpLost`.
- **PushSub** — abonnement web-push : `endpoint` (@unique), `keys`.

> ⚠ **Convention Prisma stricte** : le schéma doit rester **multi-ligne, une définition par
> ligne**. Le format compact provoque `P1012`. Règle de validation : **0 `;`** dans le fichier.

---

## 5. Progression & rangs (`src/lib/progression.ts` — SOURCE DE VÉRITÉ)

- **Rangs** : `["F","E","D","C","B","A","S","S+","SS","SS Elite"]`, `LEVELS_PER_RANK = 10`, `MAX_LEVEL = 100`.
- **Plafond de rang** `rankCeiling(rank) = (index+1) * 10` (F→10, E→20, … S+→80, SS→90, SS Elite→100).
- **Courbes d'XP** : global `round(100 * L^1.6)`, attribut `round(100 * L^1.5)`.
- `applyGlobalXp(level, xp, gained, ceiling)` : monte le niveau global **jusqu'au plafond du rang** puis bloque (barre pleine).
- `applyAttrXp(level, xp, gained, globalLevel)` : un attribut est **plafonné au niveau global** du joueur.
- **Gate de passage de rang** (`rankUpGate(globalLevel, rank, minAttrLevel)`) :
  débloque le donjon de rang quand **niveau global ≥ plafond** ET **chaque attribut ≥ moitié du
  plafond** (`attrThresholdFor(rank) = ceil(ceiling/2)`, ex. rang F → tous les attributs ≥ 5).
  → garantit une progression **homogène** (on ne monte pas en bourrinant une seule stat).
- Le passage de rang lui-même se fait en terminant un **Donjon `isRankUp`** (voir `dungeons/step`).

> ⚠ **Piège : deux définitions de `RANKS`.** `src/lib/game.config.ts` contient une ANCIENNE
> liste `["F".."S"]` + `RANK_THRESHOLDS` + `LEVEL_CURVE` (héritage, **obsolète** pour les rangs).
> La progression vivante utilise `src/lib/progression.ts`. En revanche `game.config.ts` reste
> utilisé pour : `ATTRIBUTES` (les 9), `DIFFICULTY_MULT` (multiplicateur d'XP par difficulté),
> `PENALTY_PRESETS` (intensités de pénalité) et `DEFAULTS`.

---

## 6. Les systèmes en détail

### Quêtes (`/api/quests`, `/api/quests/complete`)
`complete` calcule :
`gained = round(baseXp * DIFFICULTY_MULT[diff] * (épuisé?0.5:1) * (1+xpPct/100) * (potionXP?2:1))`.
Or : `round(gained/5 * (1+goldPct/100))`. +2 PV. Loot via `rollLoot`. XP répartie sur les
attributs de la quête + niveau global. Si `objectiveId` (objectif `count`), fait avancer la barre.
`GET /api/quests` renvoie aussi `dayThemeCode` (thème du jour) et `sfxEnabled`.

### Aventures / Objectifs (`/api/objectives`, `/api/objectives/step`)
`GET` renvoie tous les objectifs (plats) avec `frac` (0..1), `done`, `steps`, `progress`
(compteur) ; le front (`/objectifs`) reconstruit l'**arbre** via `parentId` et agrège la
progression des parents (moyenne des enfants). `step` coche une étape de checklist :
si tout est coché → award `baseXp` (attribut + global + or), et pour les récurrents
(`week`/`month`) reset des étapes au changement de période (`periodKey`) et 1 seul reward
par période (`lastRewardKey`). Clés de période dans `src/lib/date.ts` (`weekKeyOf`, `monthKeyOf`, `periodKeyFor`).

### Donjons (`/api/dungeons`, `/api/dungeons/step`)
`step` applique le **gate côté serveur** pour les donjons `isRankUp` (niveau + seuil d'attribut).
Terminer un donjon de rang → change `Hunter.rank`, donne un titre, de l'or, des Éclats, et un
**loot de rang** (`pickRankLoot`). Cérémonie côté UI (`ranks-lore.ts` : `RANK_TITLES`, `RANK_INTRO`).

### Économie (`src/lib/effects.ts`, `src/lib/loot.ts`, boutique)
- **Effets d'équipement** : `computeBonuses(equipped, plusByKey)` → `{xpPct, goldPct, lootPct}`.
  `SLOT_EFFECT` (arme/jambes/cheveux → XP ; torse/pieds → or ; casque/cape → loot),
  `RARITY_MAG` (commun 2 → mythique 16), amélioration `+N` (max 5, coût `50*(plus+1)`).
- **Loot** : `rollLoot(owned, difficulty, rnd, chanceBonus)` (préfère le neuf, sinon doublon),
  `dropChance` par difficulté, `SELL_VALUE` par rareté. **Exclus du loot** : `COSMETIC_SET`
  (cosmétiques Éclats) et `ACHIEVEMENT_SKINS` (skins de succès) → uniquement débloquables autrement.
- **Consommables** (`src/lib/consumables.ts`) : `streak_shield` (protège la série),
  `penalty_ward` (annule pénalités d'un jour) — passifs consommés au tick ;
  `xp_potion` (×2 XP 24 h), `luck_charm` (×2 loot 24 h) — buffs (`buffsJson`).
- **Cosmétiques Éclats** (`src/lib/cosmetics.ts`) : `COSMETICS` (skins exclusifs), coût en `shards`.
- **Atelier** : vendre les doublons (or), améliorer (`+N`).
- **Récompenses réelles** : créées par l'utilisateur (titre + coût en or + emoji), débloquées avec l'or.

### Succès / Titres (`src/lib/achievements.ts`, `/api/achievements`)
22 succès à 4 paliers (`bronze`/`argent`/`or`/`legendaire`), `check(ctx)` pur.
Récompenses : or + Éclats + parfois un **skin exclusif** (`ACHIEVEMENT_SKINS`). L'API crédite
**une seule fois** (via l'existence d'un `Title`). Titre équipable = `Hunter.title`, choisi dans /stats.

### Personnage (LPC pixel-art — `src/lib/lpc-items.ts`, `LpcAvatar`, `LpcItemThumb`)
Avatar composité par calques PNG 64×64 (frame idle). Slots : `weapon, headwear, hair, cape,
torso, legs, feet`. `DEFAULT_EQUIPPED`, `STARTER_ITEMS`. Assets CC-BY-SA (crédits requis).
`/personnage` = UI façon Dofus (perso à gauche, inventaire catégorisé à droite, aperçu au survol).
`character/route.ts` gère une migration d'inventaire via `INV_VERSION`.

### Sons & animations (`src/lib/sfx.ts`)
Synthétisés en **Web Audio** (aucun fichier binaire) : `playXp`, `playLevelUp`, `playLoot`,
`playRankUp`, `playObjective`. `setSfxEnabled` (réglage `Hunter.sfxEnabled`). Animations CSS
dans `globals.css` (`.anim-levelup`, `.anim-float`).

### Pénalités, bascule de journée, thème (`/api/system/tick`, `src/lib/date.ts`)
`gameDay(date, timezone, dayRolloverHour)` = jour de jeu YYYY-MM-DD. Le tick applique les
`PENALTY_PRESETS` sur les quêtes obligatoires ratées, gère la série, consomme les protections,
et envoie un résumé push. `dayThemeJson` = attribut mis en avant par jour de semaine (affiché en Quêtes).

---

## 7. Carte des fichiers

### Pages (`src/app/*/page.tsx`) — nav dans `layout.tsx`
- `/` **Statut** — avatar, barre de niveau, PV, stats, **Histoire Principale** (échelle de rangs
  + conditions du gate : niveau + chaque compétence à la moitié du palier), attributs.
- `/quetes` **Quêtes** — journalières + obligatoire + hebdo (cochables) + bannière thème + juice (sons/anim). **Vue joueur, pas de création.**
- `/objectifs` **Aventure** — l'arbre de quêtes immersif (checklists, métriques, agrégation). **Vue joueur.**
- `/donjons` **Donjons** — faire les épreuves + messaging du gate de rang. **Vue joueur.**
- `/boutique` **Boutique** — cosmétiques Éclats (grille), consommables, atelier (filtre par slot), récompenses réelles. **Vue joueur.**
- `/personnage` **Personnage** — équipement/personnalisation façon Dofus.
- `/stats` **Stats & Trophées** — courbe XP, niveaux d'attributs, sélecteur de titre, 22 succès par palier.
- `/configuration` **⚙ Config** — LES COULISSES : onglet **Assistant** (`ObjectiveWizard`),
  + Quêtes&Hebdo, Objectifs (arbre : parent/kind/récurrence), Donjons, Récompenses, Réglages.
  **Toute la création/paramétrage est ici** (les autres onglets restent "100% joueur").
- `/onboarding` **Onboarding** — accueil immersif → mène à l'Assistant.
- `/reglages` — ancienne page de réglages, **retirée de la nav** (remplacée par Config→Réglages), laissée accessible par URL.

### Routes API (`src/app/api/*/route.ts`)
`status`, `quests` (+`/complete`), `weeklies` (+`/step`), `objectives` (+`/step`),
`dungeons` (+`/step`), `character` (+`/equip`, `/appearance`), `inventory` (+`/sell`, `/upgrade`),
`cosmetics`, `consumables` (+`/use`), `rewards` (+`/redeem`), `achievements`, `settings`,
`onboarding`, `history`, `push/*`, `system/tick`, `system/remind`.
**V2 :** `integrations/health` (POST sécurisé + GET état), `almanax` (claim/buy),
`oaths`, `gates`, `forge` (break/apply), `weekscore` — et `_lib/award.ts` (cœur partagé, pas une route).

### Libs (`src/lib/*`)
`progression.ts` (rangs/XP/gate — source de vérité), `game.config.ts` (attributs, diff, pénalités ;
+ constantes de rang **héritées/obsolètes**), `game.ts` (`totalPower`, `isExhausted`, `rankIndex`),
`effects.ts`, `loot.ts`, `consumables.ts`, `cosmetics.ts`, `achievements.ts`, `lpc-items.ts`
(catalogue LPC généré), `suggestions.ts` (quêtes suggérées par attribut), `ranks-lore.ts`,
`sfx.ts`, `date.ts`, `push.ts`, `prisma.ts`.

### Composants (`src/components/*`)
`SystemPanel` (cadre "Système"), `LpcAvatar` (avatar composité), `LpcItemThumb` (vignette
mini-perso portant un item, cadrée/centrée), `ObjectiveWizard` (assistant bâtisseur d'aventure).

---

## 8. Conventions & pièges (À LIRE avant de coder)

1. **Schéma Prisma multi-ligne, 0 `;`.** Le format compact casse le build (`P1012`).
2. **JSX : `className`, jamais `class`.** (Grep de validation : `class="` doit être vide dans les `.tsx`.)
3. **Docker & lockfile.** Ne pas se fier au `package-lock.json` (généré sous Windows). Le Dockerfile
   copie seulement `package.json` et supprime le lock avant build.
4. **Faux positifs TypeScript en local (sandbox).** Le client Prisma local est souvent périmé
   → `tsc` signale des erreurs "Property X does not exist on PrismaClient / on type {…}" dans les
   **routes API** (ex. un nouveau champ Prisma). **Ce sont des faux positifs** qui disparaissent
   après `prisma generate` au build Docker. Vérification : un fichier **déjà déployé** produit les
   **mêmes** erreurs en local. De même, `Cannot find module 'web-push'` est local-only (installé en Docker).
   → Règle de validation : `tsc` ne doit avoir **0 erreur HORS `src/app/api/` et hors web-push**.
5. **Parasites git "fantômes".** Le montage du dossier connecté fait parfois apparaître de fausses
   suppressions/renommages stagés (`tailwind.config.ts`, `tsconfig.json`, `sfx.ts`, `suggestions.ts`,
   `ranks-lore.ts`, `test/*`). **Les fichiers sont intacts sur le disque.** Correctif : `git reset`
   dans un terminal Windows **avant de committer**. ⚠ **Ne jamais committer ces suppressions.**
6. **`test/` est type-checké par `next build`** (`tsconfig.include = **/*.ts`). Garder les tests
   valides côté types (ex. `test/p4.test.ts` couvre `achievements.ts`).
7. **Discipline de validation avant chaque livraison** : schéma 0 `;` ; pas de `class=` ;
   imports `@/lib`/`@/components` résolus ; équilibre `{}()[]` des fichiers touchés ;
   `tsc` sans erreur réelle (filtre routes/web-push) ; exécuter la logique pure (`test/p4.test.ts`).
8. **Migrations** = `prisma db push` au démarrage du conteneur (pas de fichiers de migration).
   Ajouter des colonnes nullable / avec défaut = sans risque.
9. **Un seul Hunter** : toutes les routes font `prisma.hunter.findFirst()`.

---

## 9. État du développement (à jour)

**Déployé et utilisé quotidiennement.** Sont construits et en prod :
progression v2 (niveau global, rangs, gate par attributs), quêtes journalières + obligatoire à
thème du jour + missions hebdo, **Aventures** (arbre Objectif Principal→Chapitres→Quêtes courtes,
checklist/hebdo/mensuel + métriques), donjons libres & de rang (cérémonie), économie complète
(or/Éclats, atelier vente/amélioration, effets d'équipement, consommables, cosmétiques exclusifs),
22 succès à paliers + skins exclusifs + titre équipable, personnage LPC + UI Dofus, sons/anim,
notifications push, pénalités réglables, **onglet Configuration** (coulisses) vs onglets joueur,
**Assistant** (flou → aventure paramétrée) + **onboarding** immersif, **Histoire Principale** sur le Statut.

### Pistes ouvertes / prochaines idées
- Réordonner l'arbre (drag & drop), ajout rapide de chapitre depuis la carte Aventure.
- Reset mensuel automatique des checklists `month` (aujourd'hui géré paresseusement au chargement/step ;
  un tick mensuel serait plus propre).
- Modèles d'aventure pré-remplis par domaine dans l'Assistant.
- Pont Telegram (notifs + validation à distance).
- Nettoyer les constantes de rang héritées dans `game.config.ts`.
- Régénérer les assets LPC en spritesheets multi-frames (marche/idle) pour animer l'avatar.

---

## 11. V2 — « Le Système s'éveille » (voir PLAN_V2.md pour le game design complet)

Grosse évolution livrée en une passe : pont Apple Santé, panoplies, Almanax, Serments,
Portes, Ombre-compagnon, Forge des Ombres, notes de semaine, Failles mensuelles, pity timer,
cérémonie de loot, PWA iOS. **Le cœur de récompense est centralisé** dans
`src/app/api/_lib/award.ts` (dossier `_lib` = pas une route ; il vit sous `api/` exprès,
pour que les faux positifs Prisma locaux restent couverts par la règle de validation §8.4).

### Nouveaux modèles Prisma (tous additifs, `db push` sans risque)
- **HealthSample** — `date`, `metric` (clé canonique), `value`, `unit`. `@@unique([hunterId, date, metric])`.
- **Gate** — Porte du jour : `date`, `rank`, `title`, `gold`, `xp`, `status` (`open/cleared/expired`). `@@unique([hunterId, date])`.
- **WeekScore** — `weekKey`, `score`, `grade` (S/A/B/C). `@@unique([hunterId, weekKey])`.
- **Hunter** += `pityCounter`, `mereons` (❖), `almanaxJson`, `oathsJson`, `shadowJson`, `gatePoolJson`, `runesJson`, `bestWeekScore`.
- **Quest** += `metricKey`, `threshold` (type `auto` = validée par Apple Santé).
- **Objective** += `metricKey` (métrique auto-alimentée). **InventoryItem** += `exoJson` (forge).
- **Dungeon** += `isRift`, `monthKey` (Failles mensuelles).

### Nouveaux systèmes (libs pures + tests `test/p5.test.ts`, 46 assertions)
- **Pont Apple Santé** (`lib/health.ts`, `POST /api/integrations/health`) : l'app iOS
  *Health Auto Export* (Automations → REST API) POSTe son JSON avec le header
  `x-system-secret` (même secret que le cron). 15 métriques canoniques (pas, kcal actives/
  ingérées, poids, sommeil, distance…), agrégation `sum/last` par jour. Effets : quêtes
  `auto` validées au seuil (+ push « Le Système a détecté… »), objectifs `metric` liés
  mis à jour tout seuls (balance → poids). Config : onglet **📡 Intégrations**.
- **Panoplies** (`lib/sets.ts`) : 6 sets nommés (Vagabond, Chevalier, Faucheur, Légionnaire,
  Berserker, Monarque), pièces multi-slots, bonus par paliers (2/3/4 pièces équipées),
  aura sur l'avatar quand complète, lore par item (`loreFor`). `validateSets()` en test.
- **Pity timer** (`lib/loot.ts` : `rollLootWithPity`) : au 10ᵉ échec consécutif, drop épique+
  garanti. Compteur `Hunter.pityCounter`.
- **Almanax** (`lib/almanax.ts`, `/api/almanax`) : offrande quotidienne déterministe
  (hash du jour), vérifiée CÔTÉ SERVEUR (`offeringSatisfied` + `checkAlmanax` dans award.ts,
  branchée sur quêtes/hebdos/objectifs). Récompense : **Méréons ❖** + or. **Temple** :
  3 reliques exclusives en ❖ (exclues du loot via `TEMPLE_SET`).
- **Serments** (`lib/oaths.ts`, `/api/oaths`) : façon idoles Dofus. 3 serments, max 2/jour,
  scellés le matin, multiplicateurs immédiats (XP/or), évalués au tick — échec = malus PV/or.
- **Ombre-compagnon** (`lib/shadow.ts`, composant `ShadowCompanion` SVG) : +1 Essence par
  journée parfaite (tick), 4 stades (0/7/30/90), bonus XP passif si « nourrie » (journée
  parfaite hier/aujourd'hui), s'assombrit sinon — ne meurt jamais. Affichée sur le Statut.
- **Portes** (`lib/gates.ts`, `/api/gates`) : au tick, 1 chance sur 3 qu'une Porte s'ouvre
  (rang pondéré D→S, récompenses croissantes), épreuve tirée du pool configurable
  (Réglages), expire en fin de jour de jeu. Push à l'ouverture.
- **Forge des Ombres** (`lib/forge.ts`, `/api/forge`) : briser un doublon → Runes (type selon
  slot, quantité selon rareté) ; appliquer une rune : 55% succès (+1% exo), 25% neutre
  (rune gardée), 20% brisée. Borne dure +5%/stat/objet. UI dans Boutique→Atelier.
- **Note de semaine** (`lib/weekscore.ts`, `/api/weekscore`) : calculée au premier tick de
  la semaine (done×10 + jours parfaits×25 − échecs×15 → S/A/B/C), record = +150 or +3 ✦.
  Affichée dans Stats.
- **Failles mensuelles** : au tick, un donjon `isRift` par mois (5 gabarits déterministes
  dans `gates.ts`), clear = or + 5 ✦ + 15 ❖.
- **Cérémonie de loot** (`components/LootCard.tsx`) : carte qui se retourne, cadre par
  rareté, lore machine à écrire (`Typewriter.tsx`), progression de panoplie, pluie de
  particules pour légendaire+.
- **PWA iOS** : `apple-touch-icon.png` + `icon-192/512.png` (générés), manifest enrichi,
  `appleWebApp` dans layout. Poussière d'ambiance en fond (CSS pur).

### Économie V2 (3 monnaies)
`or` (quêtes) → plaisir réel & consommables · `Éclats ✦` (donjons/rangs/records) → skins
prestige · `Méréons ❖` (offrandes Almanax/Failles) → reliques du Temple. Chaque monnaie a
sa boucle et son rythme.

### ⚠ Pièges V2
- `award.ts` importe la moitié des libs : tout nouveau bonus doit passer PAR LUI (ne pas
  recalculer l'XP dans une route).
- L'ordre des multiplicateurs : `baseXp × diff × épuisé × (1+bonus%/100) × potion × serments`.
- `weeklies/step` garde son propre award (loot garanti « S ») mais appelle `checkAlmanax`.
- Le client Prisma LOCAL ne connaît pas les nouveaux champs tant que `prisma generate`
  n'a pas tourné (Docker) → faux positifs tsc dans `src/app/api/**` uniquement (règle §8.4).

---

## 10. Lancer en local
```
npm install
npx prisma db push          # crée la base SQLite
npm run dev                 # http://localhost:3000
npm test                    # tests de logique pure (tsx)
```
Variables : `DATABASE_URL` (SQLite), clés VAPID pour le push, `x-system-secret` pour le tick.
