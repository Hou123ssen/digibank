#!/bin/sh
set -e

PORT="${PORT:-8080}"

mkdir -p \
    storage/app/public \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

php artisan storage:link --force >/dev/null 2>&1 || true
php artisan config:clear >/dev/null 2>&1 || true

if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    php artisan migrate --force
fi

cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen ${PORT};
    server_name _;
    root /var/www/html/public;
    index index.php index.html;

    client_max_body_size 20M;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT \$realpath_root;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default

php-fpm -D
exec nginx -g "daemon off;"
