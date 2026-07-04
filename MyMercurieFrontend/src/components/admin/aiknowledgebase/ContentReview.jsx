import React, { useState, useEffect } from 'react'
import { getPendingAiContent, approveAiContent, editAiContent, deleteAiContent, getChapter } from '../../../api/curriculumAiApi'
import Summary from '../../studentdashboard/tools/Summary'
import Flashcards from '../../studentdashboard/tools/Flashcards'
import Mnemonic from '../../studentdashboard/tools/Mnemonic'
import MockTest from '../../studentdashboard/tools/MockTest'

const TASK_META = {
  SUMMARY:    { label: 'Ready Reckoner', icon: '📋' },
  FLASHCARDS: { label: 'Flashcards',     icon: '🃏' },
  MNEMONIC:   { label: 'Mnemonic',       icon: '🧠' },
  MOCK_TEST:  { label: 'Mock Test',      icon: '📝' },
}

const FILTER_TABS = [
  { key: 'ALL',        label: 'All' },
  { key: 'SUMMARY',    label: 'Ready Reckoner' },
  { key: 'FLASHCARDS', label: 'Flashcards' },
  { key: 'MNEMONIC',   label: 'Mnemonic' },
  { key: 'MOCK_TEST',  label: 'Mock Test' },
]

const STATUS_STYLE = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING:  'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg font-bold text-sm animate-slide-up ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? '✓' : '✗'} {message}
    </div>
  )
}

function StudentPreview({ item }) {
  let parsed = {}
  try { parsed = JSON.parse(item.content) } catch {}
  const task = item.taskType
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-3">
      <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">Student View</p>
      {task === 'SUMMARY'    && <Summary    {...parsed} />}
      {task === 'FLASHCARDS' && <Flashcards flashcards={parsed.flashcards || []} />}
      {task === 'MNEMONIC'   && <Mnemonic   mnemonics={parsed.mnemonics || []} />}
      {task === 'MOCK_TEST'  && <MockTest   chapterLevel={parsed.chapterLevel} topicLevel={parsed.topicLevel} />}
    </div>
  )
}

function SimpleEditor({ item, onSave, onCancel }) {
  const [parsed, setParsed] = useState({})
  useEffect(() => { try { setParsed(JSON.parse(item.content)) } catch {} }, [item])

  const handleField = (field, value) => setParsed({ ...parsed, [field]: value })

  const handleSave = () => onSave(JSON.stringify(parsed))

  return (
    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Editing — {TASK_META[item.taskType]?.label}</p>
      {item.taskType === 'SUMMARY' && (
        <>
          <textarea rows={2} placeholder="Short Summary" value={parsed.shortSummary||''} onChange={e => handleField('shortSummary', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
          <textarea rows={5} placeholder="Key Points (one per line)" value={(parsed.keyPoints||[]).join('\n')} onChange={e => handleField('keyPoints', e.target.value.split('\n'))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#9333EA] outline-none" />
        </>
      )}
      {item.taskType === 'FLASHCARDS' && (
        <textarea rows={8} value={JSON.stringify(parsed, null, 2)} onChange={e => { try { setParsed(JSON.parse(e.target.value)) } catch {} }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-[#9333EA] outline-none" />
      )}
      {(item.taskType === 'MNEMONIC' || item.taskType === 'MOCK_TEST') && (
        <textarea rows={10} value={JSON.stringify(parsed, null, 2)} onChange={e => { try { setParsed(JSON.parse(e.target.value)) } catch {} }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-[#9333EA] outline-none" />
      )}
      <div className="flex gap-2">
        <button onClick={handleSave} className="px-4 py-2 bg-[#9333EA] text-white font-bold rounded-lg text-sm">Save</button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg text-sm">Cancel</button>
      </div>
    </div>
  )
}

export default function ContentReview({ onUpdate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState('ALL')
  const [previewOn, setPreviewOn] = useState({})  // { id: true/false }
  const [editingId, setEditingId] = useState(null)
  const [chapterCache, setChapterCache] = useState({})
  const [toast, setToast] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => { loadItems() }, [])

  const loadItems = async () => {
    try {
      const data = await getPendingAiContent()
      setItems(data)
      // Fetch chapter titles for each unique chapterId
      const ids = [...new Set(data.map(i => i.chapterId))]
      const entries = await Promise.allSettled(ids.map(id => getChapter(id).then(ch => [id, ch])))
      const cache = {}
      entries.forEach(r => { if (r.status === 'fulfilled') { const [id, ch] = r.value; cache[id] = ch } })
      setChapterCache(cache)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const showToast = (msg, type = 'success') => setToast({ message: msg, type })

  const handleApprove = async (id, status) => {
    try {
      await approveAiContent(id, { approvalStatus: status })
      await loadItems()
      onUpdate?.()
      showToast(status === 'APPROVED' ? 'Content approved ✓' : 'Content rejected')
    } catch { showToast('Action failed', 'error') }
  }

  const handleBulkApprove = async () => {
    setBulkLoading(true)
    try {
      await Promise.all(filtered.map(item => approveAiContent(item.id, { approvalStatus: 'APPROVED' })))
      await loadItems()
      onUpdate?.()
      showToast(`${filtered.length} items approved!`)
    } catch { showToast('Bulk approve failed', 'error') }
    finally { setBulkLoading(false) }
  }

  const handleEdit = async (id, content) => {
    try {
      await editAiContent(id, { content })
      setEditingId(null)
      await loadItems()
      showToast('Content saved — reset to Pending')
    } catch { showToast('Save failed', 'error') }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAiContent(id)
      await loadItems()
      onUpdate?.()
      showToast('Content deleted')
    } catch { showToast('Delete failed', 'error') }
  }

  const filtered = items.filter(i => filterTab === 'ALL' || i.taskType === filterTab)

  if (loading) return <div className="text-center py-12 text-gray-500 animate-pulse">Loading pending content...</div>

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Filter Tabs + Bulk Approve */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilterTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                filterTab === tab.key ? 'bg-[#9333EA] text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {tab.label}
              {tab.key !== 'ALL' && (
                <span className="ml-1 opacity-60">{items.filter(i => i.taskType === tab.key).length}</span>
              )}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <button onClick={handleBulkApprove} disabled={bulkLoading}
            className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
            {bulkLoading ? 'Approving...' : `✅ Approve All (${filtered.length})`}
          </button>
        )}
      </div>

      {/* Content List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl block mb-3">🎉</span>
          <h3 className="font-black text-gray-900">Nothing Pending!</h3>
          <p className="text-gray-500 mt-1 text-sm">All content has been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const chapter = chapterCache[item.chapterId]
            const taskInfo = TASK_META[item.taskType] || { label: item.taskType, icon: '📄' }
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{taskInfo.icon}</span>
                        <span className="font-black text-gray-900 text-sm">{taskInfo.label}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[item.approvalStatus]}`}>
                          {item.approvalStatus}
                        </span>
                      </div>
                      {chapter ? (
                        <p className="text-xs text-gray-500 font-medium">
                          Ch.{chapter.chapterNumber || '?'} • {chapter.subject} • {chapter.grade} — {chapter.title}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Chapter ID: {item.chapterId}</p>
                      )}
                      {item.topic && <p className="text-xs text-gray-400 mt-0.5">Topic: {item.topic}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 flex-shrink-0 ml-3">
                      <button onClick={() => setPreviewOn({...previewOn, [item.id]: !previewOn[item.id]})}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-100 transition-colors">
                        {previewOn[item.id] ? 'Hide' : '👁 Preview'}
                      </button>
                      <button onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleApprove(item.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 transition-colors">
                        ✅
                      </button>
                      <button onClick={() => handleApprove(item.id, 'REJECTED')}
                        className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors">
                        ❌
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Student Preview */}
                  {previewOn[item.id] && <StudentPreview item={item} />}

                  {/* Edit Panel */}
                  {editingId === item.id && (
                    <SimpleEditor item={item} onSave={(content) => handleEdit(item.id, content)} onCancel={() => setEditingId(null)} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
