import config from '../config';
import forexApi from './forexApi';
import indicators from './indicators';
import { TradingSignal, AnalysisResult, OHLCData } from '../types';

class SignalGeneratorService {
    /**
     * Analyze a forex pair and generate trading signal
     */
    async analyzeSymbol(symbol: string): Promise<AnalysisResult | null> {
        try {
            // Fetch historical data
            const historicalData = await forexApi.getHistoricalData(symbol);
            if (historicalData.length === 0) {
                console.error(`No historical data for ${symbol}`);
                return null;
            }

            // Get current price
            const priceData = await forexApi.getRealtimePrice(symbol);
            if (!priceData) {
                console.error(`No price data for ${symbol}`);
                return null;
            }

            // Calculate indicators
            const indicatorValues = indicators.calculateAllIndicators(historicalData);
            if (!indicatorValues) {
                console.error(`Failed to calculate indicators for ${symbol}`);
                return null;
            }

            // Get previous indicators for crossover detection
            const prevIndicators = indicators.getPreviousIndicators(historicalData);

            // Determine trend
            const trend = this.determineTrend(indicatorValues.ema9, indicatorValues.ema21);

            // Generate signal
            const signal = this.generateSignal(
                symbol,
                priceData.price,
                indicatorValues,
                prevIndicators,
                historicalData
            );

            // Get daily range
            const dailyRange = await forexApi.getDailyRange(symbol);

            return {
                symbol,
                currentPrice: priceData.price,
                trend,
                indicators: indicatorValues,
                signal,
                dailyHigh: dailyRange?.high || historicalData[historicalData.length - 1].high,
                dailyLow: dailyRange?.low || historicalData[historicalData.length - 1].low,
                timestamp: new Date(),
            };
        } catch (error) {
            console.error(`Error analyzing ${symbol}:`, error);
            return null;
        }
    }

    /**
     * Determine market trend based on EMA
     */
    private determineTrend(ema9: number, ema21: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
        const diff = ((ema9 - ema21) / ema21) * 100;

        if (diff > 0.1) return 'BULLISH';
        if (diff < -0.1) return 'BEARISH';
        return 'NEUTRAL';
    }

    /**
     * Generate trading signal based on multi-indicator strategy
     */
    private generateSignal(
        symbol: string,
        price: number,
        indicatorValues: ReturnType<typeof indicators.calculateAllIndicators>,
        prevIndicators: { ema9: number; ema21: number } | null,
        data: OHLCData[]
    ): TradingSignal | null {
        if (!indicatorValues) return null;

        const { ema9, ema21, rsi, macdHistogram } = indicatorValues;

        // Check for crossover if we have previous values
        let hasCrossover = false;
        let crossoverType: 'BUY' | 'SELL' | null = null;

        if (prevIndicators) {
            const crossover = indicators.detectEMACrossover(
                ema9,
                ema21,
                prevIndicators.ema9,
                prevIndicators.ema21
            );

            if (crossover === 'BULLISH_CROSS') {
                hasCrossover = true;
                crossoverType = 'BUY';
            } else if (crossover === 'BEARISH_CROSS') {
                hasCrossover = true;
                crossoverType = 'SELL';
            }
        }

        // BUY Signal Logic
        // Condition 1: EMA9 > EMA21 (bullish trend)
        // Condition 2: RSI in buy zone (40-70)
        // Condition 3: MACD histogram positive
        const isBullishTrend = indicators.isBullishTrend(ema9, ema21);
        const isRSIBuyOk = indicators.isRSIBuyZone(rsi);
        const isMACDBullish = indicators.isMACDBullish(macdHistogram);

        if (isBullishTrend && isRSIBuyOk && isMACDBullish) {
            const confidence = this.calculateConfidence(hasCrossover && crossoverType === 'BUY', rsi, macdHistogram);

            return this.createSignal(symbol, 'BUY', price, indicatorValues, confidence,
                `EMA9 (${ema9.toFixed(5)}) above EMA21 (${ema21.toFixed(5)}), RSI ${rsi.toFixed(1)}, MACD+ ${hasCrossover ? '(crossover!)' : ''}`
            );
        }

        // SELL Signal Logic
        // Condition 1: EMA9 < EMA21 (bearish trend)
        // Condition 2: RSI in sell zone (30-60)
        // Condition 3: MACD histogram negative
        const isBearishTrend = !isBullishTrend && ema9 < ema21;
        const isRSISellOk = indicators.isRSISellZone(rsi);
        const isMACDBearish = indicators.isMACDBearish(macdHistogram);

        if (isBearishTrend && isRSISellOk && isMACDBearish) {
            const confidence = this.calculateConfidence(hasCrossover && crossoverType === 'SELL', rsi, macdHistogram);

            return this.createSignal(symbol, 'SELL', price, indicatorValues, confidence,
                `EMA9 (${ema9.toFixed(5)}) below EMA21 (${ema21.toFixed(5)}), RSI ${rsi.toFixed(1)}, MACD- ${hasCrossover ? '(crossover!)' : ''}`
            );
        }

        return null; // No signal (HOLD)
    }

    /**
     * Calculate signal confidence
     */
    private calculateConfidence(
        hasCrossover: boolean,
        rsi: number,
        macdHistogram: number
    ): 'HIGH' | 'MEDIUM' | 'LOW' {
        let score = 0;

        // Crossover adds significant confidence
        if (hasCrossover) score += 2;

        // RSI in middle range is more reliable
        if (rsi >= 45 && rsi <= 55) score += 1;

        // Strong MACD histogram
        if (Math.abs(macdHistogram) > 0.001) score += 1;

        if (score >= 3) return 'HIGH';
        if (score >= 2) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Create trading signal with SL/TP levels
     */
    private createSignal(
        symbol: string,
        action: 'BUY' | 'SELL',
        price: number,
        indicatorValues: ReturnType<typeof indicators.calculateAllIndicators>,
        confidence: 'HIGH' | 'MEDIUM' | 'LOW',
        reason: string
    ): TradingSignal {
        const slPercent = config.stopLossPercent / 100;
        const tpPercent = config.takeProfitPercent / 100;

        let stopLoss: number;
        let takeProfit: number;

        if (action === 'BUY') {
            stopLoss = price * (1 - slPercent);
            takeProfit = price * (1 + tpPercent);
        } else {
            stopLoss = price * (1 + slPercent);
            takeProfit = price * (1 - tpPercent);
        }

        return {
            symbol,
            action,
            price,
            stopLoss,
            takeProfit,
            confidence,
            indicators: indicatorValues!,
            timestamp: new Date(),
            reason,
        };
    }

    /**
     * Analyze all configured forex pairs
     */
    async analyzeAllSymbols(): Promise<AnalysisResult[]> {
        const results: AnalysisResult[] = [];

        for (const symbol of config.forexSymbols) {
            console.log(`Analyzing ${symbol}...`);
            const result = await this.analyzeSymbol(symbol);
            if (result) {
                results.push(result);
            }
            // Small delay between API calls
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return results;
    }

    /**
     * Get signals only (filter out HOLD)
     */
    async getActiveSignals(): Promise<TradingSignal[]> {
        const analyses = await this.analyzeAllSymbols();
        return analyses
            .filter((a) => a.signal !== null)
            .map((a) => a.signal!);
    }
}

export const signalGenerator = new SignalGeneratorService();
export default signalGenerator;
