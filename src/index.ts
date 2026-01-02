import { validateConfig } from './config';
import { initializeBot } from './bot';

console.log('🚀 Forex Trading Signal Bot Starting...');
console.log('=====================================\n');

// Validate configuration
if (!validateConfig()) {
    console.error('\n❌ Configuration validation failed. Please check your .env file.');
    process.exit(1);
}

// Initialize and start the bot
try {
    const bot = initializeBot();

    console.log('\n=====================================');
    console.log('✅ Bot is running!');
    console.log('Press Ctrl+C to stop.\n');

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down bot...');
        bot.stopPolling();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n👋 Received SIGTERM, shutting down...');
        bot.stopPolling();
        process.exit(0);
    });

} catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
}
