#!/bin/sh
set -e

echo "Installing frontend dependencies..."
npm ci --prefix frontend

echo "Installing Laravel dependencies..."

if command -v composer >/dev/null 2>&1; then
echo "Using global composer..."
composer --working-dir=backend install --no-dev --optimize-autoloader --no-interaction --prefer-dist
elif command -v php >/dev/null 2>&1; then
echo "Global composer not found. Installing composer.phar temporarily..."
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php --quiet --filename=composer.phar
php composer.phar --working-dir=backend install --no-dev --optimize-autoloader --no-interaction --prefer-dist
rm -f composer-setup.php composer.phar
else
echo "ERROR: Neither composer nor php is available in the Vercel build environment."
echo "Cannot install Laravel backend dependencies."
exit 127
fi

echo "Install step completed."
