#!/data/data/com.termux/files/usr/bin/bash

echo "[*] Установка зависимостей для Anongram..."
pkg update -y && pkg upgrade -y
pkg install nodejs -y

# Создаем папку проекта
mkdir -p anongram && cd anongram

# Инициализация и установка модулей
npm init -y
npm install hyperswarm crypto b4a

# Создаем файл запуска
echo "node index.js" > start.sh
chmod +x start.sh

echo "[+] Установка завершена. Запуск: ./start.sh"
