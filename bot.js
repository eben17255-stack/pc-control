const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');

// ============= НАСТРОЙКИ =============
const TOKEN = process.env.BOT_TOKEN || "8672837047:AAG7fz0nyPN8yAPGgczm5zyrOQnkW8wE9ig";
const ADMIN_IDS = [8754794142]; // Ваш ID

const bot = new TelegramBot(TOKEN, { polling: true });

// ============= ПРОВЕРКА АДМИНА =============
function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// ============= БЕЗОПАСНЫЙ EXEC =============
function safeExec(cmd) {
    try {
        exec(cmd, (error) => {
            if (error) console.log(`⚠️ Ошибка: ${cmd}`);
        });
    } catch (e) {
        console.log(`⚠️ Ошибка выполнения`);
    }
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
        `👑 **УПРАВЛЕНИЕ ПК**\n` +
        `/shutdown - выключить\n` +
        `/restart - перезагрузить\n` +
        `/sleep - спящий режим\n` +
        `/lock - заблокировать\n\n` +
        
        `🔊 **ЗВУК**\n` +
        `/up - громче (+10%)\n` +
        `/down - тише (-10%)\n` +
        `/mute - выключить звук\n` +
        `/unmute - включить звук\n` +
        `/volume 50 - установить\n\n` +
        
        `📱 **РАЗНОЕ**\n` +
        `/notify "Текст" - уведомление\n` +
        `/processes - список процессов\n` +
        `/kill chrome - закрыть процесс\n` +
        `/cmd ipconfig - выполнить команду\n` +
        `/ping - проверка связи\n` +
        `/id - ваш ID\n` +
        `/info - информация о ПК`,
        { parse_mode: 'Markdown' }
    );
});

// ============= УПРАВЛЕНИЕ ПК =============

bot.onText(/\/shutdown/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '⏳ Выключение через 10 секунд (отмена: /cancel)');
    setTimeout(() => {
        safeExec('shutdown /s /t 1');
    }, 10000);
});

bot.onText(/\/restart/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '⏳ Перезагрузка через 10 секунд (отмена: /cancel)');
    setTimeout(() => {
        safeExec('shutdown /r /t 1');
    }, 10000);
});

bot.onText(/\/sleep/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    safeExec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
    bot.sendMessage(msg.chat.id, '💤 ПК уходит в сон');
});

bot.onText(/\/lock/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    safeExec('rundll32.exe user32.dll,LockWorkStation');
    bot.sendMessage(msg.chat.id, '🔒 ПК заблокирован');
});

bot.onText(/\/cancel/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    safeExec('shutdown /a');
    bot.sendMessage(msg.chat.id, '✅ Отменено');
});

// ============= ЗВУК (через loudness) =============

bot.onText(/\/up/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    try {
        const loudness = require('loudness');
        const vol = await loudness.getVolume();
        const newVol = Math.min(vol + 10, 100);
        await loudness.setVolume(newVol);
        bot.sendMessage(msg.chat.id, `🔊 Громкость: ${newVol}%`);
    } catch(e) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка управления звуком');
    }
});

bot.onText(/\/down/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    try {
        const loudness = require('loudness');
        const vol = await loudness.getVolume();
        const newVol = Math.max(vol - 10, 0);
        await loudness.setVolume(newVol);
        bot.sendMessage(msg.chat.id, `🔉 Громкость: ${newVol}%`);
    } catch(e) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка управления звуком');
    }
});

bot.onText(/\/mute/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    try {
        const loudness = require('loudness');
        await loudness.setMute(true);
        bot.sendMessage(msg.chat.id, '🔇 Звук выключен');
    } catch(e) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка');
    }
});

bot.onText(/\/unmute/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    try {
        const loudness = require('loudness');
        await loudness.setMute(false);
        bot.sendMessage(msg.chat.id, '🔊 Звук включён');
    } catch(e) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка');
    }
});

bot.onText(/\/volume (.+)/, async (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const vol = parseInt(match[1]);
    if (vol >= 0 && vol <= 100) {
        try {
            const loudness = require('loudness');
            await loudness.setVolume(vol);
            bot.sendMessage(msg.chat.id, `🔊 Громкость: ${vol}%`);
        } catch(e) {
            bot.sendMessage(msg.chat.id, '❌ Ошибка');
        }
    } else {
        bot.sendMessage(msg.chat.id, '❌ Введите число от 0 до 100');
    }
});

// ============= ИНФОРМАЦИЯ =============

bot.onText(/\/info/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    try {
        const si = require('systeminformation');
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const disk = await si.fsSize();
        const os = await si.osInfo();
        
        bot.sendMessage(msg.chat.id,
            `💻 **Информация о ПК**\n\n` +
            `Система: ${os.platform} ${os.distro}\n` +
            `CPU: ${cpu.currentLoad.toFixed(1)}%\n` +
            `Память: ${(mem.used / 1024 / 1024 / 1024).toFixed(1)}/${(mem.total / 1024 / 1024 / 1024).toFixed(1)} ГБ\n` +
            `Диск: ${(disk[0]?.used / 1024 / 1024 / 1024).toFixed(1)}/${(disk[0]?.size / 1024 / 1024 / 1024).toFixed(1)} ГБ`,
            { parse_mode: 'Markdown' }
        );
    } catch(e) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка получения информации');
    }
});

// ============= ПРОЦЕССЫ =============

bot.onText(/\/processes/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    try {
        const psList = (await import('ps-list')).default;
        const processes = await psList();
        const top5 = processes.slice(0, 5).map((p, i) => 
            `${i+1}. ${p.name} (CPU: ${p.cpu?.toFixed(1) || 0}%)`
        ).join('\n');
        bot.sendMessage(msg.chat.id,
            `📋 **Топ процессов**\n\n${top5}\n\nВсего: ${processes.length}`,
            { parse_mode: 'Markdown' }
        );
    } catch(e) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка получения процессов');
    }
});

bot.onText(/\/kill (.+)/, async (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const name = match[1].toLowerCase();
    try {
        const psList = (await import('ps-list')).default;
        const processes = await psList();
        const found = processes.find(p => p.name.toLowerCase().includes(name));
        if (found) {
            safeExec(`taskkill /PID ${found.pid} /F`);
            bot.sendMessage(msg.chat.id, `❌ Закрыт: ${found.name}`);
        } else {
            bot.sendMessage(msg.chat.id, '❌ Процесс не найден');
        }
    } catch(e) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка');
    }
});

// ============= УВЕДОМЛЕНИЯ =============

bot.onText(/\/notify "(.+)"/, (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const text = match[1];
    safeExec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${text}','Уведомление от бота')"`);
    bot.sendMessage(msg.chat.id, `💬 Уведомление: ${text}`);
});

// ============= КОМАНДЫ =============

bot.onText(/\/cmd (.+)/, (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const cmd = match[1];
    exec(cmd, (error, stdout) => {
        if (error) {
            bot.sendMessage(msg.chat.id, `❌ Ошибка: ${error.message}`);
        } else {
            bot.sendMessage(msg.chat.id, `💻 Результат:\n${stdout || '✅ Команда выполнена'}`);
        }
    });
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

// ============= ОБРАБОТКА ОШИБОК =============

bot.on('polling_error', (error) => {
    console.log('Ошибка:', error.message);
});

console.log('🤖 СУПЕР-БОТ ЗАПУЩЕН!');
console.log('👑 Админы:', ADMIN_IDS.join(', '));
console.log('📱 Напишите /start в Telegram');
