#!/bin/bash

echo "🚀 Начинаю установку Anongram..."

# 1. Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установи его: pkg install nodejs (для Termux)"
    exit 1
fi

# 2. Создаем рабочую директорию
mkdir -p ~/.anongram
cd ~/.anongram

# 3. Скачиваем index.js (замени ссылку на свою после загрузки на GitHub)
# Пока что используем заглушку, тебе нужно будет вставить прямую ссылку (Raw)
# curl -s https://raw.githubusercontent.com/ЮЗЕР/РЕПО/main/index.js -o index.js

# 4. Устанавливаем зависимости прямо в эту папку
npm install node-telegram-bot-api

# 5. Делаем файл исполняемым
chmod +x index.js

# 6. Создаем симлинк (команду 'anongram')
# Проверяем, Termux это или обычный Linux
if [ -d "$PREFIX/bin" ]; then
    ln -sf ~/.anongram/index.js $PREFIX/bin/anongram
else
    sudo ln -sf ~/.anongram/index.js /usr/local/bin/anongram
fi

echo "✅ Установка завершена!"
echo "Теперь просто напиши: anongram"
