import http from 'k6/http';
import { sleep, check } from 'k6';

// k6 configurations
export const options = {
  scenarios: {
    // 1. Low Load Scenario (100 users)
    low_load: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 5,
      maxDuration: '1m',
      startTime: '0s',
    },
    // 2. Medium Load Scenario (500 users)
    medium_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 0 },
      ],
      startTime: '1m',
    },
    // 3. High Load Scenario (1000 users)
    high_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      startTime: '3m',
    },
    // 4. Stress Load Scenario (5000 users)
    stress_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 5000 },
        { duration: '2m', target: 5000 },
        { duration: '1m', target: 0 },
      ],
      startTime: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // less than 1% errors
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete under 1.5s
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api/v1';

export default function () {
  // Use a mock/random email to avoid constraint conflicts on register tests
  const randNum = Math.floor(Math.random() * 1000000);
  const email = `testuser-${randNum}@apexluxe.com`;
  const password = 'UserPassword123!';

  // --- Step 1: Register ---
  const registerPayload = JSON.stringify({
    email: email,
    password: password,
    name: 'k6 Load Tester',
  });
  const headers = { 'Content-Type': 'application/json' };

  let res = http.post(`${BASE_URL}/auth/register`, registerPayload, { headers });
  check(res, {
    'register status is 201 or 409': (r) => r.status === 201 || r.status === 409,
  });

  sleep(1);

  // --- Step 2: Login (For admin/bootstrap, we might use default credentials if register needs verification)
  // Let's attempt to log in using the newly created credentials.
  // Note: Standard flows require verification, so we fallback to a verified test account or check responses
  const loginPayload = JSON.stringify({
    email: 'admin@apexluxe.com', // bootstrap super_admin email
    password: 'StrongPassword123!',
  });
  
  res = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers });
  const loginOk = check(res, {
    'login status is 200': (r) => r.status === 200,
    'has access token': (r) => r.json().accessToken !== undefined,
  });

  let authHeaders = { 'Content-Type': 'application/json' };
  if (loginOk) {
    const token = res.json().accessToken;
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  sleep(1);

  // --- Step 3: Browse Catalog ---
  res = http.get(`${BASE_URL}/products`);
  check(res, {
    'get products status is 200': (r) => r.status === 200,
    'products list is array': (r) => Array.isArray(r.json()),
  });

  const products = res.json();
  let selectedProductId = null;
  if (products && products.length > 0) {
    selectedProductId = products[0].id;
  }

  sleep(1);

  // --- Step 4: Product Detail ---
  if (selectedProductId) {
    res = http.get(`${BASE_URL}/products/${selectedProductId}`);
    check(res, {
      'get product detail status is 200': (r) => r.status === 200,
    });
  }

  sleep(1);

  // --- Step 5: Semantic Search ---
  res = http.get(`${BASE_URL}/search?q=performance+black+compression`);
  check(res, {
    'search status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // --- Step 6: AI Stylist Assistant chat ---
  if (loginOk) {
    const chatPayload = JSON.stringify({
      sessionId: 'k6-session-id',
      content: 'Can you recommend a compression top that matches black joggers?',
    });
    res = http.post(`${BASE_URL}/ai-stylist/chat`, chatPayload, { headers: authHeaders });
    check(res, {
      'stylist chat status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    });
  }

  sleep(1);

  // --- Step 7: Create Checkout Intent ---
  if (loginOk && selectedProductId) {
    const checkoutPayload = JSON.stringify({
      items: [
        {
          productId: selectedProductId,
          size: 'M',
          color: 'Onyx Black',
          quantity: 1,
        },
      ],
      successUrl: 'http://localhost:3000/checkout/success',
      cancelUrl: 'http://localhost:3000/checkout/cancel',
    });
    res = http.post(`${BASE_URL}/payments/checkout-session`, checkoutPayload, { headers: authHeaders });
    check(res, {
      'checkout status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    });
  }

  sleep(1);
}
