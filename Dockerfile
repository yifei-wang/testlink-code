FROM php:7.4-apache

RUN apt update && apt upgrade -y
RUN apt install -y \
  default-mysql-client \
  zlib1g-dev \
  libpng-dev \
  libjpeg-dev \
  libfreetype-dev \
  libzip-dev && \
  rm -rf /var/lib/apt/lists/*

# Enable Apache modules (rewrite for .htaccess support)
RUN a2enmod rewrite && \
    a2enmod headers

RUN docker-php-ext-install mysqli && \
  docker-php-ext-enable mysqli && \
  docker-php-ext-configure gd --with-freetype --with-jpeg && \
  docker-php-ext-install gd && \
  docker-php-ext-install fileinfo && \
  docker-php-ext-install zip && \
  docker-php-ext-enable fileinfo && \
  docker-php-ext-enable zip
RUN apt clean

WORKDIR /var/www/html

# Copy files to web root
COPY . .
COPY ./docker/php.ini-production /usr/local/etc/php/conf.d/php.ini

# Create Apache configuration for upload handling using Alias instead of symlink
RUN printf '# TestLink Upload Area Configuration\n\n' > /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '# upload_area - stores uploaded images and upload handler\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf 'Alias /upload_area /var/testlink/upload_area\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '<Directory /var/testlink/upload_area>\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '    AllowOverride None\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '    Options Indexes FollowSymLinks\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '    Require all granted\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '</Directory>\n\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '# Allow access to all files in upload_area\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    a2enconf testlink-upload-area

RUN  chown -R www-data:www-data /var/www/html/gui/templates_c