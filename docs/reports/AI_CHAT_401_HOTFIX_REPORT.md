# AI Chat 401 Unauthorized Hotfix Report

## 1. Root Cause Analysis
During network inspection of the Floating AI Assistant and `/ai-stylist` page chat features, guest (unauthenticated) users received a `401 Unauthorized` response when sending requests to:
`POST /api/v1/ai-stylist/chat`

The investigation of the backend controllers revealed that the `@Post('chat')` and `@Get('chat/:sessionId')` endpoints in `AiStylistController` were protected by the strict `@UseGuards(JwtAuthGuard)` decorator. Since guest users are not logged in and do not have JWT credentials in their requests, the NestJS Passport guard immediately rejected the requests with a `401 Unauthorized` status before the controller handler could be invoked. 

However, the underlying service `sendMessageToChatSession` has built-in support for guest sessions by setting the `userId` field to `null` if the user is unauthenticated. The same guard constraint also prevented guest users from performing outfit image uploads (`POST /ai-stylist/analyze`) and sportswear outfit generation (`POST /ai-stylist/generate-outfit`).

---

## 2. Solution Implemented

1. **Created `OptionalJwtAuthGuard`**:
   Created a new guard [optional-jwt-auth.guard.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/auth/guards/optional-jwt-auth.guard.ts) that extends NestJS `AuthGuard('jwt')`. It overrides the `handleRequest` hook to return `null` instead of throwing an `UnauthorizedException` when the JWT signature is missing or invalid:
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { AuthGuard } from '@nestjs/passport';

   @Injectable()
   export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
     handleRequest(err, user, info, context) {
       if (err || !user) {
         return null;
       }
       return user;
     }
   }
   ```

2. **Updated `AiStylistController`**:
   Modified [ai-stylist.controller.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/ai-stylist/ai-stylist.controller.ts) to replace `JwtAuthGuard` with `OptionalJwtAuthGuard` for all endpoints that should support optional authentication:
   * `POST /ai-stylist/analyze` (Outfit analysis upload)
   * `POST /ai-stylist/generate-outfit` (Curated outfit generation)
   * `POST /ai-stylist/chat` (Conversational message sender)
   * `GET /ai-stylist/chat/:sessionId` (Message history fetch)
   * `GET /ai-stylist/analysis/:id` (Single analysis details)

---

## 3. Files Modified
* **[NEW]** [optional-jwt-auth.guard.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/auth/guards/optional-jwt-auth.guard.ts)
* **[MODIFY]** [ai-stylist.controller.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/ai-stylist/ai-stylist.controller.ts)

---

## 4. Verification Results & Proof

We verified the hotfix by triggering actual `Invoke-RestMethod` HTTP queries against the backend service running on port `5000` as a guest shopper (without sending an `Authorization` header).

### Test 1: Math Query Intent (`17*5+?`)
* **Request**:
  `POST http://localhost:5000/api/v1/ai-stylist/chat` with body `{"sessionId": "test-session-123", "content": "17*5+?"}`
* **Response Status**: `200 OK` (No 401 Unauthorized occurs)
* **Response Body Output**:
  ```json
  {
    "id": "9aae2fe9-9650-4230-bab8-25da6594e06b",
    "sessionId": "test-session-123",
    "role": "assistant",
    "content": "17*5 = 85, equation incomplete.",
    "createdAt": "2026-06-02T20:07:45.106Z"
  }
  ```

### Test 2: General Knowledge Intent (`What is the capital of Egypt?`)
* **Request**:
  `POST http://localhost:5000/api/v1/ai-stylist/chat` with body `{"sessionId": "test-session-123", "content": "What is the capital of Egypt?"}`
* **Response Status**: `200 OK`
* **Response Body Output**:
  ```json
  {
    "id": "e38c1db6-e8b5-482b-9c82-fc3d684e6d90",
    "sessionId": "test-session-123",
    "role": "assistant",
    "content": "The capital of Egypt is Cairo.",
    "createdAt": "2026-06-02T20:07:53.995Z"
  }
  ```

### Test 3: Fashion Recommendation Intent (`Recommend gym clothes for heavy leg day training.`)
* **Request**:
  `POST http://localhost:5000/api/v1/ai-stylist/chat` with body `{"sessionId": "test-session-123", "content": "Recommend gym clothes for heavy leg day training."}`
* **Response Status**: `200 OK`
* **Response Body Output**:
  ```json
  {
    "id": "a8f95ac1-b686-42ba-99c0-f67f5f72b047",
    "sessionId": "test-session-123",
    "role": "assistant",
    "content": "For an intense leg day, you'll want attire that prioritizes mobility, compression, and moisture-wicking properties. I recommend pairing the Titanfit Joggers (Bottoms & Joggers, $125) with the Primefit Oversized Tee (Tops & Tees, $98) or the Motiondry Training Shirt (Tops & Tees, $91)...",
    "createdAt": "2026-06-02T20:08:01.138Z"
  }
  ```

### Test 4: Chat History Retrieval (`GET /chat/:sessionId`)
* **Request**:
  `GET http://localhost:5000/api/v1/ai-stylist/chat/test-session-123`
* **Response Status**: `200 OK`
* **Response Body Output**:
  Contains the full list of sequential messages exchanged above, verifying history works correctly for guest sessions.
