import { EMA, RSI, MACD, ADX, ATR } from 'technicalindicators';
import config from '../config';
import { OHLCData, IndicatorValues, CrossoverType } from '../types';

class IndicatorsService {
    /**
     * Calculate EMA (Exponential Moving Average)
     */
    calculateEMA(closes: number[], period: number): number[] {
        return EMA.calculate({ period, values: closes });
    }

    /**
     * Calculate RSI (Relative Strength Index)
     */
    calculateRSI(closes: number[], period: number = config.indicators.rsiPeriod): number[] {
        return RSI.calculate({ period, values: closes });
    }

    /**
     * Calculate MACD
     */
    calculateMACD(closes: number[]): Array<{ MACD: number; signal: number; histogram: number }> {
        const result = MACD.calculate({
            values: closes,
            fastPeriod: config.indicators.macdFast,
            slowPeriod: config.indicators.macdSlow,
            signalPeriod: config.indicators.macdSignal,
            SimpleMAOscillator: false,
            SimpleMASignal: false,
        });

        return result.map((r) => ({
            MACD: r.MACD ?? 0,
            signal: r.signal ?? 0,
            histogram: r.histogram ?? 0,
        }));
    }

    /**
     * Detect EMA crossover
     */
    detectEMACrossover(
        ema9Current: number,
        ema21Current: number,
        ema9Previous: number,
        ema21Previous: number
    ): CrossoverType {
        // Bullish crossover: EMA9 was below EMA21, now above
        if (ema9Previous <= ema21Previous && ema9Current > ema21Current) {
            return 'BULLISH_CROSS';
        }

        // Bearish crossover: EMA9 was above EMA21, now below
        if (ema9Previous >= ema21Previous && ema9Current < ema21Current) {
            return 'BEARISH_CROSS';
        }

        return 'NONE';
    }

    /**
     * Check if EMA indicates bullish trend (EMA9 > EMA21)
     */
    isBullishTrend(ema9: number, ema21: number): boolean {
        return ema9 > ema21;
    }

    /**
     * Check if RSI is in buy zone (not overbought)
     */
    isRSIBuyZone(rsi: number): boolean {
        return rsi >= config.indicators.rsiBuyMin && rsi <= config.indicators.rsiBuyMax;
    }

    /**
     * Check if RSI is in sell zone (not oversold)
     */
    isRSISellZone(rsi: number): boolean {
        return rsi >= config.indicators.rsiSellMin && rsi <= config.indicators.rsiSellMax;
    }

    /**
     * Check if MACD confirms bullish momentum
     */
    isMACDBullish(histogram: number): boolean {
        return histogram > 0;
    }

    /**
     * Check if MACD confirms bearish momentum
     */
    isMACDBearish(histogram: number): boolean {
        return histogram < 0;
    }

    /**
     * Calculate ADX (Average Directional Index) for trend strength
     */
    calculateADX(data: OHLCData[], period: number = 14): number[] {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);

        const result = ADX.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: period,
        });

        return result.map(r => r.adx);
    }

    /**
     * Calculate ATR (Average True Range) for volatility
     */
    calculateATR(data: OHLCData[], period: number = 14): number[] {
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);
        const closes = data.map(d => d.close);

        return ATR.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: period,
        });
    }

    /**
     * Check if trend is strong enough (ADX > threshold)
     */
    isTrendStrong(adx: number): boolean {
        return adx >= config.filters.adxMinStrength;
    }

    /**
     * Check if MACD histogram is significant
     */
    isMACDSignificant(histogram: number): boolean {
        return Math.abs(histogram) >= config.filters.minMacdHistogram;
    }

    /**
     * Calculate all indicators from OHLC data
     */
    calculateAllIndicators(data: OHLCData[]): IndicatorValues | null {
        if (data.length < config.indicators.macdSlow + config.indicators.macdSignal) {
            console.error('Not enough data points for indicator calculation');
            return null;
        }

        const closes = data.map((d) => d.close);

        // Calculate indicators
        const ema9Values = this.calculateEMA(closes, config.indicators.emaFast);
        const ema21Values = this.calculateEMA(closes, config.indicators.emaSlow);
        const rsiValues = this.calculateRSI(closes);
        const macdValues = this.calculateMACD(closes);
        const adxValues = this.calculateADX(data);
        const atrValues = this.calculateATR(data, config.filters.atrPeriod);

        // Get latest values
        const ema9 = ema9Values[ema9Values.length - 1];
        const ema21 = ema21Values[ema21Values.length - 1];
        const rsi = rsiValues[rsiValues.length - 1];
        const latestMACD = macdValues[macdValues.length - 1];
        const adx = adxValues.length > 0 ? adxValues[adxValues.length - 1] : undefined;
        const atr = atrValues.length > 0 ? atrValues[atrValues.length - 1] : undefined;

        if (!ema9 || !ema21 || !rsi || !latestMACD) {
            console.error('Failed to calculate some indicators');
            return null;
        }

        return {
            ema9,
            ema21,
            rsi,
            macd: latestMACD.MACD,
            macdSignal: latestMACD.signal,
            macdHistogram: latestMACD.histogram,
            adx,
            atr,
        };
    }

    /**
     * Get previous indicator values for crossover detection
     */
    getPreviousIndicators(data: OHLCData[]): { ema9: number; ema21: number } | null {
        if (data.length < config.indicators.emaSlow + 2) {
            return null;
        }

        const closes = data.map((d) => d.close);
        const ema9Values = this.calculateEMA(closes, config.indicators.emaFast);
        const ema21Values = this.calculateEMA(closes, config.indicators.emaSlow);

        // Get second-to-last values
        const ema9 = ema9Values[ema9Values.length - 2];
        const ema21 = ema21Values[ema21Values.length - 2];

        if (!ema9 || !ema21) {
            return null;
        }

        return { ema9, ema21 };
    }
}

export const indicators = new IndicatorsService();
export default indicators;
