//+------------------------------------------------------------------+
//|                                           RebelionFX_EA_Pro.mq5 |
//|                        Copyright 2026, Rebelion Digital FX      |
//|     Auto Trading EA - Multi-Indicator + Risk + Telegram         |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Rebelion Digital FX"
#property link      "https://github.com/rebelion16"
#property version   "3.00"
#property description "EA berbasis EMA + RSI + MACD + ADX + Bollinger + Stochastic"
#property description "Dengan Advanced Risk Management + Telegram Notifikasi"
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
input bool     InpNotifyOnOpen     = true;        // Notify on Trade Open
input bool     InpNotifyOnClose    = true;        // Notify on Trade Close
input bool     InpNotifyDailySummary = true;      // Send Daily Summary
input int      InpSummaryHour      = 22;          // Daily Summary Hour (server time)

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - TRADING SETTINGS                               |
//+------------------------------------------------------------------+
input group "=== TRADING SETTINGS ==="
input double   InpLotSize          = 0.01;        // Lot Size (0 = Auto Risk)
input bool     InpUseAutoLot       = true;        // Use Auto Lot (Risk-Based)
input int      InpMagicNumber      = 123456;      // Magic Number
input string   InpTradeComment     = "RebelionFX"; // Trade Comment
input int      InpMaxTradesPerDay  = 3;           // Max Trades per Day
input int      InpMaxOpenTrades    = 1;           // Max Open Trades per Symbol

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - RISK MANAGEMENT                                |
//+------------------------------------------------------------------+
input group "=== RISK MANAGEMENT (BEST PRACTICE) ==="
input double   InpRiskPercent       = 1.0;        // Risk % per Trade (1-2% recommended)
input double   InpMaxDailyLossPercent = 5.0;      // Max Daily Loss % (stop trading)
input double   InpMaxDrawdownPercent  = 10.0;     // Max Drawdown % (emergency stop)
input double   InpMaxSpreadPoints     = 20;       // Max Spread (points) to trade
input bool     InpUseBreakEven        = true;     // Use Break Even
input int      InpBreakEvenPips       = 20;       // Break Even Trigger (pips)
input bool     InpUseTrailingStop     = true;     // Use Trailing Stop
input int      InpTrailingStopPips    = 30;       // Trailing Stop (pips)
input int      InpTrailingStepPips    = 10;       // Trailing Step (pips)

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - SL/TP SETTINGS                                 |
//+------------------------------------------------------------------+
input group "=== STOP LOSS & TAKE PROFIT ==="
input double   InpStopLossPercent    = 0.8;       // Stop Loss % (forex biasa)
input double   InpTakeProfitPercent  = 1.6;       // Take Profit % (forex biasa)
input double   InpRiskRewardRatio    = 2.0;       // Risk:Reward Ratio (untuk auto TP)

input group "=== XAU/USD SPECIAL SETTINGS ==="
input bool     InpUseGoldSettings    = true;      // Gunakan setting khusus Gold
input int      InpGoldSLPips         = 70;        // Gold Stop Loss (pips)
input int      InpGoldTPPips         = 150;       // Gold Take Profit (pips)
input int      InpGoldMinADX         = 25;        // Gold Minimum ADX

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - EMA SETTINGS                                   |
//+------------------------------------------------------------------+
input group "=== EMA SETTINGS ==="
input int      InpEMAFast         = 9;            // EMA Fast Period
input int      InpEMASlow         = 21;           // EMA Slow Period

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - RSI SETTINGS                                   |
//+------------------------------------------------------------------+
input group "=== RSI SETTINGS ==="
input int      InpRSIPeriod       = 14;           // RSI Period
input int      InpRSIBuyMin       = 35;           // RSI Buy Zone Min
input int      InpRSIBuyMax       = 65;           // RSI Buy Zone Max
input int      InpRSISellMin      = 35;           // RSI Sell Zone Min
input int      InpRSISellMax      = 65;           // RSI Sell Zone Max

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - MACD SETTINGS                                  |
//+------------------------------------------------------------------+
input group "=== MACD SETTINGS ==="
input int      InpMACDFast        = 12;           // MACD Fast Period
input int      InpMACDSlow        = 26;           // MACD Slow Period
input int      InpMACDSignal      = 9;            // MACD Signal Period
input double   InpMACDMinHist     = 0.00005;      // MACD Min Histogram

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - ADX SETTINGS                                   |
//+------------------------------------------------------------------+
input group "=== ADX SETTINGS ==="
input int      InpADXPeriod       = 14;           // ADX Period
input int      InpADXMinStrength  = 20;           // ADX Minimum Strength

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - BOLLINGER BANDS                                |
//+------------------------------------------------------------------+
input group "=== BOLLINGER BANDS SETTINGS ==="
input bool     InpUseBollinger    = true;         // Use Bollinger Bands Filter
input int      InpBBPeriod        = 20;           // Bollinger Period
input double   InpBBDeviation     = 2.0;          // Bollinger Deviation
input ENUM_APPLIED_PRICE InpBBPrice = PRICE_CLOSE; // Bollinger Applied Price

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - STOCHASTIC                                     |
//+------------------------------------------------------------------+
input group "=== STOCHASTIC SETTINGS ==="
input bool     InpUseStochastic   = true;         // Use Stochastic Filter
input int      InpStochK          = 14;           // %K Period
input int      InpStochD          = 3;            // %D Period
input int      InpStochSlowing    = 3;            // Slowing
input int      InpStochOversold   = 20;           // Oversold Level
input int      InpStochOverbought = 80;           // Overbought Level

//+------------------------------------------------------------------+
//| INPUT PARAMETERS - TIME FILTER                                    |
//+------------------------------------------------------------------+
input group "=== TIME FILTER ==="
input bool     InpUseTimeFilter   = false;        // Use Time Filter
input int      InpStartHour       = 8;            // Trading Start Hour
input int      InpEndHour         = 20;           // Trading End Hour
input bool     InpAvoidFriday     = true;         // Avoid Friday Trading (after 18:00)

//+------------------------------------------------------------------+
//| GLOBAL VARIABLES                                                  |
//+------------------------------------------------------------------+
CTrade trade;
CAccountInfo accountInfo;
CSymbolInfo symbolInfo;

int handleEMAFast, handleEMASlow, handleRSI, handleMACD, handleADX;
int handleBollinger, handleStochastic;

double emaFastBuffer[], emaSlowBuffer[], rsiBuffer[];
double macdMainBuffer[], macdSignalBuffer[];
double adxBuffer[], adxPlusBuffer[], adxMinusBuffer[];
double bbUpperBuffer[], bbMiddleBuffer[], bbLowerBuffer[];
double stochKBuffer[], stochDBuffer[];

double startingBalance, dailyStartBalance;
int dailyTradesCount, totalWins, totalLosses, dailyWins, dailyLosses;
double totalProfit, totalLoss, dailyProfit;
datetime lastTradeDate;
bool dailySummarySent;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    if(!symbolInfo.Name(_Symbol)) return INIT_FAILED;
    
    trade.SetExpertMagicNumber(InpMagicNumber);
    trade.SetDeviationInPoints(10);
    trade.SetTypeFilling(ORDER_FILLING_IOC);
    
    startingBalance = AccountInfoDouble(ACCOUNT_BALANCE);
    dailyStartBalance = startingBalance;
    
    handleEMAFast   = iMA(_Symbol, PERIOD_H1, InpEMAFast, 0, MODE_EMA, PRICE_CLOSE);
    handleEMASlow   = iMA(_Symbol, PERIOD_H1, InpEMASlow, 0, MODE_EMA, PRICE_CLOSE);
    handleRSI       = iRSI(_Symbol, PERIOD_H1, InpRSIPeriod, PRICE_CLOSE);
    handleMACD      = iMACD(_Symbol, PERIOD_H1, InpMACDFast, InpMACDSlow, InpMACDSignal, PRICE_CLOSE);
    handleADX       = iADX(_Symbol, PERIOD_H1, InpADXPeriod);
    handleBollinger = iBands(_Symbol, PERIOD_H1, InpBBPeriod, 0, InpBBDeviation, InpBBPrice);
    handleStochastic = iStochastic(_Symbol, PERIOD_H1, InpStochK, InpStochD, InpStochSlowing, MODE_SMA, STO_LOWHIGH);
    
    if(handleEMAFast == INVALID_HANDLE || handleEMASlow == INVALID_HANDLE ||
       handleRSI == INVALID_HANDLE || handleMACD == INVALID_HANDLE || 
       handleADX == INVALID_HANDLE || handleBollinger == INVALID_HANDLE ||
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
    ArraySetAsSeries(adxBuffer, true);
    ArraySetAsSeries(adxPlusBuffer, true);
    ArraySetAsSeries(adxMinusBuffer, true);
    ArraySetAsSeries(bbUpperBuffer, true);
    ArraySetAsSeries(bbMiddleBuffer, true);
    ArraySetAsSeries(bbLowerBuffer, true);
    ArraySetAsSeries(stochKBuffer, true);
    ArraySetAsSeries(stochDBuffer, true);
    
    Print("🚀 RebelionFX EA v3.00 Started on ", _Symbol);
    
    if(InpUseTelegram && InpTelegramToken != "" && InpTelegramChatID != "")
        SendTelegram("🚀 RebelionFX EA Started\nSymbol: " + _Symbol + "\nBalance: $" + DoubleToString(startingBalance,2));
    
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
    IndicatorRelease(handleADX);
    IndicatorRelease(handleBollinger);
    IndicatorRelease(handleStochastic);
    Print("RebelionFX EA Stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
    UpdateDailyTracking();
    ManagePositions();
    
    if(!IsNewBar()) return;
    if(IsMaxDailyLossReached() || IsMaxDrawdownReached()) return;
    if(dailyTradesCount >= InpMaxTradesPerDay) return;
    if(!IsSpreadOK()) return;
    if(InpUseTimeFilter && !IsTimeOK()) return;
    if(InpAvoidFriday && IsFridayEvening()) return;
    if(CountTrades() >= InpMaxOpenTrades) return;
    if(!GetIndicators()) return;
    
    int signal = GetSignal();
    if(signal == 1) { if(OpenBuy()) dailyTradesCount++; }
    else if(signal == -1) { if(OpenSell()) dailyTradesCount++; }
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
        dailySummarySent = false;
    }
}

bool IsNewBar()
{
    static datetime lastBar = 0;
    datetime curBar = iTime(_Symbol, PERIOD_H1, 0);
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

bool IsSpreadOK()
{
    return SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) <= InpMaxSpreadPoints;
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
    return dt.day_of_week == 5 && dt.hour >= 18;
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
        
        // Break Even
        if(InpUseBreakEven)
        {
            double bePips = InpBreakEvenPips * point * 10;
            if(type == POSITION_TYPE_BUY && bid >= openPrice + bePips && sl < openPrice)
                trade.PositionModify(ticket, openPrice + point*10, tp);
            if(type == POSITION_TYPE_SELL && ask <= openPrice - bePips && (sl > openPrice || sl == 0))
                trade.PositionModify(ticket, openPrice - point*10, tp);
        }
        
        // Trailing Stop
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
    if(CopyBuffer(handleMACD, 0, 0, 2, macdMainBuffer) < 2) return false;
    if(CopyBuffer(handleMACD, 1, 0, 2, macdSignalBuffer) < 2) return false;
    if(CopyBuffer(handleADX, 0, 0, 2, adxBuffer) < 2) return false;
    if(CopyBuffer(handleADX, 1, 0, 2, adxPlusBuffer) < 2) return false;
    if(CopyBuffer(handleADX, 2, 0, 2, adxMinusBuffer) < 2) return false;
    if(InpUseBollinger)
    {
        if(CopyBuffer(handleBollinger, 0, 0, 2, bbMiddleBuffer) < 2) return false;
        if(CopyBuffer(handleBollinger, 1, 0, 2, bbUpperBuffer) < 2) return false;
        if(CopyBuffer(handleBollinger, 2, 0, 2, bbLowerBuffer) < 2) return false;
    }
    if(InpUseStochastic)
    {
        if(CopyBuffer(handleStochastic, 0, 0, 3, stochKBuffer) < 3) return false;
        if(CopyBuffer(handleStochastic, 1, 0, 3, stochDBuffer) < 3) return false;
    }
    return true;
}

int GetSignal()
{
    double ema9 = emaFastBuffer[1], ema21 = emaSlowBuffer[1];
    double rsi = rsiBuffer[1];
    double macdHist = macdMainBuffer[1] - macdSignalBuffer[1];
    double adx = adxBuffer[1], adxPlus = adxPlusBuffer[1], adxMinus = adxMinusBuffer[1];
    double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    
    int minADX = (IsGold() && InpUseGoldSettings) ? InpGoldMinADX : InpADXMinStrength;
    if(adx < minADX || MathAbs(macdHist) < InpMACDMinHist) return 0;
    
    bool bbBuy = true, bbSell = true;
    if(InpUseBollinger) { bbBuy = price <= bbMiddleBuffer[1]; bbSell = price >= bbMiddleBuffer[1]; }
    
    bool stochBuy = true, stochSell = true;
    if(InpUseStochastic)
    {
        stochBuy = stochKBuffer[1] < 50;
        stochSell = stochKBuffer[1] > 50;
    }
    
    // BUY
    if(ema9 > ema21 && adxPlus > adxMinus && rsi >= InpRSIBuyMin && rsi <= InpRSIBuyMax && macdHist > 0 && bbBuy && stochBuy)
        return 1;
    
    // SELL
    if(ema9 < ema21 && adxMinus > adxPlus && rsi >= InpRSISellMin && rsi <= InpRSISellMax && macdHist < 0 && bbSell && stochSell)
        return -1;
    
    return 0;
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
    if(IsGold() && InpUseGoldSettings)
    {
        double pip = 0.01;
        if(isBuy) { sl = price - InpGoldSLPips*pip; tp = price + InpGoldTPPips*pip; }
        else { sl = price + InpGoldSLPips*pip; tp = price - InpGoldTPPips*pip; }
    }
    else
    {
        double slPct = InpStopLossPercent/100, tpPct = InpTakeProfitPercent/100;
        if(isBuy) { sl = price*(1-slPct); tp = price*(1+tpPct); }
        else { sl = price*(1+slPct); tp = price*(1-tpPct); }
    }
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
        Print("✅ BUY ", lot, " @ ", price);
        if(InpUseTelegram && InpNotifyOnOpen)
            SendTelegram("📈 BUY " + _Symbol + "\nLot: " + DoubleToString(lot,2) + "\nEntry: " + DoubleToString(price,_Digits));
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
        Print("✅ SELL ", lot, " @ ", price);
        if(InpUseTelegram && InpNotifyOnOpen)
            SendTelegram("📉 SELL " + _Symbol + "\nLot: " + DoubleToString(lot,2) + "\nEntry: " + DoubleToString(price,_Digits));
        return true;
    }
    return false;
}

bool SendTelegram(string msg)
{
    if(InpTelegramToken == "" || InpTelegramChatID == "") return false;
    string url = "https://api.telegram.org/bot" + InpTelegramToken + "/sendMessage";
    string post = "chat_id=" + InpTelegramChatID + "&text=" + msg;
    char data[], result[];
    string headers = "Content-Type: application/x-www-form-urlencoded\r\n";
    StringToCharArray(post, data);
    string resHeaders;
    int res = WebRequest("POST", url, headers, 5000, data, result, resHeaders);
    return res != -1;
}

void OnChartEvent(const int id, const long& lparam, const double& dparam, const string& sparam)
{
    if(id == CHARTEVENT_KEYDOWN)
    {
        // B = Manual BUY
        if(lparam == 'B') 
        {
            Print("🔵 Manual BUY triggered by keyboard");
            OpenBuy();
        }
        
        // S = Manual SELL
        if(lparam == 'S') 
        {
            Print("🔴 Manual SELL triggered by keyboard");
            OpenSell();
        }
        
        // T = Test Telegram
        if(lparam == 'T') 
        {
            Print("📱 Testing Telegram...");
            if(SendTelegram("🔔 Test from RebelionFX EA\nSymbol: " + _Symbol + "\nTime: " + TimeToString(TimeCurrent())))
                Print("✅ Telegram test sent successfully!");
            else
                Print("❌ Telegram test failed. Check token/chat ID.");
        }
        
        // R = Show Statistics
        if(lparam == 'R')
        {
            int total = totalWins + totalLosses;
            double winRate = total > 0 ? (double)totalWins / total * 100 : 0;
            double netProfit = totalProfit - totalLoss;
            
            Print("╔════════════════════════════════════╗");
            Print("║      REBELIONFX STATISTICS         ║");
            Print("╠════════════════════════════════════╣");
            Print("║ Total Trades: ", total);
            Print("║ Wins: ", totalWins, " | Losses: ", totalLosses);
            Print("║ Win Rate: ", DoubleToString(winRate, 1), "%");
            Print("║ Net Profit: $", DoubleToString(netProfit, 2));
            Print("║ Balance: $", DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2));
            Print("║ Equity: $", DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2));
            Print("╚════════════════════════════════════╝");
        }
        
        // I = Show Indicators
        if(lparam == 'I')
        {
            if(GetIndicators())
            {
                Print("╔════════════════════════════════════╗");
                Print("║      CURRENT INDICATORS            ║");
                Print("╠════════════════════════════════════╣");
                Print("║ EMA 9: ", DoubleToString(emaFastBuffer[1], 5));
                Print("║ EMA 21: ", DoubleToString(emaSlowBuffer[1], 5));
                Print("║ RSI: ", DoubleToString(rsiBuffer[1], 1));
                Print("║ MACD Hist: ", DoubleToString(macdMainBuffer[1] - macdSignalBuffer[1], 6));
                Print("║ ADX: ", DoubleToString(adxBuffer[1], 1));
                Print("║ +DI: ", DoubleToString(adxPlusBuffer[1], 1), " | -DI: ", DoubleToString(adxMinusBuffer[1], 1));
                if(InpUseBollinger)
                    Print("║ BB Mid: ", DoubleToString(bbMiddleBuffer[1], 5));
                if(InpUseStochastic)
                    Print("║ Stoch K: ", DoubleToString(stochKBuffer[1], 1));
                Print("╚════════════════════════════════════╝");
            }
            else
            {
                Print("❌ Failed to get indicator values");
            }
        }
        
        // H = Help (show all shortcuts)
        if(lparam == 'H')
        {
            Print("╔════════════════════════════════════╗");
            Print("║    REBELIONFX KEYBOARD SHORTCUTS   ║");
            Print("╠════════════════════════════════════╣");
            Print("║ B = Open BUY position              ║");
            Print("║ S = Open SELL position             ║");
            Print("║ T = Test Telegram notification     ║");
            Print("║ R = Show trading statistics        ║");
            Print("║ I = Show current indicators        ║");
            Print("║ H = Show this help                 ║");
            Print("╚════════════════════════════════════╝");
        }
    }
}
//+------------------------------------------------------------------+
