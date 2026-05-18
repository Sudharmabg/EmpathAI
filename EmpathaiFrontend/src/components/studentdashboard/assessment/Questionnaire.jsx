import { useState, useEffect, useRef } from 'react'
import { fetchQuestionsByClass, createResponse } from '../../../api/Assessmentmanagement'
import {
  ClipboardDocumentListIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  HeartIcon,
  StarIcon,
  FlagIcon,
  PuzzlePieceIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

function detectEmotion (label) {
  const t = label.toLowerCase()
  if (t.includes('very good') || t.includes('very well') || t.includes('very happy') || t.includes('nope')) return 'happy'
  if (t.includes('okay') || t.includes('a little') || t.includes('somewhat')) return 'neutral'
  if (t.includes('low') || t.includes('kind of') || t.includes('sometimes')) return 'concern'
  return 'sad'
}

const emojiSequences = {
  happy:   ['😊', '🌟', '✨', '🎉'],
  neutral: ['😌', '🙂', '💫'],
  concern: ['😔', '💙', '🌱'],
  sad:     ['😢', '💜', '🌧️'],
}

function parseBulletPoints (raw) {
  if (!raw) return { strengths: [], improvements: [], tips: [], plain: [] }
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const strengths    = []
  const improvements = []
  const tips         = []
  const plain        = []
  lines.forEach(line => {
    const clean = line.replace(/^[\s•\-–—*]+/, '').trim()
    if (clean.includes('✅') && clean.indexOf('✅') < 4) {
      strengths.push(clean.replace(/✅\s*/, '').trim())
    } else if (clean.includes('🔹') && clean.indexOf('🔹') < 4) {
      improvements.push(clean.replace(/🔹\s*/, '').trim())
    } else if (clean.includes('💡') && clean.indexOf('💡') < 4) {
      tips.push(clean.replace(/💡\s*/, '').trim())
    } else if (clean.length > 0) {
      plain.push(clean)
    }
  })
  return { strengths, improvements, tips, plain }
}
function personalise (text, studentName) {
  if (!studentName || !text) return text
  const firstName = studentName.split(' ')[0].trim()
  if (!firstName || firstName.length < 2) return text
  const lower = firstName.toLowerCase()
  if (['you', 'your', 'they', 'their', 'he', 'she', 'his', 'her'].includes(lower)) return text
  const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text
    .replace(new RegExp(`\\b${escaped}'s\\b`, 'gi'), 'your')
    .replace(new RegExp(`\\b${escaped}\\b`, 'gi'), 'you')
    .replace(/\bshe's\b/gi, "you're")
    .replace(/\bhe's\b/gi, "you're")
    .replace(/\bshe\b/gi, 'you')
    .replace(/\bhe\b/gi, 'you')
    .replace(/\bher\b/gi, 'your')
    .replace(/\bhis\b/gi, 'your')
    .replace(/\bthey're\b/gi, "you're")
    .replace(/\bthey\b/gi, 'you')
    .replace(/\btheir\b/gi, 'your')
    .replace(/\bthem\b/gi, 'you')
}
function normalizeGroupName (raw) {
  if (!raw) return ''
  let s = raw.trim()
  if (/^Class \S+ Standard$/.test(s)) return s
  if (/^Class \S+$/.test(s)) return s + ' Standard'
  if (/^\S+ Standard$/.test(s)) return 'Class ' + s
  return 'Class ' + s + ' Standard'
}

function normalizeClassName (raw) {
  if (!raw) return ''
  let s = raw.trim()
  if (/^\S+ Standard$/.test(s) && !s.startsWith('Class ')) return s
  if (s.startsWith('Class ')) s = s.replace(/^Class\s+/, '')
  if (!s.endsWith(' Standard')) s = s + ' Standard'
  return s
}

export default function Questionnaire ({ user }) {
  const [currentQuestion, setCurrentQuestion]   = useState(0)
  const [answers, setAnswers]                   = useState({})
  const [showGrid, setShowGrid]                 = useState(true)
  
 
  const _savedUser = localStorage.getItem('user')
const _u = _savedUser ? JSON.parse(_savedUser) : user
const _todayKey = `assessment_done_${_u?.id}_${new Date().toDateString()}`
const alreadyDone = sessionStorage.getItem(_todayKey) === 'true'

const [showReport, setShowReport]             = useState(alreadyDone)
const [activeIntervention, setActiveIntervention] = useState(null)
const [isTransitioning, setIsTransitioning]   = useState(false)


  const [displayEmoji, setDisplayEmoji]         = useState('')
  const [selectedOption, setSelectedOption]     = useState(null)
  const [emojiOpacity, setEmojiOpacity]         = useState(0)
  const [emojiScale, setEmojiScale]             = useState(0.5)
  const [apiQuestions, setApiQuestions]         = useState([])
  const [loading, setLoading]                   = useState(true)
  const [analysis, setAnalysis]                 = useState(null)
  const [analysisLoading, setAnalysisLoading]   = useState(false)

  const isAnimatingRef    = useRef(false)
  const pendingTimersRef  = useRef([])
  const answersRef        = useRef({})

  const clearPendingTimers = () => {
    pendingTimersRef.current.forEach(clearTimeout)
    pendingTimersRef.current = []
  }

  const safeTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms)
    pendingTimersRef.current.push(id)
    return id
  }

  useEffect(() => () => clearPendingTimers(), [])

  const gridNumbers = [3, 7, 2, 9]

  useEffect(() => {
    const className =
      user?.className    ||
      user?.class_name   ||
      user?.class        ||
      user?.grade        ||
      user?.studentClass ||
      user?.classId

    if (!className) {
      setLoading(false)
      return
    }

fetchQuestionsByClass(className)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((q, i) => ({
            id:       q.id || i + 1,
            text:     q.questions || q.questionText || '',
            groupMap: q.group_map || q.groupMap  || '',
            groupMapId: q.groupMapId || q.group_map_id || null,
            groupClassName: q.groupClassName || q.group_class_name || q.className || '',
            options: [
              { value: 8, label: (q.option_a || q.optionA || '').trim(), emotion: detectEmotion(q.option_a || q.optionA || '') },
              { value: 6, label: (q.option_b || q.optionB || '').trim(), emotion: detectEmotion(q.option_b || q.optionB || '') },
              { value: 3, label: (q.option_c || q.optionC || '').trim(), emotion: detectEmotion(q.option_c || q.optionC || '') },
              { value: 1, label: (q.option_d || q.optionD || '').trim(), emotion: detectEmotion(q.option_d || q.optionD || '') }
            ].filter(o => o.label !== '')
          }))
          setApiQuestions(mapped)
        }
      })
      .catch(err => console.error('[Questionnaire] fetchQuestionsByClass error:', err))
      .finally(() => setLoading(false))
  }, [user])

  // ✅ NEW useEffect starts HERE — outside and after the previous one
  useEffect(() => {
    if (!alreadyDone || apiQuestions.length === 0) return
    const _su = localStorage.getItem('user')
    const _uu = _su ? JSON.parse(_su) : user
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
    const studentId = _uu?.id ?? null
    const firstQ = apiQuestions[0]
    const groupId = firstQ?.groupMapId ?? null
    if (!studentId || !groupId) { setAnalysisLoading(false); return }

    setAnalysisLoading(true)
    fetch(`/api/assessment/reports/student/${encodeURIComponent(studentId)}/group/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d) {
        const parsed = parseBulletPoints(d.bulletPoints || '')
        setAnalysis({
          strengths:    parsed.strengths,
          improvements: parsed.improvements,
          tips:         parsed.tips,
          plain:        parsed.plain,
          summaryText:  d.summaryText || '',
          studentName:  `${_uu?.firstName || ''} ${_uu?.lastName || ''}`.trim()
        })
      }
    })
    .catch(err => console.error('[Questionnaire] Restore report failed:', err))
    .finally(() => setAnalysisLoading(false))
  }, [alreadyDone, apiQuestions])

  useEffect(() => {
    clearPendingTimers()
    isAnimatingRef.current = false
    setSelectedOption(null)
    setDisplayEmoji('')
    setEmojiOpacity(0)
    setEmojiScale(0.5)
  }, [currentQuestion])

  useEffect(() => {
    if (activeQuestions[currentQuestion]?.type === 'memory') {
      setShowGrid(true)
      const t = setTimeout(() => setShowGrid(false), 2000)
      return () => clearTimeout(t)
    }
  }, [currentQuestion])

  const activeQuestions = apiQuestions
  const currentQ        = activeQuestions[currentQuestion]
  const progress        = currentQ ? ((currentQuestion + 1) / activeQuestions.length) * 100 : 100

  const saveResponseToDB = async (question, selectedLabel) => {
    const savedUser = localStorage.getItem('user')
    const u = savedUser ? JSON.parse(savedUser) : user

    const studentId   = u?.id ?? null
    const studentName = `${u?.firstName || u?.name || ''} ${u?.lastName || ''}`.trim() || 'Guest'

    const rawGroupName  = (question.groupMap || '').split(',')[0].trim() ||
                          question.groupClassName || u?.className || u?.class_name || u?.class || u?.grade || ''
    const groupName     = normalizeGroupName(rawGroupName)
    const resolvedClass = normalizeClassName(rawGroupName)
    const groupId   = question.groupMapId ?? null

    const computedAge = (() => {
      if (u?.age != null && u.age < 120) return u.age
      if (u?.dateOfBirth) {
        try {
          const dob = new Date(u.dateOfBirth)
          const today = new Date()
          let age = today.getFullYear() - dob.getFullYear()
          const m = today.getMonth() - dob.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
          return age > 0 && age < 120 ? age : null
        } catch { return null }
      }
      return null
    })()

    const payload = {
      studentId,
      studentName,
      questionId:    typeof question.id === 'number' ? question.id : null,
      questionText:  question.text,
      answer:        selectedLabel,
      responseValue: selectedLabel,
      emotion:       detectEmotion(selectedLabel),
      groupName,
      groupId,
      className:     resolvedClass,
      gender:        u?.gender ?? null,
      age:           computedAge,
      schoolName:    u?.schoolName || u?.school || u?.institutionName || null
    }

    try {
      await createResponse(payload)
    } catch (err) {
      console.error('[Questionnaire] Failed to save response:', err)
    }
  }

  const handleAnswerSelect = (questionId, option, index) => {
    if (isAnimatingRef.current) return

    isAnimatingRef.current = true

    const updatedAnswers = { ...answersRef.current, [questionId]: option.value }
    answersRef.current = updatedAnswers
    setAnswers(updatedAnswers)
    setSelectedOption(index)

    saveResponseToDB(currentQ, option.label)

    const sequence = emojiSequences[option.emotion] || ['😊']
    setDisplayEmoji(sequence[0])
    setEmojiOpacity(1)
    setEmojiScale(1)

    let step = 0

    const playNext = () => {
      step++
      if (step < sequence.length) {
        setEmojiScale(1.2)
        safeTimeout(() => { setDisplayEmoji(sequence[step]); setEmojiScale(1) }, 150)
        safeTimeout(playNext, 500)
      } else {
        safeTimeout(() => {
          setEmojiOpacity(0)
          setEmojiScale(0.5)
          safeTimeout(() => {
            setDisplayEmoji('')
            isAnimatingRef.current = false

            const isLast = currentQuestion >= activeQuestions.length - 1
            if (!isLast) {
              setIsTransitioning(true)
              safeTimeout(() => {
                setCurrentQuestion(q => q + 1)
                setIsTransitioning(false)
              }, 300)
            } else {
              handleSubmit(updatedAnswers)
            }
          }, 600)
        }, 400)
      }
    }

    safeTimeout(playNext, 500)
  }

  const handleNext = () => {
    if (isAnimatingRef.current) return
    if (currentQuestion < activeQuestions.length - 1) {
      clearPendingTimers()
      isAnimatingRef.current = false
      setIsTransitioning(true)
      setTimeout(() => { setCurrentQuestion(q => q + 1); setIsTransitioning(false) }, 300)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      clearPendingTimers()
      isAnimatingRef.current = false
      setIsTransitioning(true)
      setTimeout(() => { setCurrentQuestion(q => q - 1); setIsTransitioning(false) }, 300)
    }
  }

  const handleSubmit = async (finalAnswers) => {
  setAnalysisLoading(true)
setShowReport(true)
const _su = localStorage.getItem('user')
const _uu = _su ? JSON.parse(_su) : user
const _key = `assessment_done_${_uu?.id}_${new Date().toDateString()}`
sessionStorage.setItem(_key, 'true')

    const resolvedAnswers = finalAnswers || answersRef.current || answers

    try {
      const savedUser = localStorage.getItem('user')
      const u = savedUser ? JSON.parse(savedUser) : user
      const studentId   = u?.id ?? null
      const studentName = `${u?.firstName || u?.name || ''} ${u?.lastName || ''}`.trim() || 'Student'
      const token       = localStorage.getItem('token') || localStorage.getItem('access_token') || ''

      const firstQ       = activeQuestions.find(q => resolvedAnswers[q.id] !== undefined)
      const groupId      = firstQ?.groupMapId ?? null
      const rawGroupName  = (firstQ?.groupMap || '').split(',')[0].trim() ||
                            firstQ?.groupClassName ||
                            u?.className || u?.class_name || u?.class || u?.grade || ''
      const groupName     = normalizeGroupName(rawGroupName)
      const resolvedClass = normalizeClassName(rawGroupName)

      const answersArray = activeQuestions
        .filter(q => resolvedAnswers[q.id] !== undefined)
        .map(q => {
          const selectedOpt = q.options.find(o => o.value === resolvedAnswers[q.id])
          return {
            questionId:     q.id,
            questionText:   q.text,
            selectedOption: selectedOpt?.label || String(resolvedAnswers[q.id])
          }
        })

      if (studentId && groupId) {
        try {
          await fetch(
            `/api/assessment/reports/student/${encodeURIComponent(studentId)}/group/${groupId}/today`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
          )
        } catch (e) {
          console.warn('[Questionnaire] Cache clear skipped (non-fatal):', e.message)
        }
      }

      const reportRes = await fetch('/api/assessment/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentId,
          studentName,
          groupId,
          groupName,
          className: resolvedClass,
          answers:   answersArray
        })
      })

      if (reportRes.ok) {
        const reportData = await reportRes.json()
        const parsed = parseBulletPoints(reportData.bulletPoints || '')

        setAnalysis({
          strengths:    parsed.strengths,
          improvements: parsed.improvements,
          tips:         parsed.tips,
          plain:        parsed.plain,
          summaryText:  reportData.summaryText || '',
          studentName,
        })
      } else {
        try {
          const fallbackRes = await fetch('/api/analytics/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ studentId })
          })
          const data = await fallbackRes.json()
          setAnalysis({
            strengths:    data.strengths    || [],
            improvements: data.AreastoFocus || [],
            tips:         [],
            plain:        [],
            summaryText:  '',
            studentName,
          })
        } catch {
          setAnalysis({ strengths: [], improvements: [], tips: [], plain: [], summaryText: '', studentName })
        }
      }

    } catch (err) {
      console.error('[Questionnaire] Analysis failed:', err)
      setAnalysis({ strengths: [], improvements: [], tips: [], plain: [], summaryText: '', studentName: '' })
    } finally {
      setAnalysisLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-purple-500 font-medium animate-pulse">Loading your questions…</p>
      </div>
    )
  }

  if (activeQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3 px-4">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-2">
          <ClipboardDocumentListIcon className="w-8 h-8 text-purple-300" />
        </div>
        <p className="text-gray-600 font-semibold text-lg text-center">No questions available right now</p>
        <p className="text-gray-400 text-sm text-center">Your teacher hasn't added any questions for your class yet. Please check back later.</p>
      </div>
    )
  }

  if (showReport) {
    const sName = analysis?.studentName || ''

    const hasRealData = analysis && (
      (analysis.strengths?.length > 0) ||
      (analysis.improvements?.length > 0) ||
      (analysis.tips?.length > 0) ||
      (analysis.plain?.length > 0)
    )

    const displayStrengths    = analysis?.strengths    || []
    const displayImprovements = analysis?.improvements || []
    const displayTips         = analysis?.tips         || []
    const displayPlainFallback = (!hasRealData || (displayStrengths.length === 0 && displayImprovements.length === 0))
      ? (analysis?.plain || [])
      : []

    // FIX: personalise converts "Tin Tin did X" → "You did X" so text feels
    // directly connected to the student instead of talking about them in 3rd person.
    const p = (text) => personalise(text, sName)

    return (
      <div className="font-sans max-w-5xl mx-auto px-4 py-2 min-h-screen flex flex-col">
        <div className="mb-4 mt-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#0B1E36] tracking-tight mb-1">Assessment Complete!</h1>
          <p className="text-sm sm:text-base font-serif text-[#40607A]">Here's your personalised emotional wellness report</p>
          {analysis?.summaryText && (
            <p className="mt-2 text-sm italic text-gray-500 max-w-xl mx-auto">{p(analysis.summaryText)}</p>
          )}
        </div>

        <div className="mb-4 max-w-4xl mx-auto w-full">
          <h3 className="text-lg font-serif font-bold text-[#0B1E36] mb-2 text-center">Key Insights</h3>
          <div className="grid md:grid-cols-2 gap-3">

            {/* Strengths */}
            <div className="bg-[#dcfce7] border border-[#bbf7d0] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/60 rounded-full flex items-center justify-center shrink-0">
                  <StarIcon className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="text-lg font-serif font-bold text-[#1a202c]">Strengths</h4>
              </div>
              <ul className="text-[13px] font-serif text-[#4a5568] space-y-1.5 ml-1">
                {analysisLoading ? (
                  <li className="flex items-center gap-2 text-green-600">
                    <span className="inline-block w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    Generating your analysis…
                  </li>
                ) : displayStrengths.length > 0 ? (
                  displayStrengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5" />
                      <span>{p(item)}</span>
                    </li>
                  ))
                ) : displayPlainFallback.slice(0, 2).length > 0 ? (
                  displayPlainFallback.slice(0, 2).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                      <span>{p(item)}</span>
                    </li>
                  ))
                ) : !analysisLoading && (
                  <li className="text-green-700 text-xs italic">Completing analysis…</li>
                )}
              </ul>
            </div>

            {/* Areas to Focus */}
            <div className="bg-[#ffedd5] border border-[#fed7aa] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/60 rounded-full flex items-center justify-center shrink-0">
                  <FlagIcon className="w-5 h-5 text-orange-500" />
                </div>
                <h4 className="text-lg font-serif font-bold text-[#1a202c]">Areas to Focus</h4>
              </div>
              <ul className="text-[13px] font-serif text-[#4a5568] space-y-1.5 ml-1">
                {analysisLoading ? (
                  <li className="flex items-center gap-2 text-orange-500">
                    <span className="inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    Generating your analysis…
                  </li>
                ) : displayImprovements.length > 0 ? (
                  <>
                    {displayImprovements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                        <span>{p(item)}</span>
                      </li>
                    ))}
                    {displayTips.length > 0 && (
                      <li className="flex items-start gap-2 mt-2 pt-2 border-t border-orange-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span className="text-amber-700">{p(displayTips[0])}</span>
                      </li>
                    )}
                  </>
                ) : displayPlainFallback.slice(2, 4).length > 0 ? (
                  displayPlainFallback.slice(2, 4).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                      <span>{p(item)}</span>
                    </li>
                  ))
                ) : !analysisLoading && (
                  <li className="text-orange-700 text-xs italic">Completing analysis…</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full mb-2">
          <h3 className="text-lg font-serif font-bold text-[#0B1E36] mb-2 text-center">Recommended Interventions</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { key: 'feelings',  bg: 'bg-[#ffe4e6]', border: 'border-[#fecdd3]', Icon: HeartIcon,       color: 'text-rose-500',   title: 'Feelings Release',  desc: 'Safe space to express and release difficult emotions', btn: 'Start Activity'  },
              { key: 'chunking',  bg: 'bg-[#dbeafe]', border: 'border-[#bfdbfe]', Icon: PuzzlePieceIcon, color: 'text-blue-500',   title: 'Chunking Practice', desc: 'Step-by-step memory enhancement exercises',           btn: 'Begin Practice'  },
              { key: 'breathing', bg: 'bg-[#f3e8ff]', border: 'border-[#e9d5ff]', Icon: ArrowPathIcon,   color: 'text-purple-500', title: 'Box Breathing',     desc: 'Guided breathing exercise with visual timer',          btn: 'Start Breathing' }
            ].map(({ key, bg, border, Icon, color, title, desc, btn }) => (
              <div key={key} className={`flex flex-col ${bg} ${border} border rounded-xl p-4 shadow-sm`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 bg-white/60 rounded-full flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <h4 className="text-base font-serif font-bold text-[#1a202c]">{title}</h4>
                </div>
                <p className="text-[12px] font-serif text-[#4a5568] mb-3 flex-grow">{desc}</p>
                <button onClick={() => setActiveIntervention(key)} className="w-full bg-black text-white py-1.5 rounded-lg font-serif text-[13px] hover:bg-gray-800 transition-colors">{btn}</button>
              </div>
            ))}
          </div>
        </div>

        {activeIntervention && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setActiveIntervention(null)} className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500">✕</button>
              {activeIntervention === 'feelings'  && <FeelingsRelease onClose={() => setActiveIntervention(null)} />}
              {activeIntervention === 'chunking'  && <ChunkingPractice />}
              {activeIntervention === 'breathing' && <BoxBreathing />}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!currentQ) return null

  return (
    <div className="font-sans max-w-4xl mx-auto px-3 py-3 min-h-screen flex flex-col">
      <div className="fixed inset-0 -z-10 bg-white" />

      <div className="mb-4 mt-4 pl-2">
        <h1 className="text-4xl sm:text-[2.5rem] font-bold font-serif text-[#0B1E36] tracking-tight mb-2">Feelings Explorer</h1>
        <p className="text-[1.1rem] sm:text-lg font-serif text-[#40607A]">Let's understand how you're feeling today</p>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-500 mb-1">Question {currentQuestion + 1} of {activeQuestions.length}</p>
        <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner">
          <div className="bg-green-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {activeQuestions.map((q, index) => (
            <button
              key={index}
              onClick={() => { if (answers[q.id] !== undefined || index <= currentQuestion) setCurrentQuestion(index) }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentQuestion ? 'bg-green-500 scale-150 shadow-lg' : answers[q.id] !== undefined ? 'bg-green-300 hover:scale-125' : 'bg-gray-200 hover:bg-gray-300'}`}
            />
          ))}
        </div>
      </div>

      <div className={`flex-1 bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl p-6 shadow-xl transition-all duration-500 flex flex-col ${isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
        <div className="mb-4">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border-2 border-purple-500 text-black text-xs font-medium mb-3">
            <span>Question {currentQuestion + 1}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 leading-relaxed">{currentQ?.text}</h3>
        </div>

        {currentQ.type === 'memory' ? (
          <div className="flex-1 flex items-center justify-center">
            {showGrid ? (
              <div className="flex flex-col items-center">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs text-gray-600 mb-2 text-center font-medium">Memorize these numbers:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {gridNumbers.map((n, i) => (
                      <div key={i} className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />Memorizing…
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs text-gray-600 mb-2 text-center font-medium">Fill in the numbers you remember:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map(index => (
                      <input
                        key={index}
                        id={`memory-input-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        placeholder="?"
                        className="w-14 h-14 border-2 border-purple-200 rounded-xl text-center text-2xl font-bold focus:border-purple-500 focus:outline-none bg-white"
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          e.target.value = val
                          setAnswers(prev => {
                            const arr = [...(prev[currentQ.id] || [])]
                            arr[index] = val === '' ? null : parseInt(val, 10)
                            return { ...prev, [currentQ.id]: arr }
                          })
                          if (val && index < 3) document.getElementById(`memory-input-${index + 1}`)?.focus()
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 content-center">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedOption === index
              return (
                <label
                  key={index}
                  className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all duration-300 group bg-white
                    ${isAnimatingRef.current ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
                    ${isSelected
                      ? 'border-green-500 shadow-lg shadow-green-500/20 scale-[1.02]'
                      : 'border-gray-100 hover:border-green-200 hover:bg-green-50/30 hover:shadow-md'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={option.value}
                      checked={false}
                      onChange={() => handleAnswerSelect(currentQ.id, option, index)}
                      className="sr-only"
                      disabled={isAnimatingRef.current}
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300 group-hover:border-green-400'}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-medium text-sm text-gray-700">{option.label}</span>
                  </div>
                  <div className="w-10 h-10 flex items-center justify-center">
                    {isSelected && displayEmoji && (
                      <span className="text-3xl transition-all duration-300" style={{ opacity: emojiOpacity, transform: `scale(${emojiScale})` }}>{displayEmoji}</span>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0 || isAnimatingRef.current}
            className="px-5 py-2.5 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            style={{ fontFamily: 'Lora, serif' }}
          >
            <ChevronLeftIcon className="w-4 h-4" />Previous
          </button>
          {currentQuestion === activeQuestions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={false}

              className="px-6 py-2.5 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              style={{ fontFamily: 'Lora, serif' }}
            >
              Complete Assessment<CheckCircleIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleNext}
             disabled={false}
          className="px-6 py-2.5 bg-black text-white rounded-full text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            style={{ fontFamily: 'Lora, serif' }}
          >
            Next<ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 bg-purple-50/50 border border-purple-100 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
            <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm mb-1">About this Assessment</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              This questionnaire helps us understand your emotional well-being and provide personalised support.
              Your responses are saved securely and will be used to create a supportive learning environment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeelingsRelease ({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [feelings, setFeelings]       = useState('')
  const steps = [
    { text: 'Take a deep breath and find a comfortable position', emoji: '🧘' },
    { text: "Think about what's bothering you right now",         emoji: '💭' },
    { text: 'Write down your feelings in the space below',        emoji: '✍️' },
    { text: 'Read your feelings out loud (or in your mind)',      emoji: '🗣️' },
    { text: 'Take another deep breath and let it go',             emoji: '🌬️' }
  ]
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg"><span className="text-3xl">🔥</span></div>
      <h3 className="text-xl font-bold text-gray-800 mb-4">Feelings Release Space</h3>
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-500">Step {currentStep + 1} of {steps.length}</span>
          <span className="text-xs font-medium text-rose-500">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
          <div className="bg-gradient-to-r from-rose-400 to-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
      <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-4 mb-4 border border-rose-100">
        <span className="text-4xl mb-2 block">{steps[currentStep].emoji}</span>
        <p className="text-base text-gray-700 font-medium">{steps[currentStep].text}</p>
        {currentStep === 2 && (
          <textarea value={feelings} onChange={e => setFeelings(e.target.value)} placeholder="Write your feelings here…" className="w-full h-24 p-3 mt-3 border-2 border-rose-200 rounded-lg bg-white resize-none text-sm" />
        )}
      </div>
      <div className="flex justify-between gap-3">
        <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm disabled:opacity-40">← Previous</button>
        {currentStep < steps.length - 1
          ? <button onClick={() => setCurrentStep(currentStep + 1)} className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-400 to-red-500 text-white rounded-lg font-semibold text-sm">Next →</button>
          : <button onClick={onClose} className="flex-1 px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-lg font-semibold text-sm">Complete ✓</button>
        }
      </div>
    </div>
  )
}

function ChunkingPractice () {
  const [currentStep, setCurrentStep] = useState(0)
  const [userInput, setUserInput]     = useState('')
  const [chunks, setChunks]           = useState([])
  const examples = [
    { original: '9876543210', chunked: '987-654-3210' },
    { original: 'ABCDEFGHIJ', chunked: 'ABC-DEF-GHI-J' }
  ]
  return (
    <div>
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg"><span className="text-3xl">🧩</span></div>
        <h3 className="text-xl font-bold text-gray-800">Chunking Practice</h3>
      </div>
      {currentStep === 0 ? (
        <div>
          <p className="text-gray-600 mb-4 text-center text-sm">Chunking helps you remember information by breaking it into smaller pieces.</p>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl mb-4 border border-blue-100">
            {examples.map((ex, i) => (
              <div key={i} className="bg-white/80 p-3 rounded-lg mb-2 last:mb-0">
                <div className="font-mono text-gray-700 text-sm">{ex.original} → <span className="font-bold text-purple-700">{ex.chunked}</span></div>
              </div>
            ))}
          </div>
          <button onClick={() => setCurrentStep(1)} className="w-full bg-gradient-to-r from-blue-400 to-purple-500 text-white py-3 rounded-lg font-semibold text-sm">Try It Yourself →</button>
        </div>
      ) : (
        <div>
          <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Enter text to chunk…" className="w-full p-3 border-2 border-purple-200 rounded-lg mb-3 text-sm" />
          <button onClick={() => setChunks(userInput.match(/.{1,3}/g) || [])} disabled={!userInput} className="w-full bg-gradient-to-r from-blue-400 to-purple-500 text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-50 mb-3">Create Chunks</button>
          {chunks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chunks.map((chunk, i) => (
                <span key={i} className="bg-gradient-to-r from-purple-400 to-blue-400 text-white px-3 py-1.5 rounded-full font-mono font-bold text-sm">{chunk}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BoxBreathing () {
  const [isActive, setIsActive] = useState(false)
  const [phase, setPhase]       = useState('Inhale')
  const [count, setCount]       = useState(4)

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev === 1) {
          setPhase(cur => ({ Inhale: 'Hold', Hold: 'Exhale', Exhale: 'Rest', Rest: 'Inhale' }[cur]))
          return 4
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isActive])

  const phaseColor = { Inhale: 'from-blue-400 to-cyan-400', Hold: 'from-purple-400 to-pink-400', Exhale: 'from-green-400 to-emerald-400', Rest: 'from-amber-400 to-orange-400' }[phase]
  const phaseScale = phase === 'Inhale' ? 'scale-110' : phase === 'Exhale' ? 'scale-90' : 'scale-100'

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg"><span className="text-3xl">🌬️</span></div>
      <h3 className="text-xl font-bold text-gray-800 mb-1">Box Breathing</h3>
      <p className="text-gray-500 mb-4 text-sm">Inhale → Hold → Exhale → Rest (4s each)</p>
      <div className="mb-4">
        <div className={`w-36 h-36 mx-auto rounded-2xl bg-gradient-to-br ${phaseColor} shadow-xl transition-all duration-1000 flex flex-col items-center justify-center ${phaseScale}`}>
          <div className="text-white text-lg font-bold">{phase}</div>
          <div className="text-white text-4xl font-bold">{count}</div>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 mb-4">
        {['Inhale', 'Hold', 'Exhale', 'Rest'].map(p => (
          <div key={p} className={`px-2 py-0.5 rounded-full text-xs font-medium ${phase === p ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{p}</div>
        ))}
      </div>
      <div className="flex justify-center gap-3">
        <button onClick={() => setIsActive(a => !a)} className={`px-6 py-2 rounded-lg font-semibold text-white text-sm ${isActive ? 'bg-gradient-to-r from-rose-400 to-pink-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`}>{isActive ? 'Stop' : 'Start'}</button>
        <button onClick={() => { setIsActive(false); setPhase('Inhale'); setCount(4) }} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm">Reset</button>
      </div>
    </div>
  )
}