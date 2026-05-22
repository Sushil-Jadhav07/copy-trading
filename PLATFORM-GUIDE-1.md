# PLATFORM-GUIDE (1).pdf - Markdown conversion

**Source PDF:** `PLATFORM-GUIDE (1).pdf`  
**Total pages:** 36

> This Markdown is a faithful page-by-page conversion. Each page includes a rendered page image to preserve visual content such as diagrams, tables, and layout, followed by layout-preserved extracted text.


---

## Page 1

![Rendered page 1](PLATFORM-GUIDE-1_assets/page-01.png)


~~~~text

Ascentra Copy-Trading Backend — Full
Implementation Guide
 Base URL          https://api.ascentracapital.com      or http://13.53.246.13:8081
 (prod)
 API prefix        /api/v1


 Auth              `Authorization: Beare# Frontend Integration Guide — Backend Updates
                   (May 2026)
Companion to PLATFORM-GUIDE.md and ASCENTRA-SPEC-GAP.md.

 Base URL (prod)           http://13.53.246.13:8081    or your API domain
 API prefix                /api/v1

 Auth                      Authorization: Bearer <accessToken>

 Swagger                   GET /swagger-ui.html




Summary for FE team
 Question                Answer
 Must we release FE with No. Existing flows keep working.
 backend?
 When is FE required?    Only if you ship copy sides, risk pause, Telegram link,
                         latency/history, or full profile screens.
 Breaking API changes? None for existing request shapes. New fields are optional.
Backend behavior changes (no UI required, but good to know)

~~~~


---

## Page 2

![Rendered page 2](PLATFORM-GUIDE-1_assets/page-02.png)


~~~~text

   SELL copies may be skipped more often ( INSUFFICIENT_POSITION , NO_POSITION ) —
   child must have live long qty.
   F&O qty below one lot → skip SUB_LOT_SIZE .
   Intraday after 15:20 IST → skip MARKET_CLOSED (notification + copy log).
   Margin utilization can block copies if child enabled marginCheckEnabled and over
    maxCapitalExposure .




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
 Method Path                                       Purpose
 PATCH /child/subscriptions/copy-                  Update copySides /
            settings                               allowShortSelling

 GET        /child/trade-timeline                  Child copy timeline with latency
GET /child/subscriptions       now includes: copySides , allowShortSelling .

~~~~


---

## Page 3

![Rendered page 3](PLATFORM-GUIDE-1_assets/page-03.png)


~~~~text

Master
 Method     Path                      Purpose
 GET         /master/trade-pnl        Master P&L summary (basic until price jobs)
Engine
 Method Path                              Purpose
 GET    /engine/trade-history             Paginated copy events ( ?page=0&size=20 )
 GET    /engine/trade-                    Event detail + per-child rows
           history/{eventId}

 GET       /engine/latency-stats           ?days=7  or 30
 GET       /engine/config                 Detection methods, polling interval
 GET       /engine/metadata               copySidesOptions , skipReasons ,
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

~~~~


---

## Page 4

![Rendered page 4](PLATFORM-GUIDE-1_assets/page-04.png)


~~~~text

POST    /brokers/accounts/{accountId}/refresh-           Force refresh from
        profile                                          broker
Risk
Method Path                   Purpose
GET    /risk/status           Dashboard: trades today, margin %, blocked flag
GET    /risk/exposure         Capital exposure summary
GET    /risk/check            ?brokerAccountId= optional

POST   /risk/check-trade      Pre-check a hypothetical trade
POST   /risk/pause            Emergency pause
POST   /risk/resume           Resume copying
GET    /risk/rules            Existing — get rules
PUT    /risk/rules            Existing — update rules
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

~~~~


---

## Page 5

![Rendered page 5](PLATFORM-GUIDE-1_assets/page-05.png)


~~~~text

2. Copy subscription settings
On subscribe (optional fields)
POST /api/v1/child/subscriptions


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

~~~~


---

## Page 6

![Rendered page 6](PLATFORM-GUIDE-1_assets/page-06.png)


~~~~text

 {
     "masterId": "uuid",
     "copySides": "BUY_AND_SELL",
     "allowShortSelling": false
 }


Response:
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

![Rendered page 7](PLATFORM-GUIDE-1_assets/page-07.png)


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

![Rendered page 8](PLATFORM-GUIDE-1_assets/page-08.png)


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

![Rendered page 9](PLATFORM-GUIDE-1_assets/page-09.png)


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

![Rendered page 10](PLATFORM-GUIDE-1_assets/page-10.png)


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

![Rendered page 11](PLATFORM-GUIDE-1_assets/page-11.png)


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

![Rendered page 12](PLATFORM-GUIDE-1_assets/page-12.png)


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

![Rendered page 13](PLATFORM-GUIDE-1_assets/page-13.png)


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

![Rendered page 14](PLATFORM-GUIDE-1_assets/page-14.png)


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

![Rendered page 15](PLATFORM-GUIDE-1_assets/page-15.png)


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

![Rendered page 16](PLATFORM-GUIDE-1_assets/page-16.png)


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

![Rendered page 17](PLATFORM-GUIDE-1_assets/page-17.png)


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

![Rendered page 18](PLATFORM-GUIDE-1_assets/page-18.png)


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

![Rendered page 19](PLATFORM-GUIDE-1_assets/page-19.png)


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

![Rendered page 20](PLATFORM-GUIDE-1_assets/page-20.png)


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

![Rendered page 21](PLATFORM-GUIDE-1_assets/page-21.png)


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

![Rendered page 22](PLATFORM-GUIDE-1_assets/page-22.png)


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
r (JWT, 15 min) | | **Swagger** | /swagger-ui.html | | **Health** | GET
/health (public) | | **Roles** | MASTER \| CHILD \| ADMIN` |

Table of contents
 1. What the platform does
 2. Supported brokers
 3. Authentication
 4. Broker accounts
 5. Master APIs
 6. Child APIs
 7. Copy engine
 8. Trade engine
 9. Risk
10. P&L
11. Logs & notifications
12. Admin
13. WebSockets
14. Scheduled jobs
15. Infrastructure
16. End-to-end setup
17. Log lines
18. Related docs

~~~~


---

## Page 23

![Rendered page 23](PLATFORM-GUIDE-1_assets/page-23.png)


~~~~text

1. What the platform does
Copy-trading platform where:
 1. A master links a broker (e.g. Upstox) and sets it as active account.
 2. Children subscribe to the master, link their own broker (e.g. Dhan), and set scaling (e.g.
    1.0 = same qty).

 3. When the master executes a trade, the backend copies it to all ACTIVE children on their
    brokers.
                                                                                   Risk checks     Dhan / Groww / etc.


  Master trades on Upstox        OrderPollingService 1s   CopyEngineService

                                                                                  Copy logs +
                                                                                  notifications




2. Supported brokers
 Broker                     Login method                                      Copy detection
 Groww                      API key + secret (or token)                       Polling 1s
 Zerodha                    OAuth request_token                               Postback webhook + polling
 Upstox                     OAuth authCode                                    Polling 1s
 Dhan                       OAuth tokenId (consent flow)                      Polling 1s
 Fyers                      OAuth authCode                                    Polling 1s
 Angel One                  Client code + password + TOTP                     Polling 1s
Platform API keys live in application.yml (Groww, Zerodha, Upstox, Dhan, Fyers, Angel
One).

3. Authentication
Public (no JWT)

~~~~


---

## Page 24

![Rendered page 24](PLATFORM-GUIDE-1_assets/page-24.png)


~~~~text

 Method Path                                           Purpose
 POST   /api/v1/auth/register                          Register MASTER / CHILD / ADMIN
 POST   /api/v1/auth/login                             Email + password → JWT
 POST   /api/v1/auth/refresh-token                     New access token
 POST   /api/v1/auth/forgot-password                   Reset flow
 POST   /api/v1/auth/reset-password                    Set new password
 POST   /api/v1/auth/send-otp                          SMS OTP (AWS SNS)
 POST   /api/v1/auth/verify-otp                        Phone login
 POST   /api/v1/auth/validate-password                 Password check
 GET    /api/v1/brokers/callback                       OAuth redirect capture
 POST   /api/v1/brokers/postback/zerodha               Zerodha order webhook
Authenticated
 Method        Path                                        Purpose
 POST           /api/v1/auth/logout                        Revoke refresh token
 GET            /api/v1/auth/me                            Profile
 PUT            /api/v1/auth/me                            Update profile
 POST           /api/v1/auth/2fa/enable                    Enable 2FA
 POST           /api/v1/auth/2fa/verify                    Verify 2FA
 DELETE         /api/v1/auth/2fa/disable                   Disable 2FA
Login response: accessToken , refreshToken , user (role, email, etc.)
OTP: Stored in Redis (or in-memory fallback). SNS sends SMS when AWS keys are set;
otherwise OTP is logged server-side.

~~~~


---

## Page 25

![Rendered page 25](PLATFORM-GUIDE-1_assets/page-25.png)


~~~~text

4. Broker accounts (link + session)
All require JWT unless noted.
 Method Path                                          How it works
 GET         /api/v1/brokers                          List supported
                                                      brokers + login types
 POST       /api/v1/brokers/accounts                  Link account
                                                      ( brokerId ,
                                                       nickname , keys if
                                                      needed)
 GET        /api/v1/brokers/accounts                  List user's accounts +
                                                      session summary
 GET        /api/v1/brokers/accounts/{id}             One account
 PUT        /api/v1/brokers/accounts/{id}             Update nickname /
                                                      clientId

 DELETE     /api/v1/brokers/accounts/{id}             Deactivate (soft if
                                                      subscribed)
 POST       /api/v1/brokers/accounts/{id}/login       Start session —
                                                      body varies by broker
 GET        /api/v1/brokers/accounts/{id}/oauth-url   OAuth URL for
                                                      browser
 GET        /api/v1/brokers/accounts/{id}/status      DB + live margin
                                                      ping →
                                                      connectionHealth

 GET        /api/v1/brokers/accounts/{id}/test        Connection test
                                                      (margin call)
 GET        /api/v1/brokers/accounts/{id}/margin      Available / used
                                                      margin
 GET        /api/v1/brokers/accounts/{id}/positions   Live positions

~~~~


---

## Page 26

![Rendered page 26](PLATFORM-GUIDE-1_assets/page-26.png)


~~~~text

 GET       /api/v1/brokers/accounts/{id}/orders                  Today's order book
 GET       /api/v1/brokers/accounts/{id}/trades                  Today's trades
 GET       /api/v1/brokers/accounts/{id}/holdings                Holdings
 GET       /api/v1/brokers/accounts/{id}/dashboard               Profile + margin +
                                                                 positions + orders
 GET       /api/v1/brokers/accounts/{id}/signal                  Connection bars 1–4
 GET       /api/v1/brokers/accounts/{id}/balance-alert           Low balance warning
 PUT       /api/v1/brokers/accounts/{id}/token                   Paste access token
                                                                 manually
 POST      /api/v1/brokers/accounts/{id}/orders/close-           Close position
           position

 DELETE    /api/v1/brokers/accounts/{id}/orders/{orderId}        Cancel order
Broker login bodies ( POST .../login )
 Broker         Body
 Zerodha        { "requestToken": "..." } from Kite redirect

 Upstox / Fyers { "authCode": "..." } from OAuth redirect
 Dhan           First call → returns loginUrl ; second { "authCode": "<tokenId>" }
 Groww          {} or platform keys on account

 Angel One      { "totpCode": "123456" } (+ clientId/password on account)


OAuth callback ( GET /brokers/callback ) only returns tokens — FE must call POST
.../login with them.

Session: Token saved in DB; sessionActive , expiresAt . On 401 from broker APIs →
AUTH_REQUIRED .

~~~~


---

## Page 27

![Rendered page 27](PLATFORM-GUIDE-1_assets/page-27.png)


~~~~text

5. Master APIs ( /api/v1/master )
Master manages children, active broker, and analytics.
 Method Path                                   Purpose
 GET       /children                           List linked children + copyingStatus
 POST /children/{childId}/link                 Link child + broker on subscription
 POST /children/bulk-link                      Bulk link
 POST /subscribe/{childId}                     Master-initiated subscribe
 DELETE /children/{childId}/unlink Unlink
 POST /children/bulk-unlink                    Bulk unlink
 POST /children/{childId}/pause Pause copying
 POST /children/{childId}/resume Resume copying
 GET       /children/pending                   Pending approval queue
 POST /children/{childId}/approve Approve subscription
 POST /children/{childId}/reject Reject
 POST /children/{childId}/decline Decline
 GET       /children/{childId}/scaling         Get scaling factor
 PUT       /children/{childId}/scaling         Set scaling (e.g. 0.5, 1.0)
 GET       /analytics                          Master analytics
 GET       /dashboard                          Dashboard stats
 GET       /trade-history                      Master trade history
 POST /active-account                          Set master source { "brokerAccountId":
                                             "uuid" }

 GET       /active-account                   Get active broker account id

~~~~


---

## Page 28

![Rendered page 28](PLATFORM-GUIDE-1_assets/page-28.png)


~~~~text

 DELETE     /active-account                     Clear active account
 GET        /copy/logs                          Copy logs (master view)
 GET        /earnings                           Earnings placeholder
 GET        /payouts                            Payouts placeholder
 GET        /positions                          Live positions from active broker + P&L
Required for auto-copy: Active account set + session active + polling on.

6. Child APIs ( /api/v1/child )
 Method Path                                    Purpose
 GET    /masters                                Discover masters
 POST /subscriptions                            Subscribe { masterId,
                                                brokerAccountId?, scalingFactor }         →
                                                often PENDING_APPROVAL
 POST       /subscriptions/bulk                 Bulk subscribe
 DELETE     /subscriptions/{masterId}           Unsubscribe
 POST       /subscriptions/bulk-                Bulk
            unsubscribe

 GET        /subscriptions                      My subscriptions
 PUT        /subscriptions/broker               Switch broker for a master
 GET        /scaling                            Get scaling
 PUT        /scaling                            Update scaling
 POST       /copying/pause                      Pause { masterId }
 POST       /copying/resume                     Resume
 GET        /copied-trades                      Trades copied to child

~~~~


---

## Page 29

![Rendered page 29](PLATFORM-GUIDE-1_assets/page-29.png)


~~~~text

GET         /analytics                         Child analytics
GET         /copy/logs                         Copy logs
GET         /positions                         Live positions on child broker


7. Copy engine ( /api/v1/engine ) — core product
How auto-copy works
1. OrderPollingService runs every 1 second (if pollingEnabled ).
2. For each master with active account, fetches broker order book (Upstox: GET
   /v2/order/retrieve-all ).

3. For orders with status complete / executed / traded (not while open/pending):
      Dedup by order_id (memory + Redis + DB on reset).
      Build CopyTradeRequest (symbol, qty, side, product, exchange, price, order type).
      Call CopyEngineService.copyTrade() .
4. copyTrade() for each ACTIVE subscription:
      Duplicate guard (same symbol+qty+minute, 60s).
      Risk: max trades/day, max open positions.
      SELL guard: skip SELL if child never got a copied BUY for that symbol since subscribe.
      Scale qty: floor(masterQty × scalingFactor) .
      Market closed: skip intraday equity copies outside 9:15–15:20 IST → notification (no
      broker order).
      Place order on child broker (symbol mapping, F&O segment, product mapping).
      Save trade, copy log, push notification, Telegram (if enabled), WebSocket event.
Manual copy
Method Path              Body example
POST /copy-              { "symbol": "RELIANCE", "qty": 10, "side": "BUY",
           trade         "product": "MIS", "orderType": "MARKET", "price": 0,
                         "exchange": "NSE" }

~~~~


---

## Page 30

![Rendered page 30](PLATFORM-GUIDE-1_assets/page-30.png)


~~~~text

Same engine path as polling; master JWT required.
Polling control
 Method Path                           Purpose
 GET    /status                        Engine + pollingEnabled + supported brokers
 POST   /polling                       { "enabled": true/false } — persisted in Redis

 POST   /polling/reset                 Clear known order IDs; reload from DB
 GET    /polling/status                lastResetAt , auto-reset flag


Zerodha postback (faster than poll)
 Method Path                           Purpose
 POST /api/v1/brokers/postback/zerodha Kite postback; on COMPLETE → copy
                                       immediately
Configure in Kite developer console:
 https://api.ascentracapital.com/api/v1/brokers/postback/zerodha



Product mapping (child orders)
 Master (Upstox)                       Normalized                   Dhan child
  D                                    CNC (delivery)               CNC

  I                                    MIS (intraday)               INTRADAY


Intraday market window
   Allowed: 9:15 AM – 3:20 PM IST (equity intraday).
   Outside window: copy is skipped (not placed on broker).
   Notification (master + child):
      Cannot place copy trade: market is closed for intraday orders (9:15 AM–
   3:20 PM IST).

~~~~


---

## Page 31

![Rendered page 31](PLATFORM-GUIDE-1_assets/page-31.png)


~~~~text

   Delivery ( D / CNC) copies still work outside intraday hours.
Recent production fixes
 Fix                                                                Commit area
 Poll only after order is filled (not while OPEN)                    OrderPollingService

 Upstox orders URL: retrieve-all (was retrieve/all )                 UpstoxApiClient

 Upstox D → Dhan CNC , I → INTRADAY                                  BrokerProductMapper

 Skip intraday copy after 15:20 IST + notify                         CopyEngineService




8. Trade engine ( /api/v1/trades )
Alternative trade APIs (execute + replicate if caller is master):
 Method Path                                                Purpose
 POST           /execute                                    Place order + optional copy
 GET            /                                           List trades
 GET            /{tradeId}                                  One trade
 DELETE         /{tradeId}/cancel                           Cancel
 GET            /{tradeId}/replications                     Child replications
 GET            /open-positions                             Open positions
 POST           /basket                                     Basket orders


9. Risk ( /api/v1/risk )
Per-child rules checked before every copy:
 Method Path                 Purpose

~~~~


---

## Page 32

![Rendered page 32](PLATFORM-GUIDE-1_assets/page-32.png)


~~~~text

 GET           /rules         Get limits
 PUT           /rules         Set maxTradesPerDay , maxOpenPositions , etc.
 GET           /check         Dry-run risk check
Failures → copy status SKIPPED with reason in logs.

10. P&L ( /api/v1/pnl )
 Method          Path                                 Purpose
 GET              /realized                           Realized P&L
 GET              /unrealized                         Unrealized P&L
 GET              /summary                            Summary
 GET              /child-vs-master                    Compare child vs master
 GET              /admin/pnl/all                      Admin: all users


11. Logs & notifications
 Method       Path                                                 Purpose
 GET           /api/v1/logs/trades                                 Trade logs
 GET           /api/v1/logs/broker-errors                          Broker errors
 GET           /api/v1/copy/logs                                   Copy-specific logs
 GET           /api/v1/notifications                               In-app notifications
 PATCH         /api/v1/notifications/{id}/read                     Mark read
 POST          /api/v1/notifications/read-all                      Mark all read
 DELETE        /api/v1/notifications/{id}                          Delete

~~~~


---

## Page 33

![Rendered page 33](PLATFORM-GUIDE-1_assets/page-33.png)


~~~~text

Admin logs: /api/v1/admin/logs/trades , /system , /broker-errors

12. Admin ( /api/v1/admin — ADMIN role)
 Method      Path                                       Purpose
 GET          /users                                    List users
 POST         /users/master                             Create master
 POST         /users/child                              Create child
 GET          /users/{userId}                           User detail
 PUT          /users/{userId}                           Update
 PATCH        /users/{userId}/activate                  Activate
 PATCH        /users/{userId}/deactivate                Deactivate
 DELETE       /users/{userId}                           Delete
 GET          /analytics                                Platform analytics
 GET          /system-health                            Health overview
 GET          /subscriptions                            All subscriptions
 GET          /trade-logs                               Trade logs
 GET          /brokers/accounts                         All broker accounts
 GET          /brokers/status                           Broker API status


13. WebSockets (public /ws/** )
 URL                                       Events
 ws://host/ws/trades                       TRADE_DETECTED   , copy updates

~~~~


---

## Page 34

![Rendered page 34](PLATFORM-GUIDE-1_assets/page-34.png)


~~~~text

 ws://host/ws/positions                      Position updates
 ws://host/ws/pnl                            P&L updates
 ws://host/ws/notifications                  Push notifications


14. Scheduled jobs (background)
Job                   When                   What
Order polling         Every 1s               Scan master orders → copy
Polling reset         9:15 AM IST weekdays   Clear known orders; reload from DB
Session reminder      9:00 AM IST weekdays   Notify children with expired broker sessions


15. Infrastructure
Component                   Use
PostgreSQL (R2DBC)          Users, brokers, subscriptions, trades, copy logs
Redis (optional)            OTP, polling state, known order IDs
AWS SNS                     OTP SMS
Telegram (optional)         Copy alerts to master
Kafka                       Disabled by default ( APP_KAFKA_ENABLED=false )


16. End-to-end setup
Master
1. POST /api/v1/auth/login → JWT
2. POST /api/v1/brokers/accounts → link Upstox

~~~~


---

## Page 35

![Rendered page 35](PLATFORM-GUIDE-1_assets/page-35.png)


~~~~text

3. GET /api/v1/brokers/accounts/{id}/oauth-url → open URL → POST .../login
   with authCode
4. POST /api/v1/master/active-account → set Upstox account id
5. GET /api/v1/engine/status → pollingEnabled: true
6. Trade on Upstox → within ~1–2s child gets order on Dhan
Child
1. Register / login
2. Link Dhan ( POST .../login with tokenId flow)
3. POST /api/v1/child/subscriptions with masterId + brokerAccountId
4. Master POST /api/v1/master/children/{id}/approve
5. Copying status ACTIVE → receives copies
Verify on EC2
 grep -a -E
 "NEW_ORDER_DETECTED|COPY_ORDER_PLACED|COPY_SKIP|MARKET_CLOSED"
 /home/ec2-user/ascentra.log | tail -20



Deploy
 cd /home/ec2-user/copy-trading && git pull origin main
 ./gradlew clean build -x test --no-daemon
 killall java 2>/dev/null; sleep 3
 nohup java -Xmx512m -jar build/libs/copy-trading-backend-0.1.0.jar >
 /home/ec2-user/ascentra.log 2>&1 &




17. Log lines to know
Log                        Meaning
 NEW_ORDER_DETECTED        Master fill seen
 COPY_ENGINE_START         Copy started

~~~~


---

## Page 36

![Rendered page 36](PLATFORM-GUIDE-1_assets/page-36.png)


~~~~text

 COPY_ORDER_PLACED            Child broker order ok
 COPY_ORDER_FAILED            Child order rejected
 COPY_SKIP                    Risk / no position / zero qty / market closed
 POLL_ORDERS_FAIL             Could not fetch master orders
 MARKET_CLOSED                Intraday copy skipped outside 9:15–15:20 IST


18. Related docs in repo
 File                                                      Content
 FRONTEND-INTEGRATION-COMPLETE.md                          FE integration
 BROKER-CONNECTION-FLOW.md                                 Broker OAuth flows
 API-TESTING-GUIDE.md                                      curl examples
 COPY-TRADE-LATENCY-API.md                                 Timing fields
 scripts/curls.md                                          Test curls
 COMPLETE-API-REFERENCE.md                                 API reference

Last updated: May 2026 — commit f41e47c on main .

~~~~
