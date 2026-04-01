#!/bin/bash

echo "⚙️ Установка Anongram..."

# 1. Установка зависимостей
pkg install nodejs curl -y

# 2. Создание папки
mkdir -p ~/.anongram
cd ~/.anongram

# 3. Скачивание кода (замени ссылку на свою!)
curl -sL https://raw.githubusercontent.com/lonneecybs-sudo/anongram/main/index.js -o index.js

# 4. Установка библиотеки бота
npm install node-telegram-bot-api --quiet

# 5. Права и Симлинк
chmod +x index.js
if [ -d "$PREFIX/bin" ]; then
    ln -sf ~/.anongram/index.js $PREFIX/bin/anongram
else
    sudo ln -sf ~/.anongram/index.js /usr/local/bin/anongram
fi

echo -e "\n✅ ГОТОВО! Теперь пиши команду: anongram"
