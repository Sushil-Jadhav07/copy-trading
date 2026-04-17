# Broker Dashboard API

## Overview
Single API to fetch all demat account details after broker connection.

## Endpoint
GET /api/v1/brokers/accounts/{accountId}/dashboard

Auth:
Authorization: Bearer <accessToken>

## When to Call
After broker login succeeds (SESSION_ACTIVE):

1. POST /brokers/accounts → Link (get accountId)  
2. POST /brokers/accounts/{id}/login → Login (get SESSION_ACTIVE)  
3. GET /brokers/accounts/{id}/dashboard → Fetch everything

## Response
{
  "accountId": "60120a19-23b8-4f6a-8007-81c2054a509e",
  "brokerId": "ZERODHA",
  "brokerName": "Zerodha",
  "clientId": "DRX617",
  "nickname": "My Zerodha",
  "status": "ACTIVE",
  "sessionActive": true
}

## Balance Alert API
GET /api/v1/brokers/accounts/{accountId}/balance-alert

## Connection Signal API
GET /api/v1/brokers/accounts/{accountId}/signal

## Trade Copy Engine
POST /api/v1/engine/copy-trade

## Engine Status
GET /api/v1/engine/status
