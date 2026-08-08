const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const loudness = require('loudness');
const si = require('systeminformation');
const axios = require('axios');
const screenshot = require('screenshot-desktop');

// ============= НАСТРОЙКИ =============
const TOKEN = process.env.BOT_TOKEN || "8672837047:AAG7fz0nyPN8yAPGgczm5zyrOQnkW8wE9ig";
const ADMIN_IDS = process.env.ADMIN_IDS ? 
    process.env.ADMIN_IDS.split(',').map(Number) : 
    [8754794142];

const bot = new TelegramBot(TOKEN, { polling: true });

// ============= ПРОВЕРКА АДМИНА =============
function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// ============= ЛОГИРОВАНИЕ =============
function logAction(userId, command) {
    const log = `[${new Date().toLocaleString()}] User: ${userId} | Command: ${command}\n`;
    fs.appendFileSync('bot.log', log);
    console.log(log.trim());
}

// ============= ФУНКЦИЯ ДЛЯ УПРАВЛЕНИЯ ЯНДЕКС МУЗЫКОЙ =============
function sendToYandexMusic(key) {
    const cmd = `powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.AppActivate('Яндекс Музыка'); Start-Sleep -Milliseconds 300; $wshell.SendKeys('${key}')"`;
    exec(cmd, (error) => {
        if (error) {
            console.log('Ошибка отправки в Яндекс Музыку:', error);
        }
    });
}

// ============= /START =============
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        return bot.sendMessage(chatId, '⛔ ДОСТУП ЗАПРЕЩЁН! Вы не админ.');
    }
    
    logAction(userId, '/start');
    
    bot.sendMessage(chatId, 
        `🎮 **СУПЕР-БОТ УПРАВЛЕНИЯ ПК**\n\n` +
        `👑 **АДМИН-ПАНЕЛЬ**\n` +
        `/admin - панель управления\n` +
        `/status - статус ПК\n` +
        `/log - лог действий\n\n` +
        
        `🎵 **ЯНДЕКС МУЗЫКА**\n` +
        `/ym play - Play/Pause\n` +
        `/ym next - следующий трек\n` +
        `/ym prev - предыдущий\n` +
        `/ym like - лайк ❤️\n` +
        `/ym dislike - дизлайк 👎\n` +
        `/ym volume 50 - громкость\n` +
        `/ym info - текущий трек\n` +
        `/ym find - поиск\n` +
        `/ym open - открыть Яндекс Музыку\n\n` +
        
        `🔊 **ЗВУК**\n` +
        `/up - громче (+10%)\n` +
        `/down - тише (-10%)\n` +
        `/mute - выключить звук\n` +
        `/unmute - включить звук\n` +
        `/volume 50 - установить\n\n` +
        
        `💻 **УПРАВЛЕНИЕ ПК**\n` +
        `/shutdown - выключить\n` +
        `/restart - перезагрузить\n` +
        `/sleep - спящий режим\n` +
        `/lock - заблокировать\n` +
        `/hibernate - гибернация\n\n` +
        
        `🖥 **СИСТЕМА**\n` +
        `/cpu - загрузка CPU\n` +
        `/ram - память\n` +
        `/disk - диски\n` +
        `/processes - процессы\n` +
        `/kill chrome - закрыть\n` +
        `/run notepad - запустить\n` +
        `/cmd ipconfig - команда\n\n` +
        
        `🖱 **УПРАВЛЕНИЕ**\n` +
        `/type Привет - напечатать\n` +
        `/key ctrl+c - комбинация\n` +
        `/click - клик мыши\n\n` +
        
        `📱 **ДРУГОЕ**\n` +
        `/notify "Текст" - уведомление\n` +
        `/screenshot - скриншот\n` +
        `/ping - проверка связи`,
        { parse_mode: 'Markdown' }
    );
});

// ============= АДМИН-ПАНЕЛЬ =============
bot.onText(/\/admin/, (msg) => {
    const userId = msg.from.id;
    if (!isAdmin(userId)) return bot.sendMessage(msg.chat.id, '⛔ Доступ запрещён');
    
    const buttons = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📊 Статус ПК', callback_data: 'status' }],
                [{ text: '🎵 Яндекс Музыка', callback_data: 'ym' }],
                [{ text: '🔊 Звук', callback_data: 'sound' }],
                [{ text: '💻 Управление', callback_data: 'control' }],
                [{ text: '📁 Процессы', callback_data: 'processes' }],
                [{ text: '🔄 Обновить', callback_data: 'refresh' }]
            ]
        }
    };
    
    bot.sendMessage(msg.chat.id, '👑 **АДМИН-ПАНЕЛЬ**\nВыберите действие:', { 
        parse_mode: 'Markdown',
        ...buttons 
    });
});

// ============= ОБРАБОТКА КНОПОК =============
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (!isAdmin(userId)) {
        return bot.answerCallbackQuery(query.id, { text: '⛔ Доступ запрещён' });
    }
    
    const data = query.data;
    
    if (data === 'status') {
        const info = await getSystemInfo();
        bot.sendMessage(chatId, info, { parse_mode: 'Markdown' });
    }
    else if (data === 'ym') {
        bot.sendMessage(chatId, 
            `🎵 **Управление Яндекс Музыкой**\n\n` +
            `/ym play - Play/Pause\n` +
            `/ym next - Следующий\n` +
            `/ym prev - Предыдущий\n` +
            `/ym like - Лайк ❤️\n` +
            `/ym dislike - Дизлайк 👎\n` +
            `/ym volume 50 - Громкость\n` +
            `/ym info - Инфо о треке`,
            { parse_mode: 'Markdown' }
        );
    }
    else if (data === 'sound') {
        const vol = await loudness.getVolume();
        bot.sendMessage(chatId, 
            `🔊 **Звук**\n` +
            `Громкость: ${vol}%\n\n` +
            `/up - Громче\n` +
            `/down - Тише\n` +
            `/mute - Выключить\n` +
            `/unmute - Включить`,
            { parse_mode: 'Markdown' }
        );
    }
    else if (data === 'control') {
        bot.sendMessage(chatId,
            `💻 **Управление ПК**\n\n` +
            `/shutdown - Выключить\n` +
            `/restart - Перезагрузить\n` +
            `/sleep - Сон\n` +
            `/lock - Блокировка\n` +
            `/hibernate - Гибернация`,
            { parse_mode: 'Markdown' }
        );
    }
    else if (data === 'processes') {
        try {
            const psListModule = await import('ps-list');
            const psList = psListModule.default;
            const processes = await psList();
            const top10 = processes.slice(0, 10).map((p, i) => 
                `${i+1}. ${p.name} (CPU: ${p.cpu?.toFixed(1) || 0}%)`
            ).join('\n');
            bot.sendMessage(chatId, 
                `📋 **Топ процессов:**\n\n${top10}\n\nВсего: ${processes.length}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            bot.sendMessage(chatId, '❌ Ошибка получения списка процессов');
        }
    }
    else if (data === 'refresh') {
        bot.answerCallbackQuery(query.id, { text: '🔄 Обновлено!' });
    }
    
    bot.answerCallbackQuery(query.id);
});

// ============= СТАТУС ПК =============
let pcStatus = {
    isOnline: true,
    lastCheck: new Date()
};

setInterval(async () => {
    try {
        await si.currentLoad();
        pcStatus.isOnline = true;
        pcStatus.lastCheck = new Date();
    } catch (e) {
        pcStatus.isOnline = false;
    }
}, 10000);

async function getSystemInfo() {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const disk = await si.fsSize();
        const os = await si.osInfo();
        const uptime = await si.time();
        
        const uptimeHours = Math.floor(uptime.uptime / 3600);
        const uptimeMinutes = Math.floor((uptime.uptime % 3600) / 60);
        
        return (
            `📊 **СТАТУС ПК**\n\n` +
            `💻 Система: ${os.platform} ${os.distro}\n` +
            `⏱ Аптайм: ${uptimeHours}ч ${uptimeMinutes}м\n` +
            `🔄 Загрузка CPU: ${cpu.currentLoad.toFixed(1)}%\n` +
            `🧠 Память: ${(mem.used / 1024 / 1024 / 1024).toFixed(1)}/${(mem.total / 1024 / 1024 / 1024).toFixed(1)} ГБ (${(mem.used / mem.total * 100).toFixed(1)}%)\n` +
            `💾 Диск: ${(disk[0]?.used / 1024 / 1024 / 1024).toFixed(1)}/${(disk[0]?.size / 1024 / 1024 / 1024).toFixed(1)} ГБ (${disk[0]?.use || 0}%)\n` +
            `🌐 IP: ${await getIP()}\n` +
            `📅 ${new Date().toLocaleString()}`
        );
    } catch (e) {
        return '❌ Ошибка получения статуса';
    }
}

async function getIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        return response.data.ip;
    } catch {
        return 'Неизвестно';
    }
}

// ============= УПРАВЛЕНИЕ ЯНДЕКС МУЗЫКОЙ =============

bot.onText(/\/ym play/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    sendToYandexMusic('k');
    bot.sendMessage(msg.chat.id, '⏯ Play/Pause');
    logAction(msg.from.id, '/ym play');
});

bot.onText(/\/ym next/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    sendToYandexMusic('^{RIGHT}');
    bot.sendMessage(msg.chat.id, '⏭ Следующий трек');
    logAction(msg.from.id, '/ym next');
});

bot.onText(/\/ym prev/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    sendToYandexMusic('^{LEFT}');
    bot.sendMessage(msg.chat.id, '⏮ Предыдущий трек');
    logAction(msg.from.id, '/ym prev');
});

bot.onText(/\/ym like/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    sendToYandexMusic('^{ENTER}');
    bot.sendMessage(msg.chat.id, '❤️ Лайк поставлен!');
    logAction(msg.from.id, '/ym like');
});

bot.onText(/\/ym dislike/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    sendToYandexMusic('^+{ENTER}');
    bot.sendMessage(msg.chat.id, '👎 Дизлайк поставлен');
    logAction(msg.from.id, '/ym dislike');
});

bot.onText(/\/ym info/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    sendToYandexMusic('^%i');
    bot.sendMessage(msg.chat.id, 'ℹ️ Информация о треке показана');
    logAction(msg.from.id, '/ym info');
});

bot.onText(/\/ym volume (.+)/, async (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const vol = parseInt(match[1]);
    if (vol >= 0 && vol <= 100) {
        await loudness.setVolume(vol);
        bot.sendMessage(msg.chat.id, `🔊 Громкость: ${vol}%`);
    } else {
        bot.sendMessage(msg.chat.id, '❌ Введите число от 0 до 100');
    }
});

bot.onText(/\/ym find (.+)/, (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const query = match[1];
    exec(`start https://music.yandex.ru/search?text=${encodeURIComponent(query)}`);
    bot.sendMessage(msg.chat.id, `🔍 Поиск: ${query}`);
    logAction(msg.from.id, `/ym find ${query}`);
});

bot.onText(/\/ym open/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    exec('start https://music.yandex.ru');
    bot.sendMessage(msg.chat.id, '🎵 Яндекс Музыка открыта');
    logAction(msg.from.id, '/ym open');
});

// ============= УПРАВЛЕНИЕ ПК =============

bot.onText(/\/shutdown/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '⏳ Выключение через 10 секунд (отмена: /cancel)');
    logAction(msg.from.id, '/shutdown');
    setTimeout(() => {
        exec('shutdown /s /t 1');
        pcStatus.isOnline = false;
    }, 10000);
});

bot.onText(/\/restart/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '⏳ Перезагрузка через 10 секунд (отмена: /cancel)');
    logAction(msg.from.id, '/restart');
    setTimeout(() => {
        exec('shutdown /r /t 1');
        pcStatus.isOnline = false;
    }, 10000);
});

bot.onText(/\/sleep/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
    bot.sendMessage(msg.chat.id, '💤 ПК уходит в сон');
    pcStatus.isOnline = false;
});

bot.onText(/\/hibernate/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    exec('shutdown /h');
    bot.sendMessage(msg.chat.id, '💤 ПК в гибернации');
    pcStatus.isOnline = false;
});

bot.onText(/\/lock/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    exec('rundll32.exe user32.dll,LockWorkStation');
    bot.sendMessage(msg.chat.id, '🔒 ПК заблокирован');
});

bot.onText(/\/cancel/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    exec('shutdown /a');
    bot.sendMessage(msg.chat.id, '✅ Отменено');
});

// ============= ЗВУК =============

bot.onText(/\/up/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const vol = await loudness.getVolume();
    const newVol = Math.min(vol + 10, 100);
    await loudness.setVolume(newVol);
    bot.sendMessage(msg.chat.id, `🔊 Громкость: ${newVol}%`);
});

bot.onText(/\/down/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const vol = await loudness.getVolume();
    const newVol = Math.max(vol - 10, 0);
    await loudness.setVolume(newVol);
    bot.sendMessage(msg.chat.id, `🔉 Громкость: ${newVol}%`);
});

bot.onText(/\/mute/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    await loudness.setMute(true);
    bot.sendMessage(msg.chat.id, '🔇 Звук выключен');
});

bot.onText(/\/unmute/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    await loudness.setMute(false);
    bot.sendMessage(msg.chat.id, '🔊 Звук включён');
});

bot.onText(/\/volume (.+)/, async (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const vol = parseInt(match[1]);
    if (vol >= 0 && vol <= 100) {
        await loudness.setVolume(vol);
        bot.sendMessage(msg.chat.id, `🔊 Громкость: ${vol}%`);
    } else {
        bot.sendMessage(msg.chat.id, '❌ Введите число от 0 до 100');
    }
});

// ============= СКРИНШОТ =============

bot.onText(/\/screenshot/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    try {
        const img = await screenshot();
        fs.writeFileSync('screen.png', img);
        await bot.sendPhoto(msg.chat.id, 'screen.png');
        fs.unlinkSync('screen.png');
        bot.sendMessage(msg.chat.id, '📸 Скриншот сделан!');
    } catch(e) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка скриншота');
    }
});

// ============= СИСТЕМНАЯ ИНФОРМАЦИЯ =============

bot.onText(/\/status/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const info = await getSystemInfo();
    const status = pcStatus.isOnline ? '🟢 **ВКЛЮЧЕН**' : '🔴 **ВЫКЛЮЧЕН**';
    bot.sendMessage(msg.chat.id, 
        `📊 **СТАТУС ПК**\n\n${status}\nПоследняя проверка: ${pcStatus.lastCheck.toLocaleString()}\n\n${info}`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/\/cpu/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const cpu = await si.currentLoad();
    bot.sendMessage(msg.chat.id, `🔄 Загрузка CPU: ${cpu.currentLoad.toFixed(1)}%`);
});

bot.onText(/\/ram/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const mem = await si.mem();
    bot.sendMessage(msg.chat.id, 
        `🧠 **Память:**\n` +
        `Использовано: ${(mem.used / 1024 / 1024 / 1024).toFixed(1)} ГБ\n` +
        `Всего: ${(mem.total / 1024 / 1024 / 1024).toFixed(1)} ГБ\n` +
        `Занято: ${(mem.used / mem.total * 100).toFixed(1)}%`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/\/disk/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const disk = await si.fsSize();
    const info = disk.map(d => 
        `💾 **${d.mount}:**\n` +
        `  Использовано: ${(d.used / 1024 / 1024 / 1024).toFixed(1)} ГБ\n` +
        `  Свободно: ${(d.size / 1024 / 1024 / 1024).toFixed(1)} ГБ\n` +
        `  Занято: ${d.use}%`
    ).join('\n\n');
    bot.sendMessage(msg.chat.id, `📊 **Диски:**\n\n${info}`, { parse_mode: 'Markdown' });
});

// ============= ПРОЦЕССЫ =============

bot.onText(/\/processes/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    try {
        const psListModule = await import('ps-list');
        const psList = psListModule.default;
        const processes = await psList();
        const top10 = processes.slice(0, 10).map((p, i) => 
            `${i+1}. ${p.name} (CPU: ${p.cpu?.toFixed(1) || 0}%)`
        ).join('\n');
        bot.sendMessage(msg.chat.id, 
            `📋 **Топ 10 процессов:**\n\n${top10}\n\nВсего: ${processes.length}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка получения списка процессов');
    }
});

// ============= ПРОГРАММЫ =============

bot.onText(/\/run (.+)/, (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const program = match[1];
    exec(`start ${program}`, (error) => {
        if (error) {
            bot.sendMessage(msg.chat.id, `❌ Не удалось запустить: ${program}`);
        } else {
            bot.sendMessage(msg.chat.id, `✅ Запущено: ${program}`);
        }
    });
});

bot.onText(/\/kill (.+)/, async (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const name = match[1].toLowerCase();
    try {
        const psListModule = await import('ps-list');
        const psList = psListModule.default;
        const processes = await psList();
        const found = processes.find(p => p.name.toLowerCase().includes(name));
        if (found) {
            exec(`taskkill /PID ${found.pid} /F`);
            bot.sendMessage(msg.chat.id, `❌ Закрыт: ${found.name}`);
        } else {
            bot.sendMessage(msg.chat.id, '❌ Процесс не найден');
        }
    } catch (error) {
        bot.sendMessage(msg.chat.id, '❌ Ошибка поиска процесса');
    }
});

// ============= КЛАВИАТУРА =============

bot.onText(/\/type (.+)/, (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const text = match[1];
    const cmd = `powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${text}')"`;
    exec(cmd);
    bot.sendMessage(msg.chat.id, `⌨ Напечатано: ${text}`);
});

bot.onText(/\/key (.+)/, (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const keys = match[1];
    const cmd = `powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${keys}')"`;
    exec(cmd);
    bot.sendMessage(msg.chat.id, `⌨ Нажато: ${keys}`);
});

bot.onText(/\/click/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    const cmd = `powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('~')"`;
    exec(cmd);
    bot.sendMessage(msg.chat.id, '🖱 Клик');
});

// ============= УВЕДОМЛЕНИЯ =============

bot.onText(/\/notify "(.+)"/, (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const text = match[1];
    exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${text}','Уведомление от бота')"`);
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

// ============= ЛОГ =============

bot.onText(/\/log/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    if (fs.existsSync('bot.log')) {
        const log = fs.readFileSync('bot.log', 'utf8');
        const lastLines = log.split('\n').slice(-20).join('\n');
        bot.sendMessage(msg.chat.id, `📋 **Последние 20 действий:**\n\n${lastLines}`, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(msg.chat.id, '📋 Лог пуст');
    }
});

// ============= ID =============

bot.onText(/\/id/, (msg) => {
    bot.sendMessage(msg.chat.id, `🆔 Ваш ID: ${msg.from.id}`);
});

// ============= ПИНГ =============

bot.onText(/\/ping/, (msg) => {
    if (!isAdmin(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '🏓 Pong! Бот работает');
});

// ============= ОБРАБОТКА ОШИБОК =============

bot.on('polling_error', (error) => {
    console.log('Ошибка:', error.message);
});

console.log('🤖 СУПЕР-БОТ ЗАПУЩЕН!');
console.log(`👑 Админы: ${ADMIN_IDS.join(', ')}`);
console.log('📱 Напишите /start в Telegram');
