# Ascentra Trading Platform API

Version: `1.0`  
Spec: `OAS 3.0`  
Base path: `/v3/api-docs`  
Server: `/`

Source converted from the API text you shared.

---

## Overview

This document organizes the available APIs for the **Master-Child Copy Trading System** into a cleaner Markdown reference.

## Authentication

Most endpoints appear to require authentication except health checks and some broker callback/auth bootstrap flows.

---

# 1. Auth APIs

## `POST /api/v1/auth/login`
Login with email and password.

### Request Body
```json
{
  "email": "string",
  "password": "string"
}
```

### Response `200`
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": {
    "userId": "uuid",
    "name": "string",
    "email": "string",
    "role": "string",
    "status": "string",
    "phone": "string",
    "twoFactorEnabled": true,
    "createdAt": "datetime",
    "brokerAccounts": [{}]
  },
  "requires2FA": true
}
```

---

## `POST /api/v1/auth/register`
Register a new user.

### Request Body
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "string",
  "phone": "string"
}
```

### Response `201`
Created

---

## `GET /api/v1/auth/me`
Get current logged-in user profile.

### Response `200`
```json
{
  "userId": "uuid",
  "name": "string",
  "email": "string",
  "role": "string",
  "status": "string",
  "phone": "string",
  "twoFactorEnabled": true,
  "createdAt": "datetime",
  "brokerAccounts": [{}]
}
```

---

## `PUT /api/v1/auth/me`
Update current user profile or password.

### Request Body
```json
{
  "name": "string",
  "phone": "string",
  "currentPassword": "string",
  "newPassword": "string"
}
```

### Response `200`
Updated user object

---

## `POST /api/v1/auth/send-otp`
Send OTP to phone.

### Request Body
```json
{
  "phone": "string",
  "purpose": "string"
}
```

### Response `200`
Success object

---

## `POST /api/v1/auth/verify-otp`
Verify OTP.

### Request Body
```json
{
  "phone": "string",
  "otp": "string",
  "purpose": "string"
}
```

### Response `200`
Success object

---

## `POST /api/v1/auth/forgot-password`
Send forgot password link or token.

### Request Body
```json
{
  "email": "string"
}
```

### Response `200`
Success message

---

## `POST /api/v1/auth/reset-password`
Reset password using token.

### Request Body
```json
{
  "token": "string",
  "newPassword": "string"
}
```

### Response `200`
Success message

---

## `POST /api/v1/auth/refresh-token`
Refresh access token.

### Request Body
```json
{
  "refreshToken": "string"
}
```

### Response `200`
Success message / token response

---

## `POST /api/v1/auth/logout`
Logout current session.

### Request Body
```json
{
  "refreshToken": "string"
}
```

### Response `200`
Success message

---

## `POST /api/v1/auth/2fa/enable`
Enable 2FA.

### Response `200`
Success message

---

## `POST /api/v1/auth/2fa/verify`
Verify 2FA OTP.

### Request Body
```json
{
  "otp": "string"
}
```

### Response `200`
Success object

---

## `DELETE /api/v1/auth/2fa/disable`
Disable 2FA.

### Request Body
```json
{
  "password": "string",
  "otp": "string"
}
```

### Response `200`
Success message

---

# 2. Broker APIs

## `GET /api/v1/brokers`
Get supported brokers.

### Response `200`
Broker list

---

## `GET /api/v1/brokers/accounts`
Get connected broker accounts for current user.

### Response `200`
Broker account list

---

## `POST /api/v1/brokers/accounts`
Create / connect a broker account.

### Request Body
```json
{
  "brokerId": "string",
  "clientId": "string",
  "apiKey": "string",
  "apiSecret": "string",
  "accessToken": "string",
  "accountNickname": "string"
}
```

### Response `201`
Created

---

## `GET /api/v1/brokers/accounts/{accountId}`
Get broker account details.

### Path Params
- `accountId` — `uuid`

### Response `200`
```json
{
  "accountId": "uuid",
  "brokerId": "string",
  "brokerName": "string",
  "clientId": "string",
  "nickname": "string",
  "status": "string",
  "sessionActive": true,
  "linkedAt": "datetime"
}
```

---

## `PUT /api/v1/brokers/accounts/{accountId}`
Update broker account.

### Path Params
- `accountId` — `uuid`

### Request Body
```json
{
  "apiKey": "string",
  "apiSecret": "string",
  "accountNickname": "string"
}
```

### Response `200`
Success message

---

## `DELETE /api/v1/brokers/accounts/{accountId}`
Delete broker account.

### Path Params
- `accountId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/brokers/accounts/{accountId}/login`
Login or activate broker session.

### Path Params
- `accountId` — `uuid`

### Request Body
```json
{
  "totpCode": "string",
  "requestToken": "string",
  "authCode": "string"
}
```

### Response `200`
Success object

---

## `GET /api/v1/brokers/accounts/{accountId}/status`
Get broker session/account status.

### Path Params
- `accountId` — `uuid`

### Response `200`
Status object

---

## `GET /api/v1/brokers/accounts/{accountId}/positions`
Get positions for broker account.

### Path Params
- `accountId` — `uuid`

### Response `200`
Positions object/list

---

## `GET /api/v1/brokers/accounts/{accountId}/margin`
Get margin details for broker account.

### Path Params
- `accountId` — `uuid`

### Response `200`
Margin object

---

## `GET /api/v1/brokers/accounts/{accountId}/oauth-url`
Get broker OAuth login URL.

### Path Params
- `accountId` — `uuid`

### Query Params
- `redirectUri` — `string`

### Response `200`
OAuth URL object

---

## `GET /api/v1/brokers/callback`
Broker OAuth callback.

### Query Params
- `request_token` — `string`
- `auth_code` — `string`
- `code` — `string`
- `tokenId` — `string`
- `status` — `string`

### Response `200`
Callback result

---

# 3. Master APIs

## `GET /api/v1/master/children`
Get linked children for current master.

### Response `200`
Children list

---

## `GET /api/v1/master/children/pending`
Get pending child requests.

### Response `200`
Pending child list

---

## `POST /api/v1/master/children/{childId}/link`
Link a child to master.

### Path Params
- `childId` — `uuid`

### Request Body
```json
{
  "scalingFactor": 0
}
```

### Response `200`
Success message

---

## `DELETE /api/v1/master/children/{childId}/unlink`
Unlink a child.

### Path Params
- `childId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/master/children/bulk-link`
Bulk link children.

### Request Body
```json
{
  "children": [
    {
      "childId": "uuid",
      "scalingFactor": 0
    }
  ]
}
```

### Response `200`
Success object

---

## `POST /api/v1/master/children/bulk-unlink`
Bulk unlink children.

### Request Body
```json
{
  "childIds": ["uuid"]
}
```

> Note: Swagger example showed generic `additionalProp` fields; `childIds` is the likely intended structure.

### Response `200`
Success object

---

## `GET /api/v1/master/children/{childId}/scaling`
Get scaling for a linked child.

### Path Params
- `childId` — `uuid`

### Response `200`
Scaling object

---

## `PUT /api/v1/master/children/{childId}/scaling`
Update scaling for a linked child.

### Path Params
- `childId` — `uuid`

### Request Body
```json
{
  "scalingFactor": 0
}
```

### Response `200`
Success object

---

## `POST /api/v1/master/children/{childId}/pause`
Pause copy trading for child.

### Path Params
- `childId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/master/children/{childId}/resume`
Resume copy trading for child.

### Path Params
- `childId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/master/children/{childId}/approve`
Approve child request.

### Path Params
- `childId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/master/children/{childId}/reject`
Reject child request.

### Path Params
- `childId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/master/children/{childId}/decline`
Decline child request.

### Path Params
- `childId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/master/subscribe/{childId}`
Subscribe a child to master with scaling.

### Path Params
- `childId` — `uuid`

### Request Body
```json
{
  "scalingFactor": 0
}
```

### Response `201`
Created

---

## `GET /api/v1/master/trade-history`
Get master trade history.

### Response `200`
Trade history object/list

---

## `GET /api/v1/master/analytics`
Get master analytics.

### Response `200`
Analytics object

---

# 4. Child APIs

## `GET /api/v1/child/masters`
Get discoverable/available masters.

### Response `200`
Masters list

---

## `GET /api/v1/child/subscriptions`
Get child subscriptions.

### Response `200`
Subscription list

---

## `POST /api/v1/child/subscriptions`
Subscribe to a master.

### Request Body
```json
{
  "masterId": "uuid",
  "brokerAccountId": "uuid",
  "scalingFactor": 0
}
```

### Response `201`
Created

---

## `DELETE /api/v1/child/subscriptions/{masterId}`
Unsubscribe from master.

### Path Params
- `masterId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/child/subscriptions/bulk`
Bulk subscribe to masters.

### Request Body
```json
{
  "masters": [
    {
      "masterId": "uuid",
      "brokerAccountId": "uuid",
      "scalingFactor": 0
    }
  ]
}
```

### Response `201`
Created

---

## `POST /api/v1/child/subscriptions/bulk-unsubscribe`
Bulk unsubscribe from masters.

### Request Body
```json
{
  "masterIds": ["uuid"]
}
```

> Note: Swagger example showed generic `additionalProp` fields; `masterIds` is the likely intended structure.

### Response `200`
Success object

---

## `GET /api/v1/child/scaling`
Get scaling for a master subscription.

### Query Params
- `masterId` — `uuid` (optional)

### Response `200`
Scaling object

---

## `PUT /api/v1/child/scaling`
Update child scaling for a subscribed master.

### Request Body
```json
{
  "masterId": "uuid",
  "scalingFactor": 0
}
```

### Response `200`
Success object

---

## `POST /api/v1/child/copying/pause`
Pause copying for a master.

### Request Body
```json
{
  "masterId": "uuid"
}
```

### Response `200`
Success message

---

## `POST /api/v1/child/copying/resume`
Resume copying for a master.

### Request Body
```json
{
  "masterId": "uuid"
}
```

### Response `200`
Success message

---

## `GET /api/v1/child/copied-trades`
Get copied trades.

### Response `200`
Copied trades list

---

## `GET /api/v1/child/analytics`
Get child analytics.

### Response `200`
Analytics object

---

# 5. Admin APIs

## `GET /api/v1/admin/users`
Get users list.

### Query Params
- `role` — `string`
- `status` — `string`
- `page` — `integer`, default `1`
- `limit` — `integer`, default `20`

### Response `200`
Users list

---

## `GET /api/v1/admin/users/{userId}`
Get user detail.

### Path Params
- `userId` — `uuid`

### Response `200`
```json
{
  "userId": "uuid",
  "name": "string",
  "email": "string",
  "role": "string",
  "status": "string",
  "phone": "string",
  "twoFactorEnabled": true,
  "createdAt": "datetime",
  "brokerAccounts": [{}]
}
```

---

## `PUT /api/v1/admin/users/{userId}`
Update user.

### Path Params
- `userId` — `uuid`

### Request Body
```json
{
  "name": "string",
  "email": "string",
  "phone": "string"
}
```

### Response `200`
Updated user object

---

## `DELETE /api/v1/admin/users/{userId}`
Delete user.

### Path Params
- `userId` — `uuid`

### Response `200`
Success message

---

## `POST /api/v1/admin/users/master`
Create master user.

### Request Body
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "phone": "string"
}
```

### Response `201`
Created

---

## `POST /api/v1/admin/users/child`
Create child user.

### Request Body
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "phone": "string",
  "assignedMasterId": "uuid"
}
```

### Response `201`
Created

---

## `PATCH /api/v1/admin/users/{userId}/activate`
Activate user.

### Path Params
- `userId` — `uuid`

### Response `200`
Success message

---

## `PATCH /api/v1/admin/users/{userId}/deactivate`
Deactivate user.

### Path Params
- `userId` — `uuid`

### Response `200`
Success message

---

## `GET /api/v1/admin/trade-logs`
Get trade logs.

### Query Params
- `userId` — `uuid` (optional)
- `status` — `string` (optional)

### Response `200`
Trade logs list

---

## `GET /api/v1/admin/system-health`
Get system health.

### Response `200`
System health object

---

## `GET /api/v1/admin/subscriptions`
Get subscriptions.

### Query Params
- `masterId` — `uuid` (optional)
- `status` — `string` (optional)

### Response `200`
Subscription list

---

## `GET /api/v1/admin/analytics`
Get platform analytics.

### Response `200`
Analytics object

---

## `GET /api/v1/admin/brokers/status`
Get broker health/status.

### Response `200`
Broker status object/list

---

## `GET /api/v1/admin/brokers/accounts`
Get broker accounts.

### Query Params
- `userId` — `uuid` (optional)
- `brokerId` — `string` (optional)

### Response `200`
Broker accounts list

---

# 6. Subscription APIs

## `POST /api/subscriptions`
Create a subscription record.

### Request Body
```json
{
  "id": 0,
  "masterId": "uuid",
  "childId": "uuid",
  "brokerAccountId": "uuid",
  "scalingFactor": 0,
  "copyingStatus": "string",
  "approvedOnce": true,
  "createdAt": "datetime"
}
```

### Response `200`
```json
{
  "id": 0,
  "masterId": "uuid",
  "childId": "uuid",
  "brokerAccountId": "uuid",
  "scalingFactor": 0,
  "copyingStatus": "string",
  "approvedOnce": true,
  "createdAt": "datetime"
}
```

---

## `GET /api/subscriptions/master/{masterId}`
Get subscriptions for a master.

### Path Params
- `masterId` — `uuid`

### Response `200`
```json
[
  {
    "id": 0,
    "masterId": "uuid",
    "childId": "uuid",
    "brokerAccountId": "uuid",
    "scalingFactor": 0,
    "copyingStatus": "string",
    "approvedOnce": true,
    "createdAt": "datetime"
  }
]
```

---

# 7. Health APIs

## `GET /`
Basic root health endpoint.

### Response `200`
Health object

---

## `GET /health`
Health check endpoint.

### Response `200`
Health object

---

# 8. Notes / Cleanup Suggestions

A few things in the source spec look inconsistent and may need cleanup:

- `reject` and `decline` both exist for master child request handling.
- `POST /api/v1/master/subscribe/{childId}` overlaps conceptually with child subscription APIs.
- Subscription APIs use `/api/subscriptions` while the rest mostly use `/api/v1/...`.
- Some Swagger request/response examples are generic placeholders like `additionalProp1`, so exact final response shapes are still undefined.

---

# 9. Suggested Future Missing APIs

These are not present in the shared spec but are typically needed for a full copy-trading platform:

- Place order
- Modify order
- Cancel order
- Order book
- Trade book
- Live positions
- Holdings
- Instrument search
- Market quote / LTP
- Copy execution logs
- Risk management endpoints
- Reconciliation endpoints

