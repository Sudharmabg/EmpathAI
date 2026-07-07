import { useState, useEffect } from 'react'
import {
  ClockIcon,
  FlagIcon,
  LockClosedIcon,
  TrophyIcon,
  TrashIcon,
  CubeIcon,
  EyeIcon,
  LightBulbIcon,
  BookOpenIcon,
  Squares2X2Icon,
  HandRaisedIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { fetchMyBadges, getStudentXP } from '../../../api/rewardsApi'
import { getGoals, saveGoal, deleteGoal, completeIntervention, awardActivityXP } from '../../../api/activitiesApi.js'
import {
  getMindDumpEntries, saveMindDumpEntry, deleteMindDumpEntry,
} from '../../../api/wellnessApi.js'

const SUBJECTS = ['Mathematics', 'Science', 'SST', 'English', 'Hindi', 'Art & Craft', 'Physical Education', 'Computer Science', 'Other']

const MIND_UNLOAD_PROMPTS = [
  "What's occupying your mind today?",
  "What keeps coming back into your thoughts?",
  "What are you trying to remember?",
  "What feels unfinished?",
  "What are you worried about?",
  "What can you let go of today?",
  "What deserves your attention today?",
]
const CHUNK_NUMBER_SETS = [
  '4 9 1 7 2 0 2 6',
  '8 3 1 6 4 9 2 7 5',
  '5 0 8 1 9 3 6 2 4',
  '7 4 2 8 1 5 9 3 6',
]
const CHUNK_WORD_SETS = [
  'Candle Mountain Lemon Dog Pillow Forest Orange Cat Window',
  'Guitar River Mango Bicycle Eagle Ocean Apple Lion Table',
]

export default function Activities({ user, onXpEarned }) {
  const [activeTool, setActiveTool] = useState(null)
  const [badges, setBadges] = useState([])
  const [badgesLoading, setBadgesLoading] = useState(false)
  const [badgesError, setBadgesError] = useState('')
  const [studentXP, setStudentXP] = useState(0)

  useEffect(() => {
    const loadXP = async () => {
      if (!user?.id) return
      try {
        const data = await getStudentXP()
        setStudentXP(data?.xp ?? 0)
      } catch (err) {
        console.error('Failed to load XP:', err)
      }
    }
    loadXP()
  }, [user?.id])

  useEffect(() => {
    const loadBadges = async () => {
      if (!user?.id) return
      setBadgesLoading(true)
      setBadgesError('')
      try {
        const data = await fetchMyBadges()
        setBadges(Array.isArray(data) ? data : [])
      } catch (err) {
        setBadgesError(err.message || 'Failed to load rewards')
      } finally {
        setBadgesLoading(false)
      }
    }
    loadBadges()
  }, [user?.id])

  const handleXPEarned = async () => {
    try {
      const result = await awardActivityXP()
      setStudentXP(result.xp)
      onXpEarned?.(10)
    } catch (err) {
      console.error('Failed to award XP:', err)
      setStudentXP(prev => prev + 10)
      onXpEarned?.(10)
    }
  }

  const tools = [
    { id: 'meditation',  name: 'Meditation Timer',        description: 'Guided meditation sessions from 5-30 minutes',    icon: ClockIcon,        color: 'green',  bgColor: 'from-green-100 to-green-200',   btnLabel: 'Start Session'   },
    { id: 'goals',       name: 'Goal Setting',            description: 'Set and track your wellness goals',                icon: FlagIcon,         color: 'green',  bgColor: 'from-green-100 to-green-200',   btnLabel: 'Set Goals'       },
    
    { id: 'box-breathing', name: 'Box Breathing',         description: 'An instant calm tool for under a minute',          icon: CubeIcon,         color: 'blue',   bgColor: 'from-blue-100 to-blue-200',     btnLabel: 'Start Breathing' },
    { id: 'grounding',     name: '5-4-3-2-1 Grounding',   description: 'Reconnect with the present moment',                icon: EyeIcon,          color: 'green',  bgColor: 'from-green-100 to-green-200',   btnLabel: 'Start Grounding' },
    { id: 'braindump',     name: 'Brain Dump',            description: 'Clear your mind and choose your next step',        icon: LightBulbIcon,    color: 'orange', bgColor: 'from-orange-100 to-orange-200', btnLabel: 'Start Brain Dump'},
    { id: 'mindunload',    name: 'Mind Unloading Journal',description: 'Set down racing thoughts before bed',              icon: BookOpenIcon,     color: 'purple', bgColor: 'from-purple-100 to-purple-200', btnLabel: 'Open Journal'    },
    { id: 'chunking',      name: 'Chunking Practice',     description: 'A quick memory-boosting grouping exercise',        icon: Squares2X2Icon,   color: 'yellow', bgColor: 'from-yellow-100 to-yellow-200', btnLabel: 'Practice'        },
    { id: 'stop',          name: 'STOP Technique',        description: 'A 4-step pause for anger or stress',               icon: HandRaisedIcon,   color: 'red',    bgColor: 'from-red-100 to-red-200',       btnLabel: 'Start STOP'      },
    { id: 'mindfulness',   name: 'Gentle Mindfulness',    description: 'Gently notice the world around you',               icon: SparklesIcon,     color: 'green',  bgColor: 'from-green-100 to-green-200',   btnLabel: 'Start Mindfulness'},
    { id: 'rewards',    name: 'My Rewards',              description: 'View badges and achievements you have earned',     icon: TrophyIcon,       color: 'yellow', bgColor: 'from-yellow-100 to-yellow-200', btnLabel: 'View Rewards'    },
  ]

  return (
    <div className="font-lora">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wellness Activities</h1>
        <p className="text-gray-600">Interactive tools to support your emotional well-being</p>

        {/* ✅ XP Display */}
        <div className="mt-3 inline-block bg-purple-100 text-purple-700 px-5 py-2 rounded-full font-semibold text-sm">
          ⭐ XP: {studentXP}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => (
          <div
            key={index}
            className={'bg-gradient-to-br ' + tool.bgColor + ' border-2 border-purple-200 rounded-xl p-6 hover:border-purple-300 transition-colors text-center'}
          >
            <div className="flex justify-center mb-4">
              <div className={'w-16 h-16 bg-' + tool.color + '-100 rounded-full flex items-center justify-center'}>
                <tool.icon className={'w-8 h-8 text-' + tool.color + '-600'} />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{tool.name}</h3>
            <p className="text-gray-700 text-sm mb-4">{tool.description}</p>
            {tool.id === 'rewards' && (
              <p className="text-xs text-yellow-700 mb-2 font-medium">
                {badgesLoading
                  ? 'Loading...'
                  : badges.length + ' badge' + (badges.length !== 1 ? 's' : '') + ' earned'}
              </p>
            )}
            <button
              onClick={() => setActiveTool(tool.id)}
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              {tool.btnLabel}
            </button>
          </div>
        ))}
      </div>

      {activeTool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveTool(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
            {activeTool === 'meditation'     && <MeditationTimer   user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'goals'          && <GoalSetting       user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'box-breathing'  && <BoxBreathing      user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'grounding'      && <GroundingExercise user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'braindump'      && <BrainDump         user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'mindunload'     && <MindUnloadJournal user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'chunking'       && <ChunkingPractice  user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'stop'           && <StopTechnique     user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'mindfulness'    && <GentleMindfulness user={user} onXPEarned={handleXPEarned} />}
            {activeTool === 'rewards'        && <RewardsViewer badges={badges} loading={badgesLoading} error={badgesError} />}
          </div>
        </div>
      )}
    </div>
  )

  // ── Meditation Timer ───────────────────────────────────────────────────────
  function MeditationTimer({ user, onXPEarned }) {
    const [duration, setDuration] = useState(5)
    const [isActive, setIsActive] = useState(false)
    const [timeLeft, setTimeLeft] = useState(duration * 60)
    const [completed, setCompleted] = useState(false)
    const [saving, setSaving] = useState(false)

    const startTimer = () => {
      setIsActive(true)
      setCompleted(false)
      setTimeLeft(duration * 60)
    }

    useEffect(() => {
      if (!isActive) return
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false)
            clearInterval(interval)
            setCompleted(true)
            setSaving(true)

            completeIntervention(user?.id, 'meditation')
              .catch(err => console.error('Failed to record meditation intervention:', err))

            onXPEarned().finally(() => setSaving(false))

            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }, [isActive, duration])

    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return mins + ':' + secs.toString().padStart(2, '0')
    }

    return (
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Meditation Timer</h3>
        {!isActive && !completed && (
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Select Duration:</label>
            <select
              value={duration}
              onChange={(e) => { setDuration(Number(e.target.value)); setTimeLeft(Number(e.target.value) * 60) }}
              className="border-2 border-purple-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
        )}
        <div className="text-6xl font-bold text-purple-600 mb-6">{formatTime(timeLeft)}</div>
        {completed && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 font-semibold">
              {saving ? 'Recording session...' : 'Session complete! +10 XP earned.'}
            </p>
          </div>
        )}
        <div className="space-x-4">
          <button
            onClick={startTimer}
            disabled={isActive}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isActive ? 'In Progress...' : completed ? 'Start Again' : 'Start Meditation'}
          </button>
          <button
            onClick={() => { setIsActive(false); setTimeLeft(duration * 60); setCompleted(false) }}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
          >
            Reset
          </button>
        </div>
      </div>
    )
  }

  // ── Goal Setting ───────────────────────────────────────────────────────────
  function GoalSetting({ user, onXPEarned }) {
    const [goal, setGoal] = useState('')
    const [subjectTag, setSubjectTag] = useState('Mathematics')
    const [targetDate, setTargetDate] = useState('')
    const [goals, setGoals] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    const studentId = user?.id

    useEffect(() => {
      if (!studentId) return
      setLoading(true)
      getGoals(studentId)
        .then(data => setGoals(Array.isArray(data) ? data : []))
        .catch(() => setGoals([]))
        .finally(() => setLoading(false))
    }, [studentId])

    const addGoal = async () => {
      if (!goal.trim() || !targetDate) { setMsg('Please enter a goal and select a target date.'); return }
      setSaving(true)
      setMsg('')
      try {
        const newGoal = await saveGoal(studentId, goal, subjectTag, targetDate)
        setGoals(prev => [newGoal, ...(Array.isArray(prev) ? prev : [])])
        setGoal('')
        setTargetDate('')
        setSubjectTag('Mathematics')

        completeIntervention(studentId, 'goal')
          .catch(err => console.error('Failed to record goal intervention:', err))

        await onXPEarned()

        setMsg('Goal saved! +10 XP earned.')
      } catch {
        setMsg('Failed to save goal. Please try again.')
      } finally {
        setSaving(false)
      }
    }

    const handleDelete = async (goalId) => {
      try {
        await deleteGoal(studentId, goalId)
        setGoals(prev => (Array.isArray(prev) ? prev : []).filter(g => g.id !== goalId))
      } catch {
        setMsg('Failed to delete goal.')
      }
    }

    return (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Goal Setting</h3>
        <div className="flex items-center justify-center gap-1.5 mb-6 bg-green-50 py-1.5 px-3 rounded-full w-fit mx-auto border border-green-200">
          <LockClosedIcon className="w-3 h-3 text-green-600" />
          <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Private and Confidential</p>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-medium">Your Goal</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What do you want to achieve?"
              className="w-full p-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Subject</label>
              <select
                value={subjectTag}
                onChange={(e) => setSubjectTag(e.target.value)}
                className="w-full p-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">Target Date</label>
              <input
                type="date"
                value={targetDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full p-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>
        </div>
        <button
          onClick={addGoal}
          disabled={!goal.trim() || !targetDate || saving}
          className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 mb-2 font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Add Goal'}
        </button>
        {msg && (
          <p className={'text-sm text-center mb-4 font-medium ' + (msg.includes('saved') ? 'text-green-600' : 'text-red-500')}>
            {msg}
          </p>
        )}
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : goals.length > 0 ? (
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 space-y-3">
            <h4 className="font-semibold text-gray-800">Your Goals</h4>
            {goals.map((g) => (
              <div key={g.id} className="bg-white rounded-xl p-4 border border-purple-100 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">{g.goalText}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">{g.subjectTag}</span>
                    {g.targetDate && (
                      <span className="text-xs text-gray-500 font-medium">
                        Target: {new Date(g.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(g.id)} className="text-red-400 hover:text-red-600 transition-colors shrink-0 p-1">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">No goals yet. Add your first goal above!</p>
        )}
      </div>
    )
  }

  // ── Box Breathing  ─────────────────────────────────────────────────────
  function BoxBreathing({ user, onXPEarned }) {
    const PHASES = [
      { key: 'inhale',  label: 'Inhale' },
      { key: 'hold1',   label: 'Hold' },
      { key: 'exhale',  label: 'Exhale (mouth open, slowly)' },
      { key: 'hold2',   label: 'Hold' },
    ]
    const PHASE_SECONDS = 5

    const [totalCycles, setTotalCycles] = useState(5)
    const [isActive, setIsActive] = useState(false)
    const [phaseIndex, setPhaseIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState(PHASE_SECONDS)
    const [cyclesDone, setCyclesDone] = useState(0)
    const [completed, setCompleted] = useState(false)
    const [saving, setSaving] = useState(false)

    const start = () => {
      setIsActive(true)
      setCompleted(false)
      setPhaseIndex(0)
      setTimeLeft(PHASE_SECONDS)
      setCyclesDone(0)
    }

    const reset = () => {
      setIsActive(false)
      setCompleted(false)
      setPhaseIndex(0)
      setTimeLeft(PHASE_SECONDS)
      setCyclesDone(0)
    }

    useEffect(() => {
      if (!isActive) return
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setPhaseIndex(prevPhase => {
              const nextPhase = (prevPhase + 1) % PHASES.length
              if (nextPhase === 0) {
                setCyclesDone(prevCycles => {
                  const nextCycles = prevCycles + 1
                  if (nextCycles >= totalCycles) {
                    setIsActive(false)
                    setCompleted(true)
                    setSaving(true)
                    completeIntervention(user?.id, 'box-breathing')
                      .catch(err => console.error('Failed to record box breathing intervention:', err))
                    onXPEarned().finally(() => setSaving(false))
                  }
                  return nextCycles
                })
              }
              return nextPhase
            })
            return PHASE_SECONDS
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }, [isActive, totalCycles])

    const scale = 0.7 + (0.3 * (PHASE_SECONDS - timeLeft) / PHASE_SECONDS) * (phaseIndex === 0 ? 1 : phaseIndex === 2 ? -1 : 0) + (phaseIndex >= 1 && phaseIndex <= 2 ? (phaseIndex === 1 ? 0.3 : -0.3 + 0.3 * (PHASE_SECONDS - timeLeft) / PHASE_SECONDS) : 0)

    return (
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Box Breathing</h3>
        <p className="text-gray-600 text-sm mb-6">Stabilise your nervous system and reduce stress signals in under a minute.</p>

        {!isActive && !completed && (
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Number of cycles:</label>
            <select
              value={totalCycles}
              onChange={(e) => setTotalCycles(Number(e.target.value))}
              className="border-2 border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value={4}>4 cycles</option>
              <option value={5}>5 cycles</option>
              <option value={6}>6 cycles</option>
            </select>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div
            className="w-40 h-40 rounded-2xl bg-blue-100 border-4 border-blue-400 flex items-center justify-center transition-transform duration-1000 ease-in-out"
            style={{ transform: 'scale(' + Math.max(0.6, Math.min(1, scale)) + ')' }}
          >
            <span className="text-blue-700 font-semibold text-lg">
              {isActive ? PHASES[phaseIndex].label : completed ? 'Done' : 'Ready'}
            </span>
          </div>
        </div>

        {isActive && (
          <div className="mb-4">
            <p className="text-4xl font-bold text-blue-600">{timeLeft}</p>
            <p className="text-sm text-gray-500 mt-1">Cycle {cyclesDone + 1} of {totalCycles}</p>
          </div>
        )}

        {completed && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 font-semibold">
              {saving ? 'Recording session...' : 'Nicely done! +10 XP earned.'}
            </p>
          </div>
        )}

        <div className="space-x-4">
          <button
            onClick={start}
            disabled={isActive}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isActive ? 'In Progress...' : completed ? 'Start Again' : 'Start Breathing'}
          </button>
          <button onClick={reset} className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800">
            Reset
          </button>
        </div>
      </div>
    )
  }

  // ── 5-4-3-2-1 Grounding  ────────────────────────────────────────────────
  function GroundingExercise({ user, onXPEarned }) {
    const CATEGORIES = [
      { key: 'see',   count: 5, label: 'things you can see' },
      { key: 'touch', count: 4, label: 'things you can touch' },
      { key: 'hear',  count: 3, label: 'things you can hear' },
      { key: 'smell', count: 2, label: 'things you can smell' },
      { key: 'taste', count: 1, label: 'thing you can taste' },
    ]

    const emptyValues = () => {
      const v = {}
      CATEGORIES.forEach(cat => { v[cat.key] = Array(cat.count).fill('') })
      return v
    }

    const [values, setValues] = useState(emptyValues())
    const [completed, setCompleted] = useState(false)
    const [saving, setSaving] = useState(false)

    const setItem = (catKey, idx, val) => {
      setValues(prev => {
        const updated = { ...prev, [catKey]: [...prev[catKey]] }
        updated[catKey][idx] = val
        return updated
      })
    }

    const allFilled = CATEGORIES.every(cat => values[cat.key].every(v => v.trim() !== ''))

    const finish = async () => {
      if (!allFilled) return
      setSaving(true)
      try {
        completeIntervention(user?.id, 'grounding')
          .catch(err => console.error('Failed to record grounding intervention:', err))
        await onXPEarned()
        setCompleted(true)
      } finally {
        setSaving(false)
      }
    }

    const reset = () => { setValues(emptyValues()); setCompleted(false) }

    return (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">5-4-3-2-1 Grounding</h3>
        <p className="text-gray-600 text-sm mb-6 text-center">Emotional grounding for situational panic — reconnect with the present moment.</p>

        {!completed ? (
          <div className="space-y-5">
            {CATEGORIES.map(cat => (
              <div key={cat.key}>
                <label className="block text-gray-700 mb-2 font-medium">
                  {cat.count} {cat.label}
                </label>
                <div className="space-y-2">
                  {values[cat.key].map((val, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={val}
                      onChange={(e) => setItem(cat.key, idx, e.target.value)}
                      placeholder={'#' + (idx + 1)}
                      className="w-full p-2 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={finish}
              disabled={!allFilled || saving}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 mt-2"
            >
              {saving ? 'Saving...' : 'Mark Complete'}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-semibold">You're grounded in the present. +10 XP earned.</p>
            </div>
            <button onClick={reset} className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800">
              Do It Again
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Brain Dump  ─────────────────────────────────────────────────────────
  function BrainDump({ user, onXPEarned }) {
    const BUCKETS = [
      { key: 'must',   label: 'Must Do' },
      { key: 'should', label: 'Should Do' },
      { key: 'could',  label: 'Could Do' },
    ]

    const [problem, setProblem] = useState('')
    const [newTask, setNewTask] = useState('')
    const [bucket, setBucket] = useState('must')
    const [tasks, setTasks] = useState([]) 
    const [nextTaskId, setNextTaskId] = useState(null)
    const [completed, setCompleted] = useState(false)
    const [saving, setSaving] = useState(false)

    const addTask = () => {
      if (!newTask.trim()) return
      const id = Date.now()
      setTasks(prev => [...prev, { id, text: newTask.trim(), bucket }])
      setNewTask('')
    }

    const removeTask = (id) => {
      setTasks(prev => prev.filter(t => t.id !== id))
      if (nextTaskId === id) setNextTaskId(null)
    }

    const finish = async () => {
      if (!problem.trim() || tasks.length === 0 || !nextTaskId) return
      setSaving(true)
      try {
        completeIntervention(user?.id, 'brain-dump')
          .catch(err => console.error('Failed to record brain dump intervention:', err))
        await onXPEarned()
        setCompleted(true)
      } finally {
        setSaving(false)
      }
    }

    const reset = () => {
      setProblem(''); setNewTask(''); setBucket('must'); setTasks([]); setNextTaskId(null); setCompleted(false)
    }

    const chosenTask = tasks.find(t => t.id === nextTaskId)

    return (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Brain Dump</h3>
        <p className="text-gray-600 text-sm mb-6 text-center">A 2-minute technique to improve focus.</p>

        {!completed ? (
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-2 font-medium">1. Identify the problem</label>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full p-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                rows="2"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">2. Break it into smaller tasks</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Add a task..."
                  className="flex-1 p-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <select
                  value={bucket}
                  onChange={(e) => setBucket(e.target.value)}
                  className="p-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  {BUCKETS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
                </select>
                <button onClick={addTask} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">Add</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {BUCKETS.map(b => (
                  <div key={b.key} className="bg-orange-50 rounded-lg p-2 border border-orange-200 min-h-[60px]">
                    <p className="text-xs font-bold text-orange-700 mb-1">{b.label}</p>
                    {tasks.filter(t => t.bucket === b.key).map(t => (
                      <div key={t.id} className="flex items-center justify-between bg-white rounded px-2 py-1 mb-1 text-sm">
                        <span className="truncate">{t.text}</span>
                        <button onClick={() => removeTask(t.id)} className="text-red-400 hover:text-red-600 ml-1 shrink-0">
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {tasks.length > 0 && (
              <div>
                <label className="block text-gray-700 mb-2 font-medium">3. Choose only one task to complete next</label>
                <div className="space-y-2">
                  {tasks.map(t => (
                    <label key={t.id} className="flex items-center gap-2 p-2 border-2 border-orange-200 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="nextTask"
                        checked={nextTaskId === t.id}
                        onChange={() => setNextTaskId(t.id)}
                      />
                      <span className="text-sm">{t.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={finish}
              disabled={!problem.trim() || tasks.length === 0 || !nextTaskId || saving}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Finish Brain Dump'}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-semibold mb-1">Great focus! +10 XP earned.</p>
              {chosenTask && <p className="text-sm text-green-700">Your next step: <strong>{chosenTask.text}</strong></p>}
            </div>
            <button onClick={reset} className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800">
              Start a New Dump
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Mind Unloading Journal  ─────────────────────────────────────────────
  function MindUnloadJournal({ user, onXPEarned }) {
    const [entryText, setEntryText] = useState('')
    const [entries, setEntries] = useState([])
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [logged, setLogged] = useState(false)
    const [prompt, setPrompt] = useState(MIND_UNLOAD_PROMPTS[0])

    useEffect(() => {
      if (!user?.id) return
      getMindDumpEntries(user.id)
        .then(data => setEntries(Array.isArray(data) ? data : []))
        .catch(err => console.error('Failed to load mind dump entries:', err))
        .finally(() => setLoading(false))
    }, [user?.id])

    useEffect(() => {
      setPrompt(MIND_UNLOAD_PROMPTS[Math.floor(Math.random() * MIND_UNLOAD_PROMPTS.length)])
    }, [])

    const shufflePrompt = () => {
      setPrompt(prev => {
        let next = prev
        while (next === prev) {
          next = MIND_UNLOAD_PROMPTS[Math.floor(Math.random() * MIND_UNLOAD_PROMPTS.length)]
        }
        return next
      })
    }

    const addEntry = async () => {
      if (!entryText.trim()) return
      setSaving(true)
      try {
        const saved = await saveMindDumpEntry(user?.id, prompt, entryText)
        setEntries(prev => [saved, ...prev])

        completeIntervention(user?.id, 'mind-unload')
          .catch(err => console.error('Failed to record mind unload intervention:', err))

        await onXPEarned()

        setLogged(true)
        setEntryText('')
        shufflePrompt()
      } catch (err) {
        console.error('Failed to save mind dump entry:', err)
      } finally {
        setSaving(false)
      }
    }

    const handleDelete = async (entryId) => {
      try {
        await deleteMindDumpEntry(entryId)
        setEntries(prev => prev.filter(e => e.id !== entryId))
      } catch (err) {
        console.error('Failed to delete mind dump entry:', err)
      }
    }

    const weightLevel = Math.max(0, 5 - entries.length)

    return (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Mind Unloading Journal</h3>
        <div className="flex items-center justify-center gap-1.5 mb-4 bg-green-50 py-1.5 px-3 rounded-full w-fit mx-auto border border-green-200">
          <LockClosedIcon className="w-3 h-3 text-green-600" />
          <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Private and Confidential</p>
        </div>
        <div className="text-center mb-6">
          <span className="text-3xl">🎒</span>
          <p className="text-xs text-gray-500 mt-1">
            {weightLevel === 0 ? 'Your backpack feels light!' : 'Every entry you write empties a little more weight from your backpack.'}
          </p>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <label className="block text-gray-700 font-medium">{prompt}</label>
          <button onClick={shufflePrompt} className="text-purple-500 hover:text-purple-700" title="Get a different prompt">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          placeholder="Let it out..."
          className="w-full p-4 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 mb-4"
          rows="4"
        />

        {logged && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 font-semibold text-sm">
              {saving ? 'Saving...' : 'Recorded — that thought is safely saved. +10 XP earned.'}
            </p>
          </div>
        )}

        <button
          onClick={addEntry}
          disabled={!entryText.trim() || saving}
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 mb-6"
        >
          {saving ? 'Saving...' : 'Add Entry'}
        </button>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : entries.length > 0 && (
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-semibold mb-2">Your Past Entries:</h4>
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="mb-3 p-3 bg-white rounded flex items-start justify-between gap-2">
                <div className="flex-1">
                  {entry.promptText && <p className="text-xs text-purple-500 font-medium mb-1">{entry.promptText}</p>}
                  <p className="text-gray-800">{entry.entryText}</p>
                  <p className="text-sm text-gray-500 mt-1">{new Date(entry.loggedAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-600 shrink-0">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Chunking Practice  ──────────────────────────────────────────────────
  function ChunkingPractice({ user, onXPEarned }) {
    const [mode, setMode] = useState('numbers')
    const [setIndex, setSetIndex] = useState(0)
    const [attempt, setAttempt] = useState('')
    const [completed, setCompleted] = useState(false)
    const [saving, setSaving] = useState(false)

    const bank = mode === 'numbers' ? CHUNK_NUMBER_SETS : CHUNK_WORD_SETS
    const currentSet = bank[setIndex % bank.length]

    const shuffle = () => {
      setSetIndex(prev => prev + 1)
      setAttempt('')
      setCompleted(false)
    }

    const finish = async () => {
      if (!attempt.trim()) return
      setSaving(true)
      try {
        completeIntervention(user?.id, 'chunking')
          .catch(err => console.error('Failed to record chunking intervention:', err))
        await onXPEarned()
        setCompleted(true)
      } finally {
        setSaving(false)
      }
    }

    return (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Chunking Practice</h3>
        <p className="text-gray-600 text-sm mb-6 text-center">Break long information into meaningful groups of 2-3 clusters.</p>

        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => { setMode('numbers'); setSetIndex(0); setAttempt(''); setCompleted(false) }}
            className={'px-4 py-1.5 rounded-full text-sm font-medium border-2 ' + (mode === 'numbers' ? 'bg-yellow-500 text-white border-yellow-500' : 'border-yellow-200 text-yellow-700')}
          >
            Numbers
          </button>
          <button
            onClick={() => { setMode('words'); setSetIndex(0); setAttempt(''); setCompleted(false) }}
            className={'px-4 py-1.5 rounded-full text-sm font-medium border-2 ' + (mode === 'words' ? 'bg-yellow-500 text-white border-yellow-500' : 'border-yellow-200 text-yellow-700')}
          >
            Words
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-center">
          <p className="text-lg font-mono tracking-widest text-yellow-800">{currentSet}</p>
        </div>

        <label className="block text-gray-700 mb-2 font-medium">Group these into 2-3 clusters:</label>
        <input
          type="text"
          value={attempt}
          onChange={(e) => setAttempt(e.target.value)}
          placeholder="e.g. 491 / 720 / 26"
          className="w-full p-3 border-2 border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none mb-4"
        />

        {completed && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 font-semibold text-sm">
              {saving ? 'Saving...' : 'Great practice! +10 XP earned.'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={finish}
            disabled={!attempt.trim() || saving}
            className="flex-1 bg-black text-white py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Mark Complete'}
          </button>
          <button onClick={shuffle} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-1">
            <ArrowPathIcon className="w-4 h-4" /> New Set
          </button>
        </div>
      </div>
    )
  }

  // ── STOP Technique  ─────────────────────────────────────────────────────
  function StopTechnique({ user, onXPEarned }) {
    const STEPS = [
      { letter: 'S', title: 'Stop',   text: 'Pause whatever you are doing, right now.' },
      { letter: 'T', title: 'Take a breath', text: 'Take one slow, deliberate breath.' },
      { letter: 'O', title: 'Observe', text: 'Notice your thoughts and emotions, without judging them.' },
      { letter: 'P', title: 'Proceed', text: 'Choose how you want to proceed, intentionally.' },
    ]

    const [stepIndex, setStepIndex] = useState(0)
    const [completed, setCompleted] = useState(false)
    const [saving, setSaving] = useState(false)

    const next = async () => {
      if (stepIndex < STEPS.length - 1) {
        setStepIndex(prev => prev + 1)
      } else {
        setSaving(true)
        try {
          completeIntervention(user?.id, 'stop-technique')
            .catch(err => console.error('Failed to record STOP intervention:', err))
          await onXPEarned()
          setCompleted(true)
        } finally {
          setSaving(false)
        }
      }
    }

    const reset = () => { setStepIndex(0); setCompleted(false) }

    return (
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">STOP Technique</h3>
        <p className="text-gray-600 text-sm mb-6">For anger management — pause before you react.</p>

        {!completed ? (
          <div>
            <div className="w-24 h-24 mx-auto rounded-full bg-red-100 border-4 border-red-400 flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-red-600">{STEPS[stepIndex].letter}</span>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">{STEPS[stepIndex].title}</h4>
            <p className="text-gray-600 mb-6">{STEPS[stepIndex].text}</p>
            <p className="text-xs text-gray-400 mb-4">Step {stepIndex + 1} of {STEPS.length}</p>
            <button onClick={next} className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800">
              {stepIndex < STEPS.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-semibold">
                {saving ? 'Recording...' : 'You paused with intention. +10 XP earned.'}
              </p>
            </div>
            <button onClick={reset} className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800">
              Do It Again
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Gentle Mindfulness  ─────────────────────────────────────────────────
  function GentleMindfulness({ user, onXPEarned }) {
    const CATEGORIES = [
      { key: 'see',   count: 5, label: 'things you can see' },
      { key: 'touch', count: 4, label: 'things you can touch' },
      { key: 'hear',  count: 3, label: 'things you can hear' },
      { key: 'smell', count: 2, label: 'things you can smell' },
      { key: 'taste', count: 1, label: 'thing you can taste' },
    ]

    const [duration, setDuration] = useState(3)
    const [isActive, setIsActive] = useState(false)
    const [timeLeft, setTimeLeft] = useState(duration * 60)
    const [noticed, setNoticed] = useState({ see: 0, touch: 0, hear: 0, smell: 0, taste: 0 })
    const [completed, setCompleted] = useState(false)
    const [saving, setSaving] = useState(false)

    const start = () => {
      setIsActive(true)
      setCompleted(false)
      setTimeLeft(duration * 60)
      setNoticed({ see: 0, touch: 0, hear: 0, smell: 0, taste: 0 })
    }

    useEffect(() => {
      if (!isActive) return
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false)
            clearInterval(interval)
            setCompleted(true)
            setSaving(true)
            completeIntervention(user?.id, 'mindfulness')
              .catch(err => console.error('Failed to record mindfulness intervention:', err))
            onXPEarned().finally(() => setSaving(false))
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }, [isActive, duration])

    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return mins + ':' + secs.toString().padStart(2, '0')
    }

    const bump = (key, max) => {
      setNoticed(prev => ({ ...prev, [key]: Math.min(max, prev[key] + 1) }))
    }

    return (
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Gentle Mindfulness</h3>
        <p className="text-gray-600 text-sm mb-6">Bring your attention back to the present, gently.</p>

        {!isActive && !completed && (
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Select Duration:</label>
            <select
              value={duration}
              onChange={(e) => { setDuration(Number(e.target.value)); setTimeLeft(Number(e.target.value) * 60) }}
              className="border-2 border-green-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500"
            >
              <option value={3}>3 minutes</option>
              <option value={4}>4 minutes</option>
              <option value={5}>5 minutes</option>
            </select>
          </div>
        )}

        {(isActive || completed) && (
          <div className="text-5xl font-bold text-green-600 mb-6">{formatTime(timeLeft)}</div>
        )}

        {isActive && (
          <div className="grid grid-cols-1 gap-2 mb-6 text-left max-w-sm mx-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => bump(cat.key, cat.count)}
                className="flex items-center justify-between p-2 border-2 border-green-200 rounded-lg hover:border-green-400"
              >
                <span className="text-sm text-gray-700">{cat.count} {cat.label}</span>
                <span className="text-sm font-semibold text-green-600">{noticed[cat.key]}/{cat.count}</span>
              </button>
            ))}
          </div>
        )}

        {completed && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 font-semibold">
              {saving ? 'Recording session...' : 'Well noticed. +10 XP earned.'}
            </p>
          </div>
        )}

        <div className="space-x-4">
          <button
            onClick={start}
            disabled={isActive}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isActive ? 'In Progress...' : completed ? 'Start Again' : 'Start Mindfulness'}
          </button>
          <button
            onClick={() => { setIsActive(false); setTimeLeft(duration * 60); setCompleted(false) }}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
          >
            Reset
          </button>
        </div>
      </div>
    )
  }

  // ── Rewards Viewer ─────────────────────────────────────────────────────────
  function RewardsViewer({ badges, loading, error }) {
    return (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">My Rewards</h3>
        <p className="text-center text-sm text-gray-500 mb-6">
          Badges are awarded automatically when you reach login and session milestones.
        </p>
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading your rewards...</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}
        {!loading && !error && badges.length === 0 && (
          <div className="text-center py-10">
            <TrophyIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No badges yet!</p>
            <p className="text-sm text-gray-400 mt-1">Keep logging in and using the app to earn your first badge.</p>
          </div>
        )}
        {!loading && !error && badges.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="bg-gradient-to-br from-yellow-50 to-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-4 shadow-sm"
              >
                {badge.imageBase64 ? (
                  <img
                    src={'data:' + (badge.imageType || 'image/png') + ';base64,' + badge.imageBase64}
                    alt={badge.title}
                    className="w-14 h-14 rounded-xl object-cover border border-purple-100 shadow"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center border border-purple-200">
                    <TrophyIcon className="w-7 h-7 text-purple-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate">{badge.title}</h4>
                  <p className="text-sm text-gray-500 truncate">{badge.triggerTitle}</p>
                  <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {badge.triggerType}
                  </span>
                  {badge.earnedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Earned: {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
}