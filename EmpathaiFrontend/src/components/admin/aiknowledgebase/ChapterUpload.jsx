import React, { useState, useEffect } from 'react'
import { uploadChapter, getChapterStatus, updateChapterMetadata, publishChapter } from '../../../api/curriculumAiApi'

const CLASSES = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
  'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'
]
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Art & Craft']
const BLOOMS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

export default function ChapterUpload() {
  const [stage, setStage] = useState('FORM')
  const [chapterId, setChapterId] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [editedMetadata, setEditedMetadata] = useState(null)
  const [formData, setFormData] = useState({ board: 'CBSE', grade: '', subject: '', title: '', chapterNumber: '', rawContent: '' })
  const [subtopicInput, setSubtopicInput] = useState('')
  const [subtopics, setSubtopics] = useState([])
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Polling logic
  useEffect(() => {
    if (stage !== 'PROCESSING' || !chapterId) return
    const interval = setInterval(async () => {
      try {
        const status = await getChapterStatus(chapterId)
        if (status.processingStatus === 'PROCESSED') {
          setMetadata(status)
          setEditedMetadata({
            ...status,
            topics: status.topics || [],
            learningObjectives: status.learningObjectives || [],
            bloomsLevels: status.bloomsLevels || [],
            prerequisites: status.prerequisites || [],
            keywords: status.keywords || [],
          })
          setStage('REVIEW')
          clearInterval(interval)
        } else if (status.processingStatus === 'FAILED') {
          setStage('FORM')
          clearInterval(interval)
          alert('Processing failed. Please try again.')
        }
      } catch (err) { console.error(err) }
    }, 3000)
    return () => clearInterval(interval)
  }, [stage, chapterId])

  const addSubtopic = () => {
    const trimmed = subtopicInput.trim()
    if (trimmed && !subtopics.includes(trimmed)) {
      setSubtopics([...subtopics, trimmed])
      setSubtopicInput('')
    }
  }

  const removeSubtopic = (name) => setSubtopics(subtopics.filter(s => s !== name))

  const handleUpload = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...formData }
      if (!payload.chapterNumber) payload.chapterNumber = null
      else payload.chapterNumber = parseInt(payload.chapterNumber)
      payload.subtopics = subtopics // array, not string
      const res = await uploadChapter(payload)
      setChapterId(res.chapterId)
      setStage('PROCESSING')
    } catch (err) { alert(err.message) }
  }

  const handlePublish = async () => {
    try {
      await updateChapterMetadata(chapterId, editedMetadata)
      await publishChapter(chapterId)
      setStage('PUBLISHED')
    } catch (err) { alert(err.message) }
  }

  const toggleBloom = (level) => {
    const current = editedMetadata.bloomsLevels || []
    const updated = current.includes(level)
      ? current.filter(b => b !== level)
      : [...current, level]
    setEditedMetadata({ ...editedMetadata, bloomsLevels: updated })
  }

  const addTag = (field, value) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const current = editedMetadata[field] || []
    if (!current.includes(trimmed)) {
      setEditedMetadata({ ...editedMetadata, [field]: [...current, trimmed] })
    }
  }

  const removeTag = (field, value) => {
    setEditedMetadata({ ...editedMetadata, [field]: (editedMetadata[field] || []).filter(t => t !== value) })
  }

  // ── FORM Stage ──────────────────────────────────────────────────────────────
  if (stage === 'FORM') {
    return (
      <form onSubmit={handleUpload} className="space-y-5 max-w-2xl">
        <h3 className="text-lg font-black text-gray-900 mb-2">Upload New Chapter</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Board */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Board</label>
            <input type="text" value={formData.board}
              onChange={e => setFormData({...formData, board: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm" required />
          </div>
          {/* Class */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
            <select value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm bg-white" required>
              <option value="">Select Class</option>
              {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          {/* Subject */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
            <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm bg-white" required>
              <option value="">Select Subject</option>
              {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Chapter Title</label>
            <input type="text" value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm" required />
          </div>
          {/* Chapter Number */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Chapter Number <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input type="number" value={formData.chapterNumber}
              onChange={e => setFormData({...formData, chapterNumber: e.target.value})}
              placeholder="e.g. 3"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm" />
          </div>
        </div>

        {/* Subtopics — Chip Input */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Subtopics <span className="text-gray-400 font-normal">(Optional — guides AI metadata extraction)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={subtopicInput}
              onChange={e => setSubtopicInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtopic() }}}
              placeholder="e.g. Quantum Mechanics"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm"
            />
            <button type="button" onClick={addSubtopic}
              className="px-4 py-2.5 bg-[#9333EA] text-white font-bold rounded-xl hover:bg-[#7e22ce] transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
          {subtopics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {subtopics.map(st => (
                <span key={st} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-sm font-semibold rounded-full">
                  {st}
                  <button type="button" onClick={() => removeSubtopic(st)} className="text-purple-400 hover:text-purple-700 transition-colors leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Raw Content */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Raw Content <span className="text-gray-400 font-normal">(Markdown / Plain text)</span></label>
          <textarea rows="10" value={formData.rawContent}
            onChange={e => setFormData({...formData, rawContent: e.target.value})}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm"
            required />
        </div>

        <button type="submit" className="w-full py-3 bg-[#9333EA] hover:bg-[#7e22ce] text-white font-black rounded-xl transition-colors shadow-md shadow-purple-200">
          🤖 Generate Intelligence
        </button>
      </form>
    )
  }

  // ── PROCESSING Stage ────────────────────────────────────────────────────────
  if (stage === 'PROCESSING') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 border-4 border-[#9333EA] border-t-transparent rounded-full animate-spin mb-6" />
        <h3 className="text-xl font-black text-gray-900">Processing Chapter...</h3>
        <p className="text-gray-500 mt-1 text-sm">Generating chunks, metadata, embeddings. This may take a minute.</p>
      </div>
    )
  }

  // ── REVIEW Stage ────────────────────────────────────────────────────────────
  if (stage === 'REVIEW') {
    const em = editedMetadata || {}
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">Review AI-Extracted Metadata</h3>
          <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full">✓ AI Processing Complete</span>
        </div>

        {/* Core Fields */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h4 className="text-sm font-black text-gray-700 uppercase tracking-wide">Core Settings</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Difficulty Level</label>
              <select value={em.difficultyLevel || 'Medium'}
                onChange={e => setEditedMetadata({...em, difficultyLevel: e.target.value})}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#9333EA] outline-none">
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Estimated Reading Time (mins)</label>
              <input type="number" value={em.estimatedReadingTime || 0}
                onChange={e => setEditedMetadata({...em, estimatedReadingTime: parseInt(e.target.value)})}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
            </div>
          </div>

          {/* Topics chips */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Topics</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(em.topics || []).map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-full">
                  {t}<button type="button" onClick={() => removeTag('topics', t)} className="text-purple-400 hover:text-purple-700">×</button>
                </span>
              ))}
            </div>
            <input type="text" placeholder="Add topic and press Enter"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('topics', e.target.value); e.target.value = '' }}}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
          </div>

          {/* Learning Objectives */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Learning Objectives</label>
            <div className="space-y-1.5">
              {(em.learningObjectives || []).map((obj, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 text-xs">•</span>
                  <input type="text" value={obj}
                    onChange={e => { const arr = [...(em.learningObjectives || [])]; arr[i] = e.target.value; setEditedMetadata({...em, learningObjectives: arr}) }}
                    className="flex-1 text-sm text-gray-700 bg-transparent border-b border-gray-200 focus:border-[#9333EA] outline-none py-0.5" />
                  <button type="button" onClick={() => removeTag('learningObjectives', obj)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Metadata Accordion */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
            <span className="text-sm font-black text-gray-700">Advanced AI Metadata</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {advancedOpen && (
            <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
              {/* Bloom's Taxonomy */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Bloom's Taxonomy Levels</label>
                <div className="flex flex-wrap gap-2">
                  {BLOOMS.map(level => (
                    <button key={level} type="button"
                      onClick={() => toggleBloom(level)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        (em.bloomsLevels || []).includes(level)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'border-gray-300 text-gray-600 hover:border-purple-400'
                      }`}>{level}</button>
                  ))}
                </div>
              </div>

              {/* Prerequisites chips */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Prerequisites</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(em.prerequisites || []).map(t => (
                    <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full">
                      {t}<button type="button" onClick={() => removeTag('prerequisites', t)} className="text-blue-400 hover:text-blue-700">×</button>
                    </span>
                  ))}
                </div>
                <input type="text" placeholder="Add prerequisite and press Enter"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('prerequisites', e.target.value); e.target.value = '' }}}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
              </div>

              {/* Keywords chips */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Keywords</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(em.keywords || []).map(t => (
                    <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-full">
                      {t}<button type="button" onClick={() => removeTag('keywords', t)} className="text-gray-400 hover:text-gray-700">×</button>
                    </span>
                  ))}
                </div>
                <input type="text" placeholder="Add keyword and press Enter"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('keywords', e.target.value); e.target.value = '' }}}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
              </div>

              {/* Common Misconceptions (read-only) */}
              {(em.commonMisconceptions || []).length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">Common Misconceptions <span className="text-gray-400 font-normal">(AI-generated, read-only)</span></label>
                  <ul className="space-y-1.5">
                    {(em.commonMisconceptions || []).map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-red-400 mt-0.5">⚠</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handlePublish}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl transition-colors shadow-md">
          🚀 Publish Chapter
        </button>
      </div>
    )
  }

  // ── PUBLISHED Stage ─────────────────────────────────────────────────────────
  if (stage === 'PUBLISHED') {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <span className="text-green-600 text-3xl">✓</span>
        </div>
        <h3 className="text-xl font-black text-gray-900">Chapter Published!</h3>
        <p className="mt-2 text-sm text-gray-500">The chapter and its AI tools are now available to students.</p>
        <button
          onClick={() => { setStage('FORM'); setFormData({board:'CBSE',grade:'',subject:'',title:'',chapterNumber:'',rawContent:''}); setSubtopics([]) }}
          className="mt-6 px-6 py-2.5 bg-purple-50 text-[#9333EA] font-bold rounded-xl hover:bg-purple-100 transition-colors">
          Upload Another Chapter
        </button>
      </div>
    )
  }

  return null
}
