//+------------------------------------------------------------------+
//|                      RebelionFX_Scalping.mq5                     |
//|                  Copyright 2026, Rebelion Digital FX             |
//|          Auto Trading EA - Scalping M5 + Risk + Telegram         |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Rebelion Digital FX by Lukmandian11"
#property link      "https://github.com/rebelion16"
#property version   "1.00"
#property description "EA Scalping berbasis EMA + RSI + MACD + Stochastic"
#property description "Timeframe M5 dengan Advanced Risk Management + Multi-Account Telegram"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\AccountInfo.mqh>
#include <Trade\SymbolInfo.mqh>

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - TELEGRAM SETTINGS                              |
//+------------------------------------------------------------------+
input group "=== TELEGRAM NOTIFICATIONS ==="
input bool     InpUseTelegram      = true;        // Enable Telegram Notifications
input string   InpTelegramToken    = "";          // Telegram Bot Token
input string   InpTelegramChatID   = "";          // Telegram Chat ID
input string   InpAccountLabel     = "Scalp-1";   // Account Label (identifikasi akun)
input bool     InpNotifyOnOpen     = true;        // Notify on Trade Open
input bool     InpNotifyOnClose    = true;        // Notify on Trade Close
input bool     InpNotifyDailySummary = true;      // Send Daily Summary
input int      InpSummaryHour      = 13;          // Daily Summary Hour UTC (20:00 WIB = 13:00 UTC)

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - TRADING SETTINGS                               |
//+------------------------------------------------------------------+
input group "=== TRADING SETTINGS ==="
input double   InpLotSize          = 0.01;        // Lot Size
input bool     InpUseAutoLot       = false;       // Use Auto Lot (Risk-Based)
input int      InpMagicNumber      = 789012;      // Magic Number (berbeda dari Swing EA)
input string   InpTradeComment     = "RebelionFX_Scalp"; // Trade Comment
input int      InpMaxTradesPerDay  = 30;          // Max Trades per Day (lebih banyak untuk scalping)
input int      InpMaxOpenTrades    = 3;           // Max Open Trades per Symbol

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - RISK MANAGEMENT                                |
//+------------------------------------------------------------------+
input group "=== RISK MANAGEMENT (SCALPING) ==="
input double   InpRiskPercent       = 0.5;        // Risk % per Trade (0.5% untuk scalping)
input double   InpMaxDailyLossPercent = 3.0;      // Max Daily Loss % (lebih ketat untuk scalping)
input double   InpMaxDrawdownPercent  = 5.0;      // Max Drawdown % (lebih ketat)
input double   InpDailyProfitTarget   = 5.0;      // Daily Profit Target $
input bool     InpStopOnProfitTarget  = true;     // Stop Trading if Profit Target reached
input double   InpMaxSpreadPoints     = 15;       // Max Spread (points) - lebih ketat untuk scalping
input bool     InpUseBreakEven        = true;     // Use Break Even
input int      InpBreakEvenPips       = 5;        // Break Even Trigger (pips) - lebih cepat
input bool     InpUseTrailingStop     = true;     // Use Trailing Stop
input int      InpTrailingStopPips    = 8;        // Trailing Stop (pips) - lebih ketat
input int      InpTrailingStepPips    = 3;        // Trailing Step (pips)

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - SL/TP SETTINGS                                 |
//+------------------------------------------------------------------+
input group "=== STOP LOSS & TAKE PROFIT (SCALPING) ==="
input int      InpSLPips             = 10;        // Stop Loss (pips)
input int      InpTPPips             = 15;        // Take Profit (pips)

input group "=== XAU/USD SCALPING SETTINGS ==="
input bool     InpUseGoldSettings    = true;      // Gunakan setting khusus Gold
input int      InpGoldSLPips         = 15;        // Gold Stop Loss (pips)
input int      InpGoldTPPips         = 25;        // Gold Take Profit (pips)
input int      InpGoldMaxSpread      = 50;        // Gold Max Spread (points)

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - EMA SETTINGS (SCALPING)                        |
//+------------------------------------------------------------------+
input group "=== EMA SETTINGS (SCALPING) ==="
input int      InpEMAFast         = 5;            // EMA Fast Period (lebih cepat)
input int      InpEMASlow         = 13;           // EMA Slow Period (lebih cepat)

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - RSI SETTINGS (SCALPING)                        |
//+------------------------------------------------------------------+
input group "=== RSI SETTINGS (SCALPING) ==="
input int      InpRSIPeriod       = 7;            // RSI Period (lebih sensitif)
input int      InpRSIBuyMin       = 40;           // RSI Buy Zone Min
input int      InpRSIBuyMax       = 70;           // RSI Buy Zone Max
input int      InpRSISellMin      = 30;           // RSI Sell Zone Min
input int      InpRSISellMax      = 60;           // RSI Sell Zone Max

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - MACD SETTINGS (SCALPING)                       |
//+------------------------------------------------------------------+
input group "=== MACD SETTINGS (SCALPING) ==="
input int      InpMACDFast        = 8;            // MACD Fast Period
input int      InpMACDSlow        = 17;           // MACD Slow Period
input int      InpMACDSignal      = 9;            // MACD Signal Period
input double   InpMACDMinHist     = 0.00001;      // MACD Min Histogram (lebih sensitif)

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - STOCHASTIC (SCALPING - AKTIF)                  |
//+------------------------------------------------------------------+
input group "=== STOCHASTIC SETTINGS (SCALPING) ==="
input bool     InpUseStochastic   = true;         // Use Stochastic Filter (aktif untuk scalping)
input int      InpStochK          = 5;            // %K Period (lebih cepat)
input int      InpStochD          = 3;            // %D Period
input int      InpStochSlowing    = 3;            // Slowing
input int      InpStochOversold   = 20;           // Oversold Level
input int      InpStochOverbought = 80;           // Overbought Level

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - TIME FILTER                                    |
//+------------------------------------------------------------------+
input group "=== TIME FILTER ==="
input bool     InpUseTimeFilter   = true;         // Use Time Filter (aktif untuk scalping)
input int      InpStartHour       = 8;            // Trading Start Hour (sesi London)
input int      InpEndHour         = 20;           // Trading End Hour
input bool     InpAvoidFriday     = true;         // Avoid Friday Trading (after 16:00)
input bool     InpAvoidNews       = false;        // Avoid News Time (placeholder)

//+------------------------------------------------------------------+
//| GLOBAL VARIABLES                                                  |
//+------------------------------------------------------------------+
CTrade trade;
CAccountInfo accountInfo;
CSymbolInfo symbolInfo;

int handleEMAFast, handleEMASlow, handleRSI, handleMACD, handleStochastic;

double emaFastBuffer[], emaSlowBuffer[], rsiBuffer[];
double macdMainBuffer[], macdSignalBuffer[];
double stochKBuffer[], stochDBuffer[];

double startingBalance, dailyStartBalance;
int dailyTradesCount, totalWins, totalLosses, dailyWins, dailyLosses;
double totalProfit, totalLoss, dailyProfit;
double dailyRealizedProfit = 0;
bool dailyProfitTargetReached = false;
datetime lastTradeDate;
bool dailySummarySent;
datetime lastDiagnosticTime;
datetime lastSummaryCheck;
ulong lastKnownTickets[];
int lastPositionCount = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    if(!symbolInfo.Name(_Symbol)) return INIT_FAILED;
    
    trade.SetExpertMagicNumber(InpMagicNumber);
    trade.SetDeviationInPoints(5);  // Lebih ketat untuk scalping
    trade.SetTypeFilling(ORDER_FILLING_IOC);
    
    startingBalance = AccountInfoDouble(ACCOUNT_BALANCE);
    dailyStartBalance = startingBalance;
    
    // Indicators menggunakan timeframe M5 untuk scalping
    handleEMAFast    = iMA(_Symbol, PERIOD_M5, InpEMAFast, 0, MODE_EMA, PRICE_CLOSE);
    handleEMASlow    = iMA(_Symbol, PERIOD_M5, InpEMASlow, 0, MODE_EMA, PRICE_CLOSE);
    handleRSI        = iRSI(_Symbol, PERIOD_M5, InpRSIPeriod, PRICE_CLOSE);
    handleMACD       = iMACD(_Symbol, PERIOD_M5, InpMACDFast, InpMACDSlow, InpMACDSignal, PRICE_CLOSE);
    handleStochastic = iStochastic(_Symbol, PERIOD_M5, InpStochK, InpStochD, InpStochSlowing, MODE_SMA, STO_LOWHIGH);
    
    if(handleEMAFast == INVALID_HANDLE || handleEMASlow == INVALID_HANDLE ||
       handleRSI == INVALID_HANDLE || handleMACD == INVALID_HANDLE || 
       handleStochastic == INVALID_HANDLE)
    {
        Print("Error creating indicators!");
        return INIT_FAILED;
    }
    
    ArraySetAsSeries(emaFastBuffer, true);
    ArraySetAsSeries(emaSlowBuffer, true);
    ArraySetAsSeries(rsiBuffer, true);
    ArraySetAsSeries(macdMainBuffer, true);
    ArraySetAsSeries(macdSignalBuffer, true);
    ArraySetAsSeries(stochKBuffer, true);
    ArraySetAsSeries(stochDBuffer, true);
    
    // Initialize ticket tracking
    UpdateKnownTickets();
    
    Print("🚀 RebelionFX SCALPING v1.00 Started on ", _Symbol, " [", InpAccountLabel, "]");
    
    if(InpUseTelegram && InpTelegramToken != "" && InpTelegramChatID != "")
    {
        string msg = "🚀 RebelionFX SCALPING Started\n";
        msg += "🏷️ Akun: " + InpAccountLabel + "\n";
        msg += "📊 Symbol: " + _Symbol + "\n";
        msg += "⏱️ Timeframe: M5\n";
        msg += "💰 Balance: $" + DoubleToString(startingBalance,2);
        SendTelegram(msg);
    }
    
    return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    IndicatorRelease(handleEMAFast);
    IndicatorRelease(handleEMASlow);
    IndicatorRelease(handleRSI);
    IndicatorRelease(handleMACD);
    IndicatorRelease(handleStochastic);
    Print("RebelionFX SCALPING Stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
    UpdateDailyTracking();
    ManagePositions();
    CheckClosedTrades();
    CheckDailySummary();
    
    if(!IsNewBar()) return;
    
    // Diagnostic setiap 2 menit untuk scalping
    PrintDiagnostics();
    
    if(IsMaxDailyLossReached() || IsMaxDrawdownReached()) 
    {
        Print("⛔ Trading stopped: Max daily loss or drawdown reached");
        return;
    }
    if(dailyTradesCount >= InpMaxTradesPerDay) 
    {
        Print("⛔ Max trades per day reached: ", dailyTradesCount, "/", InpMaxTradesPerDay);
        return;
    }
    if(IsDailyProfitTargetReached())
    {
        Print("🎯 Daily profit target reached: $", DoubleToString(dailyRealizedProfit, 2));
        return;
    }
    if(!IsSpreadOK()) 
    {
        long currentSpread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
        int maxSpread = IsGold() ? InpGoldMaxSpread : (int)InpMaxSpreadPoints;
        Print("⚠️ Spread too high for scalping: ", currentSpread, " > ", maxSpread);
        return;
    }
    if(InpUseTimeFilter && !IsTimeOK()) 
    {
        Print("⏰ Outside trading hours");
        return;
    }
    if(InpAvoidFriday && IsFridayEvening()) 
    {
        Print("📅 Friday - trading paused");
        return;
    }
    if(CountTrades() >= InpMaxOpenTrades) 
    {
        Print("📊 Max open trades reached: ", CountTrades(), "/", InpMaxOpenTrades);
        return;
    }
    if(!GetIndicators()) 
    {
        Print("❌ Failed to get indicator values");
        return;
    }
    
    int signal = GetSignal();
    if(signal == 1) 
    { 
        Print("🟢 SCALP BUY SIGNAL! Opening position...");
        if(OpenBuy()) dailyTradesCount++; 
    }
    else if(signal == -1) 
    { 
        Print("🔴 SCALP SELL SIGNAL! Opening position...");
        if(OpenSell()) dailyTradesCount++; 
    }
}

//+------------------------------------------------------------------+
//| Helper Functions                                                  |
//+------------------------------------------------------------------+
void UpdateDailyTracking()
{
    MqlDateTime dt;
    TimeToStruct(TimeCurrent(), dt);
    datetime today = StringToTime(StringFormat("%04d.%02d.%02d", dt.year, dt.mon, dt.day));
    if(today != lastTradeDate)
    {
        lastTradeDate = today;
        dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
        dailyTradesCount = dailyWins = dailyLosses = 0;
        dailyProfit = 0;
        dailyRealizedProfit = 0;
        dailyProfitTargetReached = false;
        dailySummarySent = false;
    }
}

bool IsNewBar()
{
    static datetime lastBar = 0;
    datetime curBar = iTime(_Symbol, PERIOD_M5, 0);  // M5 untuk scalping
    if(curBar != lastBar) { lastBar = curBar; return true; }
    return false;
}

bool IsMaxDailyLossReached()
{
    double loss = (dailyStartBalance - AccountInfoDouble(ACCOUNT_BALANCE)) / dailyStartBalance * 100;
    return loss >= InpMaxDailyLossPercent;
}

bool IsMaxDrawdownReached()
{
    double dd = (startingBalance - AccountInfoDouble(ACCOUNT_EQUITY)) / startingBalance * 100;
    return dd >= InpMaxDrawdownPercent;
}

bool IsDailyProfitTargetReached()
{
    if(!InpStopOnProfitTarget || InpDailyProfitTarget <= 0) return false;
    if(dailyProfitTargetReached) return true;
    
    if(dailyRealizedProfit >= InpDailyProfitTarget)
    {
        dailyProfitTargetReached = true;
        
        if(InpUseTelegram)
        {
            string msg = "🎯 SCALPING PROFIT TARGET REACHED!\n";
            msg += "━━━━━━━━━━━━━━━━━━\n";
            msg += "🏷️ Akun: " + InpAccountLabel + "\n";
            msg += "📊 Symbol: " + _Symbol + "\n";
            msg += "💰 Profit: $" + DoubleToString(dailyRealizedProfit, 2) + "\n";
            msg += "🎯 Target: $" + DoubleToString(InpDailyProfitTarget, 2) + "\n";
            msg += "━━━━━━━━━━━━━━━━━━\n";
            msg += "⏸️ Scalping STOPPED untuk hari ini";
            SendTelegram(msg);
        }
        return true;
    }
    return false;
}

bool IsSpreadOK()
{
    long currentSpread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
    int maxSpread = IsGold() ? InpGoldMaxSpread : (int)InpMaxSpreadPoints;
    return currentSpread <= maxSpread;
}

bool IsTimeOK()
{
    MqlDateTime dt;
    TimeToStruct(TimeCurrent(), dt);
    return dt.hour >= InpStartHour && dt.hour < InpEndHour;
}

bool IsFridayEvening()
{
    MqlDateTime dt;
    TimeToStruct(TimeCurrent(), dt);
    return dt.day_of_week == 5 && dt.hour >= 16;  // Lebih awal untuk scalping
}

int CountTrades()
{
    int count = 0;
    for(int i = PositionsTotal()-1; i >= 0; i--)
    {
        if(PositionSelectByTicket(PositionGetTicket(i)))
            if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber && PositionGetString(POSITION_SYMBOL) == _Symbol)
                count++;
    }
    return count;
}

void ManagePositions()
{
    for(int i = PositionsTotal()-1; i >= 0; i--)
    {
        ulong ticket = PositionGetTicket(i);
        if(!PositionSelectByTicket(ticket)) continue;
        if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
        if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
        
        double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
        double sl = PositionGetDouble(POSITION_SL);
        double tp = PositionGetDouble(POSITION_TP);
        ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
        double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
        double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
        double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
        
        // Break Even (lebih cepat untuk scalping)
        if(InpUseBreakEven)
        {
            double bePips = InpBreakEvenPips * point * 10;
            if(type == POSITION_TYPE_BUY && bid >= openPrice + bePips && sl < openPrice)
                trade.PositionModify(ticket, openPrice + point*5, tp);
            if(type == POSITION_TYPE_SELL && ask <= openPrice - bePips && (sl > openPrice || sl == 0))
                trade.PositionModify(ticket, openPrice - point*5, tp);
        }
        
        // Trailing Stop (lebih ketat untuk scalping)
        if(InpUseTrailingStop)
        {
            double trail = InpTrailingStopPips * point * 10;
            double step = InpTrailingStepPips * point * 10;
            if(type == POSITION_TYPE_BUY)
            {
                double newSL = bid - trail;
                if(newSL > sl + step && newSL > openPrice)
                    trade.PositionModify(ticket, newSL, tp);
            }
            if(type == POSITION_TYPE_SELL)
            {
                double newSL = ask + trail;
                if((newSL < sl - step || sl == 0) && newSL < openPrice)
                    trade.PositionModify(ticket, newSL, tp);
            }
        }
    }
}

bool GetIndicators()
{
    if(CopyBuffer(handleEMAFast, 0, 0, 3, emaFastBuffer) < 3) return false;
    if(CopyBuffer(handleEMASlow, 0, 0, 3, emaSlowBuffer) < 3) return false;
    if(CopyBuffer(handleRSI, 0, 0, 2, rsiBuffer) < 2) return false;
    if(CopyBuffer(handleMACD, 0, 0, 3, macdMainBuffer) < 3) return false;
    if(CopyBuffer(handleMACD, 1, 0, 3, macdSignalBuffer) < 3) return false;
    if(InpUseStochastic)
    {
        if(CopyBuffer(handleStochastic, 0, 0, 3, stochKBuffer) < 3) return false;
        if(CopyBuffer(handleStochastic, 1, 0, 3, stochDBuffer) < 3) return false;
    }
    return true;
}

int GetSignal()
{
    double emaFast = emaFastBuffer[1], emaSlow = emaSlowBuffer[1];
    double rsi = rsiBuffer[1];
    double macdHist = macdMainBuffer[1] - macdSignalBuffer[1];
    double prevMacdHist = macdMainBuffer[2] - macdSignalBuffer[2];
    
    // MACD harus cukup kuat
    if(MathAbs(macdHist) < InpMACDMinHist) return 0;
    
    // Stochastic filter untuk scalping
    bool stochBuy = true, stochSell = true;
    if(InpUseStochastic)
    {
        // Stochastic crossover untuk konfirmasi
        stochBuy = stochKBuffer[1] > stochDBuffer[1] && stochKBuffer[1] < InpStochOverbought;
        stochSell = stochKBuffer[1] < stochDBuffer[1] && stochKBuffer[1] > InpStochOversold;
    }
    
    // BUY Signal: EMA crossover + RSI + MACD + Stochastic
    if(emaFast > emaSlow && 
       rsi >= InpRSIBuyMin && rsi <= InpRSIBuyMax && 
       macdHist > 0 && macdHist > prevMacdHist &&  // MACD momentum naik
       stochBuy)
        return 1;
    
    // SELL Signal
    if(emaFast < emaSlow && 
       rsi >= InpRSISellMin && rsi <= InpRSISellMax && 
       macdHist < 0 && macdHist < prevMacdHist &&  // MACD momentum turun
       stochSell)
        return -1;
    
    return 0;
}

//+------------------------------------------------------------------+
//| Print Diagnostics                                                 |
//+------------------------------------------------------------------+
void PrintDiagnostics()
{
    if(TimeCurrent() - lastDiagnosticTime < 120) return;  // Setiap 2 menit
    lastDiagnosticTime = TimeCurrent();
    
    if(!GetIndicators()) return;
    
    double emaFast = emaFastBuffer[1], emaSlow = emaSlowBuffer[1];
    double rsi = rsiBuffer[1];
    double macdHist = macdMainBuffer[1] - macdSignalBuffer[1];
    long currentSpread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
    
    Print("═══════════════════════════════════════════════════");
    Print("📊 SCALPING DIAGNOSTIC - ", _Symbol, " @ ", TimeToString(TimeCurrent()));
    Print("═══════════════════════════════════════════════════");
    Print("📈 EMA", InpEMAFast, ": ", DoubleToString(emaFast, 2), " | EMA", InpEMASlow, ": ", DoubleToString(emaSlow, 2));
    Print("📉 RSI: ", DoubleToString(rsi, 1), " | MACD Hist: ", DoubleToString(macdHist, 6));
    if(InpUseStochastic)
        Print("📊 Stoch K: ", DoubleToString(stochKBuffer[1], 1), " | D: ", DoubleToString(stochDBuffer[1], 1));
    Print("💱 Spread: ", currentSpread, " | Daily Trades: ", dailyTradesCount, "/", InpMaxTradesPerDay);
    Print("💰 Daily P/L: $", DoubleToString(dailyRealizedProfit, 2), " / Target: $", DoubleToString(InpDailyProfitTarget, 2));
    Print("═══════════════════════════════════════════════════");
}

bool IsGold() { return StringFind(_Symbol, "XAU") >= 0 || StringFind(_Symbol, "GOLD") >= 0; }

double CalcLot(double slDist)
{
    if(!InpUseAutoLot || slDist <= 0) return InpLotSize;
    double risk = AccountInfoDouble(ACCOUNT_BALANCE) * InpRiskPercent / 100;
    double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
    if(tickVal <= 0 || tickSize <= 0) return InpLotSize;
    double lot = risk / (slDist / tickSize * tickVal);
    double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
    lot = MathFloor(lot / step) * step;
    return MathMax(SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN), MathMin(SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX), lot));
}

void CalcSLTP(bool isBuy, double price, double &sl, double &tp)
{
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    int slPips = IsGold() ? InpGoldSLPips : InpSLPips;
    int tpPips = IsGold() ? InpGoldTPPips : InpTPPips;
    
    double slDist = slPips * point * 10;
    double tpDist = tpPips * point * 10;
    
    if(isBuy) { sl = price - slDist; tp = price + tpDist; }
    else { sl = price + slDist; tp = price - tpDist; }
    
    sl = NormalizeDouble(sl, _Digits);
    tp = NormalizeDouble(tp, _Digits);
}

bool OpenBuy()
{
    double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double sl, tp;
    CalcSLTP(true, price, sl, tp);
    double lot = CalcLot(price - sl);
    if(trade.Buy(lot, _Symbol, price, sl, tp, InpTradeComment))
    {
        Print("✅ SCALP BUY ", lot, " @ ", price);
        if(InpUseTelegram && InpNotifyOnOpen)
        {
            string msg = "📈 SCALP BUY " + _Symbol + "\n";
            msg += "🏷️ Akun: " + InpAccountLabel + "\n";
            msg += "📊 Lot: " + DoubleToString(lot,2) + "\n";
            msg += "💰 Entry: " + DoubleToString(price,_Digits) + "\n";
            msg += "🛑 SL: " + DoubleToString(sl,_Digits) + "\n";
            msg += "🎯 TP: " + DoubleToString(tp,_Digits);
            SendTelegram(msg);
        }
        UpdateKnownTickets();
        return true;
    }
    return false;
}

bool OpenSell()
{
    double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double sl, tp;
    CalcSLTP(false, price, sl, tp);
    double lot = CalcLot(sl - price);
    if(trade.Sell(lot, _Symbol, price, sl, tp, InpTradeComment))
    {
        Print("✅ SCALP SELL ", lot, " @ ", price);
        if(InpUseTelegram && InpNotifyOnOpen)
        {
            string msg = "📉 SCALP SELL " + _Symbol + "\n";
            msg += "🏷️ Akun: " + InpAccountLabel + "\n";
            msg += "📊 Lot: " + DoubleToString(lot,2) + "\n";
            msg += "💰 Entry: " + DoubleToString(price,_Digits) + "\n";
            msg += "🛑 SL: " + DoubleToString(sl,_Digits) + "\n";
            msg += "🎯 TP: " + DoubleToString(tp,_Digits);
            SendTelegram(msg);
        }
        UpdateKnownTickets();
        return true;
    }
    return false;
}

//+------------------------------------------------------------------+
//| Check for Closed Trades                                           |
//+------------------------------------------------------------------+
void CheckClosedTrades()
{
    if(!InpUseTelegram || !InpNotifyOnClose) return;
    
    int currentCount = 0;
    ulong currentTickets[];
    
    for(int i = PositionsTotal()-1; i >= 0; i--)
    {
        ulong ticket = PositionGetTicket(i);
        if(!PositionSelectByTicket(ticket)) continue;
        if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
        if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
        
        ArrayResize(currentTickets, currentCount + 1);
        currentTickets[currentCount] = ticket;
        currentCount++;
    }
    
    for(int i = 0; i < ArraySize(lastKnownTickets); i++)
    {
        ulong checkTicket = lastKnownTickets[i];
        bool found = false;
        
        for(int j = 0; j < currentCount; j++)
        {
            if(currentTickets[j] == checkTicket)
            {
                found = true;
                break;
            }
        }
        
        if(!found)
        {
            NotifyClosedTrade(checkTicket);
        }
    }
    
    ArrayResize(lastKnownTickets, currentCount);
    for(int i = 0; i < currentCount; i++)
        lastKnownTickets[i] = currentTickets[i];
    lastPositionCount = currentCount;
}

void NotifyClosedTrade(ulong ticket)
{
    datetime fromTime = TimeCurrent() - 86400;
    datetime toTime = TimeCurrent() + 3600;
    
    if(!HistorySelect(fromTime, toTime)) return;
    
    int totalDeals = HistoryDealsTotal();
    for(int i = totalDeals - 1; i >= 0; i--)
    {
        ulong dealTicket = HistoryDealGetTicket(i);
        if(dealTicket == 0) continue;
        
        long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
        string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
        ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
        
        if(magic != InpMagicNumber || symbol != _Symbol) continue;
        if(entry != DEAL_ENTRY_OUT) continue;
        
        double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
        double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
        double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
        ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
        
        if(profit > 0)
        {
            totalWins++;
            dailyWins++;
            totalProfit += profit;
            dailyProfit += profit;
        }
        else
        {
            totalLosses++;
            dailyLosses++;
            totalLoss += MathAbs(profit);
            dailyProfit += profit;
        }
        
        dailyRealizedProfit += profit;
        
        string closeReason = profit > 0 ? "🎯 TP HIT" : "🛑 SL HIT";
        string emoji = profit > 0 ? "✅" : "❌";
        string profitStr = profit >= 0 ? "+$" + DoubleToString(profit, 2) : "-$" + DoubleToString(MathAbs(profit), 2);
        
        string msg = emoji + " SCALP CLOSED\n";
        msg += "🏷️ Akun: " + InpAccountLabel + "\n";
        msg += "📊 " + _Symbol + "\n";
        msg += "📊 Lot: " + DoubleToString(volume, 2) + "\n";
        msg += closeReason + "\n";
        msg += "💵 P/L: " + profitStr + "\n";
        msg += "💰 Balance: $" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2);
        
        SendTelegram(msg);
        Print(emoji, " Scalp closed: ", profitStr);
        break;
    }
}

//+------------------------------------------------------------------+
//| Daily Summary                                                     |
//+------------------------------------------------------------------+
void CheckDailySummary()
{
    if(!InpUseTelegram || !InpNotifyDailySummary) return;
    
    MqlDateTime dt;
    TimeToStruct(TimeGMT(), dt);
    
    if(TimeCurrent() - lastSummaryCheck < 60) return;
    lastSummaryCheck = TimeCurrent();
    
    if(dt.hour == InpSummaryHour && !dailySummarySent)
    {
        SendDailySummary();
        dailySummarySent = true;
    }
}

void SendDailySummary()
{
    double currentBalance = AccountInfoDouble(ACCOUNT_BALANCE);
    double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
    double dailyPL = currentBalance - dailyStartBalance;
    double dailyPLPercent = dailyStartBalance > 0 ? (dailyPL / dailyStartBalance * 100) : 0;
    
    int totalDailyTrades = dailyWins + dailyLosses;
    double winRate = totalDailyTrades > 0 ? ((double)dailyWins / totalDailyTrades * 100) : 0;
    
    string emoji = dailyPL >= 0 ? "📈" : "📉";
    string plStr = dailyPL >= 0 ? "+$" + DoubleToString(dailyPL, 2) : "-$" + DoubleToString(MathAbs(dailyPL), 2);
    string plPctStr = dailyPL >= 0 ? "+" + DoubleToString(dailyPLPercent, 2) + "%" : DoubleToString(dailyPLPercent, 2) + "%";
    
    string msg = "📊 SCALPING DAILY SUMMARY\n";
    msg += "━━━━━━━━━━━━━━━━━━\n";
    msg += "🏷️ Akun: " + InpAccountLabel + "\n";
    msg += "📈 Symbol: " + _Symbol + "\n";
    msg += "⏱️ Mode: SCALPING M5\n";
    msg += "━━━━━━━━━━━━━━━━━━\n";
    msg += emoji + " P/L: " + plStr + " (" + plPctStr + ")\n";
    msg += "🎯 Win: " + IntegerToString(dailyWins) + " | Loss: " + IntegerToString(dailyLosses) + "\n";
    msg += "📊 Total Trades: " + IntegerToString(totalDailyTrades) + "\n";
    msg += "🏆 Win Rate: " + DoubleToString(winRate, 1) + "%\n";
    msg += "━━━━━━━━━━━━━━━━━━\n";
    msg += "💰 Balance: $" + DoubleToString(currentBalance, 2);
    
    SendTelegram(msg);
}

void UpdateKnownTickets()
{
    int count = 0;
    ArrayResize(lastKnownTickets, 0);
    
    for(int i = PositionsTotal()-1; i >= 0; i--)
    {
        ulong ticket = PositionGetTicket(i);
        if(!PositionSelectByTicket(ticket)) continue;
        if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
        if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
        
        ArrayResize(lastKnownTickets, count + 1);
        lastKnownTickets[count] = ticket;
        count++;
    }
    lastPositionCount = count;
}

bool SendTelegram(string msg)
{
    if(InpTelegramToken == "" || InpTelegramChatID == "") return false;
    string url = "https://api.telegram.org/bot" + InpTelegramToken + "/sendMessage";
    string post = "chat_id=" + InpTelegramChatID + "&text=" + msg;
    char data[], result[];
    string headers = "Content-Type: application/x-www-form-urlencoded; charset=utf-8\r\n";
    int len = StringToCharArray(post, data, 0, WHOLE_ARRAY, CP_UTF8);
    ArrayResize(data, len - 1);
    string resHeaders;
    int res = WebRequest("POST", url, headers, 5000, data, result, resHeaders);
    return res != -1;
}

void OnChartEvent(const int id, const long& lparam, const double& dparam, const string& sparam)
{
    if(id == CHARTEVENT_KEYDOWN)
    {
        if(lparam == 'B') { Print("🔵 Manual SCALP BUY"); OpenBuy(); }
        if(lparam == 'S') { Print("🔴 Manual SCALP SELL"); OpenSell(); }
        if(lparam == 'T') 
        {
            if(SendTelegram("🔔 Test SCALPING EA\nSymbol: " + _Symbol))
                Print("✅ Telegram OK");
            else
                Print("❌ Telegram failed");
        }
        if(lparam == 'R')
        {
            Print("╔════════════════════════════════════╗");
            Print("║    SCALPING STATISTICS             ║");
            Print("╠════════════════════════════════════╣");
            Print("║ Wins: ", totalWins, " | Losses: ", totalLosses);
            Print("║ Today: ", dailyTradesCount, " trades");
            Print("║ Daily P/L: $", DoubleToString(dailyRealizedProfit, 2));
            Print("╚════════════════════════════════════╝");
        }
        if(lparam == 'H')
        {
            Print("╔════════════════════════════════════╗");
            Print("║  SCALPING KEYBOARD SHORTCUTS       ║");
            Print("╠════════════════════════════════════╣");
            Print("║ B = Buy | S = Sell | T = Test TG   ║");
            Print("║ R = Stats | H = Help               ║");
            Print("╚════════════════════════════════════╝");
        }
    }
}
//+------------------------------------------------------------------+
