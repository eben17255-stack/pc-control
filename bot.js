const TelegramBot = require('node-telegram-bot-api');

// ============= НАСТРОЙКИ =============
const TOKEN = process.env.BOT_TOKEN || "ВАШ_ТОКЕН";
const ADMIN_IDS = [8754794142];

const bot = new TelegramBot(TOKEN, { polling: true });

// ============= ПРОВЕРКА АДМИНА =============
function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// ============= /START =============
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        return bot.sendMessage(chatId, '⛔ ДОСТУП ЗАПРЕЩЁН!');
    }
    
    bot.sendMessage(chatId, 
        `🎮 **БОТ УПРАВЛЕНИЯ ПК**\n\n` +
        `Доступные команды:\n` +
        `/shutdown - выключить ПК\n` +
        `/restart - перезагрузить\n` +
        `/ping - проверка связи\n` +
        `/id - ваш ID`,
        { parse_mode: 'Markdown' }
    );
});

// ============= ВЫКЛЮЧЕНИЕ =============
bot.onText(/\/shutdown/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const { exec } = require('child_process');
    bot.sendMessage(msg.chat.id, '⏳ Выключение через 10 секунд');
    setTimeout(() => {
        exec('shutdown /s /t 1');
    }, 10000);
});

// ============= ПЕРЕЗАГРУЗКА =============
bot.onText(/\/restart/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const { exec } = require('child_process');
    bot.sendMessage(msg.chat.id, '⏳ Перезагрузка через 10 секунд');
    setTimeout(() => {
        exec('shutdown /r /t 1');
    }, 10000);
});

// ============= ПИНГ =============
bot.onText(/\/ping/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '🏓 Pong! Бот работает');
});

// ============= ID =============
bot.onText(/\/id/, (msg) => {
    bot.sendMessage(msg.chat.id, `🆔 Ваш ID: ${msg.from.id}`);
});

console.log('🤖 БОТ ЗАПУЩЕН!');
console.log('👑 Админ:', ADMIN_IDS[0]);
