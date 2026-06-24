import { useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import NotesPage from './pages/NotesPage'
import ResultsPage from './pages/ResultsPage'
import QuizPage from './pages/QuizPage'
import ChatbotBubble from './components/ChatbotBubble'
import { logoutUser } from './services/backendApi'
import { analyzeStudyContent } from './services/llmLearningService'

function App() {
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

  const handleLogin = (session) => {
    setAuthSession(session)
    setQuizUnlocked(false)
    setQuizAttempts([])
    setAnalysisData(null)
    setActivePage('home')
  }

  const handleNavigate = (nextPage) => {
    if (nextPage === 'logout' || nextPage === 'login') {
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

  const handleGenerateQuiz = () => {
    if (!analysisData) {
      return
    }

    setQuizUnlocked(true)
    setActivePage('quiz')
  }

  const handleAnalyzeRequest = async ({ topic, file }) => {
    const generated = await analyzeStudyContent({ topic, file, token: authSession?.access_token })
    setAnalysisData(generated)
    setQuizUnlocked(true)
    setActivePage('notes')
    return generated
  }

  const handleQuizComplete = (attempt) => {
    setQuizAttempts((prev) => [attempt, ...prev])
    setQuizActivityVersion((prev) => prev + 1)
    setActivePage('results')
  }

  const handleProfileUpdated = (updated) => {
    setAuthSession((prev) => {
      if (!prev?.user) {
        return prev
      }
      return {
        ...prev,
        user: {
          ...prev.user,
          ...updated,
        },
      }
    })
  }

  let pageContent

  if (activePage === 'login') {
    pageContent = <LoginPage onLogin={handleLogin} />
  } else if (activePage === 'home') {
    pageContent = (
      <HomePage
        onNavigate={handleNavigate}
        userQuizPoints={totalQuizPoints}
        authToken={authSession?.access_token || ''}
        currentUser={authSession?.user || null}
        attempts={quizAttempts}
        activityVersion={quizActivityVersion}
      />
    )
  } else if (activePage === 'dashboard') {
    pageContent = (
      <DashboardPage
        onNavigate={handleNavigate}
        userQuizPoints={totalQuizPoints}
        onAnalyze={handleAnalyzeRequest}
        authToken={authSession?.access_token || ''}
        currentUser={authSession?.user || null}
      />
    )
  } else if (activePage === 'notes') {
    pageContent = (
      <NotesPage
        onNavigate={handleNavigate}
        onGenerateQuiz={handleGenerateQuiz}
        quizUnlocked={quizUnlocked}
        analysisData={analysisData}
      />
    )
  } else if (activePage === 'quiz') {
    pageContent = (
      <QuizPage
        onNavigate={handleNavigate}
        onQuizComplete={handleQuizComplete}
        analysisData={analysisData}
        authToken={authSession?.access_token || ''}
        currentUser={authSession?.user || null}
      />
    )
  } else if (activePage === 'results') {
    pageContent = (
      <ResultsPage
        onNavigate={handleNavigate}
        latestAttempt={quizAttempts[0] || null}
        attempts={quizAttempts}
        userQuizPoints={totalQuizPoints}
      />
    )
  } else {
    pageContent = (
      <ProfilePage
        onNavigate={handleNavigate}
        currentUser={authSession?.user || null}
        attempts={quizAttempts}
        authToken={authSession?.access_token || ''}
        onProfileUpdated={handleProfileUpdated}
      />
    )
  }

  return (
    <>
      {pageContent}
      {activePage !== 'quiz' ? (
        <ChatbotBubble currentPage={activePage} onNavigate={handleNavigate} quizUnlocked={quizUnlocked} />
      ) : null}
    </>
  )
}

export default App
