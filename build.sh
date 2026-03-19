#!/usr/bin/env bash
set -e

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
node node_modules/prisma/build/index.js generate

echo "Compiling TypeScript..."
node node_modules/typescript/bin/tsc

echo "Pushing database schema..."
node node_modules/prisma/build/index.js db push --accept-data-loss

echo "Build complete!"
