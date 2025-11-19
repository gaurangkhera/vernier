#!/bin/bash

echo "🔬 Starting Etinuxe Navigation System..."
echo "Continuing Dr. Miniature's Legacy"
echo ""

cd /workspaces/vernier/etinuxe-app

echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo ""
echo "🚀 Starting development server..."
echo "Open http://localhost:3000 in your browser"
echo ""

npm run dev
