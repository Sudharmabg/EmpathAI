import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  HeartIcon,
  ArrowPathIcon,
  CheckIcon,
  PlusIcon,
  PaperClipIcon,
  GlobeAltIcon,
  MagnifyingGlassCircleIcon
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
  const diffH = Math.floor((new Date() - new Date(iso)) / 36e5)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? 'Yesterday' : `${diffD} days ago`
}

/**
 * Build a displayable image src from a message.
 * - Fresh messages use a blob URL (imagePreview)
 * - History-loaded messages use base64 (imageBase64 + imageMimeType)
 */
function resolveImageSrc(msg) {
  if (msg.imagePreview) return msg.imagePreview
  if (msg.imageBase64 && msg.imageMimeType) {
    return `data:${msg.imageMimeType};base64,${msg.imageBase64}`
  }
  return null
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
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1.5 ${isMH ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
      {isMH ? <><HeartIcon className="w-3 h-3" />Emotional Support</> : <><BookOpenIcon className="w-3 h-3" />Study Help</>}
    </span>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-xl shadow-xl max-w-sm">
      <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onDismiss} className="shrink-0"><XMarkIcon className="w-4 h-4" /></button>
    </div>
  )
}

// ─── Usage bar ────────────────────────────────────────────────────────────────
function UsageBar({ usage }) {
  if (!usage) return null
  const pct = Math.min(100, Math.round((usage.used / usage.limit) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Daily usage</span>
        <span className={pct >= 90 ? 'text-red-600 font-semibold' : ''}>{usage.used} / {usage.limit} messages</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Attachment / Plus Button ─────────────────────────────────────────────────
function AttachmentButton({ onFileSelect, disabled }) {
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files)
    if (selected.length === 0) return
    onFileSelect?.(selected)
    setOpen(false)
    e.target.value = ''
  }

  const MENU_ITEMS = [
    {
      icon: <PaperClipIcon className="w-4 h-4" />,
      label: 'Add photos & files',
      sub: 'Upload from your device',
      action: () => { fileInputRef.current?.click(); setOpen(false) },
    },
    {
      icon: <GlobeAltIcon className="w-4 h-4" />,
      label: 'Web search',
      sub: 'Coming soon',
      action: null,
      disabled: true,
    },
    {
      icon: <MagnifyingGlassCircleIcon className="w-4 h-4" />,
      label: 'Deep research',
      sub: 'Coming soon',
      action: null,
      disabled: true,
    },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => setOpen(prev => !prev)}
        disabled={disabled}
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
          ${open
            ? 'bg-purple-600 border-purple-600 text-white'
            : 'border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-600'
          } disabled:opacity-40`}
        title="Add attachment"
      >
        <PlusIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-45' : ''}`} />
      </button>
      {open && (
        <div className="absolute bottom-10 left-0 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attach</p>
          </div>
          {MENU_ITEMS.map((item, idx) => (
            <button
              key={idx}
              onClick={item.action ?? undefined}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-50 cursor-pointer'}`}
            >
              <span className={`p-1.5 rounded-lg ${item.disabled ? 'bg-gray-100 text-gray-400' : 'bg-purple-100 text-purple-600'}`}>
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Voice Input Button ───────────────────────────────────────────────────────
function VoiceInputButton({ onTranscript, disabled }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [unsupported, setUnsupported] = useState(false)
  const recognitionRef = useRef(null)

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setUnsupported(true); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (e) => {
      const current = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(current)
    }
    recognition.onerror = () => { setIsListening(false); setTranscript('') }
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setTranscript('')
  }

  const handleConfirm = () => {
    if (transcript.trim()) onTranscript(transcript.trim())
    handleCancel()
  }

  const handleCancel = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setTranscript('')
  }

  if (unsupported) return <span className="text-[10px] text-gray-400 px-1">Voice N/A</span>

  if (isListening) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 px-1">
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className="w-0.5 bg-purple-500 rounded-full animate-pulse"
              style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }} />
          ))}
        </div>
        <button onClick={handleCancel} className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors" title="Cancel">
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleConfirm} className="w-6 h-6 rounded-full bg-green-100 hover:bg-green-200 text-green-600 flex items-center justify-center transition-colors" title="Use this text">
          <CheckIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button onClick={startListening} disabled={disabled} className="text-gray-400 hover:text-purple-600 transition-colors disabled:opacity-40" title="Voice input">
      <MicrophoneIcon className="w-5 h-5" />
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChatBuddy({ user, initialMessage, setChatMessage }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi **${user?.firstName || 'there'}**! 👋 I'm your **ChatBuddy** — powered by AI.\n\nI can help you with:\n- 📚 Any CBSE Class 8–10 topic\n- 💭 Stress, anxiety or emotional support\n- 🎯 Motivation and study tips\n\nHow are you feeling today?`,
      detectedMode: null,
      createdAt: null,
    }
  ])
  const [inputMessage, setInputMessage]   = useState('')
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState(null)
  const [sessions, setSessions]           = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [historySearch, setHistorySearch] = useState('')
  const [usage, setUsage]                 = useState(null)
  const [showCrisisModal, setShowCrisisModal] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [previewUrls, setPreviewUrls]     = useState([])
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])

  useEffect(() => {
    if (initialMessage) { setInputMessage(initialMessage); setChatMessage?.('') }
  }, [initialMessage, setChatMessage])

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true)
    try { const data = await chatService.getSessions(); setSessions(Array.isArray(data) ? data : []) }
    catch { /* non-critical */ }
    finally { setSessionsLoading(false) }
  }, [])

  const loadUsage = useCallback(async () => {
    try { const data = await chatService.getUsage(); setUsage(data) }
    catch { /* non-critical */ }
  }, [])

  useEffect(() => { loadSessions(); loadUsage() }, [loadSessions, loadUsage])

  const loadSession = async (sessionId) => {
    if (activeSessionId === sessionId) return
    setIsLoading(true)
    try {
      const data = await chatService.getSessionHistory(sessionId)
      const loaded = (data.messages || []).map(m => ({
        id:           m.id,
        role:         m.role,
        content:      m.content,
        detectedMode: m.detectedMode,
        createdAt:    m.createdAt,
        // ── FIX: map image fields from history so they render after refresh ──
        imageBase64:  m.imageBase64   || null,
        imageMimeType: m.imageMimeType || null,
      }))
      setMessages(
        loaded.length
          ? loaded
          : [{ id: 'empty', role: 'assistant', content: 'No messages in this session yet.', detectedMode: null, createdAt: null }]
      )
      setActiveSessionId(sessionId)
    } catch (err) {
      setError('Failed to load session: ' + (err.message || 'Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = () => {
    setMessages([{
      id: 'welcome', role: 'assistant',
      content: `Hi again, **${user?.firstName || 'there'}**! 😊 What would you like help with?`,
      detectedMode: null, createdAt: null,
    }])
    setActiveSessionId(null)
    setAttachedFiles([])
    setPreviewUrls([])
    inputRef.current?.focus()
  }

  const handleSendMessage = async () => {
    const text = inputMessage.trim()
    if (!text || isLoading) return
    const lower = text.toLowerCase()
    if (CRISIS_KEYWORDS.some(kw => lower.includes(kw))) { setShowCrisisModal(true); return }

    // ── Pick only the first image file (backend saves one at a time) ──────────
    const imageFile = attachedFiles.find(f => f.type.startsWith('image/')) || null
    const imagePreviewUrl = imageFile ? URL.createObjectURL(imageFile) : null

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      detectedMode: null,
      createdAt: new Date().toISOString(),
      imagePreview: imagePreviewUrl,   // blob URL — works until page refresh
      imageBase64: null,               // not yet available; backend saves and returns on next history load
      imageMimeType: imageFile?.type || null,
    }

    setMessages(prev => [...prev, userMsg])
    const filesToUpload = [...attachedFiles]
    setInputMessage('')
    setAttachedFiles([])
    setPreviewUrls([])
    setIsLoading(true)

    try {
      // ── FIX: send first image as a File so chatService uses imageBase64 /
      //   imageMimeType path — which the backend saves to DB ─────────────────
      const firstImageFile = filesToUpload.find(f => f.type.startsWith('image/')) || null
      const response = await chatService.sendMessage(text, firstImageFile)

      const effectiveMode = response.isFlagged || response.is_flagged ? 'mental_health' : response.detectedMode
      const botMsg = {
        id: response.id ?? `b-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        detectedMode: effectiveMode,
        createdAt: response.createdAt,
      }
      setMessages(prev => [...prev, botMsg])
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
      loadUsage()
      loadSessions()
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  const handleVoiceTranscript = (text) => {
    setInputMessage(prev => prev ? `${prev} ${text}` : text)
    inputRef.current?.focus()
  }

  const handleFileSelect = (files) => {
    const newFiles = files.filter(f => f.size <= 20 * 1024 * 1024)
    setAttachedFiles(prev => [...prev, ...newFiles])
    const urls = newFiles.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
    setPreviewUrls(prev => [...prev, ...urls])
  }

  const removeAttachedFile = (index) => {
    if (previewUrls[index]) URL.revokeObjectURL(previewUrls[index])
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const filteredSessions = sessions.filter(s =>
    !historySearch || formatSessionLabel(s).toLowerCase().includes(historySearch.toLowerCase())
  )

  return (
    <div className="font-lora max-w-7xl mx-auto px-4">
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
              <button onClick={handleNewChat} title="New Chat" className="p-2 hover:bg-white/70 rounded-lg transition-colors text-purple-600">
                <PencilSquareIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-gray-50/40">
              {messages.map((msg) => {
                // ── FIX: resolve image src from blob URL (fresh) or base64 (history) ──
                const imageSrc = resolveImageSrc(msg)

                return (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                        <SparklesIcon className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                    <div className="max-w-[80%] lg:max-w-[70%]">
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-sm shadow-md' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              p:      ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-gray-800">{children}</p>,
                              ul:     ({ children }) => <ul className="list-disc pl-4 space-y-2 my-3 text-gray-800">{children}</ul>,
                              ol:     ({ children }) => <ol className="list-decimal pl-4 space-y-2 my-3 text-gray-800">{children}</ol>,
                              li:     ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                              code:   ({ inline, children }) => inline
                                ? <code className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-xs font-mono border border-purple-100">{children}</code>
                                : <div className="my-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm"><pre className="bg-gray-900 p-4 text-xs overflow-x-auto text-gray-100 font-mono"><code>{children}</code></pre></div>,
                            }}
                          >{msg.content}</ReactMarkdown>
                        ) : (
                          <div>
                            {/* ── FIX: image renders from blob URL (fresh) OR base64 data URL (history) ── */}
                            {imageSrc && (
                              <img
                                src={imageSrc}
                                alt="Attached"
                                className="rounded-xl mb-2 max-h-48 max-w-full object-cover border border-white/20 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(imageSrc, '_blank')}
                              />
                            )}
                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                          </div>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            <div className="px-5 py-2 border-t border-gray-100 bg-white shrink-0">
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <button key={reply} onClick={() => setInputMessage(reply)} disabled={isLoading}
                    className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs hover:bg-purple-100 transition-colors disabled:opacity-50">
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage bar */}
            <UsageBar usage={usage} />

            {/* Input row */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="relative group">
                      {previewUrls[idx] ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-200 shadow-sm">
                          <img src={previewUrls[idx]} alt={file.name} className="w-full h-full object-cover" />
                          <button onClick={() => removeAttachedFile(idx)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors">
                            <XMarkIcon className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-2 py-1 text-xs text-purple-700 max-w-[160px]">
                          <PaperClipIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <button onClick={() => removeAttachedFile(idx)} className="shrink-0 text-purple-400 hover:text-red-500 transition-colors ml-0.5">
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex items-center border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-purple-500 bg-white px-3 py-2 gap-2">
                  <AttachmentButton
                    onFileSelect={handleFileSelect}
                    disabled={isLoading || (usage && usage.remaining === 0)}
                  />
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
                  <VoiceInputButton
                    onTranscript={handleVoiceTranscript}
                    disabled={isLoading || (usage && usage.remaining === 0)}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim() || (usage && usage.remaining === 0)}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl px-4 py-3 transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  {isLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5" />}
                </button>
              </div>
              {usage && usage.remaining === 0 && (
                <p className="text-xs text-red-500 mt-1.5">Daily message limit reached. Come back tomorrow!</p>
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
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search sessions…" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {sessionsLoading ? (
              <div className="flex items-center justify-center h-24"><ArrowPathIcon className="w-5 h-5 text-purple-400 animate-spin" /></div>
            ) : filteredSessions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8 px-4">
                {sessions.length === 0 ? 'No chat history yet. Start a conversation!' : 'No sessions match your search.'}
              </p>
            ) : (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Past sessions</p>
                {filteredSessions.map((session) => (
                  <button key={session.id} onClick={() => loadSession(session.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left group ${activeSessionId === session.id ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <ChatBubbleLeftIcon className={`w-4 h-4 mt-0.5 shrink-0 group-hover:text-purple-500 ${activeSessionId === session.id ? 'text-purple-500' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{formatSessionLabel(session)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><ClockIcon className="w-3 h-3" />{formatRelative(session.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                {(user?.firstName?.[0] ?? '?').toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 truncate">{user?.firstName} {user?.lastName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Crisis modal */}
      {showCrisisModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-200 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            <button onClick={() => setShowCrisisModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-5xl mb-4">🆘</div>
              <h3 className="text-2xl font-bold text-red-800 mb-3">We're here for you</h3>
              <p className="text-gray-600 mb-6 text-sm">It sounds like you might be going through something really difficult. You are not alone — help is just one call away.</p>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 mb-5">
                <p className="text-sm font-semibold text-red-700 mb-1">iCall Helpline (India)</p>
                <a href="tel:9152987821" className="text-3xl font-bold text-red-600 hover:text-red-800 transition-colors">9152987821</a>
                <p className="text-xs text-gray-500 mt-1">Tap to call · Available Mon–Sat, 8am–10pm IST</p>
              </div>
              <p className="text-xs text-gray-400">You can also talk to a school counsellor anytime.</p>
            </div>
          </div>
        </div>
      )}

      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </div>
  )
}