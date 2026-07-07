import React, { useState, useEffect } from 'react'
import { getPublishedChapters, getCachedAiContent } from '../../../api/curriculumAiApi'
import ToolWrapper from './ToolWrapper'
import Summary from './Summary'
import Flashcards from './Flashcards'
import Mnemonic from './Mnemonic'
import MockTest from './MockTest'

const TOOL_TABS = [
  { id: 'SUMMARY', label: 'Ready Reckoner', icon: '📋' },
  { id: 'FLASHCARDS', label: 'Flashcards', icon: '📇' },
  { id: 'MNEMONIC', label: 'Mnemonic', icon: '🧠' },
  { id: 'MOCK_TEST', label: 'Mock Test', icon: '📋' },
]

export default function AiTools({ user }) {
  const [chapters, setChapters] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [filteredChapters, setFilteredChapters] = useState([])
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [activeToolTab, setActiveToolTab] = useState('SUMMARY')
  const [loading, setLoading] = useState(true)
  const [approvedTools, setApprovedTools] = useState([])
  const [checkingApproval, setCheckingApproval] = useState(false)

  useEffect(() => {
    if (!selectedChapterId) {
      setApprovedTools([])
      return
    }

    async function checkApprovedTools() {
      setCheckingApproval(true)
      const approved = []
      await Promise.all(
        TOOL_TABS.map(async (tab) => {
          try {
            const res = await getCachedAiContent(tab.id, selectedChapterId, selectedTopic || null)
            if (res && !res.pendingApproval) {
              approved.push(tab.id)
            }
          } catch (e) {
            // Not found/not approved
          }
        })
      )
      setApprovedTools(approved)
      setCheckingApproval(false)

      if (approved.length > 0) {
        if (!approved.includes(activeToolTab)) {
          setActiveToolTab(approved[0])
        }
      } else {
        setActiveToolTab('')
      }
    }

    checkApprovedTools()
  }, [selectedChapterId, selectedTopic])

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPublishedChapters()
        setChapters(data)
        const uniqueSubjects = Array.from(new Set(data.map(c => c.subject)))
        setSubjects(uniqueSubjects)
      } catch (err) {
        console.error('Failed to load published chapters', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Handle subject change
  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject)
    setSelectedChapterId('')
    setSelectedChapter(null)
    setSelectedTopic('')
    const filtered = chapters.filter(c => c.subject === subject)
    setFilteredChapters(filtered)
  }

  // Handle chapter change
  const handleChapterChange = (chapterId) => {
    setSelectedChapterId(chapterId)
    setSelectedTopic('')
    const chap = chapters.find(c => String(c.id) === String(chapterId))
    setSelectedChapter(chap || null)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading Curriculum...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header card with dropdowns */}
      <div className="bg-white p-6 rounded-2xl border-2 border-purple-50/50 shadow-sm space-y-4">
        <h2 className="text-xl font-black text-black">Study Buddy Tools</h2>
        <p className="text-sm text-gray-500">Select a subject and chapter to unlock summaries, flashcards, mnemonics, and practice mock tests.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={e => handleSubjectChange(e.target.value)}
              className="w-full rounded-xl border-gray-200 text-sm font-semibold focus:border-primary focus:ring-primary focus:ring-4 focus:ring-purple-100 transition-all"
            >
              <option value="">Select Subject</option>
              {subjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chapter</label>
            <select
              value={selectedChapterId}
              onChange={e => handleChapterChange(e.target.value)}
              disabled={!selectedSubject}
              className="w-full rounded-xl border-gray-200 text-sm font-semibold focus:border-primary focus:ring-primary focus:ring-4 focus:ring-purple-100 transition-all disabled:opacity-50"
            >
              <option value="">Select Chapter</option>
              {filteredChapters.map(chap => (
                <option key={chap.id} value={chap.id}>{chap.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 tracking-wider mb-2 uppercase">
              Topic (Optional)
            </label>
            <select
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              disabled={!selectedChapter}
              className="w-full rounded-xl border-gray-200 text-sm font-semibold focus:border-primary focus:ring-primary focus:ring-4 focus:ring-purple-100 transition-all disabled:opacity-50"
            >
              <option value="">Whole Chapter</option>
              {selectedChapter?.topics?.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {selectedChapter && approvedTools.length > 0 && (
        <div className="flex border-b border-gray-200 bg-white px-4 rounded-xl border-2 border-purple-50/50 shadow-sm overflow-x-auto">
          {TOOL_TABS.filter(tab => approvedTools.includes(tab.id)).map(tab => {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveToolTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-black text-sm transition-all whitespace-nowrap ${activeToolTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Content wrapper */}
      <div className="min-h-[400px]">
        {!selectedChapter ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
            Select a subject and chapter to load learning aids.
          </div>
        ) : checkingApproval ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-purple-50/50 shadow-sm">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium animate-pulse">Checking approved study tools...</p>
          </div>
        ) : approvedTools.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
            No study tools have been approved for this chapter yet.
          </div>
        ) : (
          <ToolWrapper
            task={activeToolTab}
            chapterId={selectedChapter.id}
            topic={selectedTopic || null}
            grade={selectedChapter.grade}
            subject={selectedChapter.subject}
            chapter={selectedChapter.title}
          >
            {(content) => {
              switch (activeToolTab) {
                case 'SUMMARY':
                  return <Summary {...content} />
                case 'FLASHCARDS':
                  return <Flashcards {...content} />
                case 'MNEMONIC':
                  return <Mnemonic {...content} />
                case 'MOCK_TEST':
                  return <MockTest {...content} />
                default:
                  return null
              }
            }}
          </ToolWrapper>
        )}
      </div>
    </div>
  )
}
