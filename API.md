# CS 162 Attendance API Documentation

## Authentication

All API endpoints require authentication using NextAuth. Users must be logged in and have admin privileges to access these endpoints.

## Sessions

### Get All Sessions

- **GET** `/api/sessions`
- **Query Parameters:**
  - `recurringSessionId` (optional): Filter sessions by recurring session ID
- **Response:** List of sessions with creator information
- **Authentication:** Admin only

### Get Session Details

- **GET** `/api/sessions/[id]`
- **Response:** Single session object with details
- **Authentication:** Admin only

### Create Session

- **POST** `/api/sessions`
- **Request Body:**
  ```json
  {
    "name": "string",
    "expirationValue": "number",
    "expirationUnit": "seconds" | "minutes" | "hours",
    "recurringSessionId": "string (optional)"
  }
  ```
- **Response:** Newly created session object
- **Authentication:** Admin only

## Recurring Sessions

### Get All Recurring Sessions

- **GET** `/api/recurring-sessions`
- **Response:** List of recurring sessions with student count
- **Authentication:** Admin only

### Create Recurring Session

- **POST** `/api/recurring-sessions`
- **Request Body:**
  ```json
  {
    "name": "string",
    "studentNames": "string[]"
  }
  ```
- **Response:** Newly created recurring session object
- **Authentication:** Admin only

### Get Recurring Session Details

- **GET** `/api/recurring-sessions/[id]`
- **Response:** Single recurring session object
- **Authentication:** Admin only

### Get Recurring Session Roster

- **GET** `/api/recurring-sessions/[id]/roster`
- **Response:** List of students in the roster
- **Authentication:** Admin only

### Update Recurring Session Roster

- **PUT** `/api/recurring-sessions/[id]/roster`
- **Request Body:**
  ```json
  {
    "studentNames": "string[]"
  }
  ```
- **Response:** Updated list of students
- **Authentication:** Admin only

### Start Recurring Session

- **POST** `/api/recurring-sessions/[id]/start`
- **Request Body:**
  ```json
  {
    "name": "string",
    "expirationSeconds": "number"
  }
  ```
- **Response:** Newly created session object
- **Authentication:** Admin only

## Attendance

### Get Session Attendance

- **GET** `/api/attendance`
- **Query Parameters:**
  - `sessionId`: Required session ID
- **Response:** List of attendees with timestamps
- **Authentication:** Admin only

### Mark Attendance

- **POST** `/api/attendance`
- **Request Body:**
  ```json
  {
    "code": "string"
  }
  ```
- **Response:** Success confirmation
- **Authentication:** Any authenticated user

### Manual Attendance

- **PUT** `/api/attendance`
- **Request Body:**
  ```json
  {
    "sessionId": "string",
    "name": "string"
  }
  ```
- **Response:** Success confirmation
- **Authentication:** Admin only

### Excuse Absence

- **PUT** `/api/attendance/[sessionId]/excuse`
- **Request Body:**
  ```json
  {
    "userId": "string"
  }
  ```
- **Response:** Success confirmation
- **Authentication:** Admin only

## Students

### Get Student Details

- **GET** `/api/students/[email]`
- **Response:** Student information
- **Authentication:** Admin only

### Get Student Attendance History

- **GET** `/api/students/[email]/attendance`
- **Response:** Student's attendance history and statistics
- **Authentication:** Admin only

## Admins

### Get All Admins

- **GET** `/api/admins`
- **Response:** List of admins with session counts
- **Authentication:** Admin only

### Add Admin

- **POST** `/api/admins`
- **Request Body:**
  ```json
  {
    "email": "string",
    "name": "string (optional)"
  }
  ```
- **Response:** Success confirmation
- **Authentication:** Admin only

### Remove Admin

- **DELETE** `/api/admins`
- **Request Body:**
  ```json
  {
    "email": "string"
  }
  ```
- **Response:** Success confirmation
- **Authentication:** Admin only

## Analytics

### Get Analytics Data

- **GET** `/api/analytics`
- **Response:** Analytics data including:
  - Total sessions
  - Total unique students
  - Average attendance per session
  - Attendance over time (last 7 sessions)
- **Authentication:** Admin only

## Attendance Codes

### Generate Attendance Code

- **GET** `/api/code`
- **Query Parameters:**
  - `sessionId`: Required session ID
- **Response:**
  ```json
  {
    "code": "string",
    "expiresAt": "string (ISO date)"
  }
  ```
- **Authentication:** Admin only

## Error Responses

All endpoints may return the following error responses:

- **401 Unauthorized:**

  ```json
  {
    "error": "Unauthorized"
  }
  ```

- **400 Bad Request:**

  ```json
  {
    "error": "Error message describing the issue"
  }
  ```

- **404 Not Found:**

  ```json
  {
    "error": "Resource not found message"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "error": "Error message describing the issue"
  }
  ```
