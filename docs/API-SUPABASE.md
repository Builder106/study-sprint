# StudySprint Supabase & Backend API Specification

This document details the PostgreSQL stored procedures (RPCs) and Deno Edge Functions utilized by StudySprint for backend aggregations, gamification, and third-party AI/calendar integrations.

---

## PostgreSQL Stored Procedures (RPCs)

### 1. `analytics_summary(p_user_id uuid)`
Returns aggregated analytics metrics for the authenticated user's dashboard over a 365-day window.

* **Parameters**: `p_user_id` (UUID)
* **Returns**: JSON object containing:
  * `heatmap`: Array of `{ date: string, count: number, hours: number }` for 365 days.
  * `hourly_distribution`: 24-element array of hours logged per hour of day (0-23).
  * `day_of_week_distribution`: 7-element array of hours logged per weekday (Sun-Sat).
  * `subject_distribution`: Array of `{ subject: string, hours: number, percentage: number }`.

### 2. `set_goal_subjects(p_goal_id uuid, p_subjects text[])`
Atomically updates the subject tags associated with a study goal.

* **Parameters**: `p_goal_id` (UUID), `p_subjects` (Text Array)
* **Returns**: Void.

### 3. `get_public_profile(p_username text)`
Fetches a user's public profile, level, active plant stage, and total focus hours if public sharing is enabled.

* **Parameters**: `p_username` (Text)
* **Returns**: Profile JSON object or `null` if private/not found.

### 4. `get_weekly_leaderboard()`
Retrieves top 50 users ranked by total focus hours in the current calendar week.

* **Parameters**: None
* **Returns**: Array of `{ rank: number, username: string, display_name: string, weekly_hours: number, plant_stage: string }`.

### 5. `reset_account_data(p_user_id uuid)`
Clears all study sessions, goals, XP, and streak progress for an account while maintaining auth identity and username.

* **Parameters**: `p_user_id` (UUID)
* **Returns**: Void.

---

## Deno Edge Functions (`supabase/functions/`)

### 1. `syllabus-parse`
Parses PDF or raw text syllabi and returns structured study goals.

* **Endpoint**: `/functions/v1/syllabus-parse`
* **Method**: `POST`
* **Payload**:
```json
{
  "content": "CS 201 Data Structures Syllabus...",
  "contentType": "text/plain" | "application/pdf"
}
```
* **Response (200 OK)**:
```json
{
  "goals": [
    {
      "title": "Module 1: Binary Search Trees",
      "targetHours": 12,
      "targetDate": "2026-09-30",
      "subjects": ["Computer Science", "Algorithms"]
    }
  ]
}
```

### 2. `google-calendar`
Handles OAuth 2.0 PKCE token exchange, calendar event imports, and study session exports.

* **Endpoint**: `/functions/v1/google-calendar`
* **Method**: `POST`
* **Actions**: `exchange_token`, `import_events`, `export_session`
