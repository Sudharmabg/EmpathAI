import React, { useState, useEffect, useCallback } from 'react'
import { processAiRequest } from '../../../api/curriculumAiApi'
import { AlertIcon, ClockIcon, RefreshIcon } from './icons'

export default function ToolWrapper({ task, chapterId, topic, grade, subject, chapter, children }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  const fetchData = useCallback(async () => {
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
  }, [task, chapterId, topic, grade, subject, chapter])

  useEffect(() => {
    if (chapterId) {
      fetchData()
    }
  }, [fetchData, chapterId])

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border-2 border-purple-50/70 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-[#2D1B69] border-t-transparent animate-spin flex-shrink-0" />
          <p className="text-sm font-black text-[#1E1B4B]">Preparing your study tool…</p>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-purple-50 rounded-full w-1/3 animate-pulse" />
          <div className="h-4 bg-purple-50 rounded-full animate-pulse" />
          <div className="h-4 bg-purple-50 rounded-full w-5/6 animate-pulse" />
          <div className="h-4 bg-purple-50 rounded-full w-4/5 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-500 flex items-center justify-center mx-auto">
          <AlertIcon className="w-6 h-6" />
        </div>
        <p className="font-black text-sm text-red-700">{error}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-black rounded-xl text-xs hover:bg-red-700 transition-colors"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          Retry Request
        </button>
      </div>
    )
  }

  if (pending) {
    return (
      <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-8 sm:p-10 text-center space-y-3 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <ClockIcon className="w-7 h-7" />
        </div>
        <h3 className="font-black text-lg text-amber-800">Generation pending approval</h3>
        <p className="text-sm font-medium text-amber-700 max-w-sm mx-auto leading-relaxed">
          Your request for this tool has been generated and is awaiting instructor review. It'll appear here as soon as it's approved!
        </p>
      </div>
    )
  }

  if (!data) return null

  return children(data)
}