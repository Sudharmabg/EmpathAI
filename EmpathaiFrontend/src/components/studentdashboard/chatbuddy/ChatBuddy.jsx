import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  HeartIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { XMarkIcon } from '@heroicons/react/24/solid'
import chatService from '../../../services/chatService'

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso) {
  if (!iso) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatSessionLabel(session) {
  if (!session.weekStart) return 'Session'
  const d = new Date(session.weekStart)
  return `Week of ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

function formatRelative(iso) {
  if (!iso) return ''
  const then = new Date(iso)
  const now = new Date()
  const diffMs = now - then
  const diffH = Math.floor(diffMs / 36e5)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Yesterday'
  return `${diffD} days ago`
}

const CRISIS_KEYWORDS = ['suicide', 'kill myself', 'end my life', 'want to die', 'self harm']

const QUICK_REPLIES = [
  'Help me with Math',
  "I'm feeling stressed",
  'Explain this topic',
  'I need motivation',
]

// ─── Mode badge ───────────────────────────────────────────────────────────────
function ModeBadge({ mode }) {
  if (!mode) return null
  const isMH = mode === 'mental_health'
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1.5
        ${isMH
          ? 'bg-pink-100 text-pink-700'
          : 'bg-blue-100 text-blue-700'
        }`}
    >
      {isMH
        ? <><HeartIcon className="w-3 h-3" />Emotional Support</>
        : <><BookOpenIcon className="w-3 h-3" />Study Help</>
      }
    </span>
  )
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-xl shadow-xl max-w-sm animate-slide-up">
      <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onDismiss} className="shrink-0">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Usage bar ─────────────────────────────────────────────────────────────────
function UsageBar({ usage }) {
  if (!usage) return null
  const pct = Math.min(100, Math.round((usage.used / usage.limit) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Daily usage</span>
        <span className={pct >= 90 ? 'text-red-600 font-semibold' : ''}>
          {usage.used} / {usage.limit} messages
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ChatBuddy({ user, initialMessage, setChatMessage }) {
  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi **${user?.firstName || 'there'}**! 👋 I'm your **ChatBuddy** — powered by AI.\n\nI can help you with:\n- 📚 Any CBSE Class 8–10 topic\n- 💭 Stress, anxiety or emotional support\n- 🎯 Motivation and study tips\n\nHow are you feeling today?`,
      detectedMode: null,
      createdAt: null,
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]   = useState(null)

  // History sidebar state
  const [sessions, setSessions]           = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [historySearch, setHistorySearch] = useState('')

  // Usage
  const [usage, setUsage] = useState(null)

  // Misc
  const [showCrisisModal, setShowCrisisModal] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // ── scroll to bottom ──
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])

  // ── honour initialMessage prop (from dashboard quick-send) ──
  useEffect(() => {
    if (initialMessage) {
      setInputMessage(initialMessage)
      setChatMessage?.('')
    }
  }, [initialMessage, setChatMessage])

  // ── load sessions list on mount ──
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    try {
      const data = await chatService.getSessions()
      setSessions(Array.isArray(data) ? data : [])
    } catch {
      /* sessions are non-critical; silence the error */
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  // ── load today's usage ──
  const loadUsage = useCallback(async () => {
    try {
      const data = await chatService.getUsage()
      setUsage(data)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => { loadSessions(); loadUsage() }, [loadSessions, loadUsage])

  // ── load a past session into chat window ──
  const loadSession = async (sessionId) => {
    if (activeSessionId === sessionId) return
    setIsLoading(true)
    try {
      const data = await chatService.getSessionHistory(sessionId)
      const loaded = (data.messages || []).map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        detectedMode: m.detectedMode,
        createdAt: m.createdAt,
      }))
      setMessages(loaded.length ? loaded : [{ id: 'empty', role: 'assistant', content: 'No messages in this session yet.', detectedMode: null, createdAt: null }])
      setActiveSessionId(sessionId)
    } catch (err) {
      setError('Failed to load session: ' + (err.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  // ── new chat ──
  const handleNewChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Hi again, **${user?.firstName || 'there'}**! 😊 What would you like help with?`,
      detectedMode: null,
      createdAt: null,
    }])
    setActiveSessionId(null)
    inputRef.current?.focus()
  }

  // ── send message ──
  const handleSendMessage = async () => {
    const text = inputMessage.trim()
    if (!text || isLoading) return

    // Crisis intercept
    const lower = text.toLowerCase()
    if (CRISIS_KEYWORDS.some(kw => lower.includes(kw))) {
      setShowCrisisModal(true)
      return
    }

    // Optimistic user bubble
    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      detectedMode: null,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await chatService.sendMessage(text)
      // Backend returns { id, role, content, detectedMode, createdAt }
      const botMsg = {
        id: response.id ?? `b-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        detectedMode: response.detectedMode,
        createdAt: response.createdAt,
      }
      setMessages(prev => [...prev, botMsg])
      // Refresh usage after each message
      loadUsage()
      // Refresh session list (a new session may have been created)
      loadSessions()
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.')
      // Remove optimistic bubble on error
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // ── filtered sessions ──
  const filteredSessions = sessions.filter(s =>
    !historySearch || formatSessionLabel(s).toLowerCase().includes(historySearch.toLowerCase())
  )

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="font-lora max-w-7xl mx-auto px-4">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">ChatBuddy</h1>
        <p className="text-gray-500 text-sm">Your AI companion for learning and emotional support · powered by GPT-4o mini</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Main chat panel ── */}
        <div className="flex-1 w-full min-w-0">
          <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-lg overflow-hidden flex flex-col" style={{ height: '70vh', minHeight: 520 }}>

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-5 py-4 border-b border-purple-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-purple-100 rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ChatBuddy</h3>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                    Online · EmpathAI LLM
                  </p>
                </div>
              </div>
              <button
                onClick={handleNewChat}
                title="New Chat"
                className="p-2 hover:bg-white/70 rounded-lg transition-colors text-purple-600"
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-gray-50/40">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <SparklesIcon className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                  <div className={`max-w-[80%] lg:max-w-[70%] ${msg.role === 'user' ? '' : ''}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                        ${msg.role === 'user'
                          ? 'bg-purple-600 text-white rounded-br-sm shadow-md'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                        }`}
                    >
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            code: ({ inline, children }) =>
                              inline
                                ? <code className="bg-gray-100 text-purple-700 px-1 rounded text-xs font-mono">{children}</code>
                                : <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto my-1.5"><code>{children}</code></pre>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                      {msg.role === 'assistant' && <ModeBadge mode={msg.detectedMode} />}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            <div className="px-5 py-2 border-t border-gray-100 bg-white shrink-0">
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => setInputMessage(reply)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage bar */}
            <UsageBar usage={usage} />

            {/* Input row */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex items-center border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-purple-500 bg-white px-3 py-2 gap-2">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything… (Shift+Enter for new line)"
                    rows={1}
                    disabled={isLoading || (usage && usage.remaining === 0)}
                    className="flex-1 resize-none focus:outline-none bg-transparent text-sm text-gray-800 placeholder-gray-400 max-h-32 disabled:opacity-60"
                    style={{ fieldSizing: 'content' }}
                  />
                  <button className="text-gray-400 hover:text-purple-600 transition-colors" title="Voice input (coming soon)">
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim() || (usage && usage.remaining === 0)}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl px-4 py-3 transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  {isLoading
                    ? <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    : <PaperAirplaneIcon className="w-5 h-5" />
                  }
                </button>
              </div>
              {usage && usage.remaining === 0 && (
                <p className="text-xs text-red-500 mt-1.5">
                  Daily message limit reached. Come back tomorrow!
                </p>
              )}
            </div>
          </div>

          {/* Feature cards */}
          <div className="mt-5 grid sm:grid-cols-3 gap-4">
            {[
              { icon: '📚', title: 'Study Help', desc: 'CBSE Class 8–10 topics explained step by step' },
              { icon: '💭', title: 'Emotional Support', desc: 'Share how you feel and get empathetic guidance' },
              { icon: '🎯', title: 'Motivation', desc: 'Personalised tips to keep you going every day' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white border border-purple-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-2xl mb-1">{icon}</p>
                <h4 className="font-semibold text-gray-900 text-sm mb-0.5">{title}</h4>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── History sidebar ── */}
        <div className="w-full lg:w-72 bg-white border-2 border-gray-100 rounded-2xl shadow-md p-4 flex flex-col shrink-0" style={{ maxHeight: '70vh', minHeight: 380 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900">History</h3>
            <button onClick={handleNewChat} title="New Chat" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
              <PencilSquareIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {sessionsLoading ? (
              <div className="flex items-center justify-center h-24">
                <ArrowPathIcon className="w-5 h-5 text-purple-400 animate-spin" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8 px-4">
                {sessions.length === 0
                  ? 'No chat history yet. Start a conversation!'
                  : 'No sessions match your search.'
                }
              </p>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                  Past sessions
                </p>
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left group
                      ${activeSessionId === session.id
                        ? 'bg-purple-50 border border-purple-200'
                        : 'hover:bg-gray-50 border border-transparent'
                      }`}
                  >
                    <ChatBubbleLeftIcon className={`w-4 h-4 mt-0.5 shrink-0 group-hover:text-purple-500 ${activeSessionId === session.id ? 'text-purple-500' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{formatSessionLabel(session)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <ClockIcon className="w-3 h-3" />
                        {formatRelative(session.createdAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* User avatar at bottom */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                {(user?.firstName?.[0] ?? '?').toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 truncate">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Crisis modal ── */}
      {showCrisisModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-200 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setShowCrisisModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-5xl mb-4">🆘</div>
              <h3 className="text-2xl font-bold text-red-800 mb-3">We're here for you</h3>
              <p className="text-gray-600 mb-6 text-sm">
                It sounds like you might be going through something really difficult. You are not alone — help is just one call away.
              </p>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 mb-5">
                <p className="text-sm font-semibold text-red-700 mb-1">iCall Helpline (India)</p>
                <a href="tel:9152987821" className="text-3xl font-bold text-red-600 hover:text-red-800 transition-colors">
                  9152987821
                </a>
                <p className="text-xs text-gray-500 mt-1">Tap to call · Available Mon–Sat, 8am–10pm IST</p>
              </div>
              <p className="text-xs text-gray-400">You can also talk to a school counsellor anytime.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Error toast ── */}
      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </div>
  )
}