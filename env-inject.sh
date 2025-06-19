#!/bin/sh
set -e

echo "window.ENV = {" > /usr/share/nginx/html/env.js
# Loop through all env vars, filter for VITE_ prefix
printenv | grep '^VITE_' | while IFS='=' read -r name value; do
  echo "  \"$name\": \"$value\"," >> /usr/share/nginx/html/env.js
done
echo "};" >> /usr/share/nginx/html/env.js 