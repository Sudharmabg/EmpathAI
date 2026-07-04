import { useState, useEffect, useCallback } from 'react'
import {
    UsersIcon,
    ArrowTrendingUpIcon,
    ChatBubbleBottomCenterTextIcon,
    ClockIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline'
import { getAnalyticsDashboard, getStudents } from '../../api/usermanagementapi.js'

const generatePastWeeks = () => {
    const weeks = [];
    const current = new Date();
    // Go to Monday of current week
    current.setDate(current.getDate() - (current.getDay() === 0 ? 6 : current.getDay() - 1));
    for (let i = 0; i < 12; i++) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        weeks.push(`${year}-${month}-${day}`);
        current.setDate(current.getDate() - 7);
    }
    return weeks;
};

export default function AnalyticsDashboard() {
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [selectedStudentId, setSelectedStudentId] = useState('')
    const [students, setStudents] = useState([])
    const [weeks] = useState(generatePastWeeks())
    const [selectedWeek, setSelectedWeek] = useState(weeks[0])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getAnalyticsDashboard(selectedStudentId || null, selectedWeek || null)
            setDashboardData(data)
        } catch (err) {
            console.error('Failed to load dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedStudentId, selectedWeek])

    useEffect(() => {
        // Fetch students for dropdown
        getStudents({ size: 1000 }).then(res => setStudents(res.content || [])).catch(err => console.error(err))
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const stats = [
        { label: 'Active Students', value: dashboardData?.totalStudents || 0 },
        { label: 'Total Assessments', value: dashboardData?.totalAssessments || 0 },
        { label: 'No of Schools', value: dashboardData?.totalSchools || 0 },
        { label: 'Open Flagged Chats', value: dashboardData?.openFlaggedChats || 0 },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                        <div className="flex items-end justify-between mt-2">
                            <h4 className="text-2xl font-bold text-gray-900">{stat.value}</h4>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-400">Student:</span>
                        <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 focus:outline-none"
                        >
                            <option value="">All Students</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{`Student ${s.id}`}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-400">Time Range:</span>
                        <select
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                            className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 focus:outline-none cursor-pointer"
                        >
                            {weeks.map(w => {
                                const dateObj = new Date(w);
                                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                                return (
                                    <option key={w} value={w}>Week of {formattedDate}</option>
                                );
                            })}
                        </select>
                    </div>
                </div>
                <button className="text-xs font-bold text-gray-500 hover:text-purple-600 transition-colors">Export Report (.PDF)</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Schedule Stats */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" /> Schedule Planner Stats
                        </h4>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-purple-600"></span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Created</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-green-400"></span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Completed</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-64 px-2 w-full mt-4">
                        {dashboardData?.scheduleStats?.length > 0 ? (
                            (() => {
                                const stats = dashboardData.scheduleStats;
                                const maxVal = Math.max(...stats.map(s => Math.max(s.created, s.completed, 1)));
                                
                                const width = 800;
                                const height = 220;
                                const paddingX = 50; // Y axis position
                                const paddingY = 20;
                                
                                const graphPaddingX = 100; // 50px gap from Y axis
                                const graphPaddingRight = 50;
                                
                                const getX = (index) => graphPaddingX + (index * (width - graphPaddingX - graphPaddingRight) / Math.max(stats.length - 1, 1));
                                const getY = (val) => height - paddingY - ((val / maxVal) * (height - 2 * paddingY));
                                
                                // Thinner bars (0.04 instead of 0.08)
                                const barWidth = ((width - 2 * paddingX) / Math.max(stats.length, 1)) * 0.04;
                                const baseLine = height - paddingY;

                                return (
                                    <div className="w-full h-full flex flex-col relative">
                                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full flex-1 overflow-visible" preserveAspectRatio="none">
                                            {/* Grid lines */}
                                            {[0, 0.5, 1].map(ratio => {
                                                const y = height - paddingY - (ratio * (height - 2 * paddingY));
                                                return (
                                                    <g key={ratio}>
                                                        <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />
                                                        <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#9ca3af" fontWeight="bold">
                                                            {Math.round(maxVal * ratio)}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                            
                                            {/* Axis Borders (Darker & Extended) */}
                                            <line x1={paddingX} y1={baseLine} x2={width - paddingX} y2={baseLine} stroke="#4b5563" strokeWidth="2" strokeLinecap="square" />
                                            <line x1={paddingX} y1={paddingY - 5} x2={paddingX} y2={baseLine} stroke="#4b5563" strokeWidth="2" strokeLinecap="square" />
                                            
                                            {/* Bars */}
                                            {stats.map((s, i) => {
                                                const centerX = getX(i);
                                                const createdY = getY(s.created);
                                                const completedY = getY(s.completed);
                                                
                                                return (
                                                    <g key={i} className="group cursor-pointer">
                                                        {/* Created Bar */}
                                                        <rect x={centerX - barWidth - 1} y={createdY} width={barWidth} height={baseLine - createdY} fill="#9333ea" rx="1" className="transition-all hover:opacity-80" />
                                                        {/* Completed Bar */}
                                                        <rect x={centerX + 1} y={completedY} width={barWidth} height={baseLine - completedY} fill="#4ade80" rx="1" className="transition-all hover:opacity-80" />
                                                        
                                                        {/* Tooltip Hover Target */}
                                                        <rect x={centerX - barWidth - 5} y={0} width={barWidth * 2 + 10} height={height} fill="transparent">
                                                            <title>{`${s.completed} / ${s.created} completed on ${new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`}</title>
                                                        </rect>
                                                        
                                                        {/* X Axis Label */}
                                                        <text x={centerX} y={baseLine + 15} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="bold" className="uppercase">
                                                            {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                        
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">No schedule data available</div>
                        )}
                    </div>
                </div>

                {/* Mood Tracker */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-indigo-600" /> Mood Tracker
                    </h4>
                    <div className="space-y-6">
                        {dashboardData?.dailyMoods?.length > 0 ? (
                            <div className="flex justify-between w-full items-center mt-12">
                                {dashboardData.dailyMoods.map((daily, i) => {
                                    const getMoodDetails = (mood) => {
                                        switch (mood?.toLowerCase()) {
                                            case 'happy': return { emoji: '😀', color: 'bg-yellow-100 text-yellow-600 border-yellow-200' };
                                            case 'sad': return { emoji: '😢', color: 'bg-blue-100 text-blue-600 border-blue-200' };
                                            case 'angry': return { emoji: '😠', color: 'bg-red-100 text-red-600 border-red-200' };
                                            case 'anxious':
                                            case 'stressed': return { emoji: '😰', color: 'bg-orange-100 text-orange-600 border-orange-200' };
                                            case 'neutral': return { emoji: '😐', color: 'bg-gray-100 text-gray-600 border-gray-200' };
                                            default: return { emoji: '-', color: 'bg-gray-50 text-gray-300 border-gray-100' };
                                        }
                                    };
                                    const details = getMoodDetails(daily.predominantMood);
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-3 relative group cursor-pointer">
                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center text-xl sm:text-2xl shadow-sm transition-transform group-hover:scale-110 ${details.color}`}>
                                                {details.emoji}
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                {new Date(daily.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                            </span>
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none z-10">
                                                {daily.predominantMood || 'No data'}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400 text-center py-10">No mood entries found</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Interventions Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-gray-400" /> Intervention Sessions Breakdown
                    </h4>
                    <span className="text-xs text-purple-600 font-bold hover:underline cursor-pointer">View All</span>
                </div>
                <div className="p-6">
                    {dashboardData?.interventionStats?.countByType && Object.keys(dashboardData.interventionStats.countByType).length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {Object.entries(dashboardData.interventionStats.countByType).map(([type, count]) => (
                                <div key={type} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                                    <div className="text-xs font-medium text-gray-500 mt-1 capitalize">{type}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 text-center py-4">No interventions recorded.</div>
                    )}
                </div>
            </div>
        </div>
    )
}
