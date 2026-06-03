# APEX LUXE AI Analytics & Redis Caching

This document details the telemetry compiler methods, the Groq API prompts, and the Redis cache optimization strategy for administrative analytics insights.

---

## 1. Analytics Telemetry Compiler

The system aggregates live data from the database to compile a holistic telemetry brief:
- **Sales Data**: Monthly revenue summaries and checkout velocities.
- **Inventory Metrics**: Stock counts, low stock warnings, and category distributions.
- **Customer Profiles**: Account signups, verification states, and average transaction values.

---

## 2. Groq LLM Analytics Prompt

The aggregated metrics brief is formatted as a structured JSON object and dispatched to the Groq API (using the `llama3-70b-8192` engine).

### Prompt Intentions
The AI is instructed to perform deep business analysis and return high-fidelity natural language insights covering:
1. **Sales Anomalies**: Identification of unexpected spikes or sudden revenue drops.
2. **Velocity Predictions**: Estimations of product velocity and recommendations for re-stock schedules.
3. **Buying Patterns**: Highlighting buying correlations between categories.
4. **Actionable Suggestions**: Strategic recommendations to optimize pricing or clear low-velocity SKUs.

---

## 3. Redis Caching Optimization Strategy

The Groq API has strict request rate limits. To prevent excessive API calls and "Too Many Requests" exceptions, the backend implements a **Redis cache buffer**:

- **Cache Expiration**: AI-generated briefs are cached in Redis under the key `analytics:ai-insights` for exactly **30 minutes** (1800 seconds).
- **Cache Hit Flow**: When an administrator opens the analytics dashboard:
  1. The system checks Redis first.
  2. If cached insights exist (cache hit), they are returned instantly.
  3. If missing (cache miss), the system queries the database, calls the Groq API, stores the response in Redis, and then returns it.
- **Manual Cache Purges**: System settings allow admins to sweep cache keys if they need to regenerate insights immediately after restocking.
