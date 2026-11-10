# Programmer une publication

Exemples : « Publie ma vidéo reel-confiance.mp4 sur Instagram et TikTok jeudi à 18 h », « Programme ce post
LinkedIn mardi 9 h : … ».

## 1. Comprendre la demande

Il te faut : le fichier (vidéo ou image) ou le texte, les réseaux, la date et l'heure, et le sujet.
- Fichier : cherche-le là où il le dit (Téléchargements, Bureau…). S'il y en a plusieurs du même nom, demande.
- Réseaux : par défaut, tous ceux de sa marque qui acceptent ce format (une vidéo verticale : Instagram, TikTok,
  YouTube ; un texte : LinkedIn, X).
- Date : sans précision, propose le prochain créneau raisonnable (ex. demain 18 h) et demande confirmation.
- Sujet : s'il ne l'a pas dit, demande-lui en une phrase de quoi parle la vidéo.

Si `ffmpeg` est installé (`ffmpeg -version`), regarde la vidéo : durée, et 3 ou 4 images
(`ffmpeg -i <vidéo> -vf fps=1/8 -frames:v 4 /tmp/apercu-%d.jpg`) pour comprendre le contenu et choisir une
miniature. Sinon, appuie-toi sur ce qu'il t'a dit.

## 2. Proposer les textes, attendre le OK

Écris un texte par réseau, dans le ton de ses posts précédents (`scripts/posts.py list`, et les textes de
`publications.json`) :
- **Instagram** : légende (accroche en première ligne, 3 à 6 hashtags) ;
- **TikTok** : titre court + légende ;
- **YouTube** : titre (100 caractères maximum) + description ;
- **LinkedIn** : post (accroche, phrases courtes, une question à la fin) ;
- **X** : 280 caractères maximum (un mot du type « nom.com » compte comme un lien de 23 caractères).

Montre-lui tout d'un coup, avec la date et les réseaux, puis demande : « Je programme comme ça, ou tu veux changer
quelque chose ? ». **Ne programme rien avant son oui.** S'il demande des retouches, refais seulement ce qu'il
demande et remontre.

## 3. Envoyer la vidéo dans Drive

Pour une vidéo ou une image :
```bash
python3 -I scripts/drive.py put "<chemin du fichier>"
```
Il copie le fichier dans le dossier « Social media app » de son Drive, attend la fin de l'envoi (de quelques
secondes à quelques minutes) et renvoie `url`, le lien direct à donner à Buffer. Dis-lui que tu envoies la vidéo
et que ça peut prendre une minute. En cas de `NOT_PUBLIC` : le dossier n'est plus partagé publiquement, réexplique
le partage (installation, étape 5).

## 4. Programmer dans Buffer

Les identifiants sont dans `config.json` (`buffer.organizationId`, `buffer.channels`). Calcule `dueAt` avec le
fuseau horaire de `get_account`. Un `create_post` par réseau, `mode: "customScheduled"`, `schedulingType: "automatic"` :
- Instagram : `assets: [{video: {url}}]`, `metadata.instagram = {type: "reel", shouldShareToFeed: true}` ;
- TikTok : `assets: [{video: {url}}]`, `metadata.tiktok.title` ;
- YouTube : `assets: [{video: {url}}]`, `metadata.youtube = {title, categoryId: "22"}` ;
- LinkedIn et X : `text` (et l'image ou la vidéo en `assets` s'il y en a une).

Note l'identifiant de chaque post créé. Si Buffer renvoie une erreur, dis-la simplement et propose une solution
(format de vidéo, longueur du texte…).

## 5. Ranger le post dans l'app

1. Copie la vidéo pour l'aperçu : `cp "<vidéo>" public/media/videos/<id>.mp4` (et, avec ffmpeg, une miniature :
   `ffmpeg -ss 1 -i "<vidéo>" -frames:v 1 public/media/covers/<id>.jpg`).
2. Écris le post dans un fichier temporaire puis `python3 -I scripts/posts.py add <fichier>` (format en tête de
   `scripts/posts.py`) avec `status: "programmed"`, `scheduled` (heure locale, `AAAA-MM-JJTHH:MM`), les textes,
   `driveUrl` et `buffer: [{platform, postId}]`.
3. Confirme : « ✅ C'est programmé pour jeudi 18 h sur Instagram et TikTok. Le post est dans ta Bibliothèque et ton
   Calendrier ; ses vues arriveront dans tes Stats le lendemain de sa publication. »

## Changer ou annuler

« Décale mon post de jeudi à vendredi » ou « annule-le » : utilise `edit_post` ou `delete_post` de Buffer
(après confirmation), puis `scripts/posts.py set <id> scheduled=…` ou `status=todo`.
