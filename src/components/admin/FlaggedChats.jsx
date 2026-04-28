import { useState } from 'react'
import {
    FlagIcon,
    ChatBubbleLeftRightIcon,
    UserIcon,
    CalendarIcon,
    ExclamationTriangleIcon,
    ChevronRightIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function FlaggedChats() {
    const [flaggedChats, setFlaggedChats] = useState([
        {
            id: 1,
            studentName: 'Aarav Sharma',
            studentClass: '9th Standard',
            school: 'TIGPS',
            date: '2026-02-18',
            time: '10:30 AM',
            sentiment: 'Highly Concerned',
            flagReason: 'Suicidal ideation / Self-harm mentions',
            lastMessage: "I don't feel like being here anymore. Everything feels too heavy.",
            status: 'pending',
            severity: 'critical'
        },
        {
            id: 2,
            studentName: 'Priya Reddy',
            studentClass: '8th Standard',
            school: 'TIGWS',
            date: '2026-02-17',
            time: '04:15 PM',
            sentiment: 'Distressed',
            flagReason: 'Severe anxiety / Bullying',
            lastMessage: "They keep making fun of me in the hallway. I'm scared to go to school tomorrow.",
            status: 'assigned',
            severity: 'high',
            assignedTo: 'Dr. Sarah Smith'
        },
        {
            id: 3,
            studentName: 'Arjun Das',
            studentClass: '10th Standard',
            school: 'TIGPS',
            date: '2026-02-17',
            time: '09:00 AM',
            sentiment: 'Depressed',
            flagReason: 'Persistent sadness',
            lastMessage: "Nothing makes me happy lately. I've stopped playing football too.",
            status: 'pending',
            severity: 'medium'
        }
    ])

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case 'critical':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Critical</span>
            case 'high':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">High Risk</span>
            case 'medium':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Moderate</span>
            default:
                return null
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Emotional Support Alerts</h3>
                    <p className="text-sm text-gray-500 mt-1">Chat sessions flagged by AI for professional psychologist review</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        <span className="font-bold">{flaggedChats.filter(c => c.severity === 'critical').length} Critical Alerts</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student & Context</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Assessment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flagged Content</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 relative text-right">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {flaggedChats.map((chat) => (
                                <tr key={chat.id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                <UserIcon className="h-6 w-6 text-purple-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-gray-900">{chat.studentName}</div>
                                                <div className="text-xs text-gray-500">{chat.studentClass} • {chat.school}</div>
                                                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    {chat.date} • {chat.time}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            {getSeverityBadge(chat.severity)}
                                            <div className="text-xs font-medium text-gray-600">{chat.sentiment}</div>
                                            <div className="text-[10px] text-red-500 italic font-medium">{chat.flagReason}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <div className="text-sm text-gray-600 truncate italic bg-gray-50 p-2 rounded border border-dashed border-gray-200">
                                            "{chat.lastMessage}"
                                        </div>
                                        <button className="text-[10px] text-purple-600 font-bold mt-1 hover:underline">View Transcript</button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {chat.status === 'assigned' ? (
                                            <div className="space-y-1">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Assigned</span>
                                                <div className="text-[10px] text-gray-500 font-medium">To: {chat.assignedTo}</div>
                                            </div>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">Pending Review</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-700 transition shadow-sm flex items-center gap-1 ml-auto">
                                            Action <ChevronRightIcon className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group">
                    <ChatBubbleLeftRightIcon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-15 transform rotate-12 group-hover:scale-110 transition-transform" />
                    <h4 className="text-indigo-100 text-sm font-medium">Total Flagged Today</h4>
                    <div className="text-3xl font-bold mt-1">12</div>
                    <p className="text-indigo-100 text-xs mt-4 flex items-center gap-1">
                        <span className="bg-white/20 px-1.5 rounded font-bold">+2</span> since last hour
                    </p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group">
                    <CheckCircleIcon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-15 transform rotate-12 group-hover:scale-110 transition-transform" />
                    <h4 className="text-purple-100 text-sm font-medium">Resolved/Assigned</h4>
                    <div className="text-3xl font-bold mt-1">85%</div>
                    <p className="text-purple-100 text-xs mt-4">Average response time: 14 mins</p>
                </div>
            </div>
        </div>
    )
}
