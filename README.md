# ARISE — Le Système

Ta vie en RPG façon **Solo Leveling**. Web app **PWA** auto-hébergeable : tu suis tes
domaines de vie comme des attributs, tu complètes des quêtes pour gagner de l'XP, tu montes
de niveau et de **rang (F → S)**.

Stack : **Next.js** (App Router, TypeScript) · **Prisma + SQLite** · **Tailwind** ·
déploiement **Docker + Caddy**. Voir `SPEC_Systeme_SoloLeveling_IRL.md` pour la conception complète.

## Démarrer en local
Prérequis : Node 20+.
```bash
cp .env.example .env
npm install
npm run db:push   # crée la base SQLite
npm run seed      # crée ton chasseur + 9 attributs + quêtes d'exemple
npm run dev       # http://localhost:3000
```
Tester la logique de jeu : `npm test`
Build prod local : `npm run build && npm start`

## Déploiement VPS (Docker + Caddy + sous-domaine)
Prérequis : Docker + Docker Compose sur le VPS.

1. **DNS** : crée un enregistrement **A** `systeme` → IP de ton VPS (registrar de `matthomelab.tech`).
   Pour un autre sous-domaine, change-le aussi dans `Caddyfile`.
2. Sur le VPS :
   ```bash
   git clone <ton-repo> arise && cd arise
   cp .env.example .env        # change SYSTEM_CRON_SECRET
   docker compose up -d --build
   ```
3. Caddy obtient/renouvelle le **HTTPS** automatiquement. Ouvre `https://systeme.matthomelab.tech`.
4. La base vit dans le volume Docker `arise-data` (persistant). Schéma + seed appliqués au 1er démarrage.

**Mettre à jour** : `git pull && docker compose up -d --build`
**Sauvegarde DB** :
```bash
docker run --rm -v arise_arise-data:/data -v "$PWD":/backup alpine \
  sh -c "cp /data/arise.db /backup/arise-backup-$(date +%F).db"
```

## Pousser sur GitHub
```bash
cd arise
git init && git add . && git commit -m "ARISE v0.1 — MVP Statut + Quetes"
git branch -M main
git remote add origin git@github.com:<toi>/arise.git
git push -u origin main
```

## Inclus dans cette v0.1 (Phase 0–1)
- **Fenêtre de Statut** : rang, PV/Énergie, or, puissance totale, 9 attributs avec niveaux + barres d'XP.
- **Quêtes journalières** : compléter → XP réparti sur les attributs ciblés → montées de niveau.
- **Mécanique de rang** (la tienne) : seuils sur **chaque** attribut → déblocage d'une
  **« Épreuve de promotion »** → montée de rang F→E→…→S.
- Or gagné par quête, **PWA installable**.

## Réglage du jeu
Tout l'équilibrage est centralisé dans **`src/lib/game.config.ts`** :
courbes d'XP, seuils de rang, multiplicateurs de difficulté, intensité des pénalités, liste des attributs.

## Suite (voir SPEC)
Phase 2 : pénalités + cron de bascule de journée · Phase 3 : notifications push + boutique de récompenses ·
Phase 4 : donjons + historique/graphes · Phase 5 : polish + bridge Telegram.
