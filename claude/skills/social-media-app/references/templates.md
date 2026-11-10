# Templates

Un template, c'est la recette d'un format qui marche (un reel, une vidéo, un post) : sa structure, son accroche,
son rythme, son style. Il s'affiche dans l'écran Templates de l'app.

## Enregistrer un template (« Enregistre ce reel comme template »)

1. **Trouver le modèle** : un post de l'app (« celui de jeudi »), un fichier vidéo, ou un lien. Pour un lien
   Instagram ou TikTok que tu ne peux pas télécharger, demande-lui le fichier ou une description.
2. **L'analyser** :
   - avec `ffmpeg`, extrais une image toutes les 3 secondes et regarde-les (cadrage, textes à l'écran, rythme
     des plans, couleurs) ;
   - lis la légende et, s'il y en a, les chiffres du post dans `stats.json` ;
   - demande-lui ce qu'il aime dans ce format si ce n'est pas clair.
3. **Lui montrer la fiche** avant de l'enregistrer, en 5 à 8 lignes :
   - un nom court (« Face caméra · 3 conseils ») et quand l'utiliser ;
   - **Structure** : les étapes avec leur durée (accroche 0–2 s, …) ;
   - **Style** : cadrage, textes à l'écran, sous-titres, musique, couleurs ;
   - **Pour le refaire** : ce qu'il faut préparer ou tourner.
4. **Enregistrer** après son OK : copie la vidéo dans `public/media/templates/<id>.mp4`, écris la fiche (format en
   tête de `scripts/templates.py`, lettre suivante : A, B, C…) puis `python3 -I scripts/templates.py add <fichier>`.
   Confirme : « ✅ Il est enregistré dans ta section Templates (template A). »

## S'en servir (« Fais-moi un script avec le template A sur … »)

Lis la fiche (`scripts/templates.py list`, puis `templates.json`) et écris un script qui suit sa structure à la
lettre : ce qu'il dit, ce qu'on voit, la durée de chaque partie, et la légende du post. Propose-lui ensuite de
le programmer une fois la vidéo tournée.
