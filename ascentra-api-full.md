# 🚀 Ascentra Copy Trading — Complete API Documentation

## 🌐 Base URL
```
https://copy-trading-production-3981.up.railway.app
```

## 🔐 Authentication
All endpoints require:
```
Authorization: Bearer <accessToken>
```

Content-Type:
```
application/json
```

---

# 📌 1. Authentication APIs

## Register
```
POST /api/v1/auth/register
```

## Login
```
POST /api/v1/auth/login
```

## Send OTP
```
POST /api/v1/auth/send-otp
```

## Verify OTP
```
POST /api/v1/auth/verify-otp
```

## Refresh Token
```
POST /api/v1/auth/refresh-token
```

## Logout
```
POST /api/v1/auth/logout
```

## Forgot Password
```
POST /api/v1/auth/forgot-password
```

## Reset Password
```
POST /api/v1/auth/reset-password
```

## Get Profile
```
GET /api/v1/auth/me
```

## Update Profile
```
PUT /api/v1/auth/me
```

## Enable 2FA
```
POST /api/v1/auth/2fa/enable
```

## Verify 2FA
```
POST /api/v1/auth/2fa/verify
```

## Disable 2FA
```
DELETE /api/v1/auth/2fa/disable
```

---

# 👨‍💼 2. Admin APIs

## Users
- GET /api/v1/admin/users
- POST /api/v1/admin/users/master
- POST /api/v1/admin/users/child
- GET /api/v1/admin/users/{userId}
- PUT /api/v1/admin/users/{userId}
- PATCH /activate /deactivate
- DELETE user

## Analytics
```
GET /api/v1/admin/analytics
```

## System Health
```
GET /api/v1/admin/system-health
```

## Subscriptions
```
GET /api/v1/admin/subscriptions
```

## Trade Logs
```
GET /api/v1/admin/trade-logs
```

---

# 🏦 3. Broker APIs

## List Brokers
```
GET /api/v1/brokers
```

## Link Broker
```
POST /api/v1/brokers/accounts
```

## List Accounts
```
GET /api/v1/brokers/accounts
```

## Login Broker
```
POST /api/v1/brokers/accounts/{id}/login
```

## OAuth URL
```
GET /api/v1/brokers/accounts/{id}/oauth-url
```

## Dashboard
```
GET /api/v1/brokers/accounts/{id}/dashboard
```

### Dashboard Includes:
- Profile
- Margin
- Positions
- Holdings
- Orders

---

# 📊 Dashboard Response Example

```json
{
  "accountId": "uuid",
  "brokerId": "ZERODHA",
  "profile": {},
  "margin": {},
  "positions": [],
  "holdings": [],
  "orders": []
}
```

---

# 👑 4. Master APIs

## Manage Children
- GET /master/children
- POST link/unlink
- POST pause/resume
- GET pending approvals

## Scaling
- GET scaling
- PUT scaling

## Analytics
```
GET /api/v1/master/analytics
```

## Trade History
```
GET /api/v1/master/trade-history
```

---

# 👶 5. Child APIs

## Masters
```
GET /api/v1/child/masters
```

## Subscribe
```
POST /api/v1/child/subscriptions
```

## Scaling
```
PUT /api/v1/child/scaling
```

## Pause / Resume
```
POST /api/v1/child/copying/pause
POST /api/v1/child/copying/resume
```

## Analytics
```
GET /api/v1/child/analytics
```

---

# 🔔 6. Notifications

- GET /notifications
- PATCH read
- POST read-all
- DELETE notification

---

# 📜 7. Copy Logs

```
GET /api/v1/copy/logs
```

---

# ⚙️ Copy Trading Flow

### OAuth Flow
1. Link broker  
2. Get OAuth URL  
3. Login  
4. Callback  
5. Create session  
6. Fetch dashboard  

### Groww Flow
1. Provide accessToken  
2. Direct login  

---

# 📊 UI Dashboard Layout Suggestion

```
Account Info
Balance Section
Positions
Holdings
Orders
```

---

# ❗ Error Format

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Error message"
}
```

---

# 🧠 Notes for Frontend Developer

- Always check `sessionActive`
- Handle partial API failures
- Use dashboard API as primary source
- Add fallback UI for errors
- Use polling for live updates

---

# 📄 Source
Converted from PDF: Ascentra API Docs
