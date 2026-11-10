# Relevé des stats (routine du matin, ou « mets à jour mes stats »)

Lecture seule sur tous les réseaux : ne crée, ne modifie et ne supprime jamais de post pendant le relevé.
Lance les commandes depuis le dossier de l'app (`app-path.txt`).

## 1. Le plan

`python3 -I scripts/update_stats.py plan` donne la date du jour et les semaines (lundi → dimanche) à relever.
Le plan gratuit de Buffer ne sert que les 31 derniers jours.

## 2. Les abonnés (connecteur Treg)

Pour chaque réseau de chaque marque qui a un identifiant dans `config.json` (`handles`), un appel Treg :

| Réseau | Endpoint Treg | Paramètre | À garder |
|---|---|---|---|
| Instagram | `treg.instagram.user.profile` | `{"username": …}` | `followers`, `posts_count` → `posts` |
| TikTok | `treg.tiktok.user.profile` | `{"username": …}` | `followers`, `videos_count` → `posts`, `likes` |
| YouTube | `treg.youtube.channel.profile` | `{"channel_id": …}` | `subscribers` → `followers`, `videos_count` → `posts` |
| LinkedIn | `treg.linkedin.user.profile` | `{"linkedin_url": …}` | `followers` |
| X | `treg.x.user.profile` | `{"username": …}` | `followers` |

Si plusieurs fournisseurs existent pour un endpoint, prends celui que Treg classe le plus fiable. Pour Instagram,
évite la route `crawl4ai` si possible : elle a déjà renvoyé des chiffres en retard. Si un appel échoue, laisse ce
réseau de côté : n'invente et ne recopie jamais un chiffre.

## 3. Les vues par semaine (connecteur Buffer)

Pour chaque semaine du plan et chaque canal de `config.json` (`buffer.channels`) : `get_aggregated_post_metrics`
avec `startDateTime` / `endDateTime` de la semaine. Garde : `postCount` → `posts`, `views`, `reach` (si non nul),
`reactions` → `likes`, `comments`, `shares`, `saves`, `averageTimeWatched` → `avgWatchSec`.

## 4. Les posts publiés (connecteur Buffer)

`list_posts` avec `status: ["sent"]`, `includeMetrics: true`, depuis 31 jours, `first: 100`.
- Chaque post envoyé devient une entrée `timeline` : `id`, `platform` (`channelService`), `sentAt`, `views`
  (0 si absent), `text` (les 80 premiers caractères).
- Un post qui correspond à un post de l'app (même identifiant Buffer dans `buffer`, ou même début de texte)
  devient aussi une entrée `posts` : `reelId` (l'id du post de l'app), `platform`, `bufferId`, `sentAt`,
  `metricsUpdatedAt`, `views`, `reach`, `likes`, `comments`, `shares`, `saves`, `watchTimeMin`, `avgWatchSec`.
- Quand tous les posts Buffer d'un post de l'app sont envoyés : `python3 -I scripts/posts.py set <id> status=published`.

## 5. Enregistrer

Écris les valeurs dans `/tmp/social-media-app-stats.json` (format en tête de `scripts/update_stats.py`, avec
`date` = aujourd'hui), puis `python3 -I scripts/update_stats.py merge /tmp/social-media-app-stats.json`.
L'app affiche les nouveaux chiffres au prochain rechargement de la page.

## 6. Le résumé

En 2 ou 3 phrases simples : les abonnés par réseau et l'évolution depuis le dernier relevé, les vues de la
semaine, et ce qui a échoué s'il y a lieu. Si l'utilisateur a demandé « comment ont marché mes posts ? », cite le
post qui a le mieux marché et une piste pour le suivant.
