# WebSocket Auth Consistency Fix - Bugfix Design

## Overview

This bugfix addresses an authentication inconsistency in `WebSocketContext.tsx` where native `fetch()` calls bypass the centralized authentication system. The file contains four API calls (`refreshNotifications`, `fetchUnreadCount`, `markAsRead`, `markAllAsRead`) that manually manage JWT tokens instead of using the centralized `api` instance from `lib/api.ts`. This creates several problems:

1. **Code Duplication**: Manual token injection duplicates logic already handled by axios interceptors
2. **Missing Guest Token Support**: Guest users cannot access notification endpoints because the `X-Guest-Token` header is never included
3. **Inconsistent Error Handling**: 401 errors are logged to console instead of triggering the centralized redirect logic
4. **Missing Token Storage**: API responses containing `guest_token` are not stored for future requests

The fix is straightforward: replace all four `fetch()` calls with the corresponding `api` methods (`api.get()`, `api.put()`), which automatically handle JWT tokens, guest tokens, token storage, and 401 error redirects through axios interceptors.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when any of the four notification API calls are made using native `fetch()` instead of the centralized `api` instance
- **Property (P)**: The desired behavior - all notification API calls should use the centralized `api` instance to ensure consistent authentication handling
- **Preservation**: Existing WebSocket functionality (real-time notifications, toast displays, state management, Socket.io connection) that must remain unchanged by the fix
- **api instance**: The centralized axios instance in `lib/api.ts` that provides automatic JWT token injection, guest token injection, guest token storage, and 401 error handling via interceptors
- **JWT token**: The authentication token stored in `localStorage.getItem('ilena_token')` for authenticated users
- **Guest token**: The temporary token stored via `getGuestToken()`/`setGuestToken()` for unauthenticated users, sent in the `X-Guest-Token` header
- **Request interceptor**: Axios middleware that automatically adds `Authorization: Bearer ${token}` or `X-Guest-Token` headers before sending requests
- **Response interceptor**: Axios middleware that stores `guest_token` from responses and handles 401 errors by removing tokens and redirecting to `/login`

## Bug Details

### Bug Condition

The bug manifests when any of the four notification API functions (`refreshNotifications`, `fetchUnreadCount`, `markAsRead`, `markAllAsRead`) are called. These functions use native `fetch()` with manual token management, bypassing the centralized authentication system that handles JWT tokens, guest tokens, token storage, and error handling.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { functionName: string, implementation: string }
  OUTPUT: boolean
  
  RETURN input.functionName IN ['refreshNotifications', 'fetchUnreadCount', 'markAsRead', 'markAllAsRead']
         AND input.implementation.includes('fetch(')
         AND input.implementation.includes('Authorization: `Bearer ${token}`')
         AND NOT input.implementation.includes('api.get(') 
         AND NOT input.implementation.includes('api.put(')
END FUNCTION
```

### Examples

**Example 1: refreshNotifications() - Missing Guest Token Support**
- **Current (Buggy)**: Uses `fetch()` with `Authorization: Bearer ${token}` header only
- **Expected**: Should use `api.get()` which automatically includes `X-Guest-Token` for guest users
- **Impact**: Guest users cannot fetch notifications because the guest token is never sent

**Example 2: markAsRead() - Inconsistent 401 Error Handling**
- **Current (Buggy)**: 401 errors are caught and logged to `console.error()` without redirecting
- **Expected**: Should use `api.put()` which triggers the response interceptor to remove token and redirect to `/login`
- **Impact**: Authenticated users with expired tokens see console errors instead of being redirected to login

**Example 3: fetchUnreadCount() - Missing Token Storage**
- **Current (Buggy)**: If the API response contains a `guest_token` field, it is ignored
- **Expected**: Should use `api.get()` which automatically stores `guest_token` via the response interceptor
- **Impact**: Guest tokens from API responses are lost, breaking the guest authentication flow

**Example 4: markAllAsRead() - Code Duplication**
- **Current (Buggy)**: Manually constructs URL with `process.env.NEXT_PUBLIC_API_URL` and manually adds `Authorization` header
- **Expected**: Should use `api.put('/api/notifications/read-all')` which handles baseURL and headers automatically
- **Impact**: Duplicates logic that already exists in the centralized api instance

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Real-time notification delivery via Socket.io must continue to work exactly as before
- Toast notifications must continue to display when new notifications arrive
- Notification state management (adding new notifications, updating read status) must remain unchanged
- Socket.io authentication using JWT token in the auth handshake must remain unchanged
- Navigation to notification-related routes when clicking toast notifications must remain unchanged
- WebSocket connection lifecycle (connect, disconnect, cleanup on unmount) must remain unchanged
- Parallel loading of notifications and unread count on component mount must remain unchanged
- Conditional rendering logic (skip connection if not admin or no token) must remain unchanged

**Scope:**
All functionality that does NOT involve the four HTTP API calls (`refreshNotifications`, `fetchUnreadCount`, `markAsRead`, `markAllAsRead`) should be completely unaffected by this fix. This includes:
- Socket.io connection establishment and event handling
- Toast notification display logic and UI components
- React state management for notifications and unread count
- Notification click handlers and routing logic
- Component lifecycle hooks and cleanup functions

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Historical Implementation**: The WebSocketContext was likely implemented before the centralized `api` instance was created, or by a developer unaware of the centralized authentication system. The code uses native `fetch()` because that was the simplest approach at the time.

2. **Lack of Awareness**: The developer who wrote this code may not have known about the axios interceptors in `lib/api.ts` that handle JWT tokens, guest tokens, and 401 errors automatically.

3. **Copy-Paste Pattern**: All four functions follow the same pattern (native `fetch()` with manual token injection), suggesting they were copied from a single implementation without considering the centralized authentication system.

4. **No Guest Token Requirements Initially**: When this code was written, guest token support may not have been a requirement, so the manual JWT-only approach seemed sufficient.

## Correctness Properties

Property 1: Bug Condition - API Calls Use Centralized Authentication

_For any_ notification API call (refreshNotifications, fetchUnreadCount, markAsRead, markAllAsRead), the fixed implementation SHALL use the centralized `api` instance methods (`api.get()` or `api.put()`), which automatically inject JWT tokens for authenticated users, inject guest tokens for unauthenticated users, store guest tokens from responses, and handle 401 errors with redirect logic.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Preservation - WebSocket Functionality Unchanged

_For any_ WebSocket-related functionality that does NOT involve the four HTTP API calls (Socket.io connection, real-time event handling, toast display, state management, routing), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing real-time notification features.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

**File**: `frontend/contexts/WebSocketContext.tsx`

**Specific Changes**:

1. **Add Import Statement**: Add `import api from '@/lib/api';` at the top of the file to import the centralized axios instance

2. **Replace refreshNotifications() fetch call**:
   - **Before**: 
     ```typescript
     const response = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications?page=1&limit=50`,
       {
         headers: {
           Authorization: `Bearer ${token}`,
         },
       }
     );
     ```
   - **After**: 
     ```typescript
     const response = await api.get('/api/notifications?page=1&limit=50');
     ```
   - **Changes**: Remove manual URL construction, remove manual Authorization header, use `api.get()` with relative path

3. **Replace fetchUnreadCount() fetch call**:
   - **Before**: 
     ```typescript
     const response = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/unread-count`,
       {
         headers: {
           Authorization: `Bearer ${token}`,
         },
       }
     );
     ```
   - **After**: 
     ```typescript
     const response = await api.get('/api/notifications/unread-count');
     ```
   - **Changes**: Remove manual URL construction, remove manual Authorization header, use `api.get()` with relative path

4. **Replace markAsRead() fetch call**:
   - **Before**: 
     ```typescript
     const response = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/${notificationId}/read`,
       {
         method: 'PUT',
         headers: {
           Authorization: `Bearer ${token}`,
         },
       }
     );
     ```
   - **After**: 
     ```typescript
     const response = await api.put(`/api/notifications/${notificationId}/read`);
     ```
   - **Changes**: Remove manual URL construction, remove manual Authorization header, use `api.put()` with relative path

5. **Replace markAllAsRead() fetch call**:
   - **Before**: 
     ```typescript
     const response = await fetch(
       `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/read-all`,
       {
         method: 'PUT',
         headers: {
           Authorization: `Bearer ${token}`,
         },
       }
     );
     ```
   - **After**: 
     ```typescript
     const response = await api.put('/api/notifications/read-all');
     ```
   - **Changes**: Remove manual URL construction, remove manual Authorization header, use `api.put()` with relative path

6. **Update response handling**: Change `response.ok` checks to axios response handling (axios throws on non-2xx status codes, so the try-catch already handles errors correctly)

7. **Update data access**: Change `response.json()` to `response.data` (axios automatically parses JSON responses)

8. **Remove token dependency**: Remove `token` from the dependency arrays of `refreshNotifications`, `fetchUnreadCount`, `markAsRead`, and `markAllAsRead` since the api instance handles token injection automatically

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that native `fetch()` calls fail to handle guest tokens and 401 errors correctly.

**Test Plan**: Write tests that simulate API calls with different authentication states (authenticated user, guest user, expired token) and verify that the current implementation fails to handle these cases correctly. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Guest User Notification Fetch**: Call `refreshNotifications()` as a guest user (no JWT token) and verify that the `X-Guest-Token` header is NOT included (will fail on unfixed code)
2. **Expired Token 401 Handling**: Call `markAsRead()` with an expired JWT token, trigger a 401 response, and verify that the user is NOT redirected to `/login` (will fail on unfixed code - only logs to console)
3. **Guest Token Storage**: Call `fetchUnreadCount()` and receive a response with `guest_token` field, verify that the token is NOT stored (will fail on unfixed code)
4. **Manual Token Injection**: Inspect the network request for `markAllAsRead()` and verify that the `Authorization` header is manually constructed instead of using interceptors (will fail on unfixed code)

**Expected Counterexamples**:
- Guest token header is missing from requests when no JWT token is present
- 401 errors are logged to console without triggering redirect logic
- Guest tokens from API responses are not stored for future requests
- Manual token injection duplicates logic that should be handled by interceptors

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (the four notification API calls), the fixed function produces the expected behavior (uses centralized api instance).

**Pseudocode:**
```
FOR ALL functionName IN ['refreshNotifications', 'fetchUnreadCount', 'markAsRead', 'markAllAsRead'] DO
  implementation := getImplementation(functionName)
  ASSERT implementation.includes('api.get(') OR implementation.includes('api.put(')
  ASSERT NOT implementation.includes('fetch(')
  ASSERT NOT implementation.includes('Authorization: `Bearer ${token}`')
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (WebSocket functionality, toast display, state management), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL functionality WHERE NOT isBugCondition(functionality) DO
  ASSERT originalBehavior(functionality) = fixedBehavior(functionality)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different notification types and states
- It catches edge cases that manual unit tests might miss (e.g., different notification types, various unread counts)
- It provides strong guarantees that WebSocket behavior is unchanged for all scenarios

**Test Plan**: Observe behavior on UNFIXED code first for WebSocket events, toast displays, and state updates, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Socket.io Connection Preservation**: Verify that WebSocket connection is established with JWT token in auth handshake (same as before)
2. **Real-time Notification Preservation**: Verify that `notification:new` events trigger toast displays and state updates (same as before)
3. **Toast Display Preservation**: Verify that toast notifications render with correct icons, titles, and action buttons (same as before)
4. **State Management Preservation**: Verify that marking notifications as read updates local state correctly (same as before)
5. **Navigation Preservation**: Verify that clicking notification toasts navigates to correct routes (same as before)
6. **Cleanup Preservation**: Verify that component unmount disconnects Socket.io connection (same as before)
7. **Conditional Logic Preservation**: Verify that non-admin users or users without tokens skip WebSocket connection (same as before)

### Unit Tests

- Test that `refreshNotifications()` uses `api.get()` with correct endpoint
- Test that `fetchUnreadCount()` uses `api.get()` with correct endpoint
- Test that `markAsRead()` uses `api.put()` with correct endpoint and notification ID
- Test that `markAllAsRead()` uses `api.put()` with correct endpoint
- Test that axios response data is accessed via `response.data` instead of `response.json()`
- Test that error handling works correctly (axios throws on non-2xx status codes)
- Test that token is no longer in dependency arrays (api instance handles it)

### Property-Based Tests

- Generate random notification states and verify that API calls use the centralized api instance
- Generate random authentication states (authenticated, guest, expired token) and verify that the api instance handles them correctly via interceptors
- Generate random notification IDs and verify that `markAsRead()` constructs the correct URL
- Test that all WebSocket functionality continues to work across many scenarios (different notification types, various unread counts, multiple simultaneous notifications)

### Integration Tests

- Test full notification flow: receive real-time notification via Socket.io, display toast, click toast, mark as read via API, navigate to route
- Test guest user flow: access notifications as guest, verify guest token is included in requests, verify guest token is stored from responses
- Test expired token flow: make API call with expired token, verify 401 triggers redirect to `/login`
- Test that switching between authenticated and guest states works correctly
- Test that parallel loading of notifications and unread count on mount works correctly
