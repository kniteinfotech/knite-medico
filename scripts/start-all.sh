#!/usr/bin/env bash
set -e

echo "======================================================"
echo "  🚀 Starting KNITE Medico SaaS (Client & Server)"
echo "======================================================"

# 1. Start Server Container
echo "📦 Ensuring KNITE Medico Cloud Sync API container is running..."
cd /home/knite-server/Documents/Medical\ saas/server
docker compose up -d

echo "✅ Cloud Sync Server online at http://localhost:5055"

# 2. Launch Client
echo "💻 Starting KNITE Medico POS Client..."
cd /home/knite-server/Documents/Medical\ saas/client
npm run dev -- --host 0.0.0.0
