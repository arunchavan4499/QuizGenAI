# Postman Setup (All Endpoints + JWT)

Files:
- `Hire4thon.postman_collection.json`
- `Hire4thon.postman_environment.json`

## 1. Start backend
From repo root:

```powershell
$env:USE_DB_LEADERBOARD='true'; d:/Codebase/hire4thon/.venv/Scripts/python.exe -m uvicorn --app-dir d:/Codebase/hire4thon/backend app.main:app --host 127.0.0.1 --port 8000
```

## 2. Import in Postman
1. Import collection file: `docs/postman/Hire4thon.postman_collection.json`
2. Import environment file: `docs/postman/Hire4thon.postman_environment.json`
3. Select environment: `Hire4thon Local`

## 3. Recommended run order
1. `GET /health`
2. `POST /auth/register`
3. `POST /auth/login (OAuth2 Password)`
4. `GET /auth/me`
5. Quiz endpoints (`/quiz/explain`, `/quiz/generate`, `/quiz/submit`, `/quiz/insights/final`)
6. Leaderboard endpoints
7. `POST /auth/logout`

## 4. JWT + OAuth2 details
- Login endpoint uses `application/x-www-form-urlencoded` body:
  - `username` = email
  - `password` = password
- After login, test script stores token in environment variable `access_token`.
- Collection auth is configured as Bearer token using `{{access_token}}`.

## 5. Auto-captured variables
- `access_token` from `/auth/login`
- `quiz_id` and `verification_token` from `/quiz/generate`

## 6. Common troubleshooting
- `401 Unauthorized`:
  - Run login request again and confirm `access_token` is non-empty in environment.
  - Ensure protected requests are not overridden with `No Auth`.
- `422` on login:
  - Confirm body type is `x-www-form-urlencoded` and uses `username`, not `email`.
- `502` from quiz/explain endpoints:
  - LLM provider key is missing/invalid or provider unavailable.
