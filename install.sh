#!/bin/bash

echo "⚙️ Сборка и установка сети Anongram..."

# 1. Установка системных зависимостей
pkg install nodejs curl -y

# 2. Создание системной папки
mkdir -p ~/.anongram
cd ~/.anongram

# 3. Скачивание ядра (замени lonneecybs-sudo на свой точный ник в ссылке, если надо)
curl -sL https://raw.githubusercontent.com/lonneecybs-sudo/anongram/main/index.js -o index.js

# 4. Установка сетевого протокола MQTT (занимает пару секунд)
echo "📦 Настройка P2P протоколов..."
npm install mqtt --quiet

# 5. Права и Симлинк в систему
chmod +x index.js
if [ -d "$PREFIX/bin" ]; then
    ln -sf ~/.anongram/index.js $PREFIX/bin/anongram
else
    sudo ln -sf ~/.anongram/index.js /usr/local/bin/anongram
fi

echo -e "\n🔥 СИСТЕМА УСТАНОВЛЕНА!"
echo "Для входа в сеть введи команду: anongram"
