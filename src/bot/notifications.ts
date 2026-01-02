import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import config from '../config';
import { signalGenerator } from '../services';
import { getActiveSubscribers, formatSignalMessage } from './commands';
import { TradingSignal } from '../types';

// Store last sent signals to avoid duplicates
const lastSignals: Map<string, string> = new Map();

export class NotificationService {
    private bot: TelegramBot;

    constructor(bot: TelegramBot) {
        this.bot = bot;
    }

    /**
     * Start the scheduled signal checker
     */
    startScheduler(): void {
        // Run every 15 minutes during forex market hours
        // Forex market: Sunday 22:00 UTC - Friday 22:00 UTC
        const cronExpression = `*/${config.checkIntervalMinutes} * * * 1-5`; // Every X minutes, Mon-Fri

        console.log(`📅 Starting signal scheduler: every ${config.checkIntervalMinutes} minutes (Mon-Fri)`);

        cron.schedule(cronExpression, async () => {
            console.log(`⏰ [${new Date().toISOString()}] Running scheduled signal check...`);
            await this.checkAndNotifySignals();
        });

        // Also check on weekends for XAU/USD (gold trades 24/7 in some markets)
        cron.schedule(`*/${config.checkIntervalMinutes} * * * 0,6`, async () => {
            console.log(`⏰ [${new Date().toISOString()}] Running weekend signal check (XAU/USD only)...`);
            await this.checkAndNotifySignals(['XAU/USD']);
        });
    }

    /**
     * Check for signals and send notifications
     */
    async checkAndNotifySignals(symbolsOverride?: string[]): Promise<void> {
        try {
            const symbols = symbolsOverride || config.forexSymbols;
            const subscribers = getActiveSubscribers();

            if (subscribers.length === 0) {
                console.log('No active subscribers, skipping notification check');
                return;
            }

            console.log(`Checking signals for: ${symbols.join(', ')}`);
            console.log(`Active subscribers: ${subscribers.length}`);

            // Analyze each symbol
            for (const symbol of symbols) {
                const analysis = await signalGenerator.analyzeSymbol(symbol);

                if (analysis && analysis.signal) {
                    // Check if this is a new signal (not already sent)
                    const signalKey = `${symbol}-${analysis.signal.action}`;
                    const signalHash = this.generateSignalHash(analysis.signal);

                    if (lastSignals.get(signalKey) !== signalHash) {
                        console.log(`🔔 New signal for ${symbol}: ${analysis.signal.action}`);

                        // Send to all subscribers
                        await this.broadcastSignal(analysis.signal, subscribers);

                        // Update last signal
                        lastSignals.set(signalKey, signalHash);
                    } else {
                        console.log(`Signal for ${symbol} already sent, skipping...`);
                    }
                }

                // Delay between symbol checks
                await this.delay(1000);
            }
        } catch (error) {
            console.error('Error in signal check:', error);
        }
    }

    /**
     * Broadcast signal to all subscribers
     */
    private async broadcastSignal(signal: TradingSignal, subscribers: ReturnType<typeof getActiveSubscribers>): Promise<void> {
        const message = formatSignalMessage(signal);

        for (const subscriber of subscribers) {
            // Check if subscriber wants this pair
            if (!subscriber.preferredPairs.some(p => p.includes(signal.symbol.replace('/', '')))) {
                continue;
            }

            try {
                await this.bot.sendMessage(subscriber.chatId, message, { parse_mode: 'Markdown' });
                console.log(`✅ Sent signal to ${subscriber.username || subscriber.chatId}`);
            } catch (error: any) {
                if (error.response?.statusCode === 403) {
                    // User blocked the bot, could mark as inactive
                    console.log(`User ${subscriber.chatId} blocked the bot`);
                } else {
                    console.error(`Failed to send to ${subscriber.chatId}:`, error.message);
                }
            }

            // Small delay between sends
            await this.delay(100);
        }
    }

    /**
     * Send manual notification to all subscribers
     */
    async sendBroadcast(message: string): Promise<number> {
        const subscribers = getActiveSubscribers();
        let sent = 0;

        for (const subscriber of subscribers) {
            try {
                await this.bot.sendMessage(subscriber.chatId, message, { parse_mode: 'Markdown' });
                sent++;
            } catch (error) {
                console.error(`Failed to broadcast to ${subscriber.chatId}`);
            }
            await this.delay(100);
        }

        return sent;
    }

    /**
     * Generate hash for signal to detect duplicates
     */
    private generateSignalHash(signal: TradingSignal): string {
        // Hash based on signal characteristics (not timestamp)
        return `${signal.action}-${signal.price.toFixed(2)}-${signal.confidence}`;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default NotificationService;
