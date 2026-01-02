import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Telegram Bot
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',

    // Twelve Data API
    twelveDataApiKey: process.env.TWELVEDATA_API_KEY || '',
    twelveDataBaseUrl: 'https://api.twelvedata.com',

    // Trading Settings
    forexSymbols: (process.env.FOREX_SYMBOLS || 'XAU/USD,USD/JPY,GBP/USD').split(','),
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '15', 10),

    // Risk Management
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '1.5'),
    takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT || '3'),

    // Indicator Settings
    indicators: {
        emaFast: 9,
        emaSlow: 21,
        rsiPeriod: 14,
        rsiBuyMin: 40,
        rsiBuyMax: 70,
        rsiSellMin: 30,
        rsiSellMax: 60,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
    },

    // Data Settings
    historicalDataPoints: 100, // Candles to fetch for analysis
    timeframe: '1h', // 1 hour candles
};

// Validation
export function validateConfig(): boolean {
    const errors: string[] = [];

    if (!config.telegramBotToken) {
        errors.push('TELEGRAM_BOT_TOKEN is required');
    }

    if (!config.twelveDataApiKey) {
        errors.push('TWELVEDATA_API_KEY is required');
    }

    if (errors.length > 0) {
        console.error('Configuration errors:');
        errors.forEach(err => console.error(`  - ${err}`));
        return false;
    }

    return true;
}

export default config;
