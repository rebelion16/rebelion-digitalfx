# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
