import TelegramBot from 'node-telegram-bot-api';
import config from '../config';
import { setupCommands } from './commands';
import NotificationService from './notifications';

let bot: TelegramBot | null = null;
let notificationService: NotificationService | null = null;

export function initializeBot(): TelegramBot {
    if (bot) return bot;

    console.log('🤖 Initializing Telegram Bot...');

    bot = new TelegramBot(config.telegramBotToken, { polling: true });

    // Setup commands
    setupCommands(bot);

    // Initialize notification service
    notificationService = new NotificationService(bot);
    notificationService.startScheduler();

    // Bot error handling
    bot.on('polling_error', (error) => {
        console.error('Polling error:', error.message);
    });

    bot.on('error', (error) => {
        console.error('Bot error:', error.message);
    });

    console.log('✅ Telegram Bot initialized successfully!');
    console.log(`📊 Monitoring pairs: ${config.forexSymbols.join(', ')}`);
    console.log(`⏰ Signal check interval: ${config.checkIntervalMinutes} minutes`);

    return bot;
}

export function getBot(): TelegramBot | null {
    return bot;
}

export function getNotificationService(): NotificationService | null {
    return notificationService;
}

export { setupCommands } from './commands';
export { NotificationService } from './notifications';
