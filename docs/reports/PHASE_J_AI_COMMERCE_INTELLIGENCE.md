# Phase J: Advanced AI Commerce Intelligence

This phase implements enterprise-grade, retrieval-augmented intelligence and analytics for the APEX LUXE platform. It transforms APEX LUXE from a standard transactional storefront into an AI-driven, predictive retail ecosystem.

---

## Architecture Overview

The Advanced AI Commerce Intelligence system is designed for high throughput, caching-optimized background processing, and fallback stability:

```
                  ┌──────────────────────────────┐
                  │   Admin UI / Frontend App    │
                  └──────────────┬───────────────┘
                                 │ HTTP / JSON
                                 ▼
                  ┌──────────────────────────────┐
                  │  AI Intelligence Controller  │
                  └──────────────┬───────────────┘
                                 │
                  ┌──────────────┴───────────────┐
                  ▼                              ▼
        ┌──────────────────┐           ┌──────────────────┐
        │  Redis Service   │           │  BullMQ Queue    │
        │  (24-Hour Cache) │           │  (Background)    │
        └─────────▲────────┘           └─────────┬────────┘
                  │                              │
                  │                              ▼
                  │                    ┌──────────────────┐
                  │                    │  Worker Process  │
                  │                    └─────────┬────────┘
                  │                              │
                  └──────────────┬───────────────┘
                                 ▼
                  ┌──────────────────────────────┐
                  │      AI Core Services        │
                  │ (Pricing, Forecast, Trend,   │
                  │   Segmentation, Executive)   │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │  Groq Inference API │
                      │  (Llama-3.3/3.1)    │
                      └─────────────────────┘
```

### Key Technical Specs:
- **Primary LLM**: `llama-3.3-70b-specdec` via Groq for core analytical reasoning, predictions, and structuring.
- **Copywriting LLM**: `llama-3.1-8b-instant` via Groq for high-velocity marketing content and coupon copy generation.
- **Caching Strategy**: 24-hour Redis caching (`86400` seconds) on all intelligence reports to prevent redundant LLM latency and API costs.
- **Background Queue**: BullMQ processor (`ai-intelligence`) for handling heavy re-computation requests without blocking API request threads.
- **Failover Logic**: Rule-based analytic engines as hot-fallbacks for each service in the event of API limits, network hiccups, or timeout issues.

---

## AI Services & Components

### 1. AI Pricing Service
- **Location**: [pricing.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/pricing.service.ts)
- **Features**: Evaluates gross margins, historical orders, and product sales velocity. Computes recommended base prices, discount limits, and inventory health adjustments.
- **Logic**:
  - High velocity + low margin → recommends slight price increases to optimize profit.
  - Low velocity + high stock → recommends strategic discounts to clear warehousing.

### 2. Demand & Inventory Forecasting
- **Location**: [forecasting.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/forecasting.service.ts)
- **Features**: Analyzes historical sales velocity (90 days) across products, categories, and regional setups.
- **Predictions**:
  - Predicted unit sales for the next 30 days.
  - Category and region-specific growth trajectories.
  - Warehouse-level stock depletion days, reorder quantities, and inventory health scoring.

### 3. Trend & Merchandising Engine
- **Location**: [trend-merchandising.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/trend-merchandising.service.ts)
- **Features**: Examines search queries, click-through rates, conversions, and wishlist additions.
- **Outputs**:
  - Dynamic homepage product merchandising rankings.
  - Emerging search term trends and category growth indices.
  - Trending colors and aesthetic affinity flags.

### 4. Customer Segmentation & Churn Service
- **Location**: [customer-fraud.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/customer-fraud.service.ts)
- **Features**: Conducts RFM (Recency, Frequency, Monetary) segmentation.
- **Segments**: `VIP`, `Loyal`, `New`, `At-Risk`, `Churn-Risk`. Calculates retention actions, churn scoring, and targeted reactivation incentives.

### 5. AI Fraud Detection
- **Location**: [customer-fraud.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/customer-fraud.service.ts)
- **Features**: Inspects order velocities, multiple shipping address flags, referral sign-ups, and coupon usage statistics to generate a risk score (0 to 100). Flagged orders can block fulfillment or trigger additional verification.

### 6. AI Campaign Generator
- **Location**: [campaign.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/campaign.service.ts)
- **Features**: Generates targeted emails, promotional banner copies, and discount structures using customer segments and trending product catalog metrics.

### 7. Executive Dashboard Aggregator
- **Location**: [executive.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/executive.service.ts)
- **Features**: Unifies data points from pricing, inventory, forecasts, and churn risk services to present a high-level executive trajectory report (revenue projections, key vulnerabilities, and strategic expansion insights).

---

## API Endpoints

The endpoints are defined in [ai-intelligence.controller.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/ai-intelligence.controller.ts):

| Method | Route | Description |
|---|---|---|
| `GET` | `/ai-intelligence/executive` | Returns cached/computed executive dashboard metrics. |
| `GET` | `/ai-intelligence/pricing` | Returns dynamic pricing recommendations. |
| `GET` | `/ai-intelligence/forecasting` | Returns demand and inventory depletion forecasts. |
| `GET` | `/ai-intelligence/segmentation` | Returns RFM customer segments. |
| `GET` | `/ai-intelligence/fraud` | Returns transactions audited for fraud and risk. |
| `GET` | `/ai-intelligence/trends` | Returns catalog trends and merchandising layout orders. |
| `POST` | `/ai-intelligence/campaign` | Generates marketing copies using targeted inputs. |
| `POST` | `/ai-intelligence/refresh` | Triggers background BullMQ re-calculation of all reports. |

---

## Frontend Integration

We created a custom administrative control dashboard to visualize this intelligence in real-time.

- **Route**: [/admin/global-intelligence/page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/admin/global-intelligence/page.tsx)
- **Design & Layout**:
  - Glassmorphic stat cards for key business metrics (Revenue projections, health score, churn risks).
  - Multi-tab UI for navigating between **Executive Trajectory**, **Pricing Recommendations**, **Demand & Inventory Forecasting**, **Customer Segments**, and **Marketing Campaigns**.
  - Interactive "Refresh Analytics" button to trigger asynchronous BullMQ recalculation.
  - Interactive Campaign Copy generator directly inside the dashboard.
