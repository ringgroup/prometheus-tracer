#!/usr/bin/env bash
# Prometheus Tracer — one-shot GitHub + Vercel setup.
# Run from this folder:  bash deploy.sh
set -e
cd "$(dirname "$0")"

echo "==> Initializing git"
git init -b main
git add .
git commit -m "Prometheus Tracer: initial Bloomberg-style body-composition dashboard"

echo "==> Creating GitHub repo + pushing (requires GitHub CLI 'gh', logged in)"
# If you don't have gh: install with 'brew install gh' then 'gh auth login'
gh repo create prometheus-tracer --public --source=. --remote=origin --push

echo "==> Deploying to Vercel (requires 'vercel' CLI, logged in)"
# If you don't have it: 'npm i -g vercel' then 'vercel login'
vercel --prod

echo "==> Done. Your live URL is printed above."
