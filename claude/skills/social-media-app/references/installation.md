# Installer le Social media app

L'utilisateur vient de coller le lien GitHub et de dire « Installe-moi ça ». Compte une dizaine de minutes.
Avance **une étape à la fois** : à chaque étape où il doit agir, donne-lui 2 ou 3 instructions précises, puis
attends qu'il te dise « c'est fait » avant de vérifier et de passer à la suite.

Commence par un message court :
> Avec plaisir ! Je vais installer ton app de réseaux sociaux sur ton ordinateur. Elle tourne uniquement chez
> toi : rien n'est hébergé ailleurs. Je m'occupe de la technique, je te demanderai juste quelques clics.

## 1. Télécharger et installer l'app (toi seul)

1. Vérifie l'outil technique dont l'app a besoin : `node -v` (version 20 ou plus).
   - S'il manque : donne le lien https://nodejs.org (bouton « Télécharger », version LTS), explique que c'est un
     installateur à double-cliquer, et attends qu'il te dise que c'est fait.
2. Télécharge l'app dans `~/social-media-app` :
   - avec git s'il est là (`git --version`) : `git clone https://github.com/mapplesyrup/social-media-app ~/social-media-app` ;
   - sinon : télécharge `https://github.com/mapplesyrup/social-media-app/archive/refs/heads/main.zip`, décompresse-le
     dans `~/social-media-app`.
3. `cd ~/social-media-app && npm install` (une ou deux minutes).
4. Installe ce skill pour toutes ses futures conversations :
   `mkdir -p ~/.claude/skills && cp -R ~/social-media-app/claude/skills/social-media-app ~/.claude/skills/ && echo ~/social-media-app > ~/.claude/skills/social-media-app/app-path.txt`
   Explique-le en une phrase : « J'installe aussi mes instructions, pour que je sache piloter ton app dans
   n'importe quelle conversation. »

Préviens-le qu'il verra 2 ou 3 demandes d'autorisation et qu'il peut cliquer sur « Autoriser ».

## 2. Sa marque et ses réseaux

Pose 2 questions dans le même message :
1. Comment s'appelle ta marque ou ton compte ?
2. Sur quels réseaux tu publies ? (Instagram, TikTok, YouTube, LinkedIn, X)

Puis demande ses identifiants publics, pour suivre ses abonnés : le nom d'utilisateur de chaque compte
(ex. `@solene.coaching`), et pour LinkedIn l'adresse de son profil.

```bash
python3 -I scripts/config.py init "<marque>" instagram,tiktok,linkedin
python3 -I scripts/config.py handle instagram <nom d'utilisateur>
python3 -I scripts/config.py handle linkedin <adresse du profil>
scripts/start.sh
```

`start.sh` ouvre l'app dans son navigateur. Dis-lui qu'elle est vide pour l'instant et que c'est normal.

## 3. Connecter Buffer (pour publier)

Message à l'utilisateur :
> **① Buffer, pour publier sur tes réseaux.**
> 1. Crée un compte gratuit sur buffer.com.
> 2. Dans Buffer, clique sur « Connect a channel » et ajoute tes réseaux (le plan gratuit en accepte 3).
> 3. Dans l'app Claude : Réglages → Connecteurs → Buffer → Connecter.
> Dis-moi « c'est fait » quand c'est bon.

Puis vérifie : outil Buffer `get_account` (identifiant d'organisation), puis `list_channels`. Associe chaque
canal à un réseau de sa config (`service` du canal) et enregistre :
`python3 -I scripts/config.py buffer <organizationId> instagram=<id> tiktok=<id> linkedin=<id>`.
Confirme en citant les comptes trouvés (« ✅ Je vois bien tes 3 comptes : … »). S'il en manque un, dis lequel.

Si le connecteur Buffer n'apparaît pas dans ses Réglages : il peut l'ajouter depuis le répertoire des connecteurs
de Claude (« Parcourir les connecteurs », chercher Buffer).

## 4. Connecter Treg (pour suivre ses abonnés)

> **② Treg, pour suivre ton nombre d'abonnés.**
> 1. Crée un compte sur treg.to (c'est gratuit pour démarrer).
> 2. Dans Claude : Réglages → Connecteurs → Treg → Connecter.

Ne lui parle pas d'acheter du crédit : un compte neuf a un petit crédit offert, largement suffisant pour débuter.

Puis fais le premier relevé des abonnés (étape 2 de `stats-du-matin.md`) et annonce les chiffres
(« ✅ Treg est connecté. Tu as 1 240 abonnés sur Instagram… »).

## 5. Google Drive (pour envoyer ses vidéos à Buffer)

Buffer télécharge les vidéos depuis un lien public. On utilise son Google Drive :

1. `python3 -I scripts/drive.py setup`.
   - Réponse `NO_DRIVE` : demande-lui d'installer « Google Drive pour ordinateur »
     (https://www.google.com/drive/download/), de s'y connecter avec son compte Google, puis relance.
   - Sinon le dossier « Social media app » est créé dans son Drive.
2. Message :
   > **③ Google Drive, pour envoyer tes vidéos à Buffer.** J'ai créé dans ton Drive un dossier « Social media app ».
   > Une seule fois : ouvre drive.google.com, fais un clic droit sur ce dossier → Partager → Accès général →
   > « Tous les utilisateurs disposant du lien ». C'est ce qui permet à Buffer de récupérer tes vidéos.
3. Quand il a fini : `python3 -I scripts/drive.py check`. `{"shared": true}` → « ✅ Buffer pourra récupérer tes
   vidéos ». Sinon, réexplique le partage.

## 6. La routine du matin

Crée une tâche planifiée avec l'outil de tâches planifiées de l'app Claude (« Routines ») :
- tous les jours à 8 h ;
- consigne : « Relevé du matin de mon Social media app : utilise le skill social-media-app, fiche stats-du-matin. »

Explique : « Chaque matin à 8 h, je relève les vues de tes posts et tes abonnés, puis je mets ton app à jour.
Il faut que ton ordinateur soit allumé avec l'app Claude ouverte ; sinon, je le fais à la prochaine ouverture. »

Si aucun outil de tâches planifiées n'est disponible (Claude Code dans un terminal) : dis-lui qu'il suffira de
te dire « mets à jour mes stats ».

## 7. Le message de fin

Termine toujours par ce message (adapte les réseaux) :

> 🎉 **Ton app est prête !** Voici ce que je peux faire pour toi : demande-le-moi en une phrase.
>
> 1. **Programmer une publication** (vidéo, reel ou post texte) : « Publie ma vidéo X sur Instagram demain à
>    18 h ». J'écris les textes pour chaque réseau, tu valides, je programme.
> 2. **Enregistrer un template** : « Enregistre ce reel comme template ». Je note sa structure (accroche, rythme,
>    style) pour t'aider à refaire une vidéo du même type.
>
> Et aussi :
> - **Ouvrir ton app** : « Ouvre mon social media app » (ou double-clique sur « Ouvrir Social media app » dans le
>   dossier social-media-app de ton ordinateur).
> - **Faire le point** : « Comment ont marché mes posts cette semaine ? »
