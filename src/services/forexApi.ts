import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { OHLCData, PriceData, TwelveDataQuote, TwelveDataTimeSeries } from '../types';

class ForexApiService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: config.twelveDataBaseUrl,
            params: {
                apikey: config.twelveDataApiKey,
            },
        });
    }

    /**
     * Normalize symbol for Twelve Data API
     * XAU/USD might need to be sent as "XAU/USD" or "XAUUSD" depending on API
     */
    private normalizeSymbol(symbol: string): string {
        // Remove any spaces and normalize
        let normalized = symbol.trim().toUpperCase();

        // Ensure forex pairs have the slash format for Twelve Data
        // Twelve Data expects: XAU/USD, EUR/USD, etc.
        if (!normalized.includes('/') && normalized.length === 6) {
            normalized = normalized.substring(0, 3) + '/' + normalized.substring(3);
        }

        return normalized;
    }

    /**
     * Get real-time price for a forex pair
     */
    async getRealtimePrice(symbol: string): Promise<PriceData | null> {
        try {
            const normalizedSymbol = this.normalizeSymbol(symbol);

            const response = await this.client.get<TwelveDataQuote>('/quote', {
                params: { symbol: normalizedSymbol },
            });

            const data = response.data;

            // Check for API error response
            if ((data as any).status === 'error' || (data as any).code) {
                console.error(`API Error for ${normalizedSymbol}:`, (data as any).message || 'Unknown error');
                return null;
            }

            if (!data || !data.close) {
                console.error(`No data received for ${normalizedSymbol}`);
                return null;
            }

            return {
                symbol: data.symbol || normalizedSymbol,
                price: parseFloat(data.close),
                timestamp: data.datetime,
                change: parseFloat(data.change || '0'),
                percentChange: parseFloat(data.percent_change || '0'),
            };
        } catch (error: any) {
            console.error(`Error fetching price for ${symbol}:`, error?.message || error);
            return null;
        }
    }

    /**
     * Get historical OHLC data for technical analysis
     */
    async getHistoricalData(
        symbol: string,
        interval: string = config.timeframe,
        outputSize: number = config.historicalDataPoints
    ): Promise<OHLCData[]> {
        try {
            const response = await this.client.get<TwelveDataTimeSeries>('/time_series', {
                params: {
                    symbol,
                    interval,
                    outputsize: outputSize,
                },
            });

            const data = response.data;

            if (!data || !data.values || data.status === 'error') {
                console.error(`Error in time series response for ${symbol}`);
                return [];
            }

            // Convert to OHLCData format and reverse to chronological order
            return data.values
                .map((candle) => ({
                    datetime: candle.datetime,
                    open: parseFloat(candle.open),
                    high: parseFloat(candle.high),
                    low: parseFloat(candle.low),
                    close: parseFloat(candle.close),
                }))
                .reverse();
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
            return [];
        }
    }

    /**
     * Get prices for multiple symbols
     */
    async getMultiplePrices(symbols: string[]): Promise<Map<string, PriceData>> {
        const results = new Map<string, PriceData>();

        // Fetch sequentially to avoid rate limiting
        for (const symbol of symbols) {
            const price = await this.getRealtimePrice(symbol);
            if (price) {
                results.set(symbol, price);
            }
            // Small delay between requests
            await this.delay(200);
        }

        return results;
    }

    /**
     * Get daily high and low prices
     */
    async getDailyRange(symbol: string): Promise<{ high: number; low: number } | null> {
        try {
            const data = await this.getHistoricalData(symbol, '1day', 1);
            if (data.length > 0) {
                return {
                    high: data[0].high,
                    low: data[0].low,
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching daily range for ${symbol}:`, error);
            return null;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const forexApi = new ForexApiService();
export default forexApi;
