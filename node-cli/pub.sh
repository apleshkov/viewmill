#!/usr/bin/env bash

echo "Publishing..."
npm run build
rm tr/.gitignore # Make the folder available to publish
npm publish