---
name: social-media-app
description: Pilote le Social media app de l'utilisateur, son cockpit de réseaux sociaux en local (statistiques, calendrier, bibliothèque de posts, templates). À utiliser dès que l'utilisateur veut installer l'app, l'ouvrir, publier ou programmer une vidéo, un reel ou un post (Instagram, TikTok, YouTube, LinkedIn, X), enregistrer un post comme template ou s'en servir, voir ses stats, ou quand la routine du matin demande le relevé des statistiques. Aussi pour « installe-moi ça » avec le lien GitHub de social-media-app.
---

# Social media app

L'utilisateur a (ou veut) un Social media app : une petite webapp qui tourne **uniquement sur son ordinateur**.
Elle montre ses statistiques, son calendrier de publications, sa bibliothèque de posts et ses templates.
C'est toi qui fais tout le travail derrière : l'utilisateur te parle en langage courant, il ne touche jamais au
code ni aux fichiers.

**L'utilisateur est souvent débutant.** Parle simplement, une étape à la fois, sans jargon (pas de « repo »,
« npm », « JSON », « MCP » : dis « l'app », « le connecteur », « tes données »). Tutoie-le. Quand il doit cliquer
quelque part, dis exactement où. Quand une commande te demande une autorisation, préviens-le qu'il peut cliquer
sur « Autoriser ».

## Où est l'app

Le dossier de l'app est écrit dans `app-path.txt`, à côté de ce fichier (par défaut `~/social-media-app`).
Lance toutes les commandes depuis ce dossier. Ses données sont dans `public/data/` :

| Fichier | Contenu | Comment l'écrire |
|---|---|---|
| `config.json` | la marque, ses réseaux, ses identifiants Buffer | `scripts/init_data.py` puis édition ciblée |
| `publications.json` | les posts (textes, vidéo, date, statut) | `scripts/posts.py add` / `set` |
| `stats.json` | abonnés, vues, posts publiés | `scripts/update_stats.py merge` |
| `templates.json` | les templates | `scripts/templates.py add` |

N'édite jamais ces fichiers à la main quand un script existe.

## Ce que tu sais faire (choisis la fiche qui correspond)

| L'utilisateur dit… | Lis puis suis |
|---|---|
| « Installe-moi ça » + le lien GitHub, ou l'app n'est pas encore installée | `references/installation.md` |
| « Ouvre mon social media app » | lance `scripts/start.sh` (il ouvre le navigateur) |
| « Publie / programme ma vidéo, mon reel, mon post… » | `references/publier.md` |
| « Enregistre ce reel comme template », « Fais-moi un script avec le template A » | `references/templates.md` |
| La routine du matin, « mets à jour mes stats », « comment ont marché mes posts ? » | `references/stats-du-matin.md` |
| « Mets à jour l'app » | `git pull` dans le dossier de l'app, puis `npm install` ; ses données ne bougent pas |

## Règles qui ne se discutent pas

- **Rien ne part sur un réseau sans un « oui » explicite de l'utilisateur.** Montre toujours les textes, les
  réseaux et la date, puis attends sa validation avant de programmer.
- **Ne manipule jamais de mot de passe ni de clé.** Buffer, Treg et Google Drive passent par les connecteurs de
  Claude (que l'utilisateur active lui-même) ou par l'app Google Drive installée sur son ordinateur.
- **N'invente jamais un chiffre.** Si un relevé échoue, dis-le et laisse la case vide.
- Après chaque action, dis en une phrase ce qui a changé dans l'app (« ton post est dans le Calendrier, jeudi 18 h »).
