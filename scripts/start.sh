#!/bin/sh
# Lance l'app en arrière-plan sur http://localhost:4321 (utilisé par Claude) ; ne fait rien si elle tourne déjà.
cd "$(dirname "$0")/.." || exit 1
if curl -s -o /dev/null http://localhost:4321; then open http://localhost:4321; exit 0; fi
[ -d node_modules ] || npm install --silent
nohup npm run start -- --strictPort > /tmp/social-media-app.log 2>&1 &
sleep 3 && echo "App lancée : http://localhost:4321"
