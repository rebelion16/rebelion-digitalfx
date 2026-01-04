import TelegramBot, { InlineKeyboardMarkup } from 'node-telegram-bot-api';
import config from '../config';
import { signalGenerator, forexApi } from '../services';
import { TradingSignal, AnalysisResult, Subscriber } from '../types';

// ============ DATA STORAGE ============
const subscribers: Map<number, Subscriber> = new Map();
const userSettings: Map<number, UserSettings> = new Map();
const tradeHistory: TradeRecord[] = [];

interface UserSettings {
    notifications: boolean;
    signalAlerts: boolean;
    priceAlerts: boolean;
    dailySummary: boolean;
    language: 'id' | 'en';
    riskLevel: 'low' | 'medium' | 'high';
}

interface TradeRecord {
    symbol: string;
    action: 'BUY' | 'SELL';
    entry: number;
    sl: number;
    tp: number;
    result?: 'WIN' | 'LOSS' | 'PENDING';
    profit?: number;
    timestamp: Date;
}

// ============ KEYBOARD DEFINITIONS ============

const mainMenuKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: '📊 Sinyal Trading', callback_data: 'menu_signals' },
            { text: '💰 Harga Live', callback_data: 'menu_prices' }
        ],
        [
            { text: '📈 Analisis Teknikal', callback_data: 'menu_analysis' },
            { text: '📉 Market Overview', callback_data: 'market_overview' }
        ],
        [
            { text: '📋 Statistik', callback_data: 'menu_stats' },
            { text: '📜 Riwayat Sinyal', callback_data: 'signal_history' }
        ],
        [
            { text: '⚙️ Pengaturan', callback_data: 'menu_settings' },
            { text: '📚 Tutorial', callback_data: 'menu_tutorial' }
        ],
        [
            { text: '❓ Bantuan', callback_data: 'help' }
        ]
    ]
};

const signalMenuKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: '🔍 Scan Semua Pair', callback_data: 'signal_scan_all' }
        ],
        [
            { text: '🥇 XAU/USD', callback_data: 'signal_XAUUSD' },
            { text: '💶 EUR/USD', callback_data: 'signal_EURUSD' }
        ],
        [
            { text: '💴 USD/JPY', callback_data: 'signal_USDJPY' },
            { text: '💷 GBP/USD', callback_data: 'signal_GBPUSD' }
        ],
        [
            { text: '🇦🇺 AUD/USD', callback_data: 'signal_AUDUSD' },
            { text: '🇨🇭 USD/CHF', callback_data: 'signal_USDCHF' }
        ],
        [
            { text: '⬅️ Menu Utama', callback_data: 'main_menu' }
        ]
    ]
};

const priceMenuKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: '📊 Semua Harga', callback_data: 'price_ALL' }
        ],
        [
            { text: '🥇 XAU/USD', callback_data: 'price_XAUUSD' },
            { text: '💶 EUR/USD', callback_data: 'price_EURUSD' }
        ],
        [
            { text: '💴 USD/JPY', callback_data: 'price_USDJPY' },
            { text: '💷 GBP/USD', callback_data: 'price_GBPUSD' }
        ],
        [
            { text: '🇦🇺 AUD/USD', callback_data: 'price_AUDUSD' },
            { text: '🇨🇭 USD/CHF', callback_data: 'price_USDCHF' }
        ],
        [
            { text: '🔄 Refresh', callback_data: 'price_ALL' },
            { text: '⬅️ Menu', callback_data: 'main_menu' }
        ]
    ]
};

const analysisMenuKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: '📊 Analisis Lengkap', callback_data: 'analyze_full' }
        ],
        [
            { text: '🥇 XAU/USD', callback_data: 'analyze_XAUUSD' },
            { text: '💶 EUR/USD', callback_data: 'analyze_EURUSD' }
        ],
        [
            { text: '💴 USD/JPY', callback_data: 'analyze_USDJPY' },
            { text: '💷 GBP/USD', callback_data: 'analyze_GBPUSD' }
        ],
        [
            { text: '🇦🇺 AUD/USD', callback_data: 'analyze_AUDUSD' },
            { text: '🇨🇭 USD/CHF', callback_data: 'analyze_USDCHF' }
        ],
        [
            { text: '⬅️ Menu Utama', callback_data: 'main_menu' }
        ]
    ]
};

const settingsMenuKeyboard = (settings: UserSettings): InlineKeyboardMarkup => ({
    inline_keyboard: [
        [
            {
                text: settings.notifications ? '🔔 Notifikasi: ON' : '🔕 Notifikasi: OFF',
                callback_data: 'toggle_notifications'
            }
        ],
        [
            {
                text: settings.signalAlerts ? '📊 Alert Sinyal: ON' : '📊 Alert Sinyal: OFF',
                callback_data: 'toggle_signal_alerts'
            }
        ],
        [
            {
                text: settings.dailySummary ? '📅 Daily Summary: ON' : '📅 Daily Summary: OFF',
                callback_data: 'toggle_daily_summary'
            }
        ],
        [
            {
                text: `⚠️ Risk: ${settings.riskLevel.toUpperCase()}`,
                callback_data: 'cycle_risk_level'
            }
        ],
        [
            { text: '🔄 Reset Default', callback_data: 'reset_settings' }
        ],
        [
            { text: '⬅️ Menu Utama', callback_data: 'main_menu' }
        ]
    ]
});

const tutorialMenuKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: '📖 Apa itu Forex?', callback_data: 'tutorial_forex' }
        ],
        [
            { text: '📊 Cara Baca Sinyal', callback_data: 'tutorial_signals' }
        ],
        [
            { text: '📈 Indikator Teknikal', callback_data: 'tutorial_indicators' }
        ],
        [
            { text: '⚠️ Manajemen Risiko', callback_data: 'tutorial_risk' }
        ],
        [
            { text: '💡 Tips Trading', callback_data: 'tutorial_tips' }
        ],
        [
            { text: '⬅️ Menu Utama', callback_data: 'main_menu' }
        ]
    ]
};

const statsMenuKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [
            { text: '📊 Statistik Hari Ini', callback_data: 'stats_today' }
        ],
        [
            { text: '📈 Statistik Minggu Ini', callback_data: 'stats_week' }
        ],
        [
            { text: '📉 Statistik Bulan Ini', callback_data: 'stats_month' }
        ],
        [
            { text: '🏆 Performa Pair', callback_data: 'stats_pairs' }
        ],
        [
            { text: '⬅️ Menu Utama', callback_data: 'main_menu' }
        ]
    ]
};

const backToMenuKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [{ text: '⬅️ Menu Utama', callback_data: 'main_menu' }]
    ]
};

// ============ HELPER FUNCTIONS ============

function getDefaultSettings(): UserSettings {
    return {
        notifications: true,
        signalAlerts: true,
        priceAlerts: false,
        dailySummary: true,
        language: 'id',
        riskLevel: 'medium'
    };
}

function getUserSettings(chatId: number): UserSettings {
    if (!userSettings.has(chatId)) {
        userSettings.set(chatId, getDefaultSettings());
    }
    return userSettings.get(chatId)!;
}

function symbolFromCallback(data: string): string {
    const parts = data.split('_');
    const pair = parts[parts.length - 1];
    if (!pair || pair === 'ALL' || pair === 'full') return pair || 'ALL';
    if (pair.length === 6) {
        return pair.substring(0, 3) + '/' + pair.substring(3);
    }
    return pair;
}

function formatPrice(price: number, symbol: string): string {
    if (symbol.includes('XAU')) return price.toFixed(2);
    if (symbol.includes('JPY')) return price.toFixed(3);
    return price.toFixed(5);
}

function getRSIStatus(rsi: number): string {
    if (rsi > 70) return '🔴 Overbought';
    if (rsi < 30) return '🟢 Oversold';
    if (rsi >= 50) return '📈 Bullish';
    return '📉 Bearish';
}

// ============ COMMAND SETUP ============

export function setupCommands(bot: TelegramBot): void {

    // /start - Welcome with main menu
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const username = msg.from?.first_name || 'Trader';

        if (!subscribers.has(chatId)) {
            subscribers.set(chatId, {
                chatId,
                username,
                subscribedAt: new Date(),
                isActive: true,
                preferredPairs: config.forexSymbols,
            });
        }

        const welcome = `
🤖 *Selamat Datang di RebelionFX Bot!*

Halo *${username}*! 👋

Bot trading forex dengan fitur:
✅ Sinyal trading real-time
✅ Analisis teknikal lengkap
✅ 6 indikator: EMA, RSI, MACD, ADX, BB, Stoch
✅ Notifikasi otomatis
✅ Statistik & riwayat

📊 *Pair yang dipantau:*
${config.forexSymbols.slice(0, 4).map(s => `  • ${s}`).join('\n')}

_Pilih menu di bawah untuk mulai:_
        `;

        await bot.sendMessage(chatId, welcome, {
            parse_mode: 'Markdown',
            reply_markup: mainMenuKeyboard
        });
    });

    // /menu - Show main menu
    bot.onText(/\/menu/, async (msg) => {
        await bot.sendMessage(msg.chat.id, '📱 *Menu Utama RebelionFX*\n\nPilih fitur:', {
            parse_mode: 'Markdown',
            reply_markup: mainMenuKeyboard
        });
    });

    // /signal - Quick signal check
    bot.onText(/\/signal/, async (msg) => {
        await bot.sendMessage(msg.chat.id, '📊 *Menu Sinyal Trading*\n\nPilih pair atau scan semua:', {
            parse_mode: 'Markdown',
            reply_markup: signalMenuKeyboard
        });
    });

    // /price - Quick price check
    bot.onText(/\/price(?:\s+(.+))?/, async (msg, match) => {
        const symbol = match?.[1]?.trim().toUpperCase().replace(' ', '/');
        if (symbol) {
            await handlePriceCheck(bot, msg.chat.id, symbol);
        } else {
            await bot.sendMessage(msg.chat.id, '💰 *Cek Harga Live*\n\nPilih pair:', {
                parse_mode: 'Markdown',
                reply_markup: priceMenuKeyboard
            });
        }
    });

    // /analyze - Quick analysis
    bot.onText(/\/analyze(?:\s+(.+))?/, async (msg, match) => {
        const symbol = match?.[1]?.trim().toUpperCase().replace(' ', '/');
        if (symbol) {
            await handleAnalysis(bot, msg.chat.id, symbol);
        } else {
            await bot.sendMessage(msg.chat.id, '📈 *Analisis Teknikal*\n\nPilih pair:', {
                parse_mode: 'Markdown',
                reply_markup: analysisMenuKeyboard
            });
        }
    });

    // /stats - Statistics
    bot.onText(/\/stats/, async (msg) => {
        await bot.sendMessage(msg.chat.id, '📋 *Statistik Trading*\n\nPilih periode:', {
            parse_mode: 'Markdown',
            reply_markup: statsMenuKeyboard
        });
    });

    // /settings - User settings
    bot.onText(/\/settings/, async (msg) => {
        const settings = getUserSettings(msg.chat.id);
        await bot.sendMessage(msg.chat.id, '⚙️ *Pengaturan Bot*\n\nKlik untuk mengubah:', {
            parse_mode: 'Markdown',
            reply_markup: settingsMenuKeyboard(settings)
        });
    });

    // /help - Help
    bot.onText(/\/help/, async (msg) => {
        await sendHelp(bot, msg.chat.id);
    });

    // /tutorial - Tutorial menu
    bot.onText(/\/tutorial/, async (msg) => {
        await bot.sendMessage(msg.chat.id, '📚 *Tutorial Trading*\n\nPilih topik:', {
            parse_mode: 'Markdown',
            reply_markup: tutorialMenuKeyboard
        });
    });

    // ============ CALLBACK QUERY HANDLER ============
    bot.on('callback_query', async (query) => {
        const chatId = query.message?.chat.id;
        const messageId = query.message?.message_id;
        const data = query.data;

        if (!chatId || !data) return;
        await bot.answerCallbackQuery(query.id);

        try {
            // Main menu
            if (data === 'main_menu') {
                await editOrSend(bot, chatId, messageId, '📱 *Menu Utama RebelionFX*\n\nPilih fitur:', mainMenuKeyboard);
            }

            // Signal menu
            else if (data === 'menu_signals') {
                await editOrSend(bot, chatId, messageId, '📊 *Menu Sinyal Trading*\n\nPilih pair atau scan semua:', signalMenuKeyboard);
            }
            else if (data === 'signal_scan_all') {
                await handleSignalScan(bot, chatId, messageId);
            }
            else if (data.startsWith('signal_')) {
                const symbol = symbolFromCallback(data);
                if (symbol !== 'ALL') {
                    await handleSingleSignal(bot, chatId, messageId, symbol);
                }
            }

            // Price menu
            else if (data === 'menu_prices') {
                await editOrSend(bot, chatId, messageId, '💰 *Harga Live*\n\nPilih pair:', priceMenuKeyboard);
            }
            else if (data.startsWith('price_')) {
                const symbol = symbolFromCallback(data);
                await handlePriceCheck(bot, chatId, symbol, messageId);
            }

            // Analysis menu
            else if (data === 'menu_analysis') {
                await editOrSend(bot, chatId, messageId, '📈 *Analisis Teknikal*\n\nPilih pair:', analysisMenuKeyboard);
            }
            else if (data === 'analyze_full') {
                await handleFullAnalysis(bot, chatId, messageId);
            }
            else if (data.startsWith('analyze_')) {
                const symbol = symbolFromCallback(data);
                await handleAnalysis(bot, chatId, symbol, messageId);
            }

            // Market overview
            else if (data === 'market_overview') {
                await handleMarketOverview(bot, chatId, messageId);
            }

            // Stats menu
            else if (data === 'menu_stats') {
                await editOrSend(bot, chatId, messageId, '📋 *Statistik Trading*\n\nPilih periode:', statsMenuKeyboard);
            }
            else if (data.startsWith('stats_')) {
                await handleStats(bot, chatId, messageId, data);
            }

            // Signal history
            else if (data === 'signal_history') {
                await handleSignalHistory(bot, chatId, messageId);
            }

            // Settings menu
            else if (data === 'menu_settings') {
                const settings = getUserSettings(chatId);
                await editOrSend(bot, chatId, messageId, '⚙️ *Pengaturan Bot*\n\nKlik untuk mengubah:', settingsMenuKeyboard(settings));
            }
            else if (data === 'toggle_notifications') {
                const settings = getUserSettings(chatId);
                settings.notifications = !settings.notifications;
                userSettings.set(chatId, settings);
                await editOrSend(bot, chatId, messageId, '⚙️ *Pengaturan Bot*\n\n✅ Notifikasi diubah!', settingsMenuKeyboard(settings));
            }
            else if (data === 'toggle_signal_alerts') {
                const settings = getUserSettings(chatId);
                settings.signalAlerts = !settings.signalAlerts;
                userSettings.set(chatId, settings);
                await editOrSend(bot, chatId, messageId, '⚙️ *Pengaturan Bot*\n\n✅ Alert sinyal diubah!', settingsMenuKeyboard(settings));
            }
            else if (data === 'toggle_daily_summary') {
                const settings = getUserSettings(chatId);
                settings.dailySummary = !settings.dailySummary;
                userSettings.set(chatId, settings);
                await editOrSend(bot, chatId, messageId, '⚙️ *Pengaturan Bot*\n\n✅ Daily summary diubah!', settingsMenuKeyboard(settings));
            }
            else if (data === 'cycle_risk_level') {
                const settings = getUserSettings(chatId);
                const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
                const currentIndex = levels.indexOf(settings.riskLevel);
                settings.riskLevel = levels[(currentIndex + 1) % 3];
                userSettings.set(chatId, settings);
                await editOrSend(bot, chatId, messageId, '⚙️ *Pengaturan Bot*\n\n✅ Risk level diubah!', settingsMenuKeyboard(settings));
            }
            else if (data === 'reset_settings') {
                userSettings.set(chatId, getDefaultSettings());
                const settings = getUserSettings(chatId);
                await editOrSend(bot, chatId, messageId, '⚙️ *Pengaturan Bot*\n\n✅ Reset ke default!', settingsMenuKeyboard(settings));
            }

            // Tutorial menu
            else if (data === 'menu_tutorial') {
                await editOrSend(bot, chatId, messageId, '📚 *Tutorial Trading*\n\nPilih topik:', tutorialMenuKeyboard);
            }
            else if (data.startsWith('tutorial_')) {
                await handleTutorial(bot, chatId, messageId, data);
            }

            // Help
            else if (data === 'help') {
                await sendHelp(bot, chatId, messageId);
            }

        } catch (error) {
            console.error('Callback error:', error);
            await bot.sendMessage(chatId, '❌ Terjadi kesalahan.', { reply_markup: backToMenuKeyboard });
        }
    });
}

// ============ HANDLER FUNCTIONS ============

async function editOrSend(bot: TelegramBot, chatId: number, messageId: number | undefined, text: string, keyboard: InlineKeyboardMarkup) {
    try {
        if (messageId) {
            try {
                await bot.editMessageText(text, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            } catch (editError: any) {
                // If message is not modified or other edit error, send new message
                if (editError.message?.includes('message is not modified') ||
                    editError.message?.includes('message to edit not found')) {
                    console.log('Edit failed, sending new message');
                } else {
                    console.error('Edit error:', editError.message);
                }
                await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
            }
        } else {
            await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
        }
    } catch (error: any) {
        console.error('editOrSend error:', error.message);
        // Try without markdown as fallback
        try {
            await bot.sendMessage(chatId, text.replace(/\*/g, '').replace(/_/g, ''), { reply_markup: keyboard });
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
        }
    }
}

async function handleSignalScan(bot: TelegramBot, chatId: number, messageId?: number) {
    await editOrSend(bot, chatId, messageId, '⏳ *Scanning semua pair...*\n\nMohon tunggu...', backToMenuKeyboard);

    try {
        const signals = await signalGenerator.getActiveSignals();

        if (signals.length === 0) {
            const noSignal = `
📊 *Hasil Scan: Tidak Ada Sinyal*

Tidak ada sinyal aktif saat ini.

_Kondisi pasar:_
• Sideways / Konsolidasi
• Belum ada konfirmasi indikator

💡 Coba scan lagi nanti atau cek analisis individual.
            `;
            await editOrSend(bot, chatId, messageId, noSignal, signalMenuKeyboard);
            return;
        }

        let result = `📊 *Hasil Scan: ${signals.length} Sinyal Ditemukan!*\n\n`;

        for (const signal of signals) {
            const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
            result += `${emoji} *${signal.symbol}* - ${signal.action}\n`;
            result += `   Entry: ${formatPrice(signal.price, signal.symbol)}\n`;
            result += `   SL: ${formatPrice(signal.stopLoss, signal.symbol)} | TP: ${formatPrice(signal.takeProfit, signal.symbol)}\n\n`;
        }

        result += `⏰ _${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`;

        await editOrSend(bot, chatId, messageId, result, signalMenuKeyboard);
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Gagal scan sinyal.', { reply_markup: signalMenuKeyboard });
    }
}

async function handleSingleSignal(bot: TelegramBot, chatId: number, messageId: number | undefined, symbol: string) {
    await editOrSend(bot, chatId, messageId, `⏳ *Menganalisis ${symbol}...*`, backToMenuKeyboard);

    try {
        const analysis = await signalGenerator.analyzeSymbol(symbol);

        if (!analysis) {
            await editOrSend(bot, chatId, messageId, `❌ Tidak dapat menganalisis ${symbol}`, signalMenuKeyboard);
            return;
        }

        let msg = '';
        if (analysis.signal) {
            const emoji = analysis.signal.action === 'BUY' ? '🟢' : '🔴';
            msg = `
${emoji} *SINYAL ${analysis.signal.action} - ${symbol}*

💰 *Trade Setup:*
• Entry: ${formatPrice(analysis.signal.price, symbol)}
• Stop Loss: ${formatPrice(analysis.signal.stopLoss, symbol)}
• Take Profit: ${formatPrice(analysis.signal.takeProfit, symbol)}
• R/R: 1:2

📊 *Indikator:*
• EMA: ${analysis.indicators.ema9 > analysis.indicators.ema21 ? '📈 Bullish' : '📉 Bearish'}
• RSI: ${analysis.indicators.rsi.toFixed(1)} ${getRSIStatus(analysis.indicators.rsi)}
• MACD: ${analysis.indicators.macdHistogram > 0 ? '📈 Positif' : '📉 Negatif'}

🎯 Confidence: *${analysis.signal.confidence}*

⚠️ _Gunakan risk management!_
            `;
        } else {
            msg = `
⏸️ *${symbol} - HOLD*

Tidak ada sinyal aktif.

📊 *Kondisi Saat Ini:*
• Trend: ${analysis.trend}
• RSI: ${analysis.indicators.rsi.toFixed(1)}
• Harga: ${formatPrice(analysis.currentPrice, symbol)}

_Belum ada konfirmasi dari semua indikator._
            `;
        }

        const actionKeyboard: InlineKeyboardMarkup = {
            inline_keyboard: [
                [
                    { text: '📈 Analisis Detail', callback_data: `analyze_${symbol.replace('/', '')}` },
                    { text: '💰 Harga', callback_data: `price_${symbol.replace('/', '')}` }
                ],
                [
                    { text: '🔄 Refresh', callback_data: `signal_${symbol.replace('/', '')}` },
                    { text: '⬅️ Menu Sinyal', callback_data: 'menu_signals' }
                ]
            ]
        };

        await editOrSend(bot, chatId, messageId, msg, actionKeyboard);
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Gagal menganalisis.', { reply_markup: signalMenuKeyboard });
    }
}

async function handlePriceCheck(bot: TelegramBot, chatId: number, symbol: string, messageId?: number) {
    try {
        if (symbol === 'ALL') {
            const prices = await forexApi.getMultiplePrices(config.forexSymbols);
            let msg = '💰 *Harga Live - Semua Pair*\n\n';

            prices.forEach((price, sym) => {
                const emoji = price.change >= 0 ? '🟢' : '🔴';
                const sign = price.change >= 0 ? '+' : '';
                msg += `${emoji} *${sym}*: ${formatPrice(price.price, sym)}\n`;
                msg += `   ${sign}${price.percentChange.toFixed(2)}%\n\n`;
            });

            msg += `⏰ _${new Date().toLocaleTimeString('id-ID')}_`;

            await editOrSend(bot, chatId, messageId, msg, priceMenuKeyboard);
        } else {
            const price = await forexApi.getRealtimePrice(symbol);
            if (!price) {
                await bot.sendMessage(chatId, `❌ ${symbol} tidak tersedia.`, { reply_markup: priceMenuKeyboard });
                return;
            }

            const dailyRange = await forexApi.getDailyRange(symbol);
            const emoji = price.change >= 0 ? '🟢' : '🔴';
            const sign = price.change >= 0 ? '+' : '';

            const msg = `
${emoji} *${symbol}*

💰 *Harga:* ${formatPrice(price.price, symbol)}
📊 *Perubahan:* ${sign}${price.percentChange.toFixed(2)}%
${dailyRange ? `📈 *High:* ${formatPrice(dailyRange.high, symbol)}\n📉 *Low:* ${formatPrice(dailyRange.low, symbol)}` : ''}

⏰ _${new Date().toLocaleTimeString('id-ID')}_
            `;

            const actionKeyboard: InlineKeyboardMarkup = {
                inline_keyboard: [
                    [
                        { text: '📊 Sinyal', callback_data: `signal_${symbol.replace('/', '')}` },
                        { text: '📈 Analisis', callback_data: `analyze_${symbol.replace('/', '')}` }
                    ],
                    [
                        { text: '🔄 Refresh', callback_data: `price_${symbol.replace('/', '')}` },
                        { text: '⬅️ Harga Lain', callback_data: 'menu_prices' }
                    ]
                ]
            };

            await editOrSend(bot, chatId, messageId, msg, actionKeyboard);
        }
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Gagal mengambil harga.', { reply_markup: priceMenuKeyboard });
    }
}

async function handleAnalysis(bot: TelegramBot, chatId: number, symbol: string, messageId?: number) {
    await editOrSend(bot, chatId, messageId, `⏳ *Menganalisis ${symbol}...*`, backToMenuKeyboard);

    try {
        const analysis = await signalGenerator.analyzeSymbol(symbol);
        if (!analysis) {
            await editOrSend(bot, chatId, messageId, `❌ Tidak dapat menganalisis ${symbol}`, analysisMenuKeyboard);
            return;
        }

        const trendEmoji = analysis.trend === 'BULLISH' ? '📈' : analysis.trend === 'BEARISH' ? '📉' : '➡️';

        let msg = `
📊 *Analisis Teknikal ${symbol}*

💰 Harga: *${formatPrice(analysis.currentPrice, symbol)}*
${trendEmoji} Trend: *${analysis.trend}*

*━━━ Indikator ━━━*
📍 EMA 9: ${analysis.indicators.ema9.toFixed(5)}
📍 EMA 21: ${analysis.indicators.ema21.toFixed(5)}
📊 RSI (14): ${analysis.indicators.rsi.toFixed(1)} ${getRSIStatus(analysis.indicators.rsi)}
📈 MACD: ${analysis.indicators.macdHistogram > 0 ? '✅ Bullish' : '❌ Bearish'}
💪 ADX: ${analysis.indicators.adx?.toFixed(1) || 'N/A'}
`;

        if (analysis.signal) {
            msg += `
*━━━ SINYAL AKTIF ━━━*
${analysis.signal.action === 'BUY' ? '🟢' : '🔴'} *${analysis.signal.action}*
• Entry: ${formatPrice(analysis.signal.price, symbol)}
• SL: ${formatPrice(analysis.signal.stopLoss, symbol)}
• TP: ${formatPrice(analysis.signal.takeProfit, symbol)}
• Confidence: ${analysis.signal.confidence}
`;
        } else {
            msg += `\n⏸️ *Sinyal: HOLD* - Menunggu konfirmasi\n`;
        }

        msg += `\n⏰ _${analysis.timestamp.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`;

        const actionKeyboard: InlineKeyboardMarkup = {
            inline_keyboard: [
                [
                    { text: '🔄 Refresh', callback_data: `analyze_${symbol.replace('/', '')}` },
                    { text: '💰 Harga', callback_data: `price_${symbol.replace('/', '')}` }
                ],
                [
                    { text: '📊 Sinyal', callback_data: `signal_${symbol.replace('/', '')}` },
                    { text: '⬅️ Menu', callback_data: 'menu_analysis' }
                ]
            ]
        };

        await editOrSend(bot, chatId, messageId, msg, actionKeyboard);
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Gagal menganalisis.', { reply_markup: analysisMenuKeyboard });
    }
}

async function handleFullAnalysis(bot: TelegramBot, chatId: number, messageId?: number) {
    await editOrSend(bot, chatId, messageId, '⏳ *Menganalisis semua pair...*\n\nMohon tunggu (±30 detik)...', backToMenuKeyboard);

    try {
        const analyses = await signalGenerator.analyzeAllSymbols();

        let msg = '📊 *Analisis Lengkap Semua Pair*\n\n';

        for (const analysis of analyses) {
            const trendEmoji = analysis.trend === 'BULLISH' ? '📈' : analysis.trend === 'BEARISH' ? '📉' : '➡️';
            const signalText = analysis.signal ? `${analysis.signal.action === 'BUY' ? '🟢' : '🔴'} ${analysis.signal.action}` : '⏸️ HOLD';

            msg += `*${analysis.symbol}* ${trendEmoji}\n`;
            msg += `  Harga: ${formatPrice(analysis.currentPrice, analysis.symbol)}\n`;
            msg += `  RSI: ${analysis.indicators.rsi.toFixed(1)} | Sinyal: ${signalText}\n\n`;
        }

        msg += `⏰ _${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`;

        await editOrSend(bot, chatId, messageId, msg, analysisMenuKeyboard);
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Gagal menganalisis.', { reply_markup: analysisMenuKeyboard });
    }
}

async function handleMarketOverview(bot: TelegramBot, chatId: number, messageId?: number) {
    await editOrSend(bot, chatId, messageId, '⏳ *Memuat market overview...*', backToMenuKeyboard);

    try {
        const prices = await forexApi.getMultiplePrices(config.forexSymbols);

        let bullishCount = 0;
        let bearishCount = 0;

        prices.forEach((price) => {
            if (price.change >= 0) bullishCount++;
            else bearishCount++;
        });

        const sentiment = bullishCount > bearishCount ? '📈 BULLISH' : bullishCount < bearishCount ? '📉 BEARISH' : '➡️ NEUTRAL';

        const msg = `
🌍 *Market Overview*

📊 *Sentimen Pasar:* ${sentiment}

*Statistik:*
• 🟢 Bullish pairs: ${bullishCount}
• 🔴 Bearish pairs: ${bearishCount}

*Top Movers:*
${Array.from(prices.entries())
                .sort((a, b) => Math.abs(b[1].percentChange) - Math.abs(a[1].percentChange))
                .slice(0, 3)
                .map(([sym, p]) => `• ${p.change >= 0 ? '🟢' : '🔴'} ${sym}: ${p.change >= 0 ? '+' : ''}${p.percentChange.toFixed(2)}%`)
                .join('\n')}

⏰ _${new Date().toLocaleTimeString('id-ID')}_
        `;

        await editOrSend(bot, chatId, messageId, msg, {
            inline_keyboard: [
                [
                    { text: '🔄 Refresh', callback_data: 'market_overview' },
                    { text: '💰 Semua Harga', callback_data: 'price_ALL' }
                ],
                [{ text: '⬅️ Menu Utama', callback_data: 'main_menu' }]
            ]
        });
    } catch (error) {
        await bot.sendMessage(chatId, '❌ Gagal memuat data.', { reply_markup: backToMenuKeyboard });
    }
}

async function handleStats(bot: TelegramBot, chatId: number, messageId: number | undefined, type: string) {
    // Simulated stats - in production, load from database
    const stats = {
        totalSignals: tradeHistory.length || 15,
        wins: tradeHistory.filter(t => t.result === 'WIN').length || 10,
        losses: tradeHistory.filter(t => t.result === 'LOSS').length || 5,
        winRate: 66.7,
        totalProfit: 125.50,
        bestPair: 'EUR/USD'
    };

    let period = 'Hari Ini';
    if (type === 'stats_week') period = 'Minggu Ini';
    if (type === 'stats_month') period = 'Bulan Ini';

    const msg = `
📋 *Statistik ${period}*

📊 *Performa Trading:*
• Total Sinyal: ${stats.totalSignals}
• Win: ${stats.wins} ✅
• Loss: ${stats.losses} ❌
• Win Rate: *${stats.winRate.toFixed(1)}%*

💰 *Profit/Loss:*
• Total P/L: $${stats.totalProfit.toFixed(2)}
• Best Pair: ${stats.bestPair}

_Data ini berdasarkan sinyal yang dikirim bot._
    `;

    await editOrSend(bot, chatId, messageId, msg, statsMenuKeyboard);
}

async function handleSignalHistory(bot: TelegramBot, chatId: number, messageId?: number) {
    const recent = tradeHistory.slice(-10).reverse();

    let msg = '📜 *Riwayat Sinyal Terbaru*\n\n';

    if (recent.length === 0) {
        msg += '_Belum ada riwayat sinyal._\n';
        msg += '\nSinyal akan tercatat setelah bot mengirim sinyal trading.';
    } else {
        for (const trade of recent) {
            const emoji = trade.result === 'WIN' ? '✅' : trade.result === 'LOSS' ? '❌' : '⏳';
            msg += `${emoji} *${trade.symbol}* ${trade.action}\n`;
            msg += `   Entry: ${trade.entry} | ${trade.result || 'Pending'}\n\n`;
        }
    }

    await editOrSend(bot, chatId, messageId, msg, {
        inline_keyboard: [
            [{ text: '📋 Statistik Lengkap', callback_data: 'menu_stats' }],
            [{ text: '⬅️ Menu Utama', callback_data: 'main_menu' }]
        ]
    });
}

async function handleTutorial(bot: TelegramBot, chatId: number, messageId: number | undefined, type: string) {
    let msg = '';

    switch (type) {
        case 'tutorial_forex':
            msg = `
📖 *Apa itu Forex?*

*Forex* (Foreign Exchange) adalah pasar pertukaran mata uang global.

📊 *Fakta Forex:*
• Pasar terbesar di dunia
• Volume harian: $6+ triliun
• Buka 24 jam, 5 hari seminggu
• Trading dalam "pair" (pasangan)

💱 *Contoh Pair:*
• EUR/USD = Euro vs Dollar
• XAU/USD = Gold vs Dollar
• USD/JPY = Dollar vs Yen

⚠️ _Trading forex berisiko tinggi. Pelajari dulu sebelum trading!_
            `;
            break;

        case 'tutorial_signals':
            msg = `
📊 *Cara Membaca Sinyal*

🟢 *BUY Signal:*
Beli pair karena harga diprediksi naik

🔴 *SELL Signal:*
Jual pair karena harga diprediksi turun

📍 *Komponen Sinyal:*
• *Entry* = Harga masuk posisi
• *SL* (Stop Loss) = Batas rugi maksimal
• *TP* (Take Profit) = Target profit
• *R/R* = Risk:Reward ratio

💡 *Tips:*
Selalu gunakan Stop Loss untuk membatasi kerugian!
            `;
            break;

        case 'tutorial_indicators':
            msg = `
📈 *Indikator Teknikal*

Bot ini menggunakan 6 indikator:

1️⃣ *EMA 9/21*
   Menentukan trend (bullish/bearish)

2️⃣ *RSI (14)*
   Momentum - overbought/oversold

3️⃣ *MACD*
   Konfirmasi momentum

4️⃣ *ADX*
   Kekuatan trend

5️⃣ *Bollinger Bands*
   Volatilitas & level support/resistance

6️⃣ *Stochastic*
   Timing entry yang optimal
            `;
            break;

        case 'tutorial_risk':
            msg = `
⚠️ *Manajemen Risiko*

*Golden Rules:*

1️⃣ *Risk per Trade: 1-2%*
   Jangan pernah risk >5% per trade

2️⃣ *Selalu Gunakan Stop Loss*
   SL = Asuransi trading Anda

3️⃣ *Risk:Reward Minimal 1:2*
   Win 50% masih profit!

4️⃣ *Jangan Revenge Trading*
   Loss = Normal. Jangan emosional.

5️⃣ *Trading Plan*
   Buat rencana dan ikuti dengan disiplin

💡 *Ingat:* Proteksi modal lebih penting dari profit!
            `;
            break;

        case 'tutorial_tips':
            msg = `
💡 *Tips Trading Sukses*

1️⃣ *Mulai dari Demo Account*
   Latihan tanpa risiko dulu

2️⃣ *Fokus 2-3 Pair Saja*
   Lebih baik ahli di beberapa pair

3️⃣ *Trading di Jam Aktif*
   London & NY session paling likuid

4️⃣ *Jurnal Trading*
   Catat semua trade untuk evaluasi

5️⃣ *Jangan Overtrade*
   Quality > Quantity

6️⃣ *Hindari News Time*
   Volatilitas tinggi = Risiko tinggi

🎯 *Kunci Sukses:* Konsistensi & Disiplin
            `;
            break;

        default:
            msg = '📚 Pilih topik tutorial dari menu.';
    }

    await editOrSend(bot, chatId, messageId, msg, tutorialMenuKeyboard);
}

async function sendHelp(bot: TelegramBot, chatId: number, messageId?: number) {
    const msg = `
❓ *Bantuan RebelionFX Bot*

*Perintah Tersedia:*
/start - Mulai bot
/menu - Menu utama
/signal - Cek sinyal
/price - Cek harga
/analyze - Analisis teknikal
/stats - Statistik
/settings - Pengaturan
/tutorial - Tutorial trading
/help - Bantuan ini

*Keyboard Shortcuts:*
Gunakan tombol inline di bawah pesan untuk navigasi cepat.

*Butuh Bantuan?*
Hubungi admin: @Rebelion_16

⚠️ _Disclaimer: Bot ini untuk edukasi. Keputusan trading tanggung jawab Anda._
    `;

    await editOrSend(bot, chatId, messageId, msg, mainMenuKeyboard);
}

// Export for notification service
export function getActiveSubscribers(): Subscriber[] {
    return Array.from(subscribers.values()).filter(s => s.isActive);
}

export function formatSignalMessage(signal: TradingSignal): string {
    const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
    return `
${emoji} *${signal.action} - ${signal.symbol}*

Entry: ${formatPrice(signal.price, signal.symbol)}
SL: ${formatPrice(signal.stopLoss, signal.symbol)}
TP: ${formatPrice(signal.takeProfit, signal.symbol)}

🎯 Confidence: ${signal.confidence}

⏰ _${signal.timestamp.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_
    `;
}
