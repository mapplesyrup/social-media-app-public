#!/bin/sh
# Double-clique sur ce fichier pour ouvrir ton Social media app dans ton navigateur.
# Garde cette fenêtre ouverte tant que tu utilises l'app (la fermer arrête l'app).
cd "$(dirname "$0")" || exit 1
[ -d node_modules ] || npm install
npm run start
