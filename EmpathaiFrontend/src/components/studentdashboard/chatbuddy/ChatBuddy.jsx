import { useState, useRef, useEffect } from 'react'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  PlusIcon,
  PaperClipIcon,
  CameraIcon,
  PhotoIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  EllipsisHorizontalIcon,
  ChevronRightIcon,
  MicrophoneIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

export default function ChatBuddy({ user, initialMessage, setChatMessage }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: `Hi ${user.firstName}! I'm your ChatBuddy 🤖 I'm here to help you with your studies and support you emotionally. How are you feeling today?`,
      sender: 'bot',
      time: '2:30 PM'
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [showCrisisModal, setShowCrisisModal] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (initialMessage) {
      setInputMessage(initialMessage)
      setChatMessage('')
    }
  }, [initialMessage, setChatMessage])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const quickReplies = [
    "Help me with Math",
    "I'm feeling stressed",
    "Explain this topic",
    "I need motivation"
  ]

  const getBotResponse = (userMessage) => {
    const message = userMessage.toLowerCase()

    if (message.includes('algebraic expressions')) {
      return {
        text: "Great topic! 📊 Algebraic expressions are mathematical phrases that combine numbers, variables, and operations. For example, 3x + 5 is an algebraic expression where:\n\n• 3x is a term (coefficient 3, variable x)\n• 5 is a constant term\n• + is the operation\n\nThey're the building blocks of algebra! What specific part would you like to explore - simplifying expressions, combining like terms, or working with identities?",
        image: 'https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=300&h=200&fit=crop&crop=center'
      }
    }

    if (message.includes('overwhelmed') && message.includes('math')) {
      return {
        text: "I completely understand that feeling! Math homework can seem like a mountain sometimes, but remember - every expert was once a beginner. Let's tackle this together, one step at a time. What specific part is giving you trouble? 💪",
        image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&h=200&fit=crop&crop=center'
      }
    }

    if (message.includes('algebraic') && message.includes('solve for x')) {
      return {
        text: "Algebra is like solving puzzles! 🧩 Think of 'x' as a mystery number we need to find. Here's my simple 3-step method:\n\n1. Get all x terms on one side\n2. Get all numbers on the other side\n3. Divide to find x\n\nWould you like me to show you with a real example?",
        image: 'https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=300&h=200&fit=crop&crop=center'
      }
    }

    if (message.includes('helpful') && message.includes('motivation')) {
      return {
        text: "You've got this! 🌟 Let me solve 2x + 5 = 13 step by step:\n\nStep 1: Subtract 5 from both sides\n2x = 13 - 5 = 8\n\nStep 2: Divide both sides by 2\nx = 8 ÷ 2 = 4\n\nSee? You just solved for x! Every time you solve one equation, you're building your math superpowers! 🚀 Keep going - you're stronger than you think!",
        image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300&h=200&fit=crop&crop=center'
      }
    }

    return {
      text: "I understand! Let me help you with that. Can you tell me more about what specific area you'd like assistance with?"
    }
  }

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const message = inputMessage.toLowerCase()

      // Check for crisis keywords
      if (message.includes('suicide') || message.includes('kill myself') || message.includes('end my life') || message.includes('want to die')) {
        setShowCrisisModal(true)
        return
      }

      const newMessage = {
        id: messages.length + 1,
        text: inputMessage,
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages([...messages, newMessage])
      const userMsg = inputMessage
      setInputMessage('')

      setTimeout(() => {
        const response = getBotResponse(userMsg)
        const botResponse = {
          id: messages.length + 2,
          text: response.text,
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          image: response.image
        }
        setMessages(prev => [...prev, botResponse])
      }, 1000)
    }
  }

  const handleQuickReply = (reply) => {
    setInputMessage(reply)
  }

  const dropdownItems = [
    { icon: PaperClipIcon, label: 'Add photos & files' },
    { icon: CameraIcon, label: 'Take photo' },
    { icon: PhotoIcon, label: 'Create image', divider: true },
    { icon: LightBulbIcon, label: 'Thinking' },
    { icon: MagnifyingGlassIcon, label: 'Deep research' },
    { icon: ShoppingBagIcon, label: 'Shopping research' },
    { icon: EllipsisHorizontalIcon, label: 'More', hasChevron: true },
  ]

  const historyItems = [
    { id: 1, title: 'Algebraic Expressions Help', time: '2 hours ago' },
    { id: 2, title: 'Feeling Stressed - Motivation', time: 'Yesterday' },
    { id: 3, title: 'Math Homework: Solving for X', time: 'Feb 28' },
    { id: 4, title: 'Emotional Support Session', time: 'Feb 27' },
    { id: 5, title: 'Understanding Geometry', time: 'Feb 25' },
  ]

  return (
    <div className="font-lora max-w-7xl mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ChatBuddy</h1>
        <p className="text-gray-600">Your AI companion for learning and emotional support</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Chat Interface */}
        <div className="flex-1 w-full">
          <div className="bg-white border-2 border-purple-200 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 border-b border-purple-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">ChatBuddy</h3>
                  <p className="text-sm text-green-600 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Online
                  </p>
                </div>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender === 'user'
                    ? 'bg-white border border-purple-100 text-gray-900 shadow-sm'
                    : 'bg-gray-100 text-gray-900'
                    }`}>
                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Chat illustration"
                        className="mt-2 rounded-lg w-full h-32 object-cover"
                      />
                    )}
                    <p className="text-xs mt-1 text-gray-500">
                      {message.time}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Quick replies:</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <div className="flex-1 flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 bg-white relative">
                  <div ref={dropdownRef} className="relative">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="p-2 ml-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                    >
                      <PlusIcon className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-45' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#f9f9f9] border border-gray-200 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
                        {dropdownItems.map((item, index) => (
                          <div key={index}>
                            {item.divider && <div className="my-1 border-t border-gray-100" />}
                            <button
                              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <div className="flex items-center space-x-3">
                                <item.icon className="w-5 h-5 text-gray-500" />
                                <span className="font-medium">{item.label}</span>
                              </div>
                              {item.hasChevron && <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message here..."
                    className="flex-1 px-2 py-2 focus:outline-none bg-transparent"
                  />

                  <button
                    className="p-2 mr-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                    title="Voice input"
                  >
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleSendMessage}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center shadow-md"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="bg-white border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📚 Study Help</h4>
              <p className="text-sm text-gray-600">Get explanations for any CBSE topic</p>
            </div>
            <div className="bg-white border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">💭 Emotional Support</h4>
              <p className="text-sm text-gray-600">Share your feelings and get guidance</p>
            </div>
            <div className="bg-white border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🎯 Motivation</h4>
              <p className="text-sm text-gray-600">Stay motivated with personalized tips</p>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        <div className="w-full lg:w-80 bg-white border-2 border-gray-100 rounded-xl shadow-md p-4 flex flex-col h-[600px] lg:h-auto self-stretch">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-xl text-gray-900">History</h3>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600" title="New Chat">
              <PencilSquareIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="relative mb-6">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Recent chats</p>
            {historyItems.map((item) => (
              <button
                key={item.id}
                className="w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <ChatBubbleLeftIcon className="w-5 h-5 text-gray-400 group-hover:text-purple-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    {item.time}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                {user.firstName[0]}
              </div>
              <span className="text-sm font-medium truncate">{user.firstName} {user.lastName}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Crisis Modal */}
      {showCrisisModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-200 rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <div className="text-center">
              <div className="text-6xl mb-4">🆘</div>
              <h3 className="text-2xl font-bold text-red-800 mb-4">Crisis Support</h3>
              <p className="text-gray-700 mb-6">
                We're here to help. Please reach out to our crisis manager immediately.
              </p>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
                <p className="text-lg font-bold text-red-800 mb-2">Crisis Manager</p>
                <a
                  href="tel:9111111111"
                  className="text-3xl font-bold text-red-600 hover:text-red-800 transition-colors"
                >
                  911-111-1111
                </a>
                <p className="text-sm text-gray-600 mt-2">Tap to call immediately</p>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                You are not alone. Help is available 24/7.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}