// Trading Signal Types
export interface TradingSignal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    price: number;
    stopLoss: number;
    takeProfit: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    indicators: IndicatorValues;
    timestamp: Date;
    reason: string;
}

export interface IndicatorValues {
    ema9: number;
    ema21: number;
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    adx?: number;           // Average Directional Index for trend strength
    atr?: number;           // Average True Range for volatility
}

// Price Data Types
export interface OHLCData {
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface PriceData {
    symbol: string;
    price: number;
    timestamp: string;
    change: number;
    percentChange: number;
}

// Twelve Data API Response Types
export interface TwelveDataQuote {
    symbol: string;
    name: string;
    exchange: string;
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    previous_close: string;
    change: string;
    percent_change: string;
}

export interface TwelveDataTimeSeries {
    meta: {
        symbol: string;
        interval: string;
        currency_base: string;
        currency_quote: string;
    };
    values: Array<{
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
    }>;
    status: string;
}

// Subscriber Types
export interface Subscriber {
    chatId: number;
    username?: string;
    subscribedAt: Date;
    isActive: boolean;
    preferredPairs: string[];
}

// Signal Analysis Result
export interface AnalysisResult {
    symbol: string;
    currentPrice: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    indicators: IndicatorValues;
    signal: TradingSignal | null;
    dailyHigh: number;
    dailyLow: number;
    timestamp: Date;
}

// EMA Crossover Type
export type CrossoverType = 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
