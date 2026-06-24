import './LoginPage.css'
import { useState } from 'react'
import { Bot, User, Mail, Lock } from 'lucide-react'
import { loginUser, registerUser } from '../services/backendApi'

function LoginPage({ onLogin = () => {} }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (mode === 'login') {
      if (!email.trim() || !password.trim()) {
        setMessage('Please enter your email and password.')
        return
      }

      if (!email.includes('@')) {
        setMessage('Please enter a valid email address.')
        return
      }

      try {
        setIsSubmitting(true)
        const auth = await loginUser({ email: email.trim(), password })
        setMessage('')
        onLogin(auth)
      } catch (error) {
        setMessage(error?.message || 'Login failed. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setMessage('Please enter your full name.')
        return
      }

      if (password !== confirmPassword) {
        setMessage('Passwords do not match.')
        return
      }

      try {
        setIsSubmitting(true)
        await registerUser({ name: fullName.trim(), email: email.trim(), password })
        setMessage('Account created successfully. Please log in.')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
      } catch (error) {
        setMessage(error?.message || 'Sign up failed. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    setMessage(`Password reset link sent to ${email || 'your email'}.`)
    setMode('login')
    setPassword('')
  }

  return (
    <div className="login-page">
      <div className="login-left-strip" />

      <main className="login-content">
        <section className="login-brand">
          <div className="login-brand-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}><Bot size={58} /></div>
          <h1>QuizGen AI</h1>
          <p>Adaptive Quiz Generator for Courses</p>
        </section>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h2 className="login-title">{mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Forgot Password' : 'Login'}</h2>
          <p className="login-subtitle">
            {mode === 'signup'
              ? 'Create your account to start learning'
              : mode === 'forgot'
                ? 'Enter your email and we will send a reset link'
                : 'Sign in to your account to continue'}
          </p>

          {message && <p className="login-message">{message}</p>}

          {mode === 'signup' && (
            <>
              <label className="field-label" htmlFor="name">Full Name</label>
              <div className="inputForm">
                <span className="field-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><User size={18} /></span>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <label className="field-label" htmlFor="email">Email Address</label>
          <div className="inputForm">
            <span className="field-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Mail size={18} /></span>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== 'forgot' && (
            <>
              <div className="password-row">
                <label className="field-label" htmlFor="password">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => {
                      setMode('forgot')
                      setMessage('')
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="inputForm">
                <span className="field-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Lock size={18} /></span>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="•••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="inputForm">
                <span className="field-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Lock size={18} /></span>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {mode === 'login' ? (
            <button type="submit" className="button-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          ) : (
            <button type="submit" className="button-submit" disabled={isSubmitting}>
              {mode === 'signup' ? (isSubmitting ? 'Creating...' : 'Create Account') : 'Send Reset Link'}
            </button>
          )}

          {mode === 'login' && (
            <p className="signup-line">
              Don't have an account?
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setMode('signup')
                  setMessage('')
                }}
              >
                Sign up
              </button>
            </p>
          )}

          {(mode === 'signup' || mode === 'forgot') && (
            <p className="signup-line">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setMode('login')
                  setMessage('')
                }}
              >
                Back to login
              </button>
            </p>
          )}

          <div className="divider" />

          <div className="legal-links">
            <button type="button">Privacy Policy</button>
            <span>|</span>
            <button type="button">Terms of Service</button>
          </div>

          <p className="copyright">© 2024 QuizGen AI. All rights reserved.</p>
        </form>
      </main>
    </div>
  )
}

export default LoginPage
