#!/bin/bash

# Цвета для красоты в процессе установки
G='\033[0;32m'
NC='\033[0m'

echo -e "${G}──────────────────────────────────────────${NC}"
echo -e "${G}   ANONGRAM v3: INSTALLING CORE...       ${NC}"
echo -e "${G}──────────────────────────────────────────${NC}"

# 1. Ставим базу
pkg install nodejs curl -y

# 2. Подготовка папок
mkdir -p ~/.anongram
cd ~/.anongram

# 3. Качаем сам мессенджер (проверь ник в ссылке!)
echo -e "[*] Downloading index.js..."
curl -sL https://raw.githubusercontent.com/lonneecybs-sudo/anongram/main/index.js -o index.js

# 4. Ставим только нужный сетевой протокол (MQTT)
echo -e "[*] Setting up network protocols..."
npm install mqtt --quiet

# 5. Делаем магию исполняемого файла
chmod +x index.js

# Создаем системную команду 'anongram'
if [ -d "$PREFIX/bin" ]; then
    # Для Termux
    ln -sf ~/.anongram/index.js $PREFIX/bin/anongram
else
    # Для обычного Linux
    sudo ln -sf ~/.anongram/index.js /usr/local/bin/anongram
fi

echo -e "\n${G}✅ УСТАНОВКА ЗАВЕРШЕНА!${NC}"
echo -e "Просто введи: ${G}anongram${NC}"
echo -e "Внутри чата напиши ${G}/help${NC} для просмотра новых команд."
