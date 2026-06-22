import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon, CalendarIcon, GiftIcon, HomeIcon,
  ChatBubbleLeftRightIcon, BookOpenIcon, ClipboardDocumentListIcon,
  PuzzlePieceIcon, BoltIcon, ArrowRightOnRectangleIcon, CheckCircleIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import { trackTabView, trackTimeSpent } from '../analytics/ga4'
import ChatBuddy from './studentdashboard/chatbuddy/ChatBuddy'
import Activities from './studentdashboard/activity/Activities'
import Questionnaire from './studentdashboard/assessment/Questionnaire'
import Schedule from './studentdashboard/schedule/Schedule'
import Curriculum from './studentdashboard/curriculum/Curriculum'
import OverviewPanel from './dashboard/OverviewPanel'
import RightSidebarPanel from './dashboard/RightSidebarPanel'
import BadgesModal from './dashboard/BadgesModal'
import NotificationsModal from './dashboard/NotificationsModal'

import { getWeekTasks, toggleTaskComplete as apiToggleTaskComplete } from '../api/scheduleApi.js'

// ─── Valid tab IDs ─────────────────────────────────────────────────────────────
const VALID_TABS = ['overview', 'chatbuddy', 'schedule', 'questionnaire', 'curriculum', 'activities']

// ─── Subject extraction helper ────────────────────────────────────────────────
const SUBJECT_KEYWORD_MAP = [
  {
    keywords: [
      'math', 'maths', 'mathematics',
      'algebra', 'geometry', 'arithmetic', 'trigonometry', 'calculus',
    ],
    subject: 'Mathematics'
  },
  {
    keywords: [
      'science', 'sci',
      'physics', 'phy',
      'chemistry', 'chem',
      'biology', 'bio',
    ],
    subject: 'Science'
  },
  {
    keywords: [
      'english', 'eng',
      'grammar', 'literature', 'reading', 'writing', 'comprehension',
    ],
    subject: 'English'
  },
  {
    keywords: [
      'hindi', 'हिंदी',
    ],
    subject: 'Hindi'
  },
  {
    keywords: [
      'sst', 'social', 'social studies',
      'history', 'geography', 'geo', 'hist',
      'civics', 'economics', 'political science',
    ],
    subject: 'Social Studies'
  },
  {
    keywords: [
      'art', 'craft', 'art & craft', 'drawing', 'painting',
    ],
    subject: 'Art & Craft'
  },
]

function getScheduledSubjectsForDay(tasks, day) {
  const dayTasks = tasks[day] || []
  const matched = new Set()

  dayTasks.forEach(task => {
    const type = (task.detectedType || '').toLowerCase()
    if (type !== 'study') return

    const title = (task.title || '').toLowerCase()
    SUBJECT_KEYWORD_MAP.forEach(({ keywords, subject }) => {
      if (keywords.some(kw => title.includes(kw))) {
        matched.add(subject)
      }
    })
  })

  return Array.from(matched)
}

export default function Dashboard({ user, onLogout }) {
  // ── URL-driven tab state ──────────────────────────────────────────────────
  const { tab } = useParams()
  const navigate = useNavigate()

  const activeTab = VALID_TABS.includes(tab) ? tab : 'overview'
  const setActiveTab = (id) => navigate(`/student/${id}`)

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeHeaderModal, setActiveHeaderModal] = useState(null)
  const [chatMessage, setChatMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)

  // ✅ XP state — initialized from user object returned at login
  const [xp, setXp] = useState(user?.xp || 0)

  const [activeDay, setActiveDay] = useState(() => {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return DAYS[new Date().getDay()]
  })

  const todayDayName = (() => {
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return DAYS[new Date().getDay()]
  })()

  const emptyWeek = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [] }
  const [tasks, setTasks] = useState(emptyWeek)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    confirmBg: '',
    onConfirm: () => {}
  })
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningModalMessage, setWarningModalMessage] = useState('')

  const [notifications] = useState([
    { id: 1, title: 'New Math Quiz Available!', time: '10 mins ago', type: 'academic', read: false },
    { id: 2, title: '7-Day Streak!', time: '1 hour ago', type: 'achievement', read: false },
    { id: 3, title: 'Dr. Sarah replied to you', time: '2 hours ago', type: 'social', read: true },
  ])

  useEffect(() => {
    if (!user?.id) return
    setTasksLoading(true)
    setTasksError('')
    getWeekTasks(user.id)
      .then(data => setTasks({ ...emptyWeek, ...data }))
      .catch(err => { console.error(err); setTasksError('Could not load your schedule. Please refresh.') })
      .finally(() => setTasksLoading(false))
  }, [user?.id])

  const toggleTaskComplete = async (day, taskId) => {
<<<<<<< HEAD
    try {
      const saved = await apiToggleTaskComplete(taskId)
      setTasks(prev => ({ ...prev, [day]: prev[day].map(t => t.id === taskId ? { ...t, completed: saved.completed } : t) }))
      // ✅ Update XP if task was completed
      if (saved.completed && saved.xpEarned > 0) {
        setXp(prev => prev + saved.xpEarned)
      }
    } catch (err) {
      console.error('Failed to toggle task', err)
=======
    const task = tasks[day]?.find(t => String(t.id) === String(taskId))
    if (!task) return

    const toMins = (t) => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m }

    const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const todayName = (() => {
      const DAYS_JS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return DAYS_JS[new Date().getDay()]
    })()
    
    const taskDayIdx = DAYS_ORDER.indexOf(day)
    const todayIdx = DAYS_ORDER.indexOf(todayName)
    
    const isFutureDay = taskDayIdx > todayIdx
    const isToday = taskDayIdx === todayIdx
    const now = new Date()
    const currentMins = now.getHours() * 60 + now.getMinutes()
    const taskStartMins = toMins(task.startTime)

    if (isFutureDay || (isToday && currentMins < taskStartMins)) {
      setWarningModalMessage("You cannot mark a task as completed before its scheduled start time.")
      setShowWarningModal(true)
      return
>>>>>>> 27769a253f6926e6af04d5afd95e5788956fd62f
    }

    const willComplete = !task.completed
    setConfirmModalConfig({
      title: willComplete ? 'Complete Task?' : 'Mark Incomplete?',
      message: willComplete 
        ? `Are you sure you want to mark "${task.title}" as completed?` 
        : `Are you sure you want to mark "${task.title}" as incomplete?`,
      confirmText: willComplete ? 'Yes, Complete' : 'Yes, Incomplete',
      confirmBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      onConfirm: async () => {
        try {
          const saved = await apiToggleTaskComplete(taskId)
          setTasks(prev => ({ ...prev, [day]: prev[day].map(t => String(t.id) === String(taskId) ? { ...t, completed: saved.completed } : t) }))
        } catch (err) {
          console.error('Failed to toggle task', err)
        }
        setShowConfirmModal(false)
      }
    })
    setShowConfirmModal(true)
  }

  const scheduledSubjects = getScheduledSubjectsForDay(tasks, activeDay)

  const sidebarItems = [
    { id: 'overview', name: 'Overview', icon: HomeIcon },
    { id: 'chatbuddy', name: 'ChatBuddy', icon: ChatBubbleLeftRightIcon },
    { id: 'schedule', name: 'My Schedule', icon: CalendarIcon },
    { id: 'questionnaire', name: 'Feelings Explorer', icon: ClipboardDocumentListIcon },
    // { id: 'curriculum', name: 'Curriculum', icon: BookOpenIcon },
    { id: 'activities', name: 'Activities', icon: PuzzlePieceIcon },
  ]

  const performSearch = () => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return
    const match = sidebarItems.find(item => item.name.toLowerCase().includes(q))
    if (match) { setActiveTab(match.id); return }
    const map = { chat: 'chatbuddy', schedule: 'schedule', tasks: 'schedule', feelings: 'questionnaire', activities: 'activities' }
    for (const [k, v] of Object.entries(map)) { if (q.includes(k)) { setActiveTab(v); return } }
  }

  useEffect(() => {
    const tabLabel = sidebarItems.find(i => i.id === activeTab)?.name || activeTab
    const studentId = user?.id || ''
    const className = user?.className || ''
    const start = Date.now()

    trackTabView(tabLabel, studentId, className)

    return () => {
      const seconds = Math.round((Date.now() - start) / 1000)
      trackTimeSpent(tabLabel, studentId, seconds)
    }
  }, [activeTab])

  return (
    <div className="min-h-screen bg-gray-50 font-lora">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">

          {/* Logo */}
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="w-9 h-9 bg-purple-200 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200/50 group-hover:rotate-6 transition-transform">
              <span className="text-dark-navy font-black text-lg">E</span>
            </div>
            <h1 className="text-xl font-black text-black tracking-tight">EmpathAI</h1>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative group">
              <MagnifyingGlassIcon onClick={performSearch} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-600 cursor-pointer transition-colors" />
              <input
                type="text" value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && performSearch()}
                placeholder="Search sessions, lessons, or activities..."
                className="w-full pl-12 pr-12 py-2.5 bg-gray-100 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-600 outline-none text-sm transition-all shadow-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors p-1">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-5">

            {/* ✅ XP — now dynamic */}
            <div className="flex items-center bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 shadow-sm">
              <BoltIcon className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-yellow-700 font-bold text-sm">{xp} XP</span>
            </div>

            {/* Schedule dropdown */}
            <div className="relative">
              <CalendarIcon
                onClick={() => setShowScheduleDropdown(v => !v)}
                className={'w-6 h-6 cursor-pointer transition-colors ' +
                  (tasks[todayDayName]?.every(t => t.completed) && tasks[todayDayName]?.length > 0
                    ? 'text-green-500' : 'text-gray-400 hover:text-purple-600')}
              />
              <div className={'absolute top-full right-0 mt-4 w-72 bg-white rounded-2xl shadow-xl border-2 border-purple-100 p-4 transition-all duration-300 transform origin-top-right z-50 ' +
                (showScheduleDropdown ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none')}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-black text-sm">Today's Focus</h3>
                  <span className="text-xs font-bold text-gray-400">{tasks[todayDayName]?.filter(t => t.completed).length}/{tasks[todayDayName]?.length} done</span>
                </div>
                {!tasks[todayDayName]?.length ? (
                  <p className="text-xs text-center text-gray-400 py-4">No tasks for today</p>
                ) : (
                  <div className="space-y-2">
                    {tasks[todayDayName].map(task => (
                      <div key={task.id} onClick={() => toggleTaskComplete(todayDayName, task.id)} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                        <button className={'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ' + (task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                          {task.completed && <CheckCircleIcon className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1">
                          <p className={'text-xs font-bold ' + (task.completed ? 'text-gray-400' : 'text-black')}>{task.title}</p>
                          <p className="text-[10px] text-gray-400">{task.startTime} → {task.endTime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setActiveTab('schedule'); setActiveDay(todayDayName); setShowScheduleDropdown(false) }}
                  className="w-full mt-3 bg-black text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  View Full Schedule
                </button>
              </div>
            </div>

            {/* Rewards */}
            <GiftIcon onClick={() => setActiveHeaderModal('rewards')} className="w-6 h-6 text-gray-400 hover:text-primary cursor-pointer transition-colors" />

            {/* Avatar */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-black">{(user.name || user.firstName)?.split(' ')[0]}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Student</p>
              </div>
              <div className="w-10 h-10 bg-purple-200 rounded-2xl flex items-center justify-center shadow-md shadow-purple-200/20">
                <span className="text-black font-black text-base">{(user.name || user.firstName)?.charAt(0) || 'U'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex">

        {/* Sidebar nav */}
        <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <nav className="p-4 flex flex-col h-full">
            <ul className="space-y-2 flex-1">
              {sidebarItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={'w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ' +
                      (activeTab === item.id ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}
                  >
                    <item.icon className={'w-5 h-5 mr-3 transition-colors ' + (activeTab === item.id ? 'text-primary' : 'text-gray-400')} />
                    <span className="font-bold tracking-tight">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={onLogout} className="w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all mt-4">
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {activeTab === 'overview' && <OverviewPanel user={user} setActiveTab={setActiveTab} />}
          {activeTab === 'chatbuddy' && <ChatBuddy user={user} initialMessage={chatMessage} setChatMessage={setChatMessage} />}
          {activeTab === 'schedule' && (
            tasksLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-gray-500 font-medium text-sm">Loading your schedule...</p>
              </div>
            ) : tasksError ? (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-4 text-red-600 font-medium text-sm text-center">{tasksError}</div>
            ) : (
              <Schedule
                user={user}
                tasks={tasks}
                setTasks={setTasks}
                activeDay={activeDay}
                setActiveDay={setActiveDay}
                onXpEarned={(earned) => setXp(prev => prev + earned)}
                onOpenChatBuddy={(message) => {
                  if (message) setChatMessage(message)
                  setActiveTab('chatbuddy')
                }}
              />
            )
          )}
          {activeTab === 'questionnaire' && <Questionnaire user={user} />}
          {activeTab === 'curriculum' && (
            <Curriculum
              user={user}
              setActiveTab={setActiveTab}
              scheduledSubjects={scheduledSubjects}
              activeDay={activeDay}
            />
          )}
          {activeTab === 'activities' && <Activities user={user} />}
        </main>

        {/* Right sidebar — overview only */}
        {activeTab === 'overview' && (
          <aside className="w-80 bg-white border-l border-gray-200 p-6">
            <RightSidebarPanel
              user={user}
              tasks={tasks}
              todayDayName={todayDayName}
              onToggleTask={toggleTaskComplete}
            />
          </aside>
        )}
      </div>

      {/* ── Modals ── */}
      {activeHeaderModal && (
        <div
          onClick={() => setActiveHeaderModal(null)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white border-2 border-purple-200 rounded-2xl shadow-xl p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
          >
            <button onClick={() => setActiveHeaderModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">×</button>
            {activeHeaderModal === 'rewards' && <BadgesModal user={user} />}
            {activeHeaderModal === 'notifications' && <NotificationsModal notifications={notifications} />}
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {showConfirmModal && (
        <div 
          onClick={() => setShowConfirmModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-sm border-2 border-violet-100 shadow-2xl flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-4 text-violet-600 text-xl">✨</div>
            <h3 className="text-lg font-black text-black mb-2">{confirmModalConfig.title}</h3>
            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
              {confirmModalConfig.message}
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModalConfig.onConfirm} 
                className={`flex-1 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md ${confirmModalConfig.confirmBg}`}
              >
                {confirmModalConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warning Modal ── */}
      {showWarningModal && (
        <div 
          onClick={() => setShowWarningModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 w-full max-w-sm border-2 border-red-100 shadow-2xl flex flex-col items-center text-center animate-scale-up"
          >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500 text-xl animate-bounce">⚠️</div>
            <h3 className="text-lg font-black text-black mb-2">Notice</h3>
            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
              {warningModalMessage}
            </p>
            <button 
              onClick={() => setShowWarningModal(false)} 
              className="w-full bg-black text-white px-4 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-md"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}