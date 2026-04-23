import { useState, useEffect, useCallback } from 'react'
import {
    UsersIcon,
    ArrowTrendingUpIcon,
    ChatBubbleBottomCenterTextIcon,
    ClockIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline'
import { getAnalyticsDashboard } from '../../api/usermanagementapi.js'

export default function AnalyticsDashboard() {
    const [timeRange, setTimeRange] = useState('Last 7 Days')
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getAnalyticsDashboard()
            setDashboardData(data)
        } catch (err) {
            console.error('Failed to load dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const stats = [
        { label: 'Active Students', value: dashboardData?.totalStudents || 0, change: '+12%', trend: 'up' },
        { label: 'Total Assessments', value: dashboardData?.totalAssessments || 0, change: '+18%', trend: 'up' },
        { label: 'Psychologists', value: dashboardData?.totalPsychologists || 0, change: '+0', trend: 'neutral' },
        { label: 'Total Schools', value: dashboardData?.totalSchools || 0, change: 'Stable', trend: 'up' },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Filter Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-400">Viewing Data for:</span>
                    <button className="flex items-center gap-1 text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                        {timeRange} <ChevronDownIcon className="w-4 h-4" />
                    </button>
                </div>
                <button className="text-xs font-bold text-gray-500 hover:text-purple-600 transition-colors">Export Report (.PDF)</button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                        <div className="flex items-end justify-between mt-2">
                            <h4 className="text-2xl font-bold text-gray-900">{stat.value}</h4>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                        <div className="w-full bg-gray-50 h-1.5 rounded-full mt-4 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${stat.trend === 'up' ? 'bg-green-400' : 'bg-red-400'}`}
                                style={{ width: i === 0 ? '75%' : i === 1 ? '85%' : i === 2 ? '65%' : '45%' }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sentiment Trend (Line Chart SVG) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" /> Sentiment Analysis Trend
                        </h4>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Positive</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-gray-200"></span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Neutral</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative h-64 w-full">
                        <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                            {/* Grid Lines */}
                            {[0, 1, 2, 3].map(i => (
                                <line key={i} x1="0" y1={i * 100} x2="1000" y2={i * 100} stroke="#f3f4f6" strokeWidth="1" />
                            ))}

                            {/* Line Chart */}
                            <path
                                d="M0,250 C100,200 200,220 300,100 C400,150 500,80 600,60 C700,120 800,40 900,90 L1000,20"
                                fill="none"
                                stroke="#9333ea"
                                strokeWidth="4"
                                strokeLinecap="round"
                            />

                            {/* Area Fill */}
                            <path
                                d="M0,250 C100,200 200,220 300,100 C400,150 500,80 600,60 C700,120 800,40 900,90 L1000,20 L1000,300 L0,300 Z"
                                fill="url(#gradient-purple)"
                                opacity="0.1"
                            />

                            <defs>
                                <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#9333ea" />
                                    <stop offset="100%" stopColor="#ffffff" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                    </div>
                </div>

                {/* Popular Topics (Bar Chart) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-indigo-600" /> Popular Topics
                    </h4>
                    <div className="space-y-6">
                        {[
                            { label: 'Exams & Stress', value: 85, color: 'bg-red-400' },
                            { label: 'Social Anxiety', value: 62, color: 'bg-purple-400' },
                            { label: 'Career Growth', value: 45, color: 'bg-blue-400' },
                            { label: 'Family Relations', value: 38, color: 'bg-pink-400' },
                            { label: 'Self Esteem', value: 30, color: 'bg-green-400' },
                        ].map((topic, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                    <span className="text-gray-700">{topic.label}</span>
                                    <span className="text-gray-400">{topic.value}%</span>
                                </div>
                                <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${topic.color} transition-all duration-1000`}
                                        style={{ width: `${topic.value}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-gray-400" /> Peak Activity Times
                    </h4>
                    <span className="text-xs text-purple-600 font-bold hover:underline cursor-pointer">Full Report</span>
                </div>
                <div className="grid grid-cols-7 border-b border-gray-50">
                    {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map(hour => (
                        <div key={hour} className="py-4 text-center border-r border-gray-50 last:border-0">
                            <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">{hour}</p>
                            <div className="flex justify-center flex-col-reverse items-center gap-0.5 h-20">
                                {Array.from({ length: 12 }).map((_, j) => (
                                    <div
                                        key={j}
                                        className={`w-4 rounded-sm ${j < Math.random() * 10 ? 'bg-purple-100' : 'bg-transparent'}`}
                                        style={{ height: '4px' }}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
