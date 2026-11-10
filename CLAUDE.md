# Social media app

Une webapp locale (React + Vite, `npm run start` sur http://localhost:4321) que l'utilisateur pilote en parlant à
Claude : statistiques, calendrier, bibliothèque de posts et templates de ses réseaux sociaux.

**Avant toute action, lis `claude/skills/social-media-app/SKILL.md` et suis-le.** Il dit comment installer l'app,
publier un post, enregistrer un template et faire le relevé des stats du matin.

- L'utilisateur est souvent débutant : parle simplement, une étape à la fois, tutoie-le.
- Ses données sont dans `public/data/` et ne sont pas suivies par git ; écris-les avec les scripts de `scripts/`.
- Rien ne se publie sans son « oui » explicite.
