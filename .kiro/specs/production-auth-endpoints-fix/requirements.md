# Requirements Document

## Introduction

This document specifies the requirements for diagnosing and fixing 404 errors occurring on authentication endpoints in the production environment (ilenafurniture.net). The backend is a Node.js/Express application with authentication routes registered at `/api/auth/*`, fronted by an Nginx reverse proxy. The issue manifests as 404 errors when the frontend attempts to access authentication endpoints, while other API endpoints function correctly. The root cause is suspected to be either Nginx proxy configuration issues or frontend environment variable misconfiguration regarding the API base URL.

## Glossary

- **Auth_System**: The authentication subsystem consisting of Express routes handling user registration, login, and profile retrieval
- **Nginx_Proxy**: The Nginx reverse proxy server that forwards HTTP requests from the public domain to the backend application
- **Frontend_Client**: The Next.js frontend application making HTTP requests to authentication endpoints
- **Backend_Server**: The Node.js/Express application serving API endpoints on the production server
- **API_Base_URL**: The environment variable (NEXT_PUBLIC_API_URL) in the frontend that defines the base URL for API requests
- **Auth_Endpoint**: Any HTTP endpoint under the `/api/auth` path (e.g., `/api/auth/login`, `/api/auth/register`, `/api/auth/me`)
- **Proxy_Configuration**: The Nginx configuration file(s) that define how requests are routed to the backend
- **Route_Registration**: The Express middleware configuration that maps URL paths to route handlers in the backend code

## Requirements

### Requirement 1: Nginx Proxy Configuration Verification

**User Story:** As a system administrator, I want to verify the Nginx proxy configuration, so that I can ensure requests to `/api/auth/*` are correctly forwarded to the backend server.

#### Acceptance Criteria

1. THE Nginx_Proxy SHALL have a location block configured for `/api/auth` or `/api` paths
2. WHEN a request is received at `/api/auth/*`, THE Nginx_Proxy SHALL forward the request to the Backend_Server with the correct path prefix
3. THE Proxy_Configuration SHALL include proxy headers (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto) to preserve client information
4. THE Proxy_Configuration SHALL specify the correct backend server address and port where the Backend_Server is listening
5. IF the Proxy_Configuration contains path rewriting rules, THEN THE Nginx_Proxy SHALL preserve the `/api/auth` prefix when forwarding to the Backend_Server

### Requirement 2: Frontend API URL Configuration Verification

**User Story:** As a developer, I want to verify the frontend environment variables, so that I can ensure the Frontend_Client is making requests to the correct API endpoints.

#### Acceptance Criteria

1. THE Frontend_Client SHALL have the API_Base_URL environment variable defined in the production environment
2. THE API_Base_URL SHALL match the expected format for the production domain (either with or without `/api` prefix based on Nginx configuration)
3. WHEN the Frontend_Client constructs authentication requests, THE Frontend_Client SHALL concatenate the API_Base_URL with the endpoint path correctly
4. THE Frontend_Client SHALL not include duplicate path segments (e.g., `/api/api/auth`) in the final request URL

### Requirement 3: Backend Route Registration Verification

**User Story:** As a developer, I want to verify backend route registration, so that I can confirm the Auth_System routes are properly mounted and accessible.

#### Acceptance Criteria

1. THE Backend_Server SHALL register Auth_Endpoint routes at the `/api/auth` path prefix
2. WHEN the Backend_Server starts, THE Backend_Server SHALL successfully mount the authentication router without errors
3. THE Backend_Server SHALL be listening on the configured port and accepting HTTP connections
4. THE Auth_System SHALL respond to requests at `/api/auth/login`, `/api/auth/register`, and `/api/auth/me` with appropriate HTTP status codes (not 404)

### Requirement 4: Endpoint Accessibility Testing

**User Story:** As a system administrator, I want to test endpoint accessibility, so that I can identify which URL patterns successfully reach the backend.

#### Acceptance Criteria

1. WHEN a direct HTTP request is made to the Backend_Server at `http://localhost:PORT/api/auth/login`, THE Backend_Server SHALL respond with a non-404 status code
2. WHEN an HTTP request is made through the Nginx_Proxy to `https://ilenafurniture.net/api/auth/login`, THE Nginx_Proxy SHALL forward the request and return a non-404 status code
3. IF testing with the `/auth/*` path (without `/api` prefix) returns 404, THEN the issue SHALL be identified as a path prefix mismatch
4. THE Auth_Endpoint SHALL return appropriate HTTP status codes (200, 400, 401) based on request validity, not 404 errors

### Requirement 5: Configuration Correction

**User Story:** As a system administrator, I want to correct the identified configuration issue, so that authentication endpoints become accessible in production.

#### Acceptance Criteria

1. IF the Nginx_Proxy configuration is incorrect, THEN THE Proxy_Configuration SHALL be updated to correctly route `/api/auth/*` requests to the Backend_Server
2. IF the API_Base_URL is incorrect, THEN THE Frontend_Client environment variables SHALL be updated with the correct base URL
3. WHEN configuration changes are applied, THE Nginx_Proxy SHALL reload its configuration without dropping existing connections
4. WHEN configuration changes are applied, THE Frontend_Client SHALL be rebuilt and redeployed with the corrected environment variables
5. THE corrected configuration SHALL be validated by successfully making authentication requests from the Frontend_Client through the Nginx_Proxy to the Backend_Server

### Requirement 6: Post-Fix Validation

**User Story:** As a developer, I want to validate the fix, so that I can confirm all authentication endpoints are functioning correctly in production.

#### Acceptance Criteria

1. WHEN the fix is deployed, THE Auth_Endpoint at `/api/auth/login` SHALL accept POST requests and return appropriate responses (400, 401, or 200)
2. WHEN the fix is deployed, THE Auth_Endpoint at `/api/auth/register` SHALL accept POST requests and return appropriate responses (400, 409, or 201)
3. WHEN the fix is deployed, THE Auth_Endpoint at `/api/auth/me` SHALL accept GET requests with authentication tokens and return appropriate responses (401 or 200)
4. THE Frontend_Client SHALL successfully complete authentication flows (login and registration) without encountering 404 errors
5. THE Backend_Server logs SHALL show incoming requests to Auth_Endpoint paths, confirming requests are reaching the backend

### Requirement 7: SSH Access and Diagnostic Capability

**User Story:** As a system administrator, I want to use SSH access to diagnose the issue, so that I can inspect server configuration and logs directly.

#### Acceptance Criteria

1. THE system administrator SHALL have SSH access to the production server hosting the Backend_Server and Nginx_Proxy
2. WHEN connected via SSH, THE system administrator SHALL be able to read the Nginx_Proxy configuration files
3. WHEN connected via SSH, THE system administrator SHALL be able to view Backend_Server logs to confirm the server is running
4. WHEN connected via SSH, THE system administrator SHALL be able to test endpoints locally using curl or similar tools
5. WHEN connected via SSH, THE system administrator SHALL be able to reload Nginx_Proxy configuration after making changes
