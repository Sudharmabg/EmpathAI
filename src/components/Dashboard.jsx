import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  BellIcon,
  CalendarIcon,
  GiftIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  PuzzlePieceIcon,
  BoltIcon,
  CalculatorIcon,
  BeakerIcon,
  GlobeAltIcon,
  PaperAirplaneIcon,
  ArrowRightOnRectangleIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XMarkIcon,
  StarIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

import Assessment from "./studentdashboard/assessment/Assessment";
import Chatbot from "./studentdashboard/chatbuddy/Chatbot";
import ChatBuddy from "./studentdashboard/chatbuddy/ChatBuddy";
import Counselors from "./studentdashboard/counselors/Counselors";
import Curriculum from "./studentdashboard/curriculum/Curriculum";
import Activities from "./studentdashboard/activity/Activities";

import Questionnaire from './studentdashboard/assessment/Questionnaire';
import Schedule from './studentdashboard/schedule/Schedule';
import { getWeekTasks } from '../api/scheduleApi.js';
import { fetchStudentBadges } from '../api/rewardsApi.js';

// ── Badge helpers ─────────────────────────────────────────────────────────────

function toDataUrl(imageBase64, imageType) {
  if (!imageBase64) return null
  return `data:${imageType || 'image/png'};base64,${imageBase64}`
}

// Emoji & colour config per trigger type
const BADGE_META = {
  login:        { emoji: '🔑', color: 'from-blue-400 to-indigo-500',   bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'Login Milestone'        },
  intervention: { emoji: '💪', color: 'from-green-400 to-emerald-500', bg: 'bg-green-50',  border: 'border-green-200',  label: 'Wellbeing Milestone'    },
  video:        { emoji: '🎬', color: 'from-pink-400 to-rose-500',     bg: 'bg-pink-50',   border: 'border-pink-200',   label: 'Video Completion'       },
  module:       { emoji: '📚', color: 'from-orange-400 to-amber-500',  bg: 'bg-orange-50', border: 'border-orange-200', label: 'Module Completion'      },
  default:      { emoji: '🏅', color: 'from-purple-400 to-violet-500', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Achievement'            },
}

function getBadgeMeta(triggerType) {
  return BADGE_META[triggerType] || BADGE_META.default
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [activeHeaderModal, setActiveHeaderModal] = useState(null)
  const [chatMessage, setChatMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDailyCheckin, setShowDailyCheckin] = useState(true)
  const [selectedSleep, setSelectedSleep] = useState(null)
  const [selectedMood, setSelectedMood] = useState(null)

  const [showBreathing, setShowBreathing] = useState(false)
  const [activeDay, setActiveDay] = useState('Monday')

  // ── Tasks state ────────────────────────────────────────────────────────────
  const emptyWeek = {
    'Monday': [], 'Tuesday': [], 'Wednesday': [],
    'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
  }
  const [tasks, setTasks] = useState(emptyWeek)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState('')
  // ──────────────────────────────────────────────────────────────────────────

  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New Math Quiz Available!', time: '10 mins ago', type: 'academic', read: false },
    { id: 2, title: '7-Day Streak! 🔥', time: '1 hour ago', type: 'achievement', read: false },
    { id: 3, title: 'Dr. Sarah replied to you', time: '2 hours ago', type: 'social', read: true },
  ])

  // ── Load full week tasks from backend on mount ─────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    const loadTasks = async () => {
      setTasksLoading(true)
      setTasksError('')
      try {
        const weekData = await getWeekTasks(user.id)
        setTasks({ ...emptyWeek, ...weekData })
      } catch (err) {
        console.error('Failed to load schedule:', err.message)
        setTasksError('Could not load your schedule. Please refresh.')
      } finally {
        setTasksLoading(false)
      }
    }

    loadTasks()
  }, [user?.id])

  const toggleTaskComplete = (day, taskId) => {
    setTasks({
      ...tasks,
      [day]: tasks[day].map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    })
  }

  const navigateToChat = (message) => {
    setChatMessage(message)
    setActiveTab('chatbuddy')
  }

  const sidebarItems = [
    { id: 'overview', name: 'Overview', icon: HomeIcon },
    { id: 'chatbuddy', name: 'ChatBuddy', icon: ChatBubbleLeftRightIcon },
    { id: 'curriculum', name: 'Curriculum', icon: AcademicCapIcon },
    { id: 'schedule', name: 'My Schedule', icon: CalendarIcon },
    { id: 'questionnaire', name: 'Feelings Explorer', icon: ClipboardDocumentListIcon },
    { id: 'activities', name: 'Activities', icon: PuzzlePieceIcon }
  ].filter(item => item.id !== 'curriculum')

  const performSearch = () => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return

    const tabMap = {
      'overview': 'overview',
      'home': 'overview',
      'chat': 'chatbuddy',
      'chatbuddy': 'chatbuddy',
      'buddy': 'chatbuddy',
      'curriculum': 'curriculum',
      'learn': 'curriculum',
      'lessons': 'curriculum',
      'schedule': 'schedule',
      'tasks': 'schedule',
      'planner': 'schedule',
      'feelings': 'questionnaire',
      'explorer': 'questionnaire',
      'assessment': 'questionnaire',
      'questionnaire': 'questionnaire',
      'activities': 'activities',
      'tools': 'activities',
      'wellness': 'activities',
    }

    const match = sidebarItems.find(item =>
      item.name.toLowerCase().includes(query)
    )
    if (match) { setActiveTab(match.id); return }

    for (const [keyword, tabId] of Object.entries(tabMap)) {
      if (query.includes(keyword)) { setActiveTab(tabId); return }
    }
  }

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') performSearch()
  }

  return (
    <div className="min-h-screen bg-gray-50 font-lora">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="w-9 h-9 bg-purple-200 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200/50 group-hover:rotate-6 transition-transform">
              <span className="text-dark-navy font-black text-lg">E</span>
            </div>
            <h1 className="text-xl font-black text-black tracking-tight">
              EmpathAI
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative group">
              <MagnifyingGlassIcon
                onClick={performSearch}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-600 cursor-pointer transition-colors"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                placeholder="Search sessions, lessons, or activities..."
                className="w-full pl-12 pr-12 py-2.5 bg-gray-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-600 outline-none text-sm transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center space-x-5">
            {/* XP Badge */}
            <div className="flex items-center bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 shadow-sm">
              <BoltIcon className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-yellow-700 font-bold text-sm">385 XP</span>
            </div>

            {/* Calendar Icon - Daily Schedule Tracker */}
            <div className="relative group">
              <CalendarIcon
                onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                className={`w-6 h-6 cursor-pointer transition-colors ${tasks['Monday'].every(t => t.completed) && tasks['Monday'].length > 0
                  ? 'text-green-500'
                  : 'text-gray-400 hover:text-purple-600'
                  }`}
              />
              <div
                className={`absolute top-full right-0 mt-4 w-72 bg-white rounded-2xl shadow-xl border-2 border-purple-100 p-4 transition-all duration-300 transform origin-top-right z-50 ${showScheduleDropdown ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-black text-sm">Today's Focus</h3>
                  <span className="text-xs font-bold text-gray-400">{tasks['Monday'].filter(t => t.completed).length}/{tasks['Monday'].length} done</span>
                </div>
                {tasks['Monday'].length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4">No tasks for today</p>
                ) : (
                  <div className="space-y-2">
                    {tasks['Monday'].map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" onClick={() => toggleTaskComplete('Monday', task.id)}>
                        <button className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {task.completed && <CheckCircleIcon className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1">
                          <p className={`text-xs font-bold ${task.completed ? 'text-gray-400' : 'text-black'}`}>{task.title}</p>
                          <p className="text-[10px] text-gray-400">{task.startTime} → {task.endTime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    setActiveTab('schedule')
                    setShowScheduleDropdown(false)
                  }}
                  className="w-full mt-3 bg-black text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  View Full Schedule
                </button>
              </div>
            </div>

            {/* Gift Icon — opens Badges modal */}
            <GiftIcon
              onClick={() => setActiveHeaderModal('rewards')}
              className="w-6 h-6 text-gray-400 hover:text-primary cursor-pointer transition-colors"
            />

            {/* Notification Bell */}
            <div className="relative group">
              <BellIcon
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className={`w-6 h-6 cursor-pointer transition-colors ${notifications.some(n => !n.read) ? 'text-primary animate-swing' : 'text-gray-400 hover:text-purple-600'}`}
              />
              {notifications.some(n => !n.read) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white animate-bounce-subtle">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}

              {/* Notifications Dropdown */}
              <div
                className={`absolute top-full right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border-2 border-purple-100 p-0 transition-all duration-300 transform origin-top-right z-50 overflow-hidden ${showNotificationsDropdown ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
              >
                <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
                  <h3 className="font-black text-dark-navy text-sm">Notifications</h3>
                  <button className="text-[10px] font-bold text-purple-600 hover:underline">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No new notifications</div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notification) => (
                        <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${!notification.read ? 'bg-purple-50/30' : ''}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notification.read ? 'bg-primary' : 'bg-gray-200'}`}></div>
                          <div>
                            <p className={`text-sm ${!notification.read ? 'font-bold text-black' : 'font-medium text-gray-500'}`}>{notification.title}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-purple-50 text-center">
                  <button className="text-xs font-bold text-gray-500 hover:text-black transition-colors w-full py-2">View All Activity</button>
                </div>
              </div>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-black">{user.firstName}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Student</p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-2xl flex items-center justify-center shadow-md shadow-purple-200/20">
                <span className="text-black font-black text-base">{user.firstName?.charAt(0) || 'U'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <nav className="p-4 flex flex-col h-full">
            <ul className="space-y-2 flex-1">
              {sidebarItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === item.id
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${activeTab === item.id ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="font-bold tracking-tight">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all mt-4"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'overview' && <Overview user={user} setActiveTab={setActiveTab} />}
          {activeTab === 'chatbuddy' && <ChatBuddy user={user} initialMessage={chatMessage} setChatMessage={setChatMessage} />}
          {activeTab === 'curriculum' && <Curriculum user={user} setActiveTab={setActiveTab} navigateToChat={navigateToChat} />}
          {activeTab === 'schedule' && (
            tasksLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-gray-500 font-medium text-sm">Loading your schedule...</p>
              </div>
            ) : tasksError ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-4 text-red-600 font-medium text-sm text-center">
                ⚠️ {tasksError}
              </div>
            ) : (
              <Schedule
                user={user}
                tasks={tasks}
                setTasks={setTasks}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
              />
            )
          )}
          {activeTab === 'questionnaire' && <Questionnaire user={user} />}
          {activeTab === 'activities' && <Activities user={user} />}
        </main>

        {/* Right Sidebar - Only show in overview */}
        {activeTab === 'overview' && (
          <aside className="w-80 bg-white border-l border-gray-200 p-6">
            <RightSidebar />
          </aside>
        )}
      </div>

      {/* Header Modals */}
      {activeHeaderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-xl p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveHeaderModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>

            {activeHeaderModal === 'rewards' && <BadgesModal user={user} />}
            {activeHeaderModal === 'notifications' && <NotificationsModal />}
          </div>
        </div>
      )}
    </div>
  )

  // ── Badges Modal — fetches real data from backend ─────────────────────────
  function BadgesModal({ user }) {
    const [badges, setBadges] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeFilter, setActiveFilter] = useState('all')

    useEffect(() => {
      if (!user?.id) return
      const load = async () => {
        try {
          setLoading(true)
          const data = await fetchStudentBadges(user.id)
          setBadges(data)
        } catch (e) {
          setError('Could not load your badges. Please try again.')
        } finally {
          setLoading(false)
        }
      }
      load()
    }, [user?.id])

    const filters = [
      { id: 'all', label: 'All' },
      { id: 'login', label: '🔑 Login' },
      { id: 'intervention', label: '💪 Wellbeing' },
    ]

    const filtered = activeFilter === 'all'
      ? badges
      : badges.filter(b => b.triggerType === activeFilter)

    // Login milestone map for progress display
    const LOGIN_MILESTONES = [1, 2, 5, 10, 25, 50, 100]
    const INTERVENTION_MILESTONES = [1, 3, 5, 10]

    const earnedLoginValues = badges
      .filter(b => b.triggerType === 'login')
      .map(b => parseInt(b.triggerValue))

    const maxLoginEarned = earnedLoginValues.length > 0 ? Math.max(...earnedLoginValues) : 0

    return (
      <div>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-200">
            <span className="text-3xl">🏆</span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">Your Badges</h3>
          <p className="text-sm text-gray-500 mt-1">
            {badges.length === 0 ? 'Earn badges by logging in and completing sessions' : `You've earned ${badges.length} badge${badges.length !== 1 ? 's' : ''} so far!`}
          </p>
        </div>

        {/* Login progress bar */}
        {badges.some(b => b.triggerType === 'login') && (
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-black text-blue-700 uppercase tracking-wide">🔑 Login Journey</span>
              <span className="text-xs font-bold text-blue-500">{maxLoginEarned} logins</span>
            </div>
            <div className="flex items-center gap-1.5">
              {LOGIN_MILESTONES.map(m => {
                const earned = earnedLoginValues.includes(m)
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full h-2 rounded-full transition-all ${earned ? 'bg-blue-500' : 'bg-blue-100'}`} />
                    <span className={`text-[9px] font-bold ${earned ? 'text-blue-600' : 'text-blue-200'}`}>{m}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {badges.length > 0 && (
          <div className="flex gap-2 mb-5">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeFilter === f.id
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading your badges...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : badges.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl opacity-40">🏅</span>
            </div>
            <h4 className="font-black text-gray-800 mb-2">No badges yet</h4>
            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              Keep logging in and completing your sessions — your first badge is just around the corner!
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-black text-blue-700 mb-1">🔑 Login Badges</p>
                <p className="text-[11px] text-blue-500">Log in daily to earn milestones at 1, 2, 5, 10, 25, 50 and 100 logins</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs font-black text-green-700 mb-1">💪 Wellbeing Badges</p>
                <p className="text-[11px] text-green-500">Complete intervention sessions to earn badges at 1, 3, 5 and 10 sessions</p>
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">No badges in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((badge) => {
              const meta = getBadgeMeta(badge.triggerType)
              return (
                <div
                  key={badge.id}
                  className={`relative rounded-2xl border-2 ${meta.border} ${meta.bg} p-4 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow`}
                >
                  {/* Badge image or gradient icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-md overflow-hidden`}>
                    {badge.imageBase64
                      ? <img src={toDataUrl(badge.imageBase64, badge.imageType)} alt={badge.title} className="w-full h-full object-cover" />
                      : <span className="text-2xl">{meta.emoji}</span>
                    }
                  </div>

                  {/* Title */}
                  <h4 className="font-black text-gray-900 text-sm leading-tight">{badge.title}</h4>

                  {/* Description */}
                  {badge.description && (
                    <p className="text-[11px] text-gray-500 leading-snug">{badge.description}</p>
                  )}

                  {/* Earned label */}
                  <span className="inline-flex items-center gap-1 bg-white/80 border border-gray-200 rounded-full px-2 py-0.5 text-[10px] font-black text-gray-600">
                    <ShieldCheckIcon className="w-3 h-3 text-green-500" />
                    {meta.label}
                  </span>

                  {/* Earned date */}
                  {badge.earnedAt && (
                    <p className="text-[10px] text-gray-400">Earned {formatDate(badge.earnedAt)}</p>
                  )}

                  {/* Sparkle corner */}
                  <span className="absolute top-2 right-2 text-xs">✨</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer hint */}
        {badges.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100">
            Badges are awarded automatically when you hit milestones 🎉
          </p>
        )}
      </div>
    )
  }

  // Notifications Modal Component
  function NotificationsModal() {
    const notifications = [
      {
        id: 1,
        title: 'Great job on Math!',
        message: 'You completed Chapter 5 with 85% accuracy',
        time: '2 hours ago',
        type: 'achievement',
        read: false
      },
      {
        id: 2,
        title: 'Reminder: Daily Check-in',
        message: "Don't forget to log your mood today",
        time: '1 day ago',
        type: 'reminder',
        read: true
      },
      {
        id: 3,
        title: 'New Meditation Session',
        message: 'Try our new 10-minute focus meditation',
        time: '2 days ago',
        type: 'feature',
        read: true
      }
    ]

    return (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">🔔 Notifications</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {notifications.map((notif) => (
            <div key={notif.id} className={`p-4 rounded-lg border ${!notif.read
              ? 'border-purple-300 bg-purple-50'
              : 'border-gray-200 bg-gray-50'
              }`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                {!notif.read && <div className="w-2 h-2 bg-purple-600 rounded-full"></div>}
              </div>
              <p className="text-sm text-gray-700 mb-2">{notif.message}</p>
              <p className="text-xs text-gray-500">{notif.time}</p>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 bg-black text-white py-2 rounded-lg hover:bg-gray-800">
          Mark All as Read
        </button>
      </div>
    )
  }
}

function Overview({ user, setActiveTab }) {
  const achievements = [
    { title: '7-day study streak', desc: 'Keep it up!', value: '7', icon: '🔥', color: 'bg-orange-100', textColor: 'text-orange-600' },
    { title: 'Math Master', desc: 'Completed 5 chapters', value: '🎯', icon: '🎯', color: 'bg-primary/10', textColor: 'text-primary' },
    { title: 'Mindful Learner', desc: '10 sessions done', value: '🧘', icon: '🧘', color: 'bg-blue-100', textColor: 'text-blue-600' },
    { title: 'Emotion Explorer', desc: 'Top 5% in class', value: '⭐', icon: '⭐', color: 'bg-yellow-100', textColor: 'text-yellow-600' }
  ]

  const subjects = [
    { name: 'Mathematics', chapter: 'Algebra', progress: 75, icon: CalculatorIcon, color: 'blue' },
    { name: 'Science', chapter: 'Light & Sound', progress: 60, icon: BeakerIcon, color: 'green' },
    { name: 'English', chapter: 'Poetry', progress: 85, icon: BookOpenIcon, color: 'purple' },
    { name: 'Social Studies', chapter: 'Indian History', progress: 45, icon: GlobeAltIcon, color: 'orange' }
  ]

  return (
    <div className="font-lora">
      {/* Welcome Message */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-black text-dark-navy mb-1.5 tracking-tight">
          Welcome back, {user.firstName}! 🌟
        </h1>
        <p className="text-base text-gray-500 font-medium tracking-tight">Ready to continue your personalized emotional and academic journey?</p>
      </div>

      {/* Hero Achievements Section */}
      <div className="mb-10 text-center">
        <h2 className="text-lg font-black text-dark-navy mb-5 flex items-center justify-center gap-2">
          <span className="w-6 h-1 bg-purple-200 rounded-full"></span>
          Your Milestones
          <span className="w-6 h-1 bg-purple-200 rounded-full"></span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {achievements.map((ach, i) => (
            <div key={i} className="group bg-white p-5 rounded-3xl border-2 border-purple-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className={`w-12 h-12 ${ach.color} rounded-xl flex items-center justify-center text-xl mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                {ach.icon}
              </div>
              <h3 className="text-base font-black text-dark-navy mb-1">{ach.title}</h3>
              <p className="text-[11px] text-gray-500 font-medium">{ach.desc}</p>
              <div className="mt-3 pt-3 border-t border-purple-100 flex items-center justify-between">
                <span className={`text-[9px] font-black uppercase tracking-widest ${ach.textColor}`}>Achievement</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ongoing Learning Modules */}
      <div className="mb-10 text-center">
        <div className="flex flex-col items-center justify-center mb-6">
          <h2 className="text-lg font-black text-dark-navy flex items-center gap-2 mb-2">
            <span className="w-6 h-1 bg-purple-200 rounded-full"></span>
            Ongoing Learning
            <span className="w-6 h-1 bg-purple-200 rounded-full"></span>
          </h2>
          <button
            onClick={() => setActiveTab('curriculum')}
            className="text-xs font-bold text-purple-600 hover:underline"
          >
            View all curriculum
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {subjects.slice(0, 2).map((subject, index) => (
            <div key={index} className={`group bg-white p-5 rounded-3xl border-2 border-purple-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${index === 0 ? 'lg:col-start-2' : ''}`}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-[40px] -z-0"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 bg-${subject.color}-50 rounded-xl flex items-center justify-center group-hover:rotate-3 transition-transform shadow-sm`}>
                    <subject.icon className={`w-5 h-5 text-${subject.color}-500`} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-black text-dark-navy leading-none mb-1">{subject.name}</h3>
                    <p className="text-gray-400 font-bold uppercase text-[7px] tracking-widest">Chapter: {subject.chapter}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-green-600 leading-none">{subject.progress}%</p>
                  <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Progress</p>
                </div>
              </div>

              <div className="mb-4 relative z-10 px-1">
                <div className="bg-purple-50 rounded-full h-1 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.3)]" style={{ width: `${subject.progress}%` }}></div>
                </div>
              </div>

              <button className="w-fit mx-auto px-6 bg-black text-white font-black rounded-xl py-2.5 hover:bg-gray-800 transition-all relative z-10 text-[10px] uppercase tracking-widest shadow-md hover:shadow-lg active:scale-95">
                Continue Learning
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Meditation Card */}
      <div className="mb-6">
        <div className="relative group overflow-hidden rounded-3xl border-2 border-purple-200 bg-purple-50/50">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-200/50 to-transparent transition-opacity"></div>
          <div className="p-6 flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl shadow-lg border-2 border-purple-200 animate-float">
              🧘‍♀️
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black text-dark-navy mb-1 italic">Feeling Overwhelmed?</h3>
              <p className="text-gray-600 font-medium text-base leading-relaxed">Take a quick 5-minute mindfulness break to recalibrate your emotions.</p>
            </div>
            <button
              onClick={() => setActiveTab('activities')}
              className="bg-black text-white font-bold px-8 py-3 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-black/10 whitespace-nowrap text-sm"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RightSidebar() {
  const [completedTasks, setCompletedTasks] = useState({})
  const [selectedWellnessEmoji, setSelectedWellnessEmoji] = useState(null)

  const handleTaskToggle = (taskId) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  const wellnessEmojis = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '😐', label: 'Neutral' },
    { emoji: '😔', label: 'Sad' }
  ]

  return (
    <div className="font-lora">
      {/* Emotional Wellness */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">💝 Emotional Wellness</h3>
        <div className="bg-white border-2 border-purple-200 rounded-xl p-4 min-h-[120px] flex flex-col justify-center">
          <p className="text-sm text-gray-700 mb-4 text-center">
            {selectedWellnessEmoji ? "Glad you shared how you're feeling!" : "How are you feeling today?"}
          </p>
          <div className="flex justify-center space-x-6">
            {wellnessEmojis.map((item, index) => (
              (!selectedWellnessEmoji || selectedWellnessEmoji === item.emoji) && (
                <span
                  key={index}
                  onClick={() => setSelectedWellnessEmoji(item.emoji)}
                  className={`text-4xl cursor-pointer transition-all duration-500 transform ${selectedWellnessEmoji === item.emoji
                    ? 'scale-125 hover:scale-125'
                    : 'hover:scale-110 grayscale-[0.5] hover:grayscale-0'
                    }`}
                >
                  {item.emoji}
                </span>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">📝 Tasks to be done</h3>
        <div className="bg-white border-2 border-purple-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="rounded text-green-600 focus:ring-green-500"
              checked={completedTasks.task1 || false}
              onChange={() => handleTaskToggle('task1')}
            />
            <span className={`text-sm ${completedTasks.task1 ? 'text-green-600 line-through' : 'text-gray-700'}`}>
              Complete Math Chapter 5 exercises
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="rounded text-green-600 focus:ring-green-500"
              checked={completedTasks.task2 || false}
              onChange={() => handleTaskToggle('task2')}
            />
            <span className={`text-sm ${completedTasks.task2 ? 'text-green-600 line-through' : 'text-gray-700'}`}>
              Science project submission
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="rounded text-green-600 focus:ring-green-500"
              checked={completedTasks.task3 || false}
              onChange={() => handleTaskToggle('task3')}
            />
            <span className={`text-sm ${completedTasks.task3 ? 'text-green-600 line-through' : 'text-gray-700'}`}>
              English essay writing
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full"></span>
          Recent Activity
        </h3>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center space-x-3 p-3 bg-green-50/50 rounded-xl border border-green-100">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-green-600 text-sm font-bold">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Completed Math Quiz</p>
              <p className="text-xs text-gray-500 font-medium">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-blue-600 text-sm font-bold">💬</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">ChatBuddy session</p>
              <p className="text-xs text-gray-500 font-medium">Yesterday</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-primary text-sm font-bold">📝</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Feelings Explorer</p>
              <p className="text-xs text-gray-500 font-medium">2 days ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}