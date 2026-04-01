#!/bin/bash

# Установка зависимостей в системную папку (чтобы не тянуть их везде)
echo "📦 Установка библиотек..."
npm install -g node-telegram-bot-api --quiet

# Создаем папку для скрипта
mkdir -p ~/.anongram

# Записываем index.js (или скачиваем его)
# Сюда можно вставить curl твоего файла с GitHub
# curl -sL https://raw.githubusercontent.com/USER/REPO/main/index.js -o ~/.anongram/index.js

# Даем права и создаем команду в системе
chmod +x ~/.anongram/index.js

if [ -d "$PREFIX/bin" ]; then
    ln -sf ~/.anongram/index.js $PREFIX/bin/anongram
else
    sudo ln -sf ~/.anongram/index.js /usr/local/bin/anongram
fi

echo "🔥 Готово! Просто напиши: anongram"
