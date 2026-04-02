#!/bin/bash

# ANONGRAM - Анонимный чат в терминале
# Установщик

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔════════════════════════════╗"
echo "║       █████╗ ███╗   ██╗    ║"
echo "║      ██╔══██╗████╗  ██║    ║"
echo "║      ███████║██╔██╗ ██║    ║"
echo "║      ██╔══██║██║╚██╗██║    ║"
echo "║      ██║  ██║██║ ╚████║    ║"
echo "║      ╚═╝  ╚═╝╚═╝  ╚═══╝    ║"
echo "╚════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Установка ANONGRAM...${NC}"

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js не установлен!${NC}"
    echo "Установите Node.js: https://nodejs.org/"
    exit 1
fi

# Создаем папку
mkdir -p ~/.anongram
cd ~/.anongram

# Скачиваем зашифрованный файл
echo -e "${GREEN}Загрузка ANONGRAM...${NC}"
curl -sL -o anongram.js https://raw.githubusercontent.com/lonneecybs-sudo/anongram/main/anongram.js

# Устанавливаем зависимости
echo -e "${GREEN}Установка зависимостей...${NC}"
npm install mqtt readline crypto 2>/dev/null

# Делаем исполняемым
chmod +x anongram.js

# Создаем ссылку
sudo ln -sf ~/.anongram/anongram.js /usr/local/bin/anongram 2>/dev/null || {
    echo -e "${GREEN}Или запускайте так: node ~/.anongram/anongram.js${NC}"
}

echo -e "${GREEN}✅ Установка завершена!${NC}"
echo -e "${CYAN}Запустите: anongram${NC}"
