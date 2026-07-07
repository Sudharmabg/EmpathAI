import React, { useState, useEffect } from 'react'
import { getPublishedChapters, getChapterAiContent } from '../../../api/curriculumAiApi'

const AI_TOOLS = [
  { key: 'SUMMARY',    label: 'Ready Reckoner', icon: '📋', color: 'purple' },
  { key: 'FLASHCARDS', label: 'Flashcards',     icon: '🃏', color: 'blue' },
  { key: 'MNEMONIC',   label: 'Mnemonic',       icon: '🧠', color: 'amber' },
  { key: 'MOCK_TEST',  label: 'Mock Test',      icon: '📝', color: 'green' },
  { key: 'ANALOGY',    label: 'Analogy',        icon: '📖', color: 'pink' },
]

const GRADES = ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12']
const SUBJECTS = ['Mathematics','Science','English','Hindi','Social Studies','Art & Craft']

const STATUS_BADGE = {
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: '✓', label: 'Approved' },
  PENDING:  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: '⏳', label: 'Pending' },
  REJECTED: { bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-200',   icon: '✗', label: 'Rejected' },
  NONE:     { bg: 'bg-gray-100',  text: 'text-gray-500',  border: 'border-gray-200',  icon: '—', label: 'Not Generated' },
}

export default function ContentPipeline() {
  const [chapters, setChapters] = useState([])
  const [chapterAiData, setChapterAiData] = useState({}) // { chapterId: [ aiContentItems ] }
  const [loading, setLoading] = useState(true)
  const [loadingAi, setLoadingAi] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'NONE'
  const [toolFilter, setToolFilter] = useState('') // '' | AI tool key

  // Expanded chapter rows
  const [expandedChapter, setExpandedChapter] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getPublishedChapters()
      setChapters(data)
      setLoading(false)

      // Fetch AI content for each chapter in parallel
      setLoadingAi(true)
      const aiDataMap = {}
      await Promise.allSettled(
        data.map(async (ch) => {
          try {
            const aiContent = await getChapterAiContent(ch.id)
            aiDataMap[ch.id] = aiContent || []
          } catch {
            aiDataMap[ch.id] = []
          }
        })
      )
      setChapterAiData(aiDataMap)
    } catch (err) {
      console.error('Failed to load pipeline data:', err)
    } finally {
      setLoading(false)
      setLoadingAi(false)
    }
  }

  // ── Helper: get tool status for a chapter ──────────────────────────────────
  const getToolStatus = (chapterId, toolKey) => {
    const items = (chapterAiData[chapterId] || []).filter(
      item => item.taskType === toolKey && !item.topic // chapter-level only
    )
    if (items.length === 0) return { status: 'NONE', item: null }
    // Pick latest or most relevant
    const approved = items.find(i => i.approvalStatus === 'APPROVED')
    if (approved) return { status: 'APPROVED', item: approved }
    const pending = items.find(i => i.approvalStatus === 'PENDING')
    if (pending) return { status: 'PENDING', item: pending }
    const rejected = items.find(i => i.approvalStatus === 'REJECTED')
    if (rejected) return { status: 'REJECTED', item: rejected }
    return { status: 'NONE', item: items[0] }
  }

  // ── Aggregate statistics ───────────────────────────────────────────────────
  const computeStats = () => {
    const stats = {
      totalChapters: chapters.length,
      byTool: {},
      overall: { approved: 0, pending: 0, rejected: 0, notGenerated: 0, total: 0 }
    }
    AI_TOOLS.forEach(tool => {
      stats.byTool[tool.key] = { approved: 0, pending: 0, rejected: 0, notGenerated: 0 }
    })
    chapters.forEach(ch => {
      AI_TOOLS.forEach(tool => {
        const { status } = getToolStatus(ch.id, tool.key)
        if (status === 'APPROVED') {
          stats.byTool[tool.key].approved++
          stats.overall.approved++
        } else if (status === 'PENDING') {
          stats.byTool[tool.key].pending++
          stats.overall.pending++
        } else if (status === 'REJECTED') {
          stats.byTool[tool.key].rejected++
          stats.overall.rejected++
        } else {
          stats.byTool[tool.key].notGenerated++
          stats.overall.notGenerated++
        }
        stats.overall.total++
      })
    })
    return stats
  }

  const stats = !loading && !loadingAi ? computeStats() : null

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredChapters = chapters.filter(ch => {
    if (search && !ch.title.toLowerCase().includes(search.toLowerCase())) return false
    if (gradeFilter && ch.grade !== gradeFilter) return false
    if (subjectFilter && ch.subject !== subjectFilter) return false

    // Status filter: check if the chapter has at least one tool matching the selected status
    if (statusFilter) {
      const toolsToCheck = toolFilter ? [toolFilter] : AI_TOOLS.map(t => t.key)
      const hasMatch = toolsToCheck.some(tk => getToolStatus(ch.id, tk).status === statusFilter)
      if (!hasMatch) return false
    }

    // Tool filter without status filter: show chapters that have that tool in any state
    if (toolFilter && !statusFilter) {
      // No additional filtering needed — tool filter with status is handled above
    }

    return true
  })

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 border-4 border-[#9333EA] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-semibold text-sm">Loading pipeline data...</p>
      </div>
    )
  }

  if (chapters.length === 0) {
    return (
      <div className="space-y-5">
        <h3 className="text-lg font-black text-gray-900">Content Pipeline</h3>
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#9333EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h3 className="font-black text-gray-900 text-lg">No Pipeline Content Yet</h3>
          <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
            Upload and publish chapters first. The pipeline will show the AI content generation status and approval workflow for all chapters.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900">Content Pipeline</h3>
        <button
          onClick={loadData}
          disabled={loadingAi}
          className="px-4 py-2 text-xs font-bold text-[#9333EA] bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loadingAi ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── Statistics Cards ─────────────────────────────────────────────────── */}
      {stats && (
        <div className="space-y-4">
          {/* Overall summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-black text-gray-900">{stats.totalChapters}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Chapters</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
              <p className="text-2xl font-black text-green-700">{stats.overall.approved}</p>
              <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-1">Approved</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
              <p className="text-2xl font-black text-amber-700">{stats.overall.pending}</p>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">Pending</p>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
              <p className="text-2xl font-black text-red-700">{stats.overall.rejected + stats.overall.notGenerated}</p>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1">Rejected / Missing</p>
            </div>
          </div>

          {/* Per-tool breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide">AI Tool Breakdown</p>
            </div>
            <div className="divide-y divide-gray-50">
              {AI_TOOLS.map(tool => {
                const t = stats.byTool[tool.key]
                const total = stats.totalChapters
                const approvedPct = total > 0 ? Math.round((t.approved / total) * 100) : 0
                return (
                  <div key={tool.key} className="px-5 py-3.5 flex items-center gap-4">
                    <span className="text-lg w-8 text-center flex-shrink-0">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-bold text-gray-800">{tool.label}</p>
                        <p className="text-xs font-bold text-gray-400">{approvedPct}% approved</p>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        {t.approved > 0 && (
                          <div className="h-full bg-green-500 transition-all" style={{ width: `${(t.approved / total) * 100}%` }} />
                        )}
                        {t.pending > 0 && (
                          <div className="h-full bg-amber-400 transition-all" style={{ width: `${(t.pending / total) * 100}%` }} />
                        )}
                        {t.rejected > 0 && (
                          <div className="h-full bg-red-400 transition-all" style={{ width: `${(t.rejected / total) * 100}%` }} />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs font-bold">
                      <span className="text-green-600">{t.approved}✓</span>
                      <span className="text-amber-600">{t.pending}⏳</span>
                      <span className="text-red-600">{t.rejected}✗</span>
                      <span className="text-gray-400">{t.notGenerated}—</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="Search chapters..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:border-[#9333EA] focus:ring-2 focus:ring-purple-100 outline-none"
          />
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:border-[#9333EA] outline-none bg-white">
          <option value="">All Grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:border-[#9333EA] outline-none bg-white">
          <option value="">All Subjects</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={toolFilter} onChange={e => setToolFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:border-[#9333EA] outline-none bg-white">
          <option value="">All Tools</option>
          {AI_TOOLS.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:border-[#9333EA] outline-none bg-white">
          <option value="">All Statuses</option>
          <option value="APPROVED">✓ Approved</option>
          <option value="PENDING">⏳ Pending</option>
          <option value="REJECTED">✗ Rejected</option>
          <option value="NONE">— Not Generated</option>
        </select>
      </div>

      {/* ── Chapter Pipeline Table ───────────────────────────────────────────── */}
      {loadingAi && (
        <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl text-sm font-semibold text-purple-700">
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          Loading AI content status for {chapters.length} chapters...
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h4 className="font-black text-gray-900 text-sm">Chapter Pipeline</h4>
          <span className="text-xs text-gray-400 font-semibold">
            {filteredChapters.length} of {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredChapters.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No chapters match your filters.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filteredChapters.map(ch => {
              const isExpanded = expandedChapter === ch.id
              const toolStatuses = AI_TOOLS.map(tool => ({
                ...tool,
                ...getToolStatus(ch.id, tool.key),
              }))
              const approvedCount = toolStatuses.filter(t => t.status === 'APPROVED').length
              const allApproved = approvedCount === AI_TOOLS.length

              return (
                <li key={ch.id} className="group">
                  {/* ── Row Header ── */}
                  <button
                    onClick={() => setExpandedChapter(isExpanded ? null : ch.id)}
                    className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Chapter info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded uppercase tracking-wide flex-shrink-0">
                          {ch.board}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">{ch.grade} • {ch.subject}</span>
                        {ch.chapterNumber && (
                          <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">Ch. {ch.chapterNumber}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate">{ch.title}</p>
                      {ch.publishedAt && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Published {new Date(ch.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {(ch.publishedBy || ch.createdBy) && ` by ${ch.publishedBy || ch.createdBy}`}
                        </p>
                      )}
                    </div>

                    {/* Quick tool status dots */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {toolStatuses.map(ts => (
                        <div
                          key={ts.key}
                          title={`${ts.label}: ${ts.status === 'NONE' ? 'Not Generated' : ts.status}`}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                            ts.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                            ts.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                            ts.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {ts.icon}
                        </div>
                      ))}
                    </div>

                    {/* Overall badge */}
                    <div className="flex-shrink-0">
                      {allApproved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                          ✓ All Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                          {approvedCount}/{AI_TOOLS.length} tools
                        </span>
                      )}
                    </div>

                    {/* Expand chevron */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* ── Expanded Detail ── */}
                  {isExpanded && (
                    <div className="px-6 pb-5 pt-1 bg-gray-50/40 border-t border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {toolStatuses.map(ts => {
                          const badge = STATUS_BADGE[ts.status]
                          return (
                            <div
                              key={ts.key}
                              className={`rounded-xl border p-4 ${badge.border} ${ts.status === 'APPROVED' ? 'bg-green-50/50' : ts.status === 'PENDING' ? 'bg-amber-50/50' : ts.status === 'REJECTED' ? 'bg-red-50/50' : 'bg-white'}`}
                            >
                              <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-lg">{ts.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-800">{ts.label}</p>
                                </div>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                                  {badge.icon} {badge.label}
                                </span>
                              </div>

                              {/* Approval details */}
                              {ts.status === 'APPROVED' && ts.item && (
                                <div className="text-xs text-green-600 mt-1 space-y-0.5">
                                  {ts.item.approvedBy && <p className="font-semibold">✓ Approved by {ts.item.approvedBy}</p>}
                                  {ts.item.approvedAt && (
                                    <p className="text-green-500 text-[10px]">
                                      {new Date(ts.item.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                              )}
                              {ts.status === 'PENDING' && ts.item && (
                                <p className="text-xs text-amber-600 mt-1 font-semibold">⏳ Awaiting review</p>
                              )}
                              {ts.status === 'REJECTED' && ts.item && (
                                <div className="text-xs text-red-600 mt-1 space-y-0.5">
                                  {ts.item.approvedBy && <p className="font-semibold">✗ Rejected by {ts.item.approvedBy}</p>}
                                  {ts.item.approvedAt && (
                                    <p className="text-red-500 text-[10px]">
                                      {new Date(ts.item.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                              )}
                              {ts.status === 'NONE' && (
                                <p className="text-xs text-gray-400 mt-1 font-medium">Not generated yet</p>
                              )}

                              {/* Edited by info */}
                              {ts.item?.editedBy && (
                                <p className="text-[10px] text-blue-500 mt-1.5 font-semibold">✏️ Edited by {ts.item.editedBy}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
