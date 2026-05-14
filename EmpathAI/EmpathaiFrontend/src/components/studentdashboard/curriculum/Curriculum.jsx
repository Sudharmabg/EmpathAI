import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  PlayCircleIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { getAllSyllabi, getSyllabiByClass } from '../../../api/curriculumApi'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const COLOR_CLASSES = [
  'bg-blue-100 text-blue-600',
  'bg-green-100 text-green-600',
  'bg-purple-100 text-purple-600',
  'bg-orange-100 text-orange-600',
  'bg-red-100 text-red-600',
  'bg-pink-100 text-pink-600',
  'bg-yellow-100 text-yellow-600',
  'bg-teal-100 text-teal-600',
]

function subjectColor(index) {
  return COLOR_CLASSES[index % COLOR_CLASSES.length]
}

function toEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const v =
        u.searchParams.get('v') ||
        (u.hostname === 'youtu.be' ? u.pathname.slice(1) : null)
      if (v) return `https://www.youtube.com/embed/${v}`
    }
  } catch { /* not a URL */ }
  return url
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

// ─── Quiz ──────────────────────────────────────────────────────────────────────
function QuizSection({ quizzes }) {
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (!quizzes || quizzes.length === 0) return null

  const q = quizzes[qIndex]
  const options = [
    { label: 'A', text: q.optionA },
    { label: 'B', text: q.optionB },
    { label: 'C', text: q.optionC },
    { label: 'D', text: q.optionD },
  ].filter(o => o.text)
  const correctLabel = ['A', 'B', 'C', 'D'][q.correctAnswer - 1]

  function handleSubmit() {
    if (!selected) return
    setSubmitted(true)
    if (selected === correctLabel) setScore(s => s + 1)
  }

  function handleNext() {
    if (qIndex + 1 >= quizzes.length) {
      setDone(true)
    } else {
      setQIndex(i => i + 1)
      setSelected(null)
      setSubmitted(false)
    }
  }

  if (done) {
    const pct = Math.round((score / quizzes.length) * 100)
    return (
      <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🧠 Quiz Complete!</h2>
        <div className="text-center py-6">
          <div className={`text-5xl font-black mb-2 ${pct >= 70 ? 'text-green-600' : 'text-orange-500'}`}>{pct}%</div>
          <p className="text-gray-600 mb-1">{score} / {quizzes.length} correct</p>
          <p className="text-sm text-gray-500">{pct >= 70 ? '🌟 Great work!' : '💪 Keep practising!'}</p>
          <button
            onClick={() => { setQIndex(0); setSelected(null); setSubmitted(false); setScore(0); setDone(false) }}
            className="mt-6 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry Quiz
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">🧠 Quick Quiz</h2>
        <span className="text-sm text-gray-500">{qIndex + 1} / {quizzes.length}</span>
      </div>

      {q.questionImageType && (
        <img
          src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/curriculum/quiz/${q.id}/image`}
          alt="question"
          className="mb-4 rounded-lg max-h-48 object-contain"
        />
      )}

      <p className="text-gray-900 font-medium mb-4">{q.questionText}</p>

      <div className="space-y-2 mb-4">
        {options.map(o => {
          let cls = 'flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all '
          if (!submitted) {
            cls += selected === o.label
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'
          } else {
            if (o.label === correctLabel) cls += 'border-green-500 bg-green-50'
            else if (o.label === selected) cls += 'border-red-400 bg-red-50'
            else cls += 'border-gray-100 opacity-60'
          }
          return (
            <label key={o.label} className={cls}>
              <input
                type="radio"
                name={`quiz-${qIndex}`}
                value={o.label}
                checked={selected === o.label}
                disabled={submitted}
                onChange={() => setSelected(o.label)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span>{o.label}) {o.text}</span>
            </label>
          )
        })}
      </div>

      {submitted && q.explanation && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-sm text-purple-800">
          💡 {q.explanation}
        </div>
      )}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
        >
          {qIndex + 1 >= quizzes.length ? 'See Results' : 'Next Question →'}
        </button>
      )}
    </div>
  )
}

// ─── SubTopic detail ───────────────────────────────────────────────────────────
function SubTopicView({ subTopic, onBack, navigateToChat }) {
  const embedUrl = toEmbedUrl(subTopic.videoUrl)
  const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  const objectives = subTopic.learningObjectives
    ? subTopic.learningObjectives.split('\n').filter(Boolean)
    : []

  return (
    <div>
      <button onClick={onBack} className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 mb-6">
        <ArrowLeftIcon className="w-5 h-5" />
        <span>Back to Modules</span>
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">{subTopic.title}</h1>

      {objectives.length > 0 && (
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📚 Learning Objectives</h2>
          <ul className="space-y-2 text-gray-700">
            {objectives.map((obj, i) => <li key={i}>• {obj}</li>)}
          </ul>
        </div>
      )}

      {embedUrl && (
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🎥 Video Lesson</h2>
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <iframe
              width="100%" height="100%"
              src={embedUrl}
              title={subTopic.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {subTopic.summary && (
        <div className="bg-white border-2 border-purple-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📖 Summary</h2>
          {subTopic.summaryImageType && (
            <img
              src={`${BASE}/api/curriculum/subtopics/${subTopic.id}/image`}
              alt="summary"
              className="mb-4 rounded-lg max-h-64 object-contain"
            />
          )}
          <p className="text-gray-700 whitespace-pre-line">{subTopic.summary}</p>
          {navigateToChat && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => navigateToChat(subTopic.title)}
                className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span>Ask about {subTopic.title}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {subTopic.quizzes?.length > 0 && <QuizSection quizzes={subTopic.quizzes} />}
    </div>
  )
}

// ─── Module accordion ──────────────────────────────────────────────────────────
function ModuleCard({ module, index, onSelectSubTopic }) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div className="bg-white border-2 border-purple-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-purple-50 transition-colors text-left"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {index + 1}
          </div>
          <span className="font-semibold text-gray-900">{module.title}</span>
          {module.subTopics?.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {module.subTopics.length} topic{module.subTopics.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {open
          ? <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-purple-100 divide-y divide-purple-50">
          {(!module.subTopics || module.subTopics.length === 0) ? (
            <p className="px-5 py-4 text-sm text-gray-400 italic">No topics yet</p>
          ) : (
            module.subTopics
              .slice()
              .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map((st, si) => (
                <button
                  key={st.id}
                  onClick={() => onSelectSubTopic(st)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full border-2 border-purple-300 flex items-center justify-center text-xs text-purple-600 font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors flex-shrink-0">
                      {si + 1}
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{st.title}</span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    {st.videoUrl && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Video</span>}
                    {st.quizzes?.length > 0 && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Quiz</span>}
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Syllabus detail ───────────────────────────────────────────────────────────
function SyllabusView({ syllabus, onBack, navigateToChat }) {
  const [selectedSubTopic, setSelectedSubTopic] = useState(null)

  if (selectedSubTopic) {
    return (
      <SubTopicView
        subTopic={selectedSubTopic}
        onBack={() => setSelectedSubTopic(null)}
        navigateToChat={navigateToChat}
      />
    )
  }

  const totalTopics = (syllabus.modules || []).reduce((acc, m) => acc + (m.subTopics?.length || 0), 0)

  return (
    <div>
      <button onClick={onBack} className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 mb-6">
        <ArrowLeftIcon className="w-5 h-5" />
        <span>Back to Subjects</span>
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{syllabus.subject}</h1>
        <p className="text-gray-500">
          {syllabus.classLevel && `Class ${syllabus.classLevel} · `}
          {syllabus.modules?.length || 0} module{syllabus.modules?.length !== 1 ? 's' : ''} · {totalTopics} topic{totalTopics !== 1 ? 's' : ''}
        </p>
      </div>

      {(!syllabus.modules || syllabus.modules.length === 0) ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400">
          <BookOpenIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No modules have been added to this subject yet.</p>
          <p className="text-sm mt-1">Check back soon — the admin is building this curriculum!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {syllabus.modules.map((mod, i) => (
            <ModuleCard key={mod.id} module={mod} index={i} onSelectSubTopic={setSelectedSubTopic} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function Curriculum({ user, setActiveTab, navigateToChat }) {
  const [syllabi, setSyllabi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSyllabus, setSelectedSyllabus] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let data
      if (user?.role?.toUpperCase() === 'STUDENT' && user?.className) {
        data = await getSyllabiByClass(user.className)
      } else {
        data = await getAllSyllabi()
      }
      setSyllabi(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load curriculum')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  if (selectedSyllabus) {
    return (
      <div className="font-lora">
        <SyllabusView
          syllabus={selectedSyllabus}
          onBack={() => setSelectedSyllabus(null)}
          navigateToChat={navigateToChat}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="font-lora">
        <div className="mb-8">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border-2 border-gray-100 rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="font-lora flex flex-col items-center justify-center py-20 text-center">
        <ExclamationCircleIcon className="w-14 h-14 text-red-400 mb-4" />
        <p className="text-gray-700 font-medium mb-2">Could not load curriculum</p>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <button onClick={load} className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Try again
        </button>
      </div>
    )
  }

  if (syllabi.length === 0) {
    return (
      <div className="font-lora">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {user?.role === 'STUDENT' && user?.className
              ? `Class ${user.className} Curriculum`
              : 'Curriculum'}
          </h1>
          <p className="text-gray-600">Your personalised learning journey</p>
        </div>
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-16 text-center text-gray-400">
          <AcademicCapIcon className="w-14 h-14 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No subjects available yet</p>
          <p className="text-sm mt-2">
            {user?.role === 'STUDENT' && user?.className
              ? `No curriculum has been added for Class ${user.className} yet. Check back soon!`
              : "Your admin hasn't added any curriculum content yet. Check back soon!"}
          </p>
        </div>
      </div>
    )
  }

  const totalModules = syllabi.reduce((a, s) => a + (s.modules?.length || 0), 0)
  const totalTopics = syllabi.reduce((a, s) =>
    a + (s.modules || []).reduce((b, m) => b + (m.subTopics?.length || 0), 0), 0)

  return (
    <div className="font-lora">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {user?.role === 'STUDENT' && user?.className
              ? `Class ${user.className} Curriculum`
              : 'Curriculum'}
          </h1>
          <p className="text-gray-600">
            {user?.role === 'STUDENT' && user?.className
              ? `Your Class ${user.className} learning journey · `
              : ''}
            {syllabi.length} subject{syllabi.length !== 1 ? 's' : ''} · {totalModules} module{totalModules !== 1 ? 's' : ''} · {totalTopics} topic{totalTopics !== 1 ? 's' : ''}
          </p>
        </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {syllabi.map((syllabus, index) => {
          const mCount = syllabus.modules?.length || 0
          const tCount = (syllabus.modules || []).reduce((a, m) => a + (m.subTopics?.length || 0), 0)
          const colorCls = subjectColor(index)

          return (
            <div
              key={syllabus.id}
              className="bg-white border-2 border-purple-200 rounded-xl p-6 hover:border-purple-400 hover:shadow-lg transition-all duration-200 flex flex-col"
            >
              <div className="flex items-start space-x-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colorCls}`}>
                  <BookOpenIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{syllabus.subject}</h3>
                  {syllabus.classLevel && (
                    <p className="text-xs text-gray-500">Class {syllabus.classLevel}</p>
                  )}
                </div>
              </div>

              <div className="mb-4 flex gap-4 text-sm text-gray-600">
                <span>{mCount} module{mCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{tCount} topic{tCount !== 1 ? 's' : ''}</span>
              </div>

              <div className="mb-5">
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-400 h-1.5 rounded-full transition-all"
                    style={{ width: tCount > 0 ? '15%' : '0%' }}
                  />
                </div>
              </div>

              <button
                onClick={() => setSelectedSyllabus(syllabus)}
                className="mt-auto w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
              >
                <PlayCircleIcon className="w-4 h-4" />
                <span>Start Learning</span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Learning Overview</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{syllabi.length}</div>
            <p className="text-sm text-gray-600">Subjects</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalModules}</div>
            <p className="text-sm text-gray-600">Modules</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalTopics}</div>
            <p className="text-sm text-gray-600">Topics</p>
          </div>
        </div>
      </div>
    </div>
  )
}