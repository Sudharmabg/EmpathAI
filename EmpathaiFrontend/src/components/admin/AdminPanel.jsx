import { useState } from 'react'
import {
  UsersIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  AcademicCapIcon,
  FlagIcon,
  TrophyIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import UserManagement from './usermanagement/UserManagement'
import AssessmentManagement from './feelingsexplorer/AssessmentManagement'
import CurriculumManagement from './curriculummanagement/CurriculumManagement'
import FlaggedChats from './FlaggedChats'
import AnalyticsDashboard from './AnalyticsDashboard'
import Rewards from './Rewards'
import SchedulePlanner from './SchedulePlanner'

export default function AdminPanel({ user, onLogout }) {
  const menuItems = [
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'assessments', label: 'Feelings Explorer', icon: ClipboardDocumentCheckIcon },
    { id: 'schedule_planner', label: 'Schedule Planner', icon: CalendarDaysIcon },
    { id: 'curriculum', label: 'Curriculum', icon: AcademicCapIcon },
    { id: 'flagged_chats', label: 'Support Alerts', icon: FlagIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'rewards', label: 'Rewards', icon: TrophyIcon },
  ]

  const filteredMenuItems = menuItems.map(item => {
    if (user?.role === 'SCHOOL_ADMIN' && item.id === 'users') {
      return { ...item, label: 'Students' }
    }
    return item
  }).filter(item => {
    // TODO: Unhide curriculum tab when ready
    if (item.id === 'curriculum') return false

    const role = user?.role

    // Schedule Planner — visible to SUPER_ADMIN, SCHOOL_ADMIN, TEACHER only
    if (item.id === 'schedule_planner') {
      return ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'].includes(role)
    }

    if (role === 'SUPER_ADMIN') return true
    if (role === 'SCHOOL_ADMIN') return ['users', 'schedule_planner'].includes(item.id)
    if (role === 'CONTENT_ADMIN') return ['curriculum'].includes(item.id)
    if (role === 'PSYCHOLOGIST') return ['assessments', 'flagged_chats'].includes(item.id)
    if (role === 'TEACHER') return ['schedule_planner'].includes(item.id)
    return false
  })

  const [activeTab, setActiveTab] = useState(filteredMenuItems[0]?.id || 'users')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return <UserManagement user={user} />
      case 'assessments': return <AssessmentManagement />
      case 'curriculum': return <CurriculumManagement />
      case 'flagged_chats': return <FlaggedChats />
      case 'analytics': return <AnalyticsDashboard />
      case 'rewards': return <Rewards />
      case 'schedule_planner': return <SchedulePlanner user={user} />
      default:
        return (
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
            <p>This module is under development.</p>
          </div>
        )
    }
  }

  const getSubtitle = () => {
    switch (activeTab) {
      case 'users': return "Manage your organization's users and roles"
      case 'assessments': return "Manage emotional check-ins and activities"
      case 'curriculum': return "Manage syllabi and learning content"
      case 'flagged_chats': return "Manage high-risk student interactions"
      case 'analytics': return "View data and insights"
      case 'rewards': return "Create and manage student rewards and recognition"
      case 'schedule_planner': return "Manage school timings and exam dates for smart scheduling"
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              EmpathAI Admin
            </h1>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false) }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-primary' : 'text-gray-400'}`} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button onClick={onLogout} className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 lg:hidden">
          <div className="h-16 flex items-center px-4">
            <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 focus:outline-none">
              <Bars3Icon className="w-6 h-6" />
            </button>
            <span className="ml-4 text-lg font-semibold text-gray-900">EmpathAI Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredMenuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="mt-1 text-sm text-gray-500">{getSubtitle()}</p>
            </div>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}