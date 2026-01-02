import TelegramBot from 'node-telegram-bot-api';
import config from '../config';
import { signalGenerator, forexApi } from '../services';
import { TradingSignal, AnalysisResult, Subscriber } from '../types';

// In-memory subscriber storage (in production, use a database)
const subscribers: Map<number, Subscriber> = new Map();

export function setupCommands(bot: TelegramBot): void {
    // /start - Welcome message
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const username = msg.from?.username || 'Trader';

        // Auto-subscribe on start
        if (!subscribers.has(chatId)) {
            subscribers.set(chatId, {
                chatId,
                username,
                subscribedAt: new Date(),
                isActive: true,
                preferredPairs: config.forexSymbols,
            });
        }

        const welcomeMessage = `
🤖 *Selamat Datang di Forex Signal Bot!*

Halo ${username}! Bot ini akan memberikan sinyal trading berdasarkan analisis teknikal:
• EMA 9/21 Crossover
• RSI (14) Filter
• MACD Confirmation

📊 *Pair yang dipantau:*
${config.forexSymbols.map(s => `  • ${s}`).join('\n')}

*Perintah tersedia:*
/signal - Lihat sinyal aktif
/price \\<pair\\> - Cek harga (cth: /price XAU/USD)
/analyze \\<pair\\> - Analisis lengkap
/subscribe - Aktifkan notifikasi
/unsubscribe - Nonaktifkan notifikasi
/status - Status langganan
/help - Bantuan

⚠️ *Disclaimer:* Sinyal ini untuk edukasi. Keputusan trading adalah tanggung jawab Anda.

Anda sudah terdaftar untuk menerima notifikasi sinyal! 🔔
    `;

        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // /signal - Get current signals
    bot.onText(/\/signal/, async (msg) => {
        const chatId = msg.chat.id;

        await bot.sendMessage(chatId, '⏳ Menganalisis pasar...');

        try {
            const signals = await signalGenerator.getActiveSignals();

            if (signals.length === 0) {
                await bot.sendMessage(chatId, '📊 Tidak ada sinyal aktif saat ini. Pasar sedang sideways atau belum ada konfirmasi dari semua indikator.');
                return;
            }

            for (const signal of signals) {
                await bot.sendMessage(chatId, formatSignalMessage(signal), { parse_mode: 'Markdown' });
            }
        } catch (error) {
            console.error('Error getting signals:', error);
            await bot.sendMessage(chatId, '❌ Terjadi kesalahan saat menganalisis pasar. Silakan coba lagi.');
        }
    });

    // /price <pair> - Check current price
    bot.onText(/\/price(?:\s+(.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const symbol = match?.[1]?.trim().toUpperCase().replace(' ', '/');

        if (!symbol) {
            await bot.sendMessage(chatId, `
📈 *Cek Harga*

Gunakan: \`/price <pair>\`

Contoh:
• /price XAU/USD
• /price USD/JPY
• /price GBP/USD

Atau: /price all untuk semua pair
      `, { parse_mode: 'Markdown' });
            return;
        }

        await bot.sendMessage(chatId, '⏳ Mengambil data harga...');

        try {
            if (symbol === 'ALL') {
                const prices = await forexApi.getMultiplePrices(config.forexSymbols);
                let message = '💰 *Harga Terkini:*\n\n';

                prices.forEach((price, sym) => {
                    const changeEmoji = price.change >= 0 ? '🟢' : '🔴';
                    const changeSign = price.change >= 0 ? '+' : '';
                    message += `${changeEmoji} *${sym}*: ${formatPrice(price.price, sym)}\n`;
                    message += `   ${changeSign}${price.change.toFixed(5)} (${changeSign}${price.percentChange.toFixed(2)}%)\n\n`;
                });

                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            } else {
                const price = await forexApi.getRealtimePrice(symbol);

                if (!price) {
                    await bot.sendMessage(chatId, `❌ Pair ${symbol} tidak ditemukan atau tidak tersedia.`);
                    return;
                }

                const dailyRange = await forexApi.getDailyRange(symbol);
                const changeEmoji = price.change >= 0 ? '🟢' : '🔴';
                const changeSign = price.change >= 0 ? '+' : '';

                const message = `
${changeEmoji} *${symbol}*

💰 *Harga:* ${formatPrice(price.price, symbol)}
📊 *Perubahan:* ${changeSign}${price.change.toFixed(5)} (${changeSign}${price.percentChange.toFixed(2)}%)
${dailyRange ? `📈 *High Hari Ini:* ${formatPrice(dailyRange.high, symbol)}\n📉 *Low Hari Ini:* ${formatPrice(dailyRange.low, symbol)}` : ''}

⏰ Update: ${new Date().toLocaleTimeString('id-ID')}
        `;

                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            }
        } catch (error) {
            console.error('Error getting price:', error);
            await bot.sendMessage(chatId, '❌ Gagal mengambil data harga. Silakan coba lagi.');
        }
    });

    // /analyze <pair> - Full analysis
    bot.onText(/\/analyze(?:\s+(.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const symbol = match?.[1]?.trim().toUpperCase().replace(' ', '/');

        if (!symbol) {
            await bot.sendMessage(chatId, `
📊 *Analisis Teknikal*

Gunakan: \`/analyze <pair>\`

Contoh:
• /analyze XAU/USD
• /analyze USD/JPY
      `, { parse_mode: 'Markdown' });
            return;
        }

        await bot.sendMessage(chatId, '⏳ Menganalisis...');

        try {
            const analysis = await signalGenerator.analyzeSymbol(symbol);

            if (!analysis) {
                await bot.sendMessage(chatId, `❌ Tidak dapat menganalisis ${symbol}. Pastikan pair tersedia.`);
                return;
            }

            await bot.sendMessage(chatId, formatAnalysisMessage(analysis), { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error analyzing:', error);
            await bot.sendMessage(chatId, '❌ Gagal menganalisis. Silakan coba lagi.');
        }
    });

    // /subscribe - Enable notifications
    bot.onText(/\/subscribe/, async (msg) => {
        const chatId = msg.chat.id;
        const username = msg.from?.username;

        const subscriber = subscribers.get(chatId);
        if (subscriber && subscriber.isActive) {
            await bot.sendMessage(chatId, '✅ Anda sudah berlangganan notifikasi sinyal!');
            return;
        }

        subscribers.set(chatId, {
            chatId,
            username,
            subscribedAt: new Date(),
            isActive: true,
            preferredPairs: config.forexSymbols,
        });

        await bot.sendMessage(chatId, '🔔 Berhasil berlangganan! Anda akan menerima notifikasi sinyal trading.');
    });

    // /unsubscribe - Disable notifications
    bot.onText(/\/unsubscribe/, async (msg) => {
        const chatId = msg.chat.id;

        const subscriber = subscribers.get(chatId);
        if (subscriber) {
            subscriber.isActive = false;
            subscribers.set(chatId, subscriber);
        }

        await bot.sendMessage(chatId, '🔕 Notifikasi dinonaktifkan. Gunakan /subscribe untuk mengaktifkan kembali.');
    });

    // /status - Check subscription status
    bot.onText(/\/status/, async (msg) => {
        const chatId = msg.chat.id;

        const subscriber = subscribers.get(chatId);
        const status = subscriber?.isActive ? '🟢 Aktif' : '🔴 Nonaktif';

        await bot.sendMessage(chatId, `
📋 *Status Langganan*

Status: ${status}
${subscriber ? `Berlangganan sejak: ${subscriber.subscribedAt.toLocaleDateString('id-ID')}` : ''}

Pair yang dipantau:
${config.forexSymbols.map(s => `  • ${s}`).join('\n')}
    `, { parse_mode: 'Markdown' });
    });

    // /help - Show help
    bot.onText(/\/help/, async (msg) => {
        const chatId = msg.chat.id;

        await bot.sendMessage(chatId, `
📚 *Panduan Penggunaan*

*Perintah:*
• /signal - Lihat sinyal trading aktif
• /price \\<pair\\> - Cek harga pair tertentu
• /price all - Cek semua harga
• /analyze \\<pair\\> - Analisis teknikal lengkap
• /subscribe - Aktifkan notifikasi otomatis
• /unsubscribe - Nonaktifkan notifikasi
• /status - Lihat status langganan

*Strategi Trading:*
Bot menggunakan kombinasi 3 indikator:
1. *EMA 9/21* - Trend detection
2. *RSI 14* - Momentum filter
3. *MACD* - Signal confirmation

*Sinyal BUY:*
✅ EMA9 > EMA21 (bullish trend)
✅ RSI antara 40-70 (momentum sehat)
✅ MACD histogram positif

*Sinyal SELL:*
✅ EMA9 < EMA21 (bearish trend)
✅ RSI antara 30-60 (momentum sehat)
✅ MACD histogram negatif

⚠️ *Disclaimer:* Trading forex berisiko tinggi. Sinyal ini untuk edukasi saja. Selalu gunakan manajemen risiko yang baik.
    `, { parse_mode: 'Markdown' });
    });
}

// Export subscribers for notification service
export function getActiveSubscribers(): Subscriber[] {
    return Array.from(subscribers.values()).filter(s => s.isActive);
}

// Format signal message
export function formatSignalMessage(signal: TradingSignal): string {
    const emoji = signal.action === 'BUY' ? '🟢' : '🔴';
    const actionText = signal.action === 'BUY' ? 'BUY' : 'SELL';
    const confidenceEmoji = signal.confidence === 'HIGH' ? '🔥' : signal.confidence === 'MEDIUM' ? '⚡' : '💡';

    return `
${emoji} *${actionText} SIGNAL - ${signal.symbol}* ${confidenceEmoji}

📊 *Analisis Teknikal:*
• EMA 9: ${signal.indicators.ema9.toFixed(5)}
• EMA 21: ${signal.indicators.ema21.toFixed(5)}
• RSI: ${signal.indicators.rsi.toFixed(1)}
• MACD: ${signal.indicators.macdHistogram > 0 ? '📈 Bullish' : '📉 Bearish'}

💰 *Trade Setup:*
• Entry: ${formatPrice(signal.price, signal.symbol)}
• Stop Loss: ${formatPrice(signal.stopLoss, signal.symbol)} (-${config.stopLossPercent}%)
• Take Profit: ${formatPrice(signal.takeProfit, signal.symbol)} (+${config.takeProfitPercent}%)
• Risk/Reward: 1:2

🎯 *Confidence:* ${signal.confidence}
📝 *Alasan:* ${signal.reason}

⏰ ${signal.timestamp.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

⚠️ _Selalu gunakan manajemen risiko!_
  `;
}

// Format analysis message
function formatAnalysisMessage(analysis: AnalysisResult): string {
    const trendEmoji = analysis.trend === 'BULLISH' ? '📈' : analysis.trend === 'BEARISH' ? '📉' : '➡️';

    let signalSection = '';
    if (analysis.signal) {
        signalSection = `
🎯 *SINYAL AKTIF:* ${analysis.signal.action === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
• Entry: ${formatPrice(analysis.signal.price, analysis.symbol)}
• SL: ${formatPrice(analysis.signal.stopLoss, analysis.symbol)}
• TP: ${formatPrice(analysis.signal.takeProfit, analysis.symbol)}
`;
    } else {
        signalSection = `
⏸️ *SINYAL:* HOLD
_Menunggu konfirmasi dari semua indikator_
`;
    }

    return `
📊 *Analisis ${analysis.symbol}*

💰 *Harga:* ${formatPrice(analysis.currentPrice, analysis.symbol)}
📈 *High:* ${formatPrice(analysis.dailyHigh, analysis.symbol)}
📉 *Low:* ${formatPrice(analysis.dailyLow, analysis.symbol)}
${trendEmoji} *Trend:* ${analysis.trend}

*Indikator:*
• EMA 9: ${analysis.indicators.ema9.toFixed(5)}
• EMA 21: ${analysis.indicators.ema21.toFixed(5)}
• RSI (14): ${analysis.indicators.rsi.toFixed(1)} ${getRSIStatus(analysis.indicators.rsi)}
• MACD: ${analysis.indicators.macd.toFixed(5)}
• MACD Signal: ${analysis.indicators.macdSignal.toFixed(5)}
• MACD Histogram: ${analysis.indicators.macdHistogram.toFixed(5)} ${analysis.indicators.macdHistogram > 0 ? '📈' : '📉'}
${signalSection}
⏰ ${analysis.timestamp.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
  `;
}

function getRSIStatus(rsi: number): string {
    if (rsi > 70) return '🔴 Overbought';
    if (rsi < 30) return '🟢 Oversold';
    if (rsi >= 50) return '📈 Bullish';
    return '📉 Bearish';
}

function formatPrice(price: number, symbol: string): string {
    // XAU/USD uses 2 decimals, JPY pairs use 3, others use 5
    if (symbol.includes('XAU')) {
        return price.toFixed(2);
    }
    if (symbol.includes('JPY')) {
        return price.toFixed(3);
    }
    return price.toFixed(5);
}
