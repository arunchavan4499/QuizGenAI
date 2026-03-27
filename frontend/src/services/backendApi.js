const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

function authHeaders(token) {
  if (!token) {
    return {}
  }
  return { Authorization: `Bearer ${token}` }
}

async function parseJson(response) {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function requestJson(path, options = {}, fallbackErrorMessage = 'Request failed') {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw buildError(
      `Unable to reach backend at ${API_BASE_URL}. Ensure the API server is running and VITE_API_BASE_URL is correct.`,
      0,
    )
  }

  const payload = await parseJson(response)
  if (!response.ok) {
    throw buildError(formatApiErrorDetail(payload?.detail, fallbackErrorMessage), response.status)
  }

  return payload
}

function formatApiErrorDetail(detail, fallbackErrorMessage) {
  if (!detail) {
    return fallbackErrorMessage
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    const normalized = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object') {
          if (typeof item.msg === 'string') {
            return item.msg
          }
          if (typeof item.message === 'string') {
            return item.message
          }
        }
        return ''
      })
      .filter(Boolean)

    return normalized.length > 0 ? normalized.join('; ') : fallbackErrorMessage
  }

  if (typeof detail === 'object') {
    if (typeof detail.message === 'string') {
      return detail.message
    }
    try {
      return JSON.stringify(detail)
    } catch {
      return fallbackErrorMessage
    }
  }

  return String(detail)
}

function buildError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

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
