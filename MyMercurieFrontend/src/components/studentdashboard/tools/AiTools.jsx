import React, { useState, useEffect } from 'react'
import { getPublishedChapters, getCachedAiContent } from '../../../api/curriculumAiApi'
import ToolWrapper from './ToolWrapper'
import Summary from './Summary'
import Flashcards from './Flashcards'
import Mnemonic from './Mnemonic'
import MockTest from './MockTest'
import SelectDropdown from './SelectDropdown'
import {
  BookOpenIcon,
  LayersIcon,
  BrainIcon,
  ClipboardCheckIcon,
  SparklesIcon,
  TargetIcon,
  OpenBoxIllustration,
} from './icons'

const TOOL_TABS = [
  {
    id: 'SUMMARY',
    label: 'Ready Reckoner',
    shortLabel: 'Summary',
    icon: BookOpenIcon,
    accent: 'primary',
    description: 'Get concise chapter summaries to grasp key concepts quickly.',
  },
  {
    id: 'FLASHCARDS',
    label: 'Flashcards',
    shortLabel: 'Flashcards',
    icon: LayersIcon,
    accent: 'lilac',
    description: 'Review important points with smart, swipeable flashcards.',
  },
  {
    id: 'MNEMONIC',
    label: 'Mnemonics',
    shortLabel: 'Mnemonics',
    icon: BrainIcon,
    accent: 'blue',
    description: 'Remember better with memory tricks and patterns.',
  },
  {
    id: 'MOCK_TEST',
    label: 'Mock Test',
    shortLabel: 'Mock Test',
    icon: ClipboardCheckIcon,
    accent: 'amber',
    description: 'Practice with chapter tests and track your understanding.',
  },
]

// Small accent palette pulled from the app's existing theme colors
// (see tailwind.config.js: primary, dusty-lilac, powder-blue, warm-apricot)
const ACCENTS = {
  primary: {
    iconBg: 'bg-[#EDEBFB]',
    iconText: 'text-[#2D1B69]',
    chipActive: 'bg-[#2D1B69] text-white shadow-md shadow-[#2D1B69]/25',
    ring: 'hover:border-[#2D1B69]/40',
    dot: 'bg-[#2D1B69]',
  },
  lilac: {
    iconBg: 'bg-[#F3EBFB]',
    iconText: 'text-[#8B5CF6]',
    chipActive: 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/25',
    ring: 'hover:border-[#8B5CF6]/40',
    dot: 'bg-[#8B5CF6]',
  },
  blue: {
    iconBg: 'bg-[#E7F6F7]',
    iconText: 'text-[#3B9DA1]',
    chipActive: 'bg-[#3B9DA1] text-white shadow-md shadow-[#3B9DA1]/25',
    ring: 'hover:border-[#3B9DA1]/40',
    dot: 'bg-[#3B9DA1]',
  },
  amber: {
    iconBg: 'bg-[#FDF3E0]',
    iconText: 'text-[#C8860D]',
    chipActive: 'bg-[#C8860D] text-white shadow-md shadow-[#C8860D]/25',
    ring: 'hover:border-[#C8860D]/40',
    dot: 'bg-[#C8860D]',
  },
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject)
    setSelectedChapterId('')
    setSelectedChapter(null)
    setSelectedTopic('')
    setFilteredChapters(chapters.filter(c => c.subject === subject))
  }

  const handleChapterChange = (chapterId) => {
    setSelectedChapterId(chapterId)
    setSelectedTopic('')
    const chap = chapters.find(c => String(c.id) === String(chapterId))
    setSelectedChapter(chap || null)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-11 h-11 border-4 border-[#2D1B69] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-semibold text-sm">Loading curriculum…</p>
      </div>
    )
  }

  const subjectOptions = subjects.map(s => ({ value: s, label: s }))
  const chapterOptions = filteredChapters.map(c => ({ value: c.id, label: c.title }))
  const topicOptions = (selectedChapter?.topics || []).map(t => ({ value: t, label: t }))

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">

      {/* ---------- Hero header ---------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D1B69] via-[#3B2F5C] to-[#6366F1] p-7 sm:p-9 text-white shadow-lg shadow-[#2D1B69]/20">
        <div className="absolute -right-10 -top-16 w-56 h-56 bg-white/10 rounded-full" />
        <div className="absolute -left-10 bottom-0 w-40 h-40 bg-white/5 rounded-full" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-4">
            <SparklesIcon className="w-3.5 h-3.5" />
            AI-Powered Learning
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Study Buddy Tools</h2>
          <p className="mt-2 text-sm sm:text-[15px] text-white/80 font-medium leading-relaxed">
            Smart tools to help you study better, understand faster, and practice with confidence.
          </p>
        </div>
      </div>

      {/* ---------- Tool showcase grid ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {TOOL_TABS.map(tab => {
          const accent = ACCENTS[tab.accent]
          const Icon = tab.icon
          const isApproved = approvedTools.includes(tab.id)
          const isActive = selectedChapter && isApproved && activeToolTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              disabled={!selectedChapter || !isApproved}
              onClick={() => setActiveToolTab(tab.id)}
              className={`group relative text-left bg-white rounded-2xl border-2 p-4 sm:p-5 transition-all duration-200
                ${isActive ? 'border-[#2D1B69] shadow-md shadow-[#2D1B69]/10 -translate-y-0.5' : 'border-purple-50/70 shadow-sm'}
                ${selectedChapter && isApproved ? `${accent.ring} cursor-pointer hover:-translate-y-0.5 hover:shadow-md` : 'cursor-default opacity-90'}
              `}
            >
              <div className={`w-10 h-10 rounded-xl ${accent.iconBg} ${accent.iconText} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-black text-[15px] text-[#1E1B4B]">{tab.shortLabel}</h3>
              <p className="text-xs text-gray-500 font-medium leading-snug mt-1">{tab.description}</p>

              {selectedChapter && (
                <span className={`absolute top-3.5 right-3.5 w-2 h-2 rounded-full ${isApproved ? accent.dot : 'bg-gray-200'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* ---------- Get started / selector card ---------- */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-purple-50/70 shadow-sm space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EDEBFB] text-[#2D1B69] flex items-center justify-center flex-shrink-0">
            <TargetIcon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-black text-[#1E1B4B] text-base">Get started</h3>
            <p className="text-sm text-gray-500 font-medium">Select a subject, chapter, and topic to load the best tools for you.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectDropdown
            label="Subject"
            icon={BookOpenIcon}
            placeholder="Select subject"
            value={selectedSubject}
            onChange={handleSubjectChange}
            options={subjectOptions}
          />

          <SelectDropdown
            label="Chapter"
            icon={LayersIcon}
            placeholder="Select chapter"
            value={selectedChapterId}
            onChange={handleChapterChange}
            options={chapterOptions}
            disabled={!selectedSubject}
            helperText="Pick a subject first"
          />

          <SelectDropdown
            label="Topic (optional)"
            icon={TargetIcon}
            placeholder="Whole chapter"
            value={selectedTopic}
            onChange={setSelectedTopic}
            options={[{ value: '', label: 'Whole chapter' }, ...topicOptions]}
            disabled={!selectedChapter}
            helperText="Pick a chapter first"
          />
        </div>
      </div>

      {/* ---------- Tabs (only once tools are approved) ---------- */}
      {selectedChapter && approvedTools.length > 0 && (
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border-2 border-purple-50/70 shadow-sm">
          {TOOL_TABS.filter(tab => approvedTools.includes(tab.id)).map(tab => {
            const accent = ACCENTS[tab.accent]
            const Icon = tab.icon
            const active = activeToolTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveToolTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all
                  ${active ? accent.chipActive : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.shortLabel}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ---------- Content ---------- */}
      <div className="min-h-[400px]">
        {!selectedChapter ? (
          <EmptyState
            title="Choose a subject and chapter to see your tools"
            subtitle="We'll prepare summaries, flashcards, mnemonics, and mock tests tailored to your topic."
          />
        ) : checkingApproval ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-purple-50/70 shadow-sm">
            <div className="w-10 h-10 border-4 border-[#2D1B69] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-semibold text-sm">Checking approved study tools…</p>
          </div>
        ) : approvedTools.length === 0 ? (
          <EmptyState
            title="No study tools are ready for this chapter yet"
            subtitle="Your teacher hasn't approved any AI-generated tools for this chapter or topic yet. Please check back soon."
          />
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

function EmptyState({ title, subtitle }) {
  return (
    <div className="bg-white border-2 border-dashed border-purple-100 rounded-3xl p-10 sm:p-14 text-center">
      <div className="flex justify-center">
        <OpenBoxIllustration className="w-36 h-32 sm:w-44 sm:h-40" />
      </div>
      <h3 className="mt-2 font-black text-[#1E1B4B] text-lg">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 font-medium max-w-md mx-auto leading-relaxed">{subtitle}</p>
    </div>
  )
}