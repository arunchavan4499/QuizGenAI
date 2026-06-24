# Prompt to Restore Authentication

You can copy and paste the prompt below to any AI agent (or run it yourself) when you want to restore the login page, JWT authorization, and real API integrations.

---

### Prompt:
```text
Restore the login page, authentication logic, and real backend API integrations that were previously mocked for frontend testing.

Please apply the following changes:

1. In `frontend/src/App.jsx`:
   - Re-import the `LoginPage` component: `import LoginPage from './pages/LoginPage'`
   - Re-import and use `logoutUser` in `handleLogout`: `import { logoutUser } from './services/backendApi'`
   - Change `activePage` state back to start at `'login'` by default.
   - Change `authSession` state back to default to `null`.
   - Update `handleLogout` to make the remote `logoutUser` API request (if `token` exists), clear the state, and redirect back to the `'login'` page.
   - Restore the `activePage === 'login'` condition to render the `<LoginPage onLogin={handleLogin} />` component.

2. In `frontend/src/services/backendApi.js`:
   - Remove the mock return values and restore real HTTP fetches using `requestJson` for:
     - `registerUser`
     - `loginUser`
     - `logoutUser`
     - `explainTopic`
     - `generateQuiz`
     - `submitQuizSection`
     - `fetchFinalInsights`
     - `fetchLeaderboard`
     - `fetchUserProfile`
     - `updateUserProfile`

3. In `frontend/src/services/submissionStreakService.js`:
   - Remove the mock return payload in `fetchSubmissionStreak` and restore the real `fetch` network call to `${baseUrl}/api/submission-streak`.
```

---

### Original Code Reference

Here is the original code that was replaced, in case you need to copy and paste it back manually:

#### 1. In `App.jsx`
```javascript
// At the top imports:
import LoginPage from './pages/LoginPage'
import { logoutUser } from './services/backendApi'

// Inside function App():
  const [activePage, setActivePage] = useState('login')
  const [quizUnlocked, setQuizUnlocked] = useState(false)
  const [quizAttempts, setQuizAttempts] = useState([])
  const [analysisData, setAnalysisData] = useState(null)
  const [authSession, setAuthSession] = useState(null)
  const [quizActivityVersion, setQuizActivityVersion] = useState(0)
  const totalQuizPoints = quizAttempts.reduce((sum, attempt) => sum + (attempt.scoreNumber || 0), 0)

  const handleLogout = async () => {
    const token = authSession?.access_token
    if (token) {
      try {
        await logoutUser({ token })
      } catch {
        // Logout should still clear local session even if API call fails.
      }
    }

    setAuthSession(null)
    setQuizUnlocked(false)
    setQuizAttempts([])
    setAnalysisData(null)
    setQuizActivityVersion(0)
    setActivePage('login')
  }

  const handleNavigate = (nextPage) => {
    if (nextPage === 'logout') {
      void handleLogout()
      return
    }

    if (nextPage === 'quiz' && !quizUnlocked) {
      setActivePage('notes')
      return
    }

    if (nextPage === 'notes' && !analysisData) {
      setActivePage('dashboard')
      return
    }

    setActivePage(nextPage)
  }

  const handleLogin = (session) => {
    setAuthSession(session)
    setQuizUnlocked(false)
    setQuizAttempts([])
    setAnalysisData(null)
    setActivePage('home')
  }

  // Under pageContent resolution:
  if (activePage === 'login') {
    pageContent = <LoginPage onLogin={handleLogin} />
  } else if (activePage === 'home') {
    // ...
```

#### 2. In `backendApi.js`
```javascript
export async function registerUser({ name, email, password }) {
  return requestJson(
    '/auth/register',
    {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    },
    'Registration failed',
  )
}

export async function loginUser({ email, password }) {
  const form = new URLSearchParams()
  form.set('username', email)
  form.set('password', password)

  return requestJson(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    },
    'Login failed',
  )
}

export async function logoutUser({ token }) {
  return requestJson(
    '/auth/logout',
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
      },
    },
    'Logout failed',
  )
}

export async function explainTopic({ token, inputType = 'topic', topic, documentText, question }) {
  const body = {
    input_type: inputType,
    topic,
    question,
  }

  if (inputType === 'document') {
    body.document_text = documentText
  }

  return requestJson(
    '/quiz/explain',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify(body),
    },
    'Explain failed',
  )
}

export async function generateQuiz({ token, quizId, inputType, topic, documentText, difficulty, questionCount = 5 }) {
  const body = {
    quiz_id: quizId,
    input_type: inputType,
    topic,
    difficulty,
    question_count: questionCount,
  }

  if (inputType === 'document') {
    body.document_text = documentText
  }

  return requestJson(
    '/quiz/generate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify(body),
    },
    'Quiz generation failed',
  )
}

export async function submitQuizSection({ token, quizId, difficulty, verificationToken, answers }) {
  return requestJson(
    '/quiz/submit',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify({
        quiz_id: quizId,
        difficulty,
        verification_token: verificationToken,
        answers,
      }),
    },
    'Quiz submission failed',
  )
}

export async function fetchFinalInsights({ token, quizId }) {
  return requestJson(
    '/quiz/insights/final',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify({ quiz_id: quizId }),
    },
    'Final insights failed',
  )
}

export async function fetchLeaderboard({ token, difficulty = 'overall', limit = 10 }) {
  const endpoint = difficulty === 'overall' ? `/leaderboard/overall?limit=${limit}` : `/leaderboard/${difficulty}?limit=${limit}`

  return requestJson(
    endpoint,
    {
      headers: {
        ...authHeaders(token),
      },
    },
    'Leaderboard fetch failed',
  )
}

export async function fetchUserProfile({ token }) {
  return requestJson(
    '/auth/profile',
    {
      headers: {
        ...authHeaders(token),
      },
    },
    'Profile fetch failed',
  )
}

export async function updateUserProfile({ token, profile }) {
  return requestJson(
    '/auth/profile',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify(profile),
    },
    'Profile update failed',
  )
}
```

#### 3. In `submissionStreakService.js`
```javascript
export async function fetchSubmissionStreak(token = '') {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const response = await fetch(`${baseUrl}/api/submission-streak`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch submission streak: ${response.status}`)
  }

  const payload = await response.json()
  return normalizeStreakPayload(payload)
}
```
