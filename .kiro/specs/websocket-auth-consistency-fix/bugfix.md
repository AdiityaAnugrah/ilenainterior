# Bugfix Requirements Document

## Introduction

The WebSocketContext.tsx file currently uses native `fetch()` calls for API requests instead of the centralized `api` instance from `lib/api.ts`. This creates an authentication inconsistency where WebSocket-related API calls manually manage JWT tokens and completely bypass the axios interceptors that handle:
- Automatic JWT token injection for authenticated users
- Automatic guest token injection for unauthenticated users
- Guest token storage from API responses
- Centralized 401 error handling and redirect logic

This bug results in code duplication, inconsistent error handling, and missing guest token support in the WebSocket context, which breaks the application's unified authentication flow.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `refreshNotifications()` is called THEN the system uses native `fetch()` with manual `Authorization: Bearer ${token}` header instead of the centralized api instance

1.2 WHEN `fetchUnreadCount()` is called THEN the system uses native `fetch()` with manual `Authorization: Bearer ${token}` header instead of the centralized api instance

1.3 WHEN `markAsRead()` is called THEN the system uses native `fetch()` with manual `Authorization: Bearer ${token}` header instead of the centralized api instance

1.4 WHEN `markAllAsRead()` is called THEN the system uses native `fetch()` with manual `Authorization: Bearer ${token}` header instead of the centralized api instance

1.5 WHEN any of the four fetch calls encounter a 401 error THEN the system logs to console.error without triggering the centralized redirect logic

1.6 WHEN a guest user (without JWT token) accesses notification endpoints THEN the system fails to include the guest token header (`X-Guest-Token`)

1.7 WHEN API responses contain a `guest_token` field THEN the system fails to store it for future requests

### Expected Behavior (Correct)

2.1 WHEN `refreshNotifications()` is called THEN the system SHALL use `api.get()` from the centralized api instance which automatically injects authentication tokens via interceptors

2.2 WHEN `fetchUnreadCount()` is called THEN the system SHALL use `api.get()` from the centralized api instance which automatically injects authentication tokens via interceptors

2.3 WHEN `markAsRead()` is called THEN the system SHALL use `api.put()` from the centralized api instance which automatically injects authentication tokens via interceptors

2.4 WHEN `markAllAsRead()` is called THEN the system SHALL use `api.put()` from the centralized api instance which automatically injects authentication tokens via interceptors

2.5 WHEN any of the four API calls encounter a 401 error THEN the system SHALL trigger the centralized error handling logic which removes the token and redirects to `/login` (for authenticated users)

2.6 WHEN a guest user (without JWT token) accesses notification endpoints THEN the system SHALL automatically include the guest token header (`X-Guest-Token`) via the request interceptor

2.7 WHEN API responses contain a `guest_token` field THEN the system SHALL automatically store it via the response interceptor for future requests

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an authenticated admin user receives a real-time notification via Socket.io THEN the system SHALL CONTINUE TO display toast notifications and update the unread count

3.2 WHEN the WebSocket connection is established THEN the system SHALL CONTINUE TO authenticate using the JWT token in the Socket.io auth handshake

3.3 WHEN notification state is updated locally (after marking as read) THEN the system SHALL CONTINUE TO update the React state correctly

3.4 WHEN a user clicks on a notification toast THEN the system SHALL CONTINUE TO navigate to the appropriate route and mark the notification as read

3.5 WHEN the component unmounts THEN the system SHALL CONTINUE TO properly disconnect the Socket.io connection

3.6 WHEN initial notifications are loaded on mount THEN the system SHALL CONTINUE TO fetch both notifications list and unread count in parallel

3.7 WHEN the user is not an admin or has no token THEN the system SHALL CONTINUE TO skip WebSocket connection and API calls
