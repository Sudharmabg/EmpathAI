import { useState, useEffect, useRef } from 'react'
import { fetchQuestionsByClass, createResponse } from '../../../api/Assessmentmanagement'
import { apiRequest, apiDelete } from '../../../api/apiClient'
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

function detectEmotion (label, questionText = '', tag = '') {
  if (tag) {
    const cleanTag = tag.trim().toLowerCase()
    if (cleanTag === 'strength' || cleanTag === 'growth') {
      return 'happy'
    } else if (cleanTag === 'weakness' || cleanTag === 'risk') {
      return 'sad'
    } else if (cleanTag === 'neutral') {
      return 'neutral'
    }
  }

  const q = questionText.toLowerCase()
  const l = label.toLowerCase()

  const negativeIndicators = [
    'sad', 'stressed', 'worried', 'anxious', 'trouble', 'down', 'lonely', 'angry', 
    'hard', 'difficult', 'struggle', 'pressure', 'overwhelmed', 'concern', 'low',
    'bad', 'hurt', 'pain', 'scared', 'afraid', 'upset', 'annoyed', 'frustrated'
  ]
  const isQuestionNegative = negativeIndicators.some(word => q.includes(word))

  // Determine agreement strength
  const strongYes = ['very', 'always', 'yes', 'constantly', 'extremely', 'a lot', 'all the time', 'often']
  const strongNo = ['no', 'not really', 'never', 'nope', 'not at all', 'rarely', 'hardly', 'seldom']
  const neutralOrMod = ['okay', 'a little', 'somewhat', 'sometimes', 'maybe', 'moderately']

  let direction = 'agree' // default
  if (strongNo.some(w => l.includes(w))) {
    direction = 'disagree'
  } else if (neutralOrMod.some(w => l.includes(w))) {
    direction = 'neutral'
  } else if (strongYes.some(w => l.includes(w))) {
    direction = 'agree'
  } else {
    // semantic fallback
    if (l.includes('good') || l.includes('happy') || l.includes('well') || l.includes('fine')) {
      direction = 'agree'
    } else if (l.includes('bad') || l.includes('sad') || l.includes('worry')) {
      direction = 'disagree'
    }
  }

  // Resolve final emotion state: 'happy', 'neutral', 'concern', 'sad'
  if (isQuestionNegative) {
    if (direction === 'disagree') return 'happy' // "Not sad" -> happy
    if (direction === 'neutral') return 'concern' // "Sometimes sad" -> concern
    return 'sad' // "Very sad" -> sad
  } else {
    // positive question, e.g. "Do you feel happy?"
    if (direction === 'agree') return 'happy' // "Very happy" -> happy
    if (direction === 'neutral') return 'neutral' // "Sometimes happy" -> neutral
    return 'sad' // "Not happy" -> sad
  }
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
  let resultText = text
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

  // Verb map to fix subject-verb agreement (e.g., "you shows" -> "you show")
  const verbMap = {
    shows: 'show',
    demonstrates: 'demonstrate',
    feels: 'feel',
    experiences: 'experience',
    displays: 'display',
    has: 'have',
    is: 'are',
    was: 'were',
    does: 'do',
    wants: 'want',
    needs: 'need',
    seems: 'seem',
    struggles: 'struggle',
    finds: 'find',
    enjoys: 'enjoy',
    manages: 'manage',
    faces: 'face',
    navigates: 'navigate',
    expresses: 'express',
    copes: 'cope',
    reacts: 'react',
    responds: 'respond',
    seeks: 'seek',
    prefers: 'prefer',
    tends: 'tend',
    exhibits: 'exhibit',
    maintains: 'maintain',
    hopes: 'hope',
    appreciates: 'appreciate',
    values: 'value',
    understands: 'understand',
    knows: 'know',
    thinks: 'think',
    uses: 'use',
    makes: 'make',
    takes: 'take',
    keeps: 'keep',
    gets: 'get',
    goes: 'go',
    comes: 'come',
    helps: 'help',
    gives: 'give',
    allows: 'allow',
    leads: 'lead',
    creates: 'create',
    develops: 'develop',
    grows: 'grow',
    builds: 'build'
  }

  // Fix verb agreement for "you [verb]"
  resultText = resultText.replace(/\b(you)\s+(\w+)\b/gi, (match, p1, p2) => {
    const lowerVerb = p2.toLowerCase()
    if (verbMap[lowerVerb]) {
      return p1 + ' ' + verbMap[lowerVerb]
    }
    return match
  })

  // Capitalize first letter of each sentence
  resultText = resultText.replace(/^\s*[a-z]/, (m) => m.toUpperCase())
  return resultText
}

function getDisplayReportContent (report) {
  if (!report) return { strengths: [], improvements: [], tips: [], plain: [], summaryText: '' }

  let bulletsSource = report.bulletPoints || ''
  let summarySource = report.summaryText || ''

  if (report.editedSummaryText) {
    const lines = report.editedSummaryText.split('\n')
    const summaryMarker = lines.findIndex(l => l.trim().toLowerCase() === 'summary:')
    if (summaryMarker !== -1) {
      bulletsSource = lines.slice(0, summaryMarker).join('\n').trim()
      summarySource = lines.slice(summaryMarker + 1).join('\n').trim()
    } else {
      bulletsSource = report.editedSummaryText.trim()
      summarySource = ''
    }
  }

  const parsed = parseBulletPoints(bulletsSource)
  return {
    strengths:    parsed.strengths,
    improvements: parsed.improvements,
    tips:         parsed.tips,
    plain:        parsed.plain,
    summaryText:  summarySource
  }
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
  
 
  const [showReport, setShowReport]             = useState(false)
  const [showCelebration, setShowCelebration]   = useState(false)
  const [activeIntervention, setActiveIntervention] = useState(null)
  const [isTransitioning, setIsTransitioning]   = useState(false)


  const [selectedOption, setSelectedOption]     = useState(null)
  const [apiQuestions, setApiQuestions]         = useState([])
  const [loading, setLoading]                   = useState(true)
  const [analysis, setAnalysis]                 = useState(null)
  const [analysisLoading, setAnalysisLoading]   = useState(false)

  const isAnimatingRef    = useRef(false)
  const pendingTimersRef  = useRef([])
  const answersRef        = useRef({})
  const hasHydratedRef    = useRef(false)

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
          const mapped = data.map((q, i) => {
            const qText = q.questions || q.questionText || ''
            return {
              id:       q.id || i + 1,
              text:     qText,
              groupMap: q.group_map || q.groupMap  || '',
              groupMapId: q.groupMapId || q.group_map_id || null,
              groupClassName: q.groupClassName || q.group_class_name || q.className || '',
              options: [
                { value: 8, label: (q.option_a || q.optionA || '').trim(), emotion: detectEmotion(q.option_a || q.optionA || '', qText, q.option1Tag) },
                { value: 6, label: (q.option_b || q.optionB || '').trim(), emotion: detectEmotion(q.option_b || q.optionB || '', qText, q.option2Tag) },
                { value: 3, label: (q.option_c || q.optionC || '').trim(), emotion: detectEmotion(q.option_c || q.optionC || '', qText, q.option3Tag) },
                { value: 1, label: (q.option_d || q.optionD || '').trim(), emotion: detectEmotion(q.option_d || q.optionD || '', qText, q.option4Tag) }
              ].filter(o => o.label !== '')
            }
          })
          setApiQuestions(mapped)
          
          // Hydrate progress once when questions are loaded
          if (!hasHydratedRef.current) {
            const storageKey = user ? `questionnaire_progress_${user.email || user.id}` : 'questionnaire_progress_guest'
            const saved = localStorage.getItem(storageKey)
            if (saved) {
              try {
                const parsed = JSON.parse(saved)
                if (parsed.answers && parsed.currentQuestion !== undefined) {
                  setAnswers(parsed.answers)
                  answersRef.current = parsed.answers
                  // Ensure currentQuestion doesn't exceed loaded questions
                  const maxIndex = mapped.length - 1
                  setCurrentQuestion(Math.min(parsed.currentQuestion, maxIndex))
                }
              } catch (e) {
                console.error("Failed to parse saved questionnaire progress", e)
              }
            }
            hasHydratedRef.current = true
          }
        }
      })
      .catch(err => console.error('[Questionnaire] fetchQuestionsByClass error:', err))
      .finally(() => setLoading(false))
  }, [user])

  // Persist progress when answers or currentQuestion changes
  useEffect(() => {
    if (apiQuestions.length > 0 && !showReport) {
      const storageKey = user ? `questionnaire_progress_${user.email || user.id}` : 'questionnaire_progress_guest'
      localStorage.setItem(storageKey, JSON.stringify({ answers, currentQuestion }))
    }
  }, [answers, currentQuestion, apiQuestions, showReport, user])

  // Fetch past student responses on load to prefill questions
  // Commented out to ensure feelings explorer starts as a fresh daily assessment instead of preselecting past options
  /*
  useEffect(() => {
    const _su = localStorage.getItem('user')
    const _uu = _su ? JSON.parse(_su) : user
    const studentId = _uu?.id ?? null
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
    if (!studentId || apiQuestions.length === 0) return

    fetch(`/api/responses?studentId=${encodeURIComponent(studentId)}&size=200`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && (data.content || Array.isArray(data))) {
        const responseList = data.content || data
        const prefilledAnswers = {}

        responseList.forEach(resp => {
          const question = apiQuestions.find(q => q.id === resp.questionId)
          if (question) {
            const matchedOption = question.options.find(
              o => o.label.trim().toLowerCase() === (resp.responseValue || '').trim().toLowerCase()
            )
            if (matchedOption) {
              prefilledAnswers[resp.questionId] = matchedOption.value
            }
          }
        })

        if (Object.keys(prefilledAnswers).length > 0) {
          answersRef.current = prefilledAnswers
          setAnswers(prefilledAnswers)
        }
      }
    })
    .catch(err => console.error('[Questionnaire] Fetch past responses failed:', err))
  }, [apiQuestions, user])
  */

  // ✅ NEW useEffect starts HERE — outside and after the previous one
  useEffect(() => {
    if (apiQuestions.length === 0) return
    const _su = localStorage.getItem('user')
    const _uu = _su ? JSON.parse(_su) : user
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
    const studentId = _uu?.id ?? null
    const firstQ = apiQuestions[0]
    const groupId = firstQ?.groupMapId ?? null
    if (!studentId || !groupId) { setAnalysisLoading(false); return }

    setAnalysisLoading(true)
    apiRequest(`/api/assessment/reports/student/${encodeURIComponent(studentId)}/group/${groupId}`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d) {
        setShowReport(true)
        const displayContent = getDisplayReportContent(d)
        setAnalysis({
          strengths:    displayContent.strengths,
          improvements: displayContent.improvements,
          tips:         displayContent.tips,
          plain:        displayContent.plain,
          summaryText:  displayContent.summaryText,
          studentName:  `${_uu?.firstName || ''} ${_uu?.lastName || ''}`.trim()
        })
      }
    })
    .catch(err => console.error('[Questionnaire] Restore report failed:', err))
    .finally(() => setAnalysisLoading(false))
  }, [apiQuestions])

  useEffect(() => {
    clearPendingTimers()
    isAnimatingRef.current = false
    setSelectedOption(null)
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

  const saveResponseToDB = async (question, selectedLabel, resolvedEmotion) => {
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
      emotion:       resolvedEmotion || detectEmotion(selectedLabel, question.text),
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

    saveResponseToDB(currentQ, option.label, option.emotion)

    // snappy transition to the next question after 800ms
    safeTimeout(() => {
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
    }, 800)
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
    setShowCelebration(true)
    
    setTimeout(() => {
      setShowCelebration(false)
      setShowReport(true)
    }, 2000)
    
    // Clear saved progress on submission
    const storageKey = user ? `questionnaire_progress_${user.email || user.id}` : 'questionnaire_progress_guest'
    localStorage.removeItem(storageKey)

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
          await apiDelete(
            `/api/assessment/reports/student/${encodeURIComponent(studentId)}/group/${groupId}/today`
          )
        } catch (e) {
          console.warn('[Questionnaire] Cache clear skipped (non-fatal):', e.message)
        }
      }

      const reportRes = await apiRequest('/api/assessment/reports/generate', {
        method: 'POST',
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
        const displayContent = getDisplayReportContent(reportData)

        setAnalysis({
          strengths:    displayContent.strengths,
          improvements: displayContent.improvements,
          tips:         displayContent.tips,
          plain:        displayContent.plain,
          summaryText:  displayContent.summaryText,
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3 px-4">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-2">
          <ClipboardDocumentListIcon className="w-8 h-8 text-purple-300" />
        </div>
        <p className="text-gray-600 font-semibold text-lg text-center">No questions available right now</p>
        <p className="text-gray-400 text-sm text-center">Your teacher hasn't added any questions for your class yet. Please check back later.</p>
      </div>
    )
  }

  if (showCelebration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <style>{`
          @keyframes pop-in {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-pop-in { animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}</style>
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center animate-pop-in shadow-xl shadow-green-500/30 mb-6">
          <CheckCircleIcon className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 animate-pulse font-serif">Awesome job!</h2>
        <p className="text-gray-500 mt-2 font-serif text-lg">Gathering your insights...</p>
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
      <style>{`
        @keyframes emoji-pop {
          0% { transform: scale(0); opacity: 0; }
          45% { transform: scale(1.4) rotate(-5deg); opacity: 1; }
          70% { transform: scale(1.1) rotate(5deg); }
          100% { transform: scale(1.2) rotate(0deg); opacity: 1; }
        }
        .animate-emoji-pop {
          animation: emoji-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50" />

      <div className="mb-4 mt-4 pl-2">
        <h1 className="text-4xl sm:text-[2.5rem] font-bold font-serif text-[#0B1E36] tracking-tight mb-2">Feelings Explorer</h1>
        <p className="text-[1.1rem] sm:text-lg font-serif text-[#40607A]">Let's understand how you're feeling today</p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Question {currentQuestion + 1} of {activeQuestions.length}</p>
          <p className="text-sm font-bold text-indigo-500">
            {currentQuestion === 0 ? "Let's go!" : currentQuestion === activeQuestions.length - 1 ? "Almost done!" : "Doing great!"}
          </p>
        </div>
        <div className="bg-white/50 backdrop-blur-sm border border-white/60 rounded-full h-3 overflow-hidden shadow-inner p-0.5">
          <div className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={`flex-1 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 flex flex-col ${isTransitioning ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
        <div className="mb-6">
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
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 content-center mt-2">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedOption === index || (selectedOption === null && answers[currentQ.id] === option.value)
              const optionEmoji = emojiSequences[option.emotion]?.[0] || '😊'
              return (
                <label
                  key={index}
                  className={`relative overflow-visible flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all duration-300 group bg-white/80 backdrop-blur-sm
                    ${isAnimatingRef.current ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}
                    ${isSelected
                      ? 'border-indigo-400 shadow-xl shadow-indigo-500/20 scale-[1.03] bg-indigo-50/50'
                      : 'border-white hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:-translate-y-1'
                    }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option.value}
                    checked={false}
                    onChange={() => handleAnswerSelect(currentQ.id, option, index)}
                    className="sr-only"
                    disabled={isAnimatingRef.current}
                  />
                  <div className="w-16 h-16 flex items-center justify-center mb-3">
                    <span
                      className={`text-5xl transition-all duration-300 transform origin-center
                        ${isSelected
                          ? 'animate-emoji-pop opacity-100 scale-125'
                          : 'opacity-80 group-hover:opacity-100 group-hover:scale-110 group-hover:rotate-6'
                        }`}
                    >
                      {optionEmoji}
                    </span>
                  </div>
                  <span className={`font-semibold text-base text-center transition-colors ${isSelected ? 'text-indigo-700' : 'text-gray-600 group-hover:text-gray-900'}`}>{option.label}</span>
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