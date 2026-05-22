# PLATFORM-GUIDE (2).pdf - Markdown conversion

**Source PDF:** `PLATFORM-GUIDE (2).pdf`  
**Total pages:** 22

> This Markdown is a faithful page-by-page conversion. Each page includes a rendered page image to preserve visual content such as diagrams, tables, and layout, followed by layout-preserved extracted text.


---

## Page 1

![Rendered page 1](PLATFORM-GUIDE-2_assets/page-01.png)


~~~~text

Frontend Integration Guide — Backend
Updates (May 2026)
Companion to PLATFORM-GUIDE.md and ASCENTRA-SPEC-GAP.md.

 Base URL (prod)         http://13.53.246.13:8081     or your API domain
 API prefix              /api/v1

 Auth                    Authorization: Bearer <accessToken>

 Swagger                 GET /swagger-ui.html




Summary for FE team
 Question                Answer
 Must we release FE with No. Existing flows keep working.
 backend?
 When is FE required?    Only if you ship copy sides, risk pause, Telegram link,
                         latency/history, or full profile screens.
 Breaking API changes? None for existing request shapes. New fields are optional.
Backend behavior changes (no UI required, but good to know)
  SELL copies may be skipped more often ( INSUFFICIENT_POSITION , NO_POSITION ) —
  child must have live long qty.
  F&O qty below one lot → skip SUB_LOT_SIZE .
  Intraday after 15:20 IST → skip MARKET_CLOSED (notification + copy log).
  Margin utilization can block copies if child enabled marginCheckEnabled and over
   maxCapitalExposure .

~~~~


---

## Page 2

![Rendered page 2](PLATFORM-GUIDE-2_assets/page-02.png)


~~~~text

Table of contents
 1. Quick reference — new endpoints
 2. Copy subscription settings
 3. Skip reasons & notifications
 4. Profile & broker accounts
 5. Risk management UI
 6. Latency & trade history
 7. Telegram linking
 8. Engine metadata
 9. Screen → API mapping
10. TypeScript types (suggested)
11. Related docs

1. Quick reference — new endpoints
All require JWT unless noted (public).
Child
 Method Path                                         Purpose
 PATCH /child/subscriptions/copy-                    Update copySides /
            settings                                 allowShortSelling

 GET        /child/trade-timeline                    Child copy timeline with latency
GET /child/subscriptions       now includes: copySides , allowShortSelling .
Master
 Method      Path                        Purpose
 GET          /master/trade-pnl          Master P&L summary (basic until price jobs)
Engine

~~~~


---

## Page 3

![Rendered page 3](PLATFORM-GUIDE-2_assets/page-03.png)


~~~~text

 Method Path                               Purpose
 GET    /engine/trade-history              Paginated copy events ( ?page=0&size=20 )
 GET    /engine/trade-                     Event detail + per-child rows
           history/{eventId}


 GET       /engine/latency-stats           ?days=7   or 30
 GET       /engine/config                  Detection methods, polling interval
 GET       /engine/metadata                copySidesOptions , skipReasons ,
                                           notificationTypes


Postback (broker console only, not FE): POST /engine/postback/zerodha or
/brokers/postback/zerodha (public)


User profile (spec path)
 Method       Path                          Purpose
 GET          /users/me/profile             User + all broker account profiles
 PUT          /users/me/profile             Update name / telegram chat id
Legacy: GET /auth/me , PUT /auth/me still work.
Broker
 Method Path                                                    Purpose
 GET    /brokers/accounts/{accountId}/profile                   Normalized profile (60s
                                                                cache)
 POST      /brokers/accounts/{accountId}/refresh-               Force refresh from
           profile                                              broker
Risk
 Method Path                        Purpose
 GET    /risk/status                Dashboard: trades today, margin %, blocked flag

~~~~


---

## Page 4

![Rendered page 4](PLATFORM-GUIDE-2_assets/page-04.png)


~~~~text

 GET      /risk/exposure       Capital exposure summary
 GET      /risk/check          ?brokerAccountId= optional

 POST     /risk/check-trade    Pre-check a hypothetical trade
 POST     /risk/pause          Emergency pause
 POST     /risk/resume         Resume copying
 GET      /risk/rules          Existing — get rules
 PUT      /risk/rules          Existing — update rules
Telegram
 Method Path                                            Purpose
 POST /notifications/telegram/generate-link-            6-digit link code
         token

 GET     /notifications/telegram/status                 Linked? preferences
 PUT     /notifications/telegram/preferences            Alert toggles
 POST    /notifications/telegram/test                   Send test message
 POST    /notifications/telegram/unlink                 Unlink
 POST    /telegram/webhook                              (public) — Telegram →
                                                        backend


2. Copy subscription settings
On subscribe (optional fields)
POST /api/v1/child/subscriptions

~~~~


---

## Page 5

![Rendered page 5](PLATFORM-GUIDE-2_assets/page-05.png)


~~~~text

 {
     "masterId": "uuid",
     "brokerAccountId": "uuid",
     "scalingFactor": 1.0,
     "copySides": "BUY_ONLY",
     "allowShortSelling": false
 }



 Field                  Values                       Default    Meaning
 copySides              BUY_ONLY      |              BUY_ONLY   What sides to copy
                        BUY_AND_SELL      | MIRROR
 allowShortSelling      boolean                      false      With MIRROR , allow
                                                                naked short if true
copySides   behavior (for UI copy):
 Value             BUY      SELL
 BUY_ONLY          Copied   Only if copied BUY + live position ≥ sell qty
 BUY_AND_SELL      Copied   Only if live position ≥ sell qty
 MIRROR            Copied   Same as BUY_AND_SELL unless allowShortSelling: true
Update settings later
PATCH /api/v1/child/subscriptions/copy-settings


 {
     "masterId": "uuid",
     "copySides": "BUY_AND_SELL",
     "allowShortSelling": false
 }


Response:

~~~~


---

## Page 6

![Rendered page 6](PLATFORM-GUIDE-2_assets/page-06.png)


~~~~text

 {
     "masterId": "uuid",
     "copySides": "BUY_AND_SELL",
     "allowShortSelling": false,
     "message": "Copy settings updated"
 }



List subscriptions (new fields)
GET /api/v1/child/subscriptions

Each item now includes:
 {
     "masterId": "...",
     "masterName": "...",
     "scalingFactor": 1.0,
     "copySides": "BUY_ONLY",
     "allowShortSelling": false,
     "copyingStatus": "ACTIVE",
     "brokerAccountId": "...",
     "subscribedAt": "2026-05-20T..."
 }



UI: copy sides picker
Load options from GET /api/v1/engine/metadata → copySidesOptions :

~~~~


---

## Page 7

![Rendered page 7](PLATFORM-GUIDE-2_assets/page-07.png)


~~~~text

 {
     "copySidesOptions": [
         {
              "id": "BUY_ONLY",
              "label": "Buy only (safe default)",
              "description": "Copy BUY; SELL only with copied BUY + live
 position"
         },
         {
              "id": "BUY_AND_SELL",
              "label": "Buy and sell",
              "description": "Copy BUY and SELL when child has live long qty"
         },
         {
              "id": "MIRROR",
              "label": "Mirror master",
              "description": "Copy all sides; optional naked short if
 allowShortSelling"
         }
     ]
 }


Show “Allow short selling” toggle only when copySides === "MIRROR" .

3. Skip reasons & notifications
Skip reasons (copy logs / timeline)
Use GET /engine/metadata → skipReasons or map locally:
 skipReason                              Suggested UI label
 ZERO_QUANTITY                           Scaled quantity is zero
 SUB_LOT_SIZE                            Below one F&O lot after scaling
 RISK_LIMIT                              Risk limit reached

~~~~


---

## Page 8

![Rendered page 8](PLATFORM-GUIDE-2_assets/page-08.png)


~~~~text

 MAX_CAPITAL_EXPOSURE             Margin utilization too high
 NO_POSITION                      No copied buy position for this symbol
 INSUFFICIENT_POSITION            Not enough shares to sell
 SELL_BLOCKED                     Sell not allowed for this subscription
 MARKET_CLOSED                    Intraday copy blocked after market close
 COPY_PAUSED                      Copy trading paused
 SESSION_EXPIRED                  Broker session expired
GET /child/copied-trades   and GET /child/copy/logs may include skipReason on
skipped rows.
Notification types (handle in alerts UI)
 type                            Action
 TRADE_COPIED                    Success toast
 TRADE_FAILED                    Error toast
 MARKET_CLOSED                   Warning — intraday not copied
 SESSION_EXPIRED                 Prompt re-login
 SESSION_EXPIRING                Warning — session expiring soon
 SESSION_REMINDER                Morning reminder
GET /api/v1/notifications   — unchanged shape; filter by type if needed.

4. Profile & broker accounts
Full profile page (recommended for spec)
GET /api/v1/users/me/profile

~~~~


---

## Page 9

![Rendered page 9](PLATFORM-GUIDE-2_assets/page-09.png)


~~~~text

 {
     "userId": "uuid",
     "name": "Rahul Sharma",
     "email": "rahul@example.com",
     "mobile": "+91...",
     "role": "CHILD",
     "createdAt": "...",
     "telegramLinked": true,
     "brokerAccounts": [
         {
             "accountId": "uuid",
             "broker": "ZERODHA",
             "clientId": "ZA1234",
             "fullName": "Rahul Sharma",
             "marginAvailable": 125000,
             "marginUsed": 48500,
             "marginUsedPercent": 27.9,
             "fundsUtilizationStatus": "GREEN",
             "sessionActive": true,
             "tokenExpiresAt": "...",
             "tokenExpiresInHours": 18,
             "isTokenExpired": false,
             "openPositionsCount": 3,
             "lastSyncedAt": "..."
         }
     ]
 }


fundsUtilizationStatus      : GREEN | YELLOW | RED — use for margin card color.
PUT /api/v1/users/me/profile


 {
     "displayName": "Rahul S.",
     "telegramChatId": "123456789"
 }

~~~~


---

## Page 10

![Rendered page 10](PLATFORM-GUIDE-2_assets/page-10.png)


~~~~text

Prefer Telegram link flow (§7) over manual telegramChatId when possible.
Single broker profile
GET /api/v1/brokers/accounts/{accountId}/profile

Use on broker detail drawer/page. Cached 60s on server.
POST /api/v1/brokers/accounts/{accountId}/refresh-profile

Call when user taps Refresh on profile page.

5. Risk management UI
Dashboard card
GET /api/v1/risk/status?brokerAccountId={uuid}

Pass child’s active brokerAccountId when known.
 {
     "maxTradesPerDay": 50,
     "tradesToday": 12,
     "tradesRemaining": 38,
     "maxOpenPositions": 20,
     "openPositions": 8,
     "positionsRemaining": 12,
     "maxCapitalExposure": 80,
     "marginCheckEnabled": true,
     "marginUtilizationPct": 45.2,
     "marginBlocked": false,
     "availableMargin": 75000,
     "usedMargin": 62000,
     "totalFunds": 137000,
     "copyPaused": false,
     "pausedUntil": null,
     "allowed": true
 }

~~~~


---

## Page 11

![Rendered page 11](PLATFORM-GUIDE-2_assets/page-11.png)


~~~~text

Show red banner when allowed === false or marginBlocked === true .
Exposure summary
GET /api/v1/risk/exposure?brokerAccountId={uuid}


 {
     "totalCapital": 137000,
     "deployedCapital": 62000,
     "exposurePercent": 45.2,
     "openPositions": 8,
     "tradesPlacedToday": 12,
     "marginAvailable": 75000
 }



Pause / resume copying
POST /api/v1/risk/pause


 {
     "reason": "Manual pause",
     "pauseUntil": "2026-05-20T15:30:00Z"
 }


POST /api/v1/risk/resume   — no body.
Pre-trade check (optional)
POST /api/v1/risk/check-trade?brokerAccountId={uuid}


 {
     "symbol": "NIFTY26MAY25900CE",
     "side": "BUY",
     "qty": 65,
     "price": 120.5,
     "product": "NRML"
 }

~~~~


---

## Page 12

![Rendered page 12](PLATFORM-GUIDE-2_assets/page-12.png)


~~~~text

 {
     "allowed": true,
     "warnings": [],
     "checks": [{ "rule": "composite", "status": "OK", "message": "OK" }],
     "symbol": "NIFTY26MAY25900CE"
 }



Risk rules (existing)
GET /PUT /api/v1/risk/rules       — unchanged; fields:
     maxTradesPerDay

     maxOpenPositions

     maxCapitalExposure   (percent, e.g. 80 )
     marginCheckEnabled




6. Latency & trade history
  Note: eventId = backend copyGroupId (UUID string per master copy batch).

Master — trade history list
GET /api/v1/engine/trade-history?page=0&size=20&symbol=NIFTY&side=BUY

Query params (all optional): page , size (max 100), from , to (ISO dates), symbol , side .

~~~~


---

## Page 13

![Rendered page 13](PLATFORM-GUIDE-2_assets/page-13.png)


~~~~text

 {
     "totalElements": 142,
     "page": 0,
     "size": 20,
     "content": [
         {
             "eventId": "uuid-copy-group",
             "symbol": "NIFTY26MAY25900CE",
             "side": "BUY",
             "masterQty": 65,
             "masterTriggeredAt": "2026-05-13T09:15:01.234Z",
             "avgChildLatencyMs": 278,
             "minChildLatencyMs": 245,
             "maxChildLatencyMs": 312,
             "childrenTotal": 5,
             "childrenSucceeded": 3,
             "childrenFailed": 2
         }
     ]
 }



Master — event detail
GET /api/v1/engine/trade-history/{eventId}

~~~~


---

## Page 14

![Rendered page 14](PLATFORM-GUIDE-2_assets/page-14.png)


~~~~text

 {
     "eventId": "...",
     "symbol": "NIFTY26MAY25900CE",
     "side": "BUY",
     "children": [
         {
             "childName": "Rahul",
             "broker": "—",
             "status": "SUCCESS",
             "orderId": "...",
             "totalChildLatencyMs": 257,
             "brokerLatencyMs": 257
         }
     ]
 }



Master — latency stats
GET /api/v1/engine/latency-stats?days=7


 {
     "avgTotalLatencyMs": 312,
     "minTotalLatencyMs": 189,
     "maxTotalLatencyMs": 892,
     "p50LatencyMs": 290,
     "p95LatencyMs": 650,
     "p99LatencyMs": 820,
     "tradeCount": 87,
     "successRate": 94.2,
     "brokerBreakdown": []
 }



Child — timeline
GET /api/v1/child/trade-timeline

~~~~


---

## Page 15

![Rendered page 15](PLATFORM-GUIDE-2_assets/page-15.png)


~~~~text

 {
     "trades": [
         {
             "eventId": "uuid",
             "masterName": "Alpha Trader",
             "symbol": "NIFTY25000CE",
             "side": "BUY",
             "masterTriggeredAt": "2026-05-13T09:15:01.234Z",
             "myOrderPlacedAt": "2026-05-13T09:15:01.567Z",
             "totalChildLatencyMs": 333,
             "status": "SUCCESS",
             "skipReason": null,
             "qty": 65
         }
     ]
 }



Master — trade P&L (basic)
GET /api/v1/master/trade-pnl


 {
     "summary": {
         "totalRealisedPnl": 0,
         "totalUnrealisedPnl": 0,
         "todayPnl": 0,
         "totalTrades": 42,
         "winRate": 0
     },
     "trades": []
 }


Real P&L fields will improve when backend price-fetch jobs land.

7. Telegram linking

~~~~


---

## Page 16

![Rendered page 16](PLATFORM-GUIDE-2_assets/page-16.png)


~~~~text

Backend env (not FE): telegram.enabled=true , telegram.bot-token=... in
application.yml .


Flow
       Frontend                                            Backend        User                Telegram Bot


             POST /notifications/telegram/generate-link-token


                     code, botUsername, instruction


                            Show code + "Send /link 123456 to @Bot"


                                                                                   /link 123456


                                                                         webhook


                                                                      Account linked


                    GET /notifications/telegram/status


                               linked: true




       Frontend                                            Backend        User                Telegram Bot




1. Generate code
POST /api/v1/notifications/telegram/generate-link-token


 {
     "code": "847291",
     "expiresAt": "2026-05-20T10:15:00Z",
     "botUsername": "AscentraAlertBot",
     "instruction": "Send /link 847291 to @AscentraAlertBot on Telegram"
 }


Display instruction and a Copy button for the command.
2. Poll or refresh status
GET /api/v1/notifications/telegram/status

~~~~


---

## Page 17

![Rendered page 17](PLATFORM-GUIDE-2_assets/page-17.png)


~~~~text

 {
     "linked": true,
     "chatId": "123456789",
     "preferences": {
         "tradeAlerts": true,
         "riskAlerts": true,
         "dailySummary": true,
         "systemAlerts": false,
         "alertOnSuccess": true,
         "alertOnFailure": true,
         "alertOnSkipped": true
     }
 }



3. Update preferences
PUT /api/v1/notifications/telegram/preferences


 {
     "tradeAlerts": true,
     "riskAlerts": true,
     "alertOnSkipped": true
 }



4. Test
POST /api/v1/notifications/telegram/test


 { "sent": true }



5. Unlink
POST /api/v1/notifications/telegram/unlink




8. Engine metadata

~~~~


---

## Page 18

![Rendered page 18](PLATFORM-GUIDE-2_assets/page-18.png)


~~~~text

GET /api/v1/engine/metadata         — use once at app init or settings screen.
 {
     "copySidesOptions": [ ... ],
     "skipReasons": [
         "ZERO_QUANTITY",
         "SUB_LOT_SIZE",
         "RISK_LIMIT",
         "MAX_CAPITAL_EXPOSURE",
         "NO_POSITION",
         "INSUFFICIENT_POSITION",
         "SELL_BLOCKED",
         "MARKET_CLOSED",
         "SESSION_EXPIRED"
     ],
     "notificationTypes": [
         "TRADE_COPIED",
         "TRADE_FAILED",
         "MARKET_CLOSED",
         "SESSION_EXPIRED",
         "SESSION_EXPIRING",
         "SESSION_REMINDER"
     ]
 }




9. Screen → API mapping
Screen                    Primary APIs                                           New?
Login / register          /auth/*                                                No
Child — subscribe         POST /child/subscriptions      (+ optional             Optional
                          copySides   )                                          fields
Child —                   GET /child/subscriptions                               +2 fields
subscriptions list

~~~~


---

## Page 19

![Rendered page 19](PLATFORM-GUIDE-2_assets/page-19.png)


~~~~text

Child — copy            PATCH /child/subscriptions/copy-settings       New
settings
Child — copied          GET /child/copied-trades                       +skipReason
trades
Child — timeline        GET /child/trade-timeline                      New
Child — risk settings   GET/PUT /risk/rules   , GET /risk/status ,     Enhanced
                        pause/resume
Child — positions       GET /child/positions                           No
Master — dashboard      GET /master/dashboard                          No
Master — latency        GET /engine/trade-history   , latency-stats    New
Master — trade P&L      GET /master/trade-pnl                          New
Profile                 GET /users/me/profile   , broker .../profile   New paths
Notifications bell      GET /notifications                             +types
Telegram settings       /notifications/telegram/*                      New
Broker link / login     /brokers/*                                     No
Engine admin toggle     POST /engine/polling                           No


10. TypeScript types (suggested)

~~~~


---

## Page 20

![Rendered page 20](PLATFORM-GUIDE-2_assets/page-20.png)


~~~~text

export type CopySides = 'BUY_ONLY' | 'BUY_AND_SELL' | 'MIRROR';


export interface SubscribeRequest {
    masterId: string;
    brokerAccountId: string;
    scalingFactor?: number;
    copySides?: CopySides;
    allowShortSelling?: boolean;
}


export interface CopySettingsRequest {
    masterId: string;
    copySides?: CopySides;
    allowShortSelling?: boolean;
}


export type SkipReason =
    | 'ZERO_QUANTITY'
    | 'SUB_LOT_SIZE'
    | 'RISK_LIMIT'
    | 'MAX_CAPITAL_EXPOSURE'
    | 'NO_POSITION'
    | 'INSUFFICIENT_POSITION'
    | 'SELL_BLOCKED'
    | 'MARKET_CLOSED'
    | 'COPY_PAUSED'
    | 'SESSION_EXPIRED';


export interface Subscription {
    masterId: string;
    masterName: string;
    scalingFactor: number;
    copySides: CopySides;
    allowShortSelling: boolean;
    copyingStatus: string;
    brokerAccountId: string;
    subscribedAt: string;

~~~~


---

## Page 21

![Rendered page 21](PLATFORM-GUIDE-2_assets/page-21.png)


~~~~text

 }


 export interface RiskStatus {
     maxTradesPerDay: number;
     tradesToday: number;
     tradesRemaining: number;
     maxOpenPositions: number;
     openPositions: number;
     maxCapitalExposure: number;
     marginUtilizationPct: number;
     marginBlocked: boolean;
     allowed: boolean;
     copyPaused: boolean;
     pausedUntil: string | null;
 }


 export interface TelegramLinkTokenResponse {
     code: string;
     expiresAt: string;
     botUsername: string;
     instruction: string;
 }




11. Related docs
Document                              Audience
PLATFORM-GUIDE.md                     Full backend API reference
ASCENTRA-SPEC-GAP.md                  Spec v2 vs implementation matrix
ENGINE-CHANGELOG.md                   Engine audit changelog
Ascentra_Backend_Spec_v2.docx         Original product spec


Checklist for FE release (optional features)

~~~~


---

## Page 22

![Rendered page 22](PLATFORM-GUIDE-2_assets/page-22.png)


~~~~text

   Copy sides dropdown on subscribe / settings
   Allow short selling toggle (MIRROR only)
   Skip reason labels in copy logs
   MARKET_CLOSED / SESSION_EXPIRED notification handling

   Risk status card + pause/resume buttons
   Profile page using /users/me/profile
   Telegram connect flow
   Master latency / trade history pages
Minimum release: none required — ship backend-only deploy if UI unchanged.

~~~~
