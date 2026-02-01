# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [Scalping 1.00] - 2026-02-01
### Added
- **RebelionFX_Scalping.mq5** - EA Scalping baru untuk timeframe M5:
  - Timeframe: M5 (5 menit) untuk scalping cepat
  - SL/TP: 10/15 pips (Gold: 15/25 pips)
  - Max Spread: 15 points (lebih ketat)
  - Break Even: 5 pips, Trailing Stop: 8 pips
  - Max Trades/Day: 30 (lebih banyak untuk scalping)
  - Risk: 0.5% per trade, Max Daily Loss: 3%
  - Indicator: EMA 5/13, RSI 7, MACD 8/17/9, Stochastic 5/3/3
  - Semua fitur Telegram dari EA Swing (notifikasi, daily summary, multi-account)
  - Daily Profit Target: $5 default
  - Magic Number berbeda: 789012 (untuk multi-EA)

## [3.11] - 2026-01-30
### Added
- **Daily Profit Target (RebelionFX_EA.mq5)**:
  - Added: `InpDailyProfitTarget` - Target profit harian dalam $ (default: $2)
  - Added: `InpStopOnProfitTarget` - Toggle untuk stop trading jika target tercapai
  - Added: Notifikasi Telegram saat target profit tercapai
  - Added: Tracking `dailyRealizedProfit` per symbol
  - Changed: Trading otomatis stop jika profit harian tercapai
  - Changed: Reset otomatis keesokan harinya

## [3.10] - 2026-01-28
### Added
- **Multi-Account Telegram Support (RebelionFX_EA.mq5)**:
  - Added: `InpAccountLabel` - Parameter untuk identifikasi akun di notifikasi Telegram
  - Added: Notifikasi close trade (TP/SL) dengan detail profit/loss
  - Added: Daily Summary otomatis jam 20:00 WIB (13:00 UTC)
  - Added: Tracking posisi untuk deteksi trade yang ditutup
  - Changed: Semua notifikasi sekarang menyertakan label akun
  - Changed: Notifikasi open trade sekarang menyertakan SL/TP
  - Improved: Format notifikasi lebih informatif dengan emoji

### Changed
- **EA Version Updated to 3.10**
- **Daily Summary Format**:
  - Menampilkan P/L hari ini dengan persentase
  - Menampilkan statistik Win/Loss dan Win Rate
  - Menampilkan Balance dan Equity terkini

## [3.1.1] - 2026-01-14
### Fixed
- **Timeframe Reverted to H1 (RebelionFX_EA.mq5)**:
  - Changed: Timeframe dikembalikan dari M15 ke **H1** (1 Hour)
  - Reason: M15 terlalu cepat dan menghasilkan terlalu sedikit sinyal valid
  - H1 memberikan sinyal yang lebih reliable dan stabil
- **Telegram Emoji Encoding Fixed (RebelionFX_EA.mq5)**:
  - Fixed: Emoji seperti 🚀 muncul sebagai `??` di Telegram
  - Solution: Menggunakan `CP_UTF8` encoding pada `StringToCharArray`
  - Added: Header `charset=utf-8` pada request ke Telegram API
- **Bot VPS Restarted**:
  - Fixed: Inline keyboard buttons tidak merespon di Telegram bot
  - Cause: PM2 process tidak berjalan (empty process list)
  - Solution: Started bot dengan `pm2 start dist/index.js --name forex-bot`
  - Location: `/opt/forex-bot` on VPS 157.15.40.88:4140

## [3.1.0] - 2026-01-14
### Fixed
- **EA Trading Issue (RebelionFX_EA.mq5)**:
  - Fixed: EA tidak pernah membuka trade karena spread Gold terlalu tinggi
  - Fixed: **SL/TP Gold sangat tipis** - pip value diperbaiki dari 0.01 ke 0.10 (50 pips = $5, 100 pips = $10)
  - Added: `InpGoldMaxSpread = 100` - Setting spread khusus untuk Gold (sebelumnya pakai default 20 points)
  - Added: `IsSpreadOK()` sekarang cek Gold-specific spread limit
  - Added: Comprehensive diagnostic logging di tab Experts untuk debugging
  - Added: `PrintDiagnostics()` function - menampilkan status semua kondisi trading setiap 5 menit
  - Added: Log status untuk setiap pengecekan (spread, time filter, max trades, etc.)
  - Improved: Logging saat signal BUY/SELL terdeteksi dengan emoji indicators

### Changed
- **EA Default Settings Updated**:
  - Timeframe: H1 → **M15** (signal dicek setiap 15 menit)
  - Max Trades per Day: 3 → **10**
  - Max Open Trades per Symbol: 1 → **2**
  - Auto Lot: ON → **OFF** (fixed lot 0.01)

## [3.0.0] - 2026-01-08
### Changed
- **EA Optimization (RebelionFX_EA.mq5)**:
  - Disabled strict Bollinger Bands filter by default (`InpUseBollinger = false`).
  - Disabled strict Stochastic filter by default (`InpUseStochastic = false`).
  - Widened RSI Buy Max from 65 to 75 to catch stronger trends.
  - Widened RSI Sell Min from 35 to 25 to catch stronger trends.
  - Lowered ADX Minimum Strength from 20 to 15 to enter developing trends earlier.
  - Reduced Stop Loss (0.8% -> 0.5%) and Take Profit (1.6% -> 1.0%) for higher consistency and frequency.
  - Updated Gold settings (SL 50 pips, TP 100 pips, Min ADX 20) for quicker scalping.
