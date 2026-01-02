# Forex Trading Signal Bot 🤖📈

Bot Telegram untuk sinyal trading Forex otomatis dengan analisis teknikal.

## Fitur

- ✅ **Sinyal Open/Close** - Notifikasi otomatis BUY/SELL dengan SL/TP
- ✅ **Multi-Indicator Strategy** - EMA 9/21 + RSI 14 + MACD
- ✅ **Real-time Price** - Cek harga terkini
- ✅ **Technical Analysis** - Analisis lengkap per pair
- ✅ **Auto Notifications** - Jadwal pengecekan tiap 15 menit

## Pair yang Didukung

- XAU/USD (Gold)
- USD/JPY
- GBP/USD

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Copy `.env.example` ke `.env` dan isi:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TWELVEDATA_API_KEY=your_api_key
```

**Cara mendapatkan:**
- Telegram Bot Token: Chat ke [@BotFather](https://t.me/BotFather), ketik `/newbot`
- Twelve Data API Key: Daftar gratis di [twelvedata.com](https://twelvedata.com)

### 3. Run Bot

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Bot Commands

| Command | Deskripsi |
|---------|-----------|
| `/start` | Mulai dan subscribe notifikasi |
| `/signal` | Lihat sinyal aktif |
| `/price <pair>` | Cek harga (cth: `/price XAU/USD`) |
| `/analyze <pair>` | Analisis teknikal lengkap |
| `/subscribe` | Aktifkan notifikasi |
| `/unsubscribe` | Nonaktifkan notifikasi |
| `/status` | Status langganan |
| `/help` | Bantuan |

## Trading Strategy

Bot menggunakan **Multi-Indicator Confirmation**:

### BUY Signal
1. ✅ EMA 9 > EMA 21 (bullish trend)
2. ✅ RSI antara 40-70 (momentum sehat)
3. ✅ MACD histogram positif

### SELL Signal
1. ✅ EMA 9 < EMA 21 (bearish trend)
2. ✅ RSI antara 30-60 (momentum sehat)
3. ✅ MACD histogram negatif

### Risk Management
- Stop Loss: 1.5% dari entry
- Take Profit: 3% dari entry
- Risk/Reward Ratio: 1:2

## Deploy ke VPS

```bash
# Build
npm run build

# Run dengan PM2
pm2 start dist/index.js --name forex-bot

# Auto-restart setelah reboot
pm2 startup
pm2 save
```

## Project Structure

```
src/
├── config/          # Environment config
├── services/
│   ├── forexApi.ts       # Twelve Data API client
│   ├── indicators.ts     # RSI, MACD, EMA calculator
│   └── signalGenerator.ts # Trading signal logic
├── bot/
│   ├── commands.ts       # Telegram commands
│   ├── notifications.ts  # Auto notification scheduler
│   └── index.ts          # Bot initialization
├── types/           # TypeScript interfaces
└── index.ts         # Entry point
```

## ⚠️ Disclaimer

Bot ini hanya untuk edukasi. Trading forex berisiko tinggi. Keputusan trading adalah tanggung jawab Anda sepenuhnya. Selalu gunakan manajemen risiko yang baik.

## License

MIT
