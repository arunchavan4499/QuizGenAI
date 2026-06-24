import { useMemo, useState, useEffect, useRef } from 'react'
import { Bot, X, Send } from 'lucide-react'
import './ChatbotBubble.css'

const QUICK_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'notes', label: 'Notes' },
  { id: 'results', label: 'Results' },
  { id: 'profile', label: 'Profile' },
]

const CHATBOT_ENDPOINT = import.meta.env.VITE_CHATBOT_API_URL || 'http://127.0.0.1:5000/chat'

function ChatbotLogo() {
  return <Bot className="cb-logo" />
}

function getLocalNavigationIntent(text = '') {
  const normalized = text.toLowerCase()
  if (normalized.includes('home')) return 'home'
  if (normalized.includes('dashboard')) return 'dashboard'
  if (normalized.includes('notes')) return 'notes'
  if (normalized.includes('result')) return 'results'
  if (normalized.includes('profile')) return 'profile'
  if (normalized.includes('quiz')) return 'quiz'
  return null
}

function ChatbotBubble({ currentPage = 'home', onNavigate = () => {}, quizUnlocked = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: 'Hey! I can help you navigate, explain concepts in simpler terms, and suggest what to do next.',
    },
  ])

  const leftEyeRef = useRef(null)
  const rightEyeRef = useRef(null)
  const leftEyeballRef = useRef(null)
  const rightEyeballRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = (event) => {
      const cursorX = event.clientX
      const cursorY = event.clientY

      const updateEye = (eyeEl, eyeballEl) => {
        if (!eyeEl || !eyeballEl) return
        const rect = eyeEl.getBoundingClientRect()
        const eyeX = rect.left + rect.width / 2
        const eyeY = rect.top + rect.height / 2

        const dx = cursorX - eyeX
        const dy = cursorY - eyeY

        const angle = Math.atan2(dy, dx)
        const maxDisplacement = 3.5
        const dist = Math.hypot(dx, dy)
        const displacement = Math.min(maxDisplacement, dist / 25)

        const moveX = Math.cos(angle) * displacement
        const moveY = Math.sin(angle) * displacement

        eyeballEl.style.transform = `translate(${moveX}px, ${moveY}px)`
      }

      updateEye(leftEyeRef.current, leftEyeballRef.current)
      updateEye(rightEyeRef.current, rightEyeballRef.current)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const visibleQuickLinks = useMemo(
    () => QUICK_LINKS.filter((item) => item.id !== currentPage),
    [currentPage],
  )

  const addAssistantMessage = (text) => {
    setMessages((prev) => [...prev, { id: Date.now(), role: 'assistant', text }])
  }

  const handleQuickNavigate = (nextPage) => {
    if (nextPage === 'quiz' && !quizUnlocked) {
      addAssistantMessage('Quiz unlocks after analysis in Notes. I moved you to Notes first.')
      onNavigate('notes')
      return
    }
    onNavigate(nextPage)
    addAssistantMessage(`Navigating to ${nextPage}.`)
  }

  const sendMessage = async () => {
    const message = input.trim()
    if (!message || isSending) {
      return
    }

    const localIntent = getLocalNavigationIntent(message)
    setInput('')
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: message }])

    if (localIntent) {
      handleQuickNavigate(localIntent)
      return
    }

    setIsSending(true)
    try {
      const response = await fetch(CHATBOT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `${message}\n\nCurrent page: ${currentPage}. Help with this website's navigation and learning workflow when relevant.`,
        }),
      })

      if (!response.ok) {
        throw new Error('Chat service unavailable')
      }

      const payload = await response.json()
      addAssistantMessage(payload.reply || 'I could not generate a response. Please try again.')
    } catch {
      addAssistantMessage('I cannot reach the chatbot service right now. You can still use quick navigation buttons here.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="cb-wrap" aria-live="polite">
      {isOpen ? (
        <section className="cb-panel" aria-label="Assistant chat">
          <div className="cb-head">
            <div className="cb-head-brand">
              <div className="cb-logo-badge">
                <ChatbotLogo />
              </div>
              <p className="cb-title">Study Buddy</p>
              <p className="cb-sub">Ask for help or navigate quickly</p>
            </div>
            <button type="button" className="cb-icon-btn" onClick={() => setIsOpen(false)} aria-label="Close assistant">
              <X size={18} />
            </button>
          </div>

          <div className="cb-links">
            {visibleQuickLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                className="cb-link-btn"
                onClick={() => handleQuickNavigate(link.id)}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="cb-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`cb-message ${msg.role === 'user' ? 'cb-message-user' : 'cb-message-assistant'}`}
              >
                {msg.text}
              </div>
            ))}
            {isSending ? <div className="cb-typing">Thinking...</div> : null}
          </div>

          <div className="cb-input-row">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask me to explain or navigate"
              className="cb-input"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  sendMessage()
                }
              }}
            />
            <button type="button" className="cb-send-btn" onClick={sendMessage} disabled={isSending || !input.trim()} aria-label="Send message">
              <Send size={15} />
            </button>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        className="cb-fab-circle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open assistant"
      >
        <div className="cb-bot-face">
          <div ref={leftEyeRef} className="cb-bot-eye cb-bot-eye-left">
            <div ref={leftEyeballRef} className="cb-bot-eyeball" />
          </div>
          <div ref={rightEyeRef} className="cb-bot-eye cb-bot-eye-right">
            <div ref={rightEyeballRef} className="cb-bot-eyeball" />
          </div>
        </div>
      </button>
    </div>
  )
}

export default ChatbotBubble
