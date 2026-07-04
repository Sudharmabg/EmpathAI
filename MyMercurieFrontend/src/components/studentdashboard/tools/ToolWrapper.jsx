import React, { useState, useEffect } from 'react'
import { processAiRequest } from '../../../api/curriculumAiApi'

export default function ToolWrapper({ task, chapterId, topic, grade, subject, chapter, children }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      setData(null)
      setPending(false)
      try {
        const res = await processAiRequest({ task, chapterId, topic, grade, subject, chapter })
        if (res.pendingApproval) {
          setPending(true)
        } else {
          const parsedContent = typeof res.content === 'string' ? JSON.parse(res.content) : res.content
          setData(parsedContent)
        }
      } catch (err) {
        console.error('AI Request Error:', err)
        setError('Failed to generate or retrieve AI study tool content. Please retry.')
      } finally {
        setLoading(false)
      }
    }

    if (chapterId) {
      fetchData()
    }
  }, [task, chapterId, topic, grade, subject, chapter])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-purple-50/50 shadow-sm p-8 space-y-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-100 text-red-700 rounded-2xl p-6 text-center space-y-3">
        <p className="font-bold text-sm">{error}</p>
        <button
          onClick={() => {
            setError(null)
            // Trigger refetch by updating a local state if necessary or just recall the hook logic
            window.location.reload()
          }}
          className="px-4 py-2 bg-red-600 text-white font-semibold rounded-xl text-xs hover:bg-red-700 transition-colors"
        >
          Retry Request
        </button>
      </div>
    )
  }

  if (pending) {
    return (
      <div className="bg-amber-50 border-2 border-amber-100 text-amber-700 rounded-2xl p-8 text-center space-y-3 shadow-sm">
        <span className="text-4xl block mb-4">⏳</span>
        <h3 className="font-black text-xl">Generation Pending Approval</h3>
        <p className="text-sm font-medium">Your request for {task} has been generated and is awaiting instructor review. It will appear here once approved!</p>
      </div>
    )
  }

  if (!data) return null

  return children(data)
}
