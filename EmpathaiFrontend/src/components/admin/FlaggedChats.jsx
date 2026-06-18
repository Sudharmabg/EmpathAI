import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { useState, useEffect, useCallback } from 'react'
import {
    ChatBubbleLeftRightIcon,
    UserIcon,
    CalendarIcon,
    ExclamationTriangleIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    XMarkIcon
} from '@heroicons/react/24/outline'
import { apiGet } from '../../api/apiClient'

// ── Transcript Modal ──────────────────────────────────────────────────────────
function TranscriptModal({ flagId, studentName, onClose }) {
    const [messages, setMessages] = useState([])
    const [source, setSource]     = useState('CHAT')   // ✅ NEW
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState(null)

    useEffect(() => {
        const fetchTranscript = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await apiGet(`/api/flagged-chats/${flagId}/transcript`)
                setMessages(data?.messages ?? [])
                setSource(data?.source ?? 'CHAT')      // ✅ NEW
            } catch (err) {
                console.error('Failed to fetch transcript:', err)
                setError('Could not load transcript. Please try again.')
            } finally {
                setLoading(false)
            }
        }
        fetchTranscript()
    }, [flagId])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    const formatTime = (iso) => {
        if (!iso) return ''
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col"
                style={{ maxHeight: '80vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Chat Transcript</h2>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                            {studentName ? `Week session for ${studentName}` : 'Full session history'}
                            {/* ✅ NEW — Schedule Assistant badge */}
                            {source === 'SCHEDULE' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200">
                                    🗓 Schedule Assistant
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <ArrowPathIcon className="w-6 h-6 animate-spin mb-2" />
                            <p className="text-sm">Loading transcript...</p>
                        </div>
                    )}
                    {error && (
                        <div className="flex flex-col items-center justify-center py-16 text-red-400 gap-2">
                            <ExclamationTriangleIcon className="w-6 h-6" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    {!loading && !error && messages.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-16">
                            No messages found for this session.
                        </p>
                    )}
                    {!loading && !error && messages.map((msg) => {
                        const isStudent = msg.role === 'user'
                        // ✅ NEW — show correct sender name based on detectedMode
                        const senderName = isStudent
                            ? (studentName ?? 'Student')
                            : (msg.detectedMode === 'schedule' ? 'Schedule Assistant' : 'ChatBuddy')

                        return (
                            <div key={msg.id} className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] flex flex-col gap-1 ${isStudent ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-400 px-1">
                                        {senderName}
                                    </span>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                        isStudent
                                            ? 'bg-purple-600 text-white rounded-tr-sm'
                                            : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                    }`}>
                                        {isStudent ? (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p:      ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                                                    ul:     ({ children }) => <ul className="list-disc pl-4 space-y-1 my-1">{children}</ul>,
                                                    ol:     ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-1">{children}</ol>,
                                                    li:     ({ children }) => <li className="leading-snug pl-1">{children}</li>,
                                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                    code:   ({ inline, children }) =>
                                                        inline
                                                            ? <code className="bg-white/20 text-white px-1 rounded text-xs font-mono">{children}</code>
                                                            : <pre className="bg-black/10 p-2 rounded text-xs overflow-x-auto my-1"><code>{children}</code></pre>,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 px-1">
                                        {formatTime(msg.createdAt)}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 text-right">
                    <button
                        onClick={onClose}
                        className="text-xs bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FlaggedChats() {
    const [flaggedChats, setFlaggedChats] = useState([])
    const [stats, setStats]               = useState(null)
    const [loading, setLoading]           = useState(true)
    const [error, setError]               = useState(null)
    const [transcript, setTranscript]     = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [chatsRes, statsRes] = await Promise.all([
                apiGet('/api/flagged-chats?page=0&size=50'),
                apiGet('/api/flagged-chats/stats'),
            ])
            setFlaggedChats(chatsRes?.content ?? chatsRes ?? [])
            setStats(statsRes)
        } catch (err) {
            console.error('Failed to fetch flagged chats:', err)
            setError('Failed to load support alerts. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const getSeverityBadge = (severity) => {
        switch (severity?.toLowerCase()) {
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

    const formatDateTime = (isoString) => {
        if (!isoString) return { date: '—', time: '—' }
        const d = new Date(isoString)
        return {
            date: d.toISOString().split('T')[0],
            time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    }

    const criticalCount = flaggedChats.filter(
        c => c.severity?.toLowerCase() === 'critical'
    ).length

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <ArrowPathIcon className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Loading support alerts...</p>
        </div>
    )

    if (error) return (
        <div className="flex flex-col items-center justify-center py-24 text-red-500 gap-3">
            <ExclamationTriangleIcon className="w-8 h-8" />
            <p className="text-sm">{error}</p>
            <button
                onClick={fetchData}
                className="text-xs bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition"
            >
                Retry
            </button>
        </div>
    )

    return (
        <>
            {transcript && (
                <TranscriptModal
                    flagId={transcript.flagId}
                    studentName={transcript.studentName}
                    onClose={() => setTranscript(null)}
                />
            )}

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Emotional Support Alerts</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Chat sessions flagged by AI for professional psychologist review
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={fetchData}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                            title="Refresh"
                        >
                            <ArrowPathIcon className="w-4 h-4 text-gray-500" />
                        </button>
                        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            <span className="font-bold">
                                {criticalCount} Critical Alert{criticalCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Student & Context
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Risk Assessment
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Flagged Content
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 relative text-right">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {flaggedChats.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">
                                            ✅ No flagged chats at this time.
                                        </td>
                                    </tr>
                                ) : (
                                    flaggedChats.map((chat) => {
                                        const dt = formatDateTime(chat.createdAt)
                                        return (
                                            <tr
                                                key={chat.id}
                                                className="hover:bg-gray-50 transition-colors group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                            <UserIcon className="h-6 w-6 text-purple-600" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {chat.studentName ?? `Student #${chat.studentId}`}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {chat.studentClass ?? '—'} • School ID: {chat.school ?? '—'}
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                                                                <CalendarIcon className="w-3 h-3" />
                                                                {dt.date} • {dt.time}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {getSeverityBadge(chat.severity)}
                                                        <div className="text-xs font-medium text-gray-600">
                                                            {chat.sentiment}
                                                        </div>
                                                        <div className="text-[10px] text-red-500 italic font-medium">
                                                            {chat.flagReason}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="text-sm text-gray-600 truncate italic bg-gray-50 p-2 rounded border border-dashed border-gray-200">
                                                        "{chat.lastMessage}"
                                                    </div>
                                                    <button
                                                        onClick={() => setTranscript({
                                                            flagId:      chat.id,
                                                            studentName: chat.studentName ?? `Student #${chat.studentId}`
                                                        })}
                                                        className="text-[10px] text-purple-600 font-bold mt-1 hover:underline"
                                                    >
                                                        View Transcript
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {chat.status === 'ASSIGNED' ? (
                                                        <div className="space-y-1">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                                Assigned
                                                            </span>
                                                            <div className="text-[10px] text-gray-500 font-medium">
                                                                To: {chat.assignedPsychologistName ?? `ID ${chat.assignedPsychologistId}`}
                                                            </div>
                                                        </div>
                                                    ) : chat.status === 'RESOLVED' ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                                            Resolved
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                                            Pending Review
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-700 transition shadow-sm flex items-center gap-1 ml-auto">
                                                        Action <ChevronRightIcon className="w-3 h-3" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group">
                        <ChatBubbleLeftRightIcon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-15 transform rotate-12 group-hover:scale-110 transition-transform" />
                        <h4 className="text-indigo-100 text-sm font-medium">Total Flagged Today</h4>
                        <div className="text-3xl font-bold mt-1">{stats?.totalFlaggedToday ?? '—'}</div>
                        <p className="text-indigo-100 text-xs mt-4 flex items-center gap-1">
                            <span className="bg-white/20 px-1.5 rounded font-bold">
                                +{stats?.flaggedLastHour ?? 0}
                            </span>
                            since last hour
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden group">
                        <CheckCircleIcon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-15 transform rotate-12 group-hover:scale-110 transition-transform" />
                        <h4 className="text-purple-100 text-sm font-medium">Resolved/Assigned</h4>
                        <div className="text-3xl font-bold mt-1">
                            {stats ? `${stats.resolvedOrAssignedPercent}%` : '—'}
                        </div>
                        <p className="text-purple-100 text-xs mt-4">
                            Average response time: {stats?.averageResponseMinutes ?? '—'} mins
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}