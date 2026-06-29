import React, { useState, useEffect, useCallback } from 'react'
import { ChatBubbleLeftRightIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function AdminChats() {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedWeek, setSelectedWeek] = useState('')
    const [sourceFilter, setSourceFilter] = useState('CHAT') // 'CHAT' or 'SCHEDULE'

    // Modal state
    const [selectedSession, setSelectedSession] = useState(null)
    const [transcriptLoading, setTranscriptLoading] = useState(false)
    const [transcriptData, setTranscriptData] = useState(null)

    const fetchSessions = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
            if (!token) throw new Error("No auth token found")

            const res = await fetch('/api/chat/admin/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error("Failed to fetch chat logs")
            const data = await res.json()
            setSessions(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    const handleViewTranscript = async (session) => {
        setSelectedSession(session)
        setTranscriptLoading(true)
        setTranscriptData(null)
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
            const res = await fetch(`/api/chat/admin/session/${session.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error("Failed to fetch transcript")
            const data = await res.json()
            setTranscriptData(data)
        } catch (err) {
            console.error("Transcript error", err)
        } finally {
            setTranscriptLoading(false)
        }
    }

    // Only compute unique weeks for the currently selected source
    const sessionsBySource = sessions.filter(s => s.source === sourceFilter)
    const uniqueWeeks = Array.from(new Set(sessionsBySource.map(s => s.weekStart))).sort((a, b) => new Date(b) - new Date(a))

    // Set default week to the most recent one when sessions load
    useEffect(() => {
        if (uniqueWeeks.length > 0) {
            // Check if selectedWeek is valid in the new source list, if not, select the first one
            if (!uniqueWeeks.includes(selectedWeek)) {
                setSelectedWeek(uniqueWeeks[0])
            }
        } else {
            setSelectedWeek('')
        }
    }, [uniqueWeeks, selectedWeek, sourceFilter])

    const filteredSessions = sessionsBySource.filter(s => {
        if (selectedWeek && s.weekStart !== selectedWeek) return false
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
            (s.className && s.className.toLowerCase().includes(term)) ||
            (s.studentId && s.studentId.toString().includes(term))
        )
    })

    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setSourceFilter('CHAT')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        sourceFilter === 'CHAT' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    ChatBuddy Logs
                </button>
                <button
                    onClick={() => setSourceFilter('SCHEDULE')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        sourceFilter === 'SCHEDULE' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Schedule Assistant Logs
                </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by student ID or class..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        />
                    </div>
                    {uniqueWeeks.length > 0 && (
                        <select
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm bg-white"
                        >
                            <option value="">All Weeks</option>
                            {uniqueWeeks.map(week => (
                                <option key={week} value={week}>
                                    Week of {new Date(week).toLocaleDateString()}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <button
                    onClick={fetchSessions}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading chat logs...</div>
            ) : error ? (
                <div className="text-center py-12 text-red-500 bg-red-50 rounded-lg">{error}</div>
            ) : filteredSessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                    No chat sessions found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredSessions.map(session => (
                        <div key={session.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-gray-900 text-lg truncate" title={`Student ${session.studentId}`}>
                                        Student {session.studentId}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {new Date(session.createdAt).toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-4 flex-1">
                                {session.className && (
                                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs rounded-full font-medium">
                                        {session.className}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={() => handleViewTranscript(session)}
                                className="w-full py-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                            >
                                View Transcript
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Transcript Modal */}
            {selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {selectedSession.source === 'CHAT' ? 'ChatBuddy Transcript' : 'Schedule Assistant Transcript'} — Student {selectedSession.studentId}
                                    </h3>
                                <p className="text-xs text-gray-500">
                                    Session from {new Date(selectedSession.weekStart).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                            {transcriptLoading ? (
                                <div className="text-center py-10 text-gray-500">Loading transcript...</div>
                            ) : !transcriptData || !transcriptData.messages || transcriptData.messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 italic">No messages in this session.</div>
                            ) : (
                                transcriptData.messages.map((msg, idx) => {
                                    const isUser = msg.role === 'user'
                                    return (
                                        <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                                isUser ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                            }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl flex justify-end">
                            <button
                                onClick={() => setSelectedSession(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
