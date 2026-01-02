import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Telegram Bot
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',

    // Twelve Data API
    twelveDataApiKey: process.env.TWELVEDATA_API_KEY || '',
    twelveDataBaseUrl: 'https://api.twelvedata.com',

    // Trading Settings - Stable pairs + XAU/USD for high-risk traders
    forexSymbols: (process.env.FOREX_SYMBOLS || 'XAU/USD,EUR/USD,USD/JPY,AUD/USD,USD/CHF,NZD/USD,EUR/GBP').split(','),
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '15', 10),

    // Default Risk Management - For regular forex pairs ($100 capital)
    stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '0.8'),
    takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT || '1.6'),

    // Symbol-Specific Risk Settings (for high-risk assets like Gold)
    // XAU/USD: 70 pips SL ($7 risk), 150 pips TP ($15 target) on $100 capital
    symbolRisk: {
        'XAU/USD': {
            stopLossPips: 70,       // 70 pips = $7 on 0.01 lot
            takeProfitPips: 150,    // 150 pips = $15 on 0.01 lot
            pipValue: 0.10,         // $0.10 per pip on 0.01 lot for gold
            isHighRisk: true,       // Flag for high-risk warning
            minAdx: 25,             // Require stronger trend for gold
        },
    } as Record<string, {
        stopLossPips: number;
        takeProfitPips: number;
        pipValue: number;
        isHighRisk: boolean;
        minAdx?: number;
    }>,

    // Indicator Settings
    indicators: {
        emaFast: 9,
        emaSlow: 21,
        rsiPeriod: 14,
        rsiBuyMin: 35,      // Widened for better entries
        rsiBuyMax: 65,      // Avoid overbought
        rsiSellMin: 35,
        rsiSellMax: 65,     // Avoid oversold
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
    },

    // Signal Filters - Prevent false signals
    filters: {
        adxMinStrength: 20,         // Minimum ADX for trend confirmation
        atrPeriod: 14,              // ATR period for volatility filter
        minMacdHistogram: 0.00005,  // Minimum MACD histogram strength
        requireCrossover: false,     // Require EMA crossover for entry
        maxSpreadPercent: 0.05,     // Max spread to avoid high cost entries
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
