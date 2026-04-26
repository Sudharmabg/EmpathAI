import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon, BellIcon, CalendarIcon, GiftIcon, HomeIcon,
  ChatBubbleLeftRightIcon, BookOpenIcon, ClipboardDocumentListIcon,
  PuzzlePieceIcon, BoltIcon, ArrowRightOnRectangleIcon, CheckCircleIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

import ChatBuddy from './studentdashboard/chatbuddy/ChatBuddy'
import Activities from './studentdashboard/activity/Activities'
import Questionnaire from './studentdashboard/assessment/Questionnaire'
import Schedule from './studentdashboard/schedule/Schedule'
import OverviewPanel from './dashboard/OverviewPanel'
import RightSidebarPanel from './dashboard/RightSidebarPanel'
import BadgesModal from './dashboard/BadgesModal'
import NotificationsModal from './dashboard/NotificationsModal'

import { getWeekTasks } from '../api/scheduleApi.js'

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [activeHeaderModal, setActiveHeaderModal] = useState(null)
  const [chatMessage, setChatMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)

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

  const toggleTaskComplete = (day, taskId) =>
    setTasks(prev => ({ ...prev, [day]: prev[day].map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }))

  const sidebarItems = [
    { id: 'overview', name: 'Overview', icon: HomeIcon },
    { id: 'chatbuddy', name: 'ChatBuddy', icon: ChatBubbleLeftRightIcon },
    { id: 'schedule', name: 'My Schedule', icon: CalendarIcon },
    { id: 'questionnaire', name: 'Feelings Explorer', icon: ClipboardDocumentListIcon },
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

            {/* XP */}
            <div className="flex items-center bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 shadow-sm">
              <BoltIcon className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-yellow-700 font-bold text-sm">385 XP</span>
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
                <button onClick={() => { setActiveTab('schedule'); setActiveDay(todayDayName); setShowScheduleDropdown(false) }} className="w-full mt-3 bg-black text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors">
                  View Full Schedule
                </button>
              </div>
            </div>

            {/* Rewards */}
            <GiftIcon onClick={() => setActiveHeaderModal('rewards')} className="w-6 h-6 text-gray-400 hover:text-primary cursor-pointer transition-colors" />

            {/* Notifications */}
            <div className="relative">
              <BellIcon
                onClick={() => setShowNotificationsDropdown(v => !v)}
                className={'w-6 h-6 cursor-pointer transition-colors ' + (notifications.some(n => !n.read) ? 'text-primary animate-swing' : 'text-gray-400 hover:text-purple-600')}
              />
              {notifications.some(n => !n.read) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
              <div className={'absolute top-full right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border-2 border-purple-100 overflow-hidden transition-all duration-300 transform origin-top-right z-50 ' +
                (showNotificationsDropdown ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none')}>
                <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
                  <h3 className="font-black text-dark-navy text-sm">Notifications</h3>
                  <button className="text-[10px] font-bold text-purple-600 hover:underline">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.map(n => (
                    <div key={n.id} className={'p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ' + (!n.read ? 'bg-purple-50/30' : '')}>
                      <div className={'w-2 h-2 rounded-full mt-1.5 shrink-0 ' + (!n.read ? 'bg-primary' : 'bg-gray-200')} />
                      <div>
                        <p className={'text-sm ' + (!n.read ? 'font-bold text-black' : 'font-medium text-gray-500')}>{n.title}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-purple-50 text-center">
                  <button className="text-xs font-bold text-gray-500 hover:text-black transition-colors w-full py-2">View All Activity</button>
                </div>
              </div>
            </div>

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
              <Schedule user={user} tasks={tasks} setTasks={setTasks} activeDay={activeDay} setActiveDay={setActiveDay} />
            )
          )}
          {activeTab === 'questionnaire' && <Questionnaire user={user} />}
          {activeTab === 'activities' && <Activities user={user} />}
        </main>

        {/* Right sidebar — overview only */}
        {activeTab === 'overview' && (
          <aside className="w-80 bg-white border-l border-gray-200 p-6">
            <RightSidebarPanel user={user} />
          </aside>
        )}
      </div>

      {/* ── Modals ── */}
      {activeHeaderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-xl p-8 w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setActiveHeaderModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">×</button>
            {activeHeaderModal === 'rewards' && <BadgesModal user={user} />}
            {activeHeaderModal === 'notifications' && <NotificationsModal notifications={notifications} />}
          </div>
        </div>
      )}
    </div>
  )
}