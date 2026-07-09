import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
    addTask, editTask, deleteTask, toggleTaskComplete, getRecommendations,
    savePreferences, getPreferences, getMonthTasks
} from '../../../api/scheduleApi.js'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { apiRequest } from '../../../api/apiClient.js'
import 'katex/dist/katex.min.css'
import {
    CalendarIcon, PlusIcon, TrashIcon, CheckCircleIcon,
    ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon,
    PencilIcon, ExclamationTriangleIcon,
    ClockIcon, AcademicCapIcon, SparklesIcon,
    XMarkIcon, ArrowPathIcon, PaperAirplaneIcon,
    PencilSquareIcon, ChatBubbleLeftIcon, Cog6ToothIcon,
    MicrophoneIcon, CheckIcon, MagnifyingGlassIcon,
    BookOpenIcon, HeartIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { BookOpenIcon as BookOpenSolid } from '@heroicons/react/24/solid'
import chatService from '../../../services/chatService'

// ═══════════════════════════════════════════════════════════════════════════════
// DATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function toISO(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}
function mondayOf(d) {
    const date = new Date(d)
    const day = date.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    date.setDate(date.getDate() + diff)
    date.setHours(0, 0, 0, 0)
    return date
}
function addDays(d, n) {
    const date = new Date(d)
    date.setDate(date.getDate() + n)
    return date
}
function weekDatesFrom(monday) {
    return Array.from({ length: 7 }, (_, i) => toISO(addDays(monday, i)))
}
function dayLabel(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
}
function shortDateLabel(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function monthYearLabel(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function todayISO() {
    return toISO(new Date())
}
function firstOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1)
}
function monthGridDates(viewMonth) {
    const first = firstOfMonth(viewMonth)
    const startWeekday = (first.getDay() + 6) % 7
    const gridStart = addDays(first, -startWeekday)
    return Array.from({ length: 42 }, (_, i) => {
        const d = addDays(gridStart, i)
        return { iso: toISO(d), inMonth: d.getMonth() === viewMonth.getMonth() }
    })
}
function monthLabel(d) {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function isWeekendISO(iso) {
    const d = new Date(iso + 'T00:00:00').getDay()
    return d === 0 || d === 6
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME SELECT
// ═══════════════════════════════════════════════════════════════════════════════

function TimeSelect({ value, onChange, label, is24h }) {
    if (is24h) {
        const toH = (v) => { if (!v) return '12'; return v.split(':')[0] }
        const toM = (v) => { if (!v) return '00'; return v.split(':')[1] }
        const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
        const minutes = ['00','05','10','15','20','25','30','35','40','45','50','55']
        const emit = (h, m) => onChange(`${h}:${m}`)
        const sel = "flex-1 px-2 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none text-sm font-bold text-gray-700 bg-white appearance-none text-center cursor-pointer"
        return (
            <div>
                {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
                <div className="flex gap-1.5 items-center">
                    <select value={toH(value)} onChange={e => emit(e.target.value, toM(value))} className={sel}>{hours.map(h => <option key={h}>{h}</option>)}</select>
                    <span className="text-gray-400 font-black text-sm">:</span>
                    <select value={toM(value)} onChange={e => emit(toH(value), e.target.value)} className={sel}>{minutes.map(m => <option key={m}>{m}</option>)}</select>
                </div>
            </div>
        )
    }
    const toH = (v) => { if (!v) return '12'; const [h] = v.split(':').map(Number); return h % 12 === 0 ? '12' : String(h % 12) }
    const toM = (v) => { if (!v) return '00'; return v.split(':')[1] }
    const toAP = (v) => { if (!v) return 'AM'; const [h] = v.split(':').map(Number); return h >= 12 ? 'PM' : 'AM' }
    const hours = ['12','1','2','3','4','5','6','7','8','9','10','11']
    const minutes = ['00','05','10','15','20','25','30','35','40','45','50','55']
    const emit = (h, m, ap) => {
        let hour = parseInt(h)
        if (ap === 'PM' && hour !== 12) hour += 12
        if (ap === 'AM' && hour === 12) hour = 0
        onChange(`${String(hour).padStart(2,'0')}:${m}`)
    }
    const sel = "flex-1 px-2 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none text-sm font-bold text-gray-700 bg-white appearance-none text-center cursor-pointer"
    return (
        <div>
            {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
            <div className="flex gap-1.5 items-center">
                <select value={toH(value)} onChange={e => emit(e.target.value, toM(value), toAP(value))} className={sel}>{hours.map(h => <option key={h}>{h}</option>)}</select>
                <span className="text-gray-400 font-black text-sm">:</span>
                <select value={toM(value)} onChange={e => emit(toH(value), e.target.value, toAP(value))} className={sel}>{minutes.map(m => <option key={m}>{m}</option>)}</select>
                <select value={toAP(value)} onChange={e => emit(toH(value), toM(value), e.target.value)} className={sel}><option>AM</option><option>PM</option></select>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const STUDY_TIME_OPTIONS = [
    { value: 'MORNING',   label: 'Morning',   time: '6 AM – 12 PM', emoji: '🌅',
      color: 'border-amber-200 bg-amber-50',   activeColor: 'border-amber-400 bg-amber-100 ring-2 ring-amber-300' },
    { value: 'AFTERNOON', label: 'Afternoon', time: '12 PM – 5 PM', emoji: '☀️',
      color: 'border-orange-200 bg-orange-50', activeColor: 'border-orange-400 bg-orange-100 ring-2 ring-orange-300' },
    { value: 'EVENING',   label: 'Evening',   time: '5 PM – 9 PM',  emoji: '🌆',
      color: 'border-violet-200 bg-violet-50', activeColor: 'border-violet-400 bg-violet-100 ring-2 ring-violet-300' },
    { value: 'NIGHT',     label: 'Night',     time: '9 PM – 11 PM', emoji: '🌙',
      color: 'border-indigo-200 bg-indigo-50', activeColor: 'border-indigo-400 bg-indigo-100 ring-2 ring-indigo-300' },
]

const REASON_SUGGESTIONS = [
    'Football practice', 'Tuition / Extra class', 'Family time',
    'Religious activity', 'Sports training', 'Music / Dance class',
    'Part-time work', 'Other',
]

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

function getTodayName() {
    const DAYS_JS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    return DAYS_JS[new Date().getDay()]
}

const WELLNESS_ACTIVITY_OPTIONS = [
    'Listening to music','Painting / Drawing','Playing an instrument','Reading a book',
    'Going for a walk','Meditation','Yoga / Stretching','Watching a show',
    'Journaling','Hanging out with friends','Other (Custom Activity)',
]

const OTHER_ACTIVITY_OPTIONS = [
    'Assigned Intervention','Counsellor Check-in','Peer Support Session',
    'Skill-Building Exercise','Guided Reflection','Other (Custom Activity)',
]

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: TASK TYPE STYLING (matches design)
// ═══════════════════════════════════════════════════════════════════════════════

const TASK_TYPE_CONFIG = {
    Study: {
        bg: 'bg-violet-50',
        border: 'border-violet-100',
        iconBg: 'bg-violet-500',
        icon: BookOpenIcon,
        text: 'text-violet-900',
        subtext: 'text-violet-600',
    },
    Wellness: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        iconBg: 'bg-emerald-500',
        icon: HeartIcon,
        text: 'text-emerald-900',
        subtext: 'text-emerald-600',
    },
    Other: {
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        iconBg: 'bg-blue-500',
        icon: ClipboardDocumentListIcon,
        text: 'text-blue-900',
        subtext: 'text-blue-600',
    },
    Intervention: {
        bg: 'bg-purple-50',
        border: 'border-purple-100',
        iconBg: 'bg-purple-500',
        icon: ClipboardDocumentListIcon,
        text: 'text-purple-900',
        subtext: 'text-purple-600',
    },
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREFERENCES MODAL
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PREFERENCES MODAL (Side-drawer with tabs)
// ═══════════════════════════════════════════════════════════════════════════════

const PREF_TABS = [
    { id: 'study-goals',    label: 'Study Goals',    sublabel: 'Focus & targets',       icon: '🎯' },
    { id: 'availability',   label: 'Availability',   sublabel: 'Set your time',         icon: '🕐' },
    { id: 'study-sessions', label: 'Study Sessions', sublabel: 'Duration & breaks',     icon: '📚' },
    { id: 'ai-suggestions', label: 'AI Suggestions', sublabel: 'Smart recommendations', icon: '✨' },
    { id: 'notifications',  label: 'Notifications',  sublabel: 'Reminders & alerts',    icon: '🔔' },
]

const WEEKDAYS_SHORT = [
    { full: 'MONDAY',    short: 'Mon' },
    { full: 'TUESDAY',   short: 'Tue' },
    { full: 'WEDNESDAY', short: 'Wed' },
    { full: 'THURSDAY',  short: 'Thu' },
    { full: 'FRIDAY',    short: 'Fri' },
    { full: 'SATURDAY',  short: 'Sat' },
    { full: 'SUNDAY',    short: 'Sun' },
]

const INTENSITY_OPTIONS = [
    { value: 'LIGHT',     label: 'Light',     range: '1-3 hrs/day', icon: '🌱' },
    { value: 'MODERATE',  label: 'Moderate',  range: '4-6 hrs/day', icon: '📊' },
    { value: 'INTENSIVE', label: 'Intensive', range: '7+ hrs/day',  icon: '🚀' },
]

function PreferencesModal({ user, initialPrefs, isFirstTime, onComplete, onSkip }) {
    const [loading, setLoading] = useState(!initialPrefs)
    const [saving, setSaving]   = useState(false)
    const [error, setError]     = useState('')
    const [activeTab, setActiveTab] = useState('study-goals')

    // Existing fields
    const [preferredStudyTime, setPreferredStudyTime] = useState(initialPrefs?.preferredStudyTime || null)
    const [busySlots, setBusySlots] = useState(initialPrefs?.busySlots || [])

    // NEW fields
    const [preferredStudyDays, setPreferredStudyDays] = useState(
        initialPrefs?.preferredStudyDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    )
    const [dailyStudyTargetHours, setDailyStudyTargetHours] = useState(
        initialPrefs?.dailyStudyTargetHours ?? 4
    )
    const [studyIntensity, setStudyIntensity] = useState(
        initialPrefs?.studyIntensity || 'MODERATE'
    )

    // Busy slot form state
    const [busyForm, setBusyForm] = useState({
        recurring: true, day: getTodayName(), date: todayISO(),
        startTime: '16:00', endTime: '18:00', reason: ''
    })
    const [busyFormError, setBusyFormError] = useState('')

    const toM = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const fmt = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }

    useEffect(() => {
        if (initialPrefs) { setLoading(false); return }
        getPreferences(user.id)
            .then(data => {
                setPreferredStudyTime(data.preferredStudyTime || null)
                setBusySlots(data.busySlots || [])
                setPreferredStudyDays(data.preferredStudyDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])
                setDailyStudyTargetHours(data.dailyStudyTargetHours ?? 4)
                setStudyIntensity(data.studyIntensity || 'MODERATE')
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [user.id, initialPrefs])

    const toggleStudyDay = (dayFull) => {
        setPreferredStudyDays(prev =>
            prev.includes(dayFull)
                ? prev.filter(d => d !== dayFull)
                : [...prev, dayFull]
        )
    }

    const adjustHours = (delta) => {
        setDailyStudyTargetHours(prev => Math.max(1, Math.min(12, prev + delta)))
    }

    const addBusySlot = () => {
        setBusyFormError('')
        if (!busyForm.startTime || !busyForm.endTime) { setBusyFormError('Set both times.'); return }
        if (toM(busyForm.endTime) <= toM(busyForm.startTime)) { setBusyFormError('End must be after start.'); return }
        if (!busyForm.recurring && !busyForm.date) { setBusyFormError('Pick a date.'); return }

        const effectiveDay = busyForm.recurring
            ? busyForm.day
            : new Date(busyForm.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })

        const sameDay = busySlots.filter(s => {
            if (s.recurring !== busyForm.recurring) return false
            return busyForm.recurring ? s.day === busyForm.day : s.date === busyForm.date
        })
        if (sameDay.some(s => toM(busyForm.startTime) < toM(s.endTime) && toM(busyForm.endTime) > toM(s.startTime))) {
            setBusyFormError('Overlaps with existing slot.'); return
        }
        const newSlot = {
            day: effectiveDay, startTime: busyForm.startTime, endTime: busyForm.endTime,
            reason: busyForm.reason || 'Busy',
            recurring: busyForm.recurring, date: busyForm.recurring ? null : busyForm.date
        }
        setBusySlots([...busySlots, newSlot])
        setBusyForm({ recurring: true, day: getTodayName(), date: todayISO(), startTime: '16:00', endTime: '18:00', reason: '' })
    }

    const removeBusySlot = (index) => {
        setBusySlots(busySlots.filter((_, i) => i !== index))
    }

    const handleReset = () => {
        setPreferredStudyTime(null)
        setBusySlots([])
        setPreferredStudyDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])
        setDailyStudyTargetHours(4)
        setStudyIntensity('MODERATE')
        setError('')
    }

    const handleSave = async () => {
        if (!preferredStudyTime && activeTab === 'study-sessions') {
            setError('Please select a preferred study time.')
            setActiveTab('study-sessions')
            return
        }
        if (preferredStudyDays.length === 0) {
            setError('Please select at least one study day.')
            setActiveTab('study-goals')
            return
        }
        setSaving(true); setError('')
        try {
            await savePreferences(
                user.id,
                preferredStudyTime || 'AFTERNOON',
                busySlots,
                preferredStudyDays,
                dailyStudyTargetHours,
                studyIntensity
            )
            onComplete({
                preferredStudyTime: preferredStudyTime || 'AFTERNOON',
                busySlots,
                preferredStudyDays,
                dailyStudyTargetHours,
                studyIntensity
            })
        } catch (err) {
            setError(err.message || 'Failed to save.')
            setSaving(false)
        }
    }

    const inputClass = "border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-violet-300 outline-none bg-white w-full transition-colors"

    if (loading) return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center font-lora">
            <div className="bg-white rounded-2xl p-10 border border-violet-100 shadow-2xl flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-violet-100 rounded-full" />
                    <div className="absolute inset-0 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="text-center">
                    <p className="font-black text-black text-sm">Loading preferences</p>
                    <p className="text-gray-400 text-xs font-medium mt-0.5">Just a moment…</p>
                </div>
            </div>
        </div>
    )

    return (
        <div
            onClick={() => onSkip && onSkip()}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-end sm:pr-6 font-lora"
        >
            <div
                onClick={e => e.stopPropagation()}
                className="bg-white w-full sm:max-w-4xl h-full sm:h-[92vh] sm:rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-black">Preferences</h2>
                        {isFirstTime && (
                            <span className="text-[10px] font-black text-violet-600 bg-violet-100 border border-violet-200 px-2 py-1 rounded-full">
                                FIRST-TIME SETUP
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onSkip}
                        className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Body: Sidebar + Content ── */}
                <div className="flex-1 flex overflow-hidden">

                    {/* ── Left Sidebar Tabs ── */}
                    <div className="w-64 border-r border-gray-100 bg-gray-50/50 py-4 px-3 overflow-y-auto flex-shrink-0">
                        <div className="space-y-1">
                            {PREF_TABS.map(tab => {
                                const isActive = activeTab === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                                            isActive
                                                ? 'bg-white shadow-sm border border-violet-100'
                                                : 'hover:bg-white/60'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 ${
                                            isActive ? 'bg-violet-100' : 'bg-gray-100'
                                        }`}>
                                            {tab.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-black ${isActive ? 'text-violet-700' : 'text-gray-700'}`}>
                                                {tab.label}
                                            </p>
                                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{tab.sublabel}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── Right Content Area ── */}
                    <div className="flex-1 overflow-y-auto p-8">

                        {/* ═══ STUDY GOALS TAB ═══ */}
                        {activeTab === 'study-goals' && (
                            <div>
                                <h3 className="text-xl font-black text-black mb-1">Study Goals</h3>
                                <p className="text-sm text-gray-500 font-medium mb-8">Customize your goals and study preferences.</p>

                                {/* Preferred Study Days */}
                                <div className="mb-8">
                                    <p className="text-sm font-black text-gray-800 mb-3">Preferred study days</p>
                                    <div className="flex flex-wrap gap-2">
                                        {WEEKDAYS_SHORT.map(day => {
                                            const isSelected = preferredStudyDays.includes(day.full)
                                            return (
                                                <button
                                                    key={day.full}
                                                    onClick={() => toggleStudyDay(day.full)}
                                                    className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                                                        isSelected
                                                            ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200'
                                                            : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'
                                                    }`}
                                                >
                                                    {day.short}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Daily Study Target */}
                                <div className="mb-8">
                                    <p className="text-sm font-black text-gray-800 mb-3">Daily study target</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => adjustHours(-1)}
                                                className="w-10 h-10 flex items-center justify-center text-violet-600 hover:bg-violet-50 font-black text-lg transition-colors"
                                            >
                                                −
                                            </button>
                                            <div className="w-14 text-center">
                                                <span className="text-lg font-black text-black">{dailyStudyTargetHours}</span>
                                            </div>
                                            <button
                                                onClick={() => adjustHours(1)}
                                                className="w-10 h-10 flex items-center justify-center text-violet-600 hover:bg-violet-50 font-black text-lg transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="text-sm font-bold text-gray-600">hours per day</span>
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium mt-2">Recommended: 4-8 hours</p>
                                </div>

                                {/* Study Intensity */}
                                <div className="mb-8">
                                    <p className="text-sm font-black text-gray-800 mb-3">Study intensity</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {INTENSITY_OPTIONS.map(opt => {
                                            const isSelected = studyIntensity === opt.value
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setStudyIntensity(opt.value)}
                                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                                                        isSelected
                                                            ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-200'
                                                            : 'bg-white border-gray-100 hover:border-violet-200'
                                                    }`}
                                                >
                                                    <span className="text-2xl">{opt.icon}</span>
                                                    <span className={`text-sm font-black ${isSelected ? 'text-violet-700' : 'text-gray-700'}`}>
                                                        {opt.label}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400">{opt.range}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 bg-violet-200 rounded-lg flex items-center justify-center">
                                            <CalendarIcon className="w-3.5 h-3.5 text-violet-700" />
                                        </div>
                                        <p className="text-sm font-black text-violet-900">Preview: Your schedule will adapt like this</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Mock bar chart */}
                                        <div className="flex items-end justify-around gap-2 h-24">
                                            {WEEKDAYS_SHORT.map(day => {
                                                const isActive = preferredStudyDays.includes(day.full)
                                                const height = isActive
                                                    ? Math.min(90, 40 + dailyStudyTargetHours * 6)
                                                    : 15
                                                return (
                                                    <div key={day.full} className="flex flex-col items-center gap-1 flex-1">
                                                        <div
                                                            className={`w-full rounded-t-md transition-all duration-300 ${
                                                                isActive ? 'bg-violet-500' : 'bg-violet-200'
                                                            }`}
                                                            style={{ height: `${height}%` }}
                                                        />
                                                        <span className="text-[9px] font-bold text-violet-700">{day.short.slice(0, 3)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {/* Checklist */}
                                        <div className="space-y-2">
                                            {[
                                                'Balanced study blocks',
                                                'Smart break reminders',
                                                'Wellness time included',
                                                'Personalized suggestions',
                                            ].map(item => (
                                                <div key={item} className="flex items-center gap-2">
                                                    <CheckCircleIcon className="w-4 h-4 text-violet-600 flex-shrink-0" />
                                                    <span className="text-xs font-bold text-gray-700">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ AVAILABILITY TAB ═══ */}
                        {activeTab === 'availability' && (
                            <div>
                                <h3 className="text-xl font-black text-black mb-1">Availability</h3>
                                <p className="text-sm text-gray-500 font-medium mb-6">Set your busy hours — we'll skip these when planning tasks.</p>

                                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-5">
                                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-3">Add a busy slot</p>

                                    <div className="flex gap-2 mb-3">
                                        <button
                                            onClick={() => { setBusyForm(p => ({ ...p, recurring: true })); setBusyFormError('') }}
                                            className={`flex-1 text-xs font-black py-2 rounded-xl border-2 transition-all ${
                                                busyForm.recurring ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'
                                            }`}
                                        >
                                            🔁 Weekly
                                        </button>
                                        <button
                                            onClick={() => { setBusyForm(p => ({ ...p, recurring: false })); setBusyFormError('') }}
                                            className={`flex-1 text-xs font-black py-2 rounded-xl border-2 transition-all ${
                                                !busyForm.recurring ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'
                                            }`}
                                        >
                                            📅 One-time
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2.5 mb-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                                                {busyForm.recurring ? 'Day' : 'Date'}
                                            </label>
                                            {busyForm.recurring ? (
                                                <select value={busyForm.day} onChange={e => setBusyForm(p => ({ ...p, day: e.target.value }))} className={inputClass}>
                                                    {DAYS.map(d => <option key={d}>{d}</option>)}
                                                </select>
                                            ) : (
                                                <input type="date" value={busyForm.date} onChange={e => setBusyForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">From</label>
                                            <input type="time" value={busyForm.startTime} onChange={e => setBusyForm(p => ({ ...p, startTime: e.target.value }))} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">To</label>
                                            <input type="time" value={busyForm.endTime} onChange={e => setBusyForm(p => ({ ...p, endTime: e.target.value }))} className={inputClass} />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Reason (optional)</label>
                                        <input
                                            type="text"
                                            value={busyForm.reason}
                                            onChange={e => setBusyForm(p => ({ ...p, reason: e.target.value }))}
                                            placeholder="e.g. Football practice"
                                            className={inputClass}
                                        />
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {REASON_SUGGESTIONS.slice(0, 6).map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setBusyForm(p => ({ ...p, reason: r }))}
                                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                                        busyForm.reason === r ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'
                                                    }`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {busyFormError && (
                                        <p className="text-[11px] text-red-500 font-bold mb-2.5 flex items-center gap-1">
                                            <ExclamationTriangleIcon className="w-3 h-3" /> {busyFormError}
                                        </p>
                                    )}

                                    <button onClick={addBusySlot} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-colors">
                                        <PlusIcon className="w-3.5 h-3.5" /> Add Slot
                                    </button>
                                </div>

                                {busySlots.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-center">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                            <ClockIcon className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500">No busy slots added</p>
                                        <p className="text-xs text-gray-400 font-medium mt-1">Your schedule is wide open!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {busySlots.map((slot, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white border border-red-100 rounded-xl px-4 py-3">
                                                <div className="w-1.5 h-10 bg-red-400 rounded-full flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-black text-sm text-red-700">{slot.day}</p>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${slot.recurring === false ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-500'}`}>
                                                            {slot.recurring === false ? 'ONE-TIME' : 'WEEKLY'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-red-500 font-medium mt-0.5">
                                                        {fmt(slot.startTime)} – {fmt(slot.endTime)}
                                                        {slot.reason && ` · ${slot.reason}`}
                                                    </p>
                                                </div>
                                                <button onClick={() => removeBusySlot(i)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══ STUDY SESSIONS TAB ═══ */}
                        {activeTab === 'study-sessions' && (
                            <div>
                                <h3 className="text-xl font-black text-black mb-1">Study Sessions</h3>
                                <p className="text-sm text-gray-500 font-medium mb-8">When do you study best? We'll prioritize this window.</p>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    {STUDY_TIME_OPTIONS.map(opt => {
                                        const isSelected = preferredStudyTime === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setPreferredStudyTime(opt.value)}
                                                className={`relative flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-left ${
                                                    isSelected ? opt.activeColor : opt.color + ' hover:opacity-90'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-3 right-3 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center">
                                                        <CheckIcon className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                )}
                                                <span className="text-3xl mb-2">{opt.emoji}</span>
                                                <span className="font-black text-base text-black block">{opt.label}</span>
                                                <span className="text-xs font-medium text-gray-500 mt-1">{opt.time}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
                                    <SparklesIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-black text-blue-900 mb-0.5">Smart scheduling</p>
                                        <p className="text-xs text-blue-700 font-medium">
                                            AI suggestions will prioritise this window when planning your study sessions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ AI SUGGESTIONS TAB ═══ */}
                        {activeTab === 'ai-suggestions' && (
                            <div>
                                <h3 className="text-xl font-black text-black mb-1">AI Suggestions</h3>
                                <p className="text-sm text-gray-500 font-medium mb-8">Control how the AI plans your day.</p>

                                <div className="flex flex-col items-center justify-center py-16 text-center bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <SparklesIcon className="w-8 h-8 text-violet-500" />
                                    </div>
                                    <p className="text-lg font-black text-gray-800 mb-1">Coming Soon</p>
                                    <p className="text-sm text-gray-500 font-medium max-w-sm">
                                        Advanced AI controls — set suggestion frequency, focus areas, and personalisation preferences.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ═══ NOTIFICATIONS TAB ═══ */}
                        {activeTab === 'notifications' && (
                            <div>
                                <h3 className="text-xl font-black text-black mb-1">Notifications</h3>
                                <p className="text-sm text-gray-500 font-medium mb-8">Configure reminders and alerts.</p>

                                <div className="flex flex-col items-center justify-center py-16 text-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <span className="text-3xl">🔔</span>
                                    </div>
                                    <p className="text-lg font-black text-gray-800 mb-1">Coming Soon</p>
                                    <p className="text-sm text-gray-500 font-medium max-w-sm">
                                        Push notifications, email reminders, and daily digest settings will be available here.
                                    </p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-6 flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <p className="text-red-600 text-sm font-bold">{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-violet-600 transition-colors"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        Reset to defaults
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onSkip}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                'Save Preferences'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
// ═══════════════════════════════════════════════════════════════════════════════
// AGENT TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const AGENT_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'add_task',
            description: "Add a new task or study session to the student's schedule. Always gather title, date, start time, and end time before calling. Ask one or two questions at a time if info is missing — never assume times.",
            parameters: {
                type: 'object',
                properties: {
                    title:     { type: 'string', description: 'Short descriptive task title e.g. "Math revision", "Physics chapter 4"' },
                    date:      { type: 'string', description: 'ISO date in "yyyy-MM-dd" format e.g. "2026-07-10"' },
                    startTime: { type: 'string', description: 'Start time in 24-hr HH:MM format e.g. "09:00", "14:30"' },
                    endTime:   { type: 'string', description: 'End time in 24-hr HH:MM format e.g. "10:00", "16:00"' },
                    notes:     { type: 'string', description: 'Optional extra notes or reminders for the task' },
                },
                required: ['title', 'date', 'startTime', 'endTime'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'edit_task',
            description: "Edit an existing task — change its title, date, start time, end time, or notes. Confirm new details with the student before calling. Only use IDs from the task list in the system prompt.",
            parameters: {
                type: 'object',
                properties: {
                    taskId:    { type: 'string', description: 'The unique ID of the task to edit' },
                    title:     { type: 'string', description: 'New title for the task' },
                    date:      { type: 'string', description: 'ISO date in "yyyy-MM-dd" format' },
                    startTime: { type: 'string', description: 'New start time in 24-hr HH:MM format' },
                    endTime:   { type: 'string', description: 'New end time in 24-hr HH:MM format' },
                    notes:     { type: 'string', description: 'Updated notes (optional)' },
                },
                required: ['taskId', 'title', 'date', 'startTime', 'endTime'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_task',
            description: "Delete an existing task from the student's schedule. Confirm with the student before calling. Only use IDs from the task list in the system prompt.",
            parameters: {
                type: 'object',
                properties: {
                    taskId:    { type: 'string', description: 'The unique ID of the task to delete' },
                    taskTitle: { type: 'string', description: 'Title of the task (used to confirm with student)' },
                },
                required: ['taskId', 'taskTitle'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'mark_task_complete',
            description: 'Toggle a task as complete or incomplete.',
            parameters: {
                type: 'object',
                properties: {
                    taskId:    { type: 'string', description: 'The unique ID of the task' },
                    taskTitle: { type: 'string', description: 'Title of the task for reference' },
                },
                required: ['taskId', 'taskTitle'],
            },
        },
    },
]

// ═══════════════════════════════════════════════════════════════════════════════
// VOICE INPUT BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

function VoiceInputButton({ onTranscript, disabled }) {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript]   = useState('')
    const [unsupported, setUnsupported] = useState(false)
    const recognitionRef                = useRef(null)

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) { setUnsupported(true); return }
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-IN'
        recognition.interimResults = true
        recognition.continuous = false
        recognition.onresult = (e) => {
            const current = Array.from(e.results).map(r => r[0].transcript).join('')
            setTranscript(current)
        }
        recognition.onerror = () => { setIsListening(false); setTranscript('') }
        recognitionRef.current = recognition
        recognition.start()
        setIsListening(true)
        setTranscript('')
    }

    const handleConfirm = () => {
        if (transcript.trim()) onTranscript(transcript.trim())
        handleCancel()
    }

    const handleCancel = () => {
        recognitionRef.current?.stop()
        setIsListening(false)
        setTranscript('')
    }

    if (unsupported) return <span className="text-[10px] text-gray-400 px-1">Voice N/A</span>

    if (isListening) {
        return (
            <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5 px-1">
                    {[0,1,2,3,4].map(i => (
                        <span
                            key={i}
                            className="w-0.5 bg-violet-500 rounded-full animate-pulse"
                            style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }}
                        />
                    ))}
                </div>
                <button onClick={handleCancel} className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors" title="Cancel">
                    <XMarkIcon className="w-3 h-3" />
                </button>
                <button onClick={handleConfirm} className="w-5 h-5 rounded-full bg-green-100 hover:bg-green-200 text-green-600 flex items-center justify-center transition-colors" title="Use this text">
                    <CheckIcon className="w-3 h-3" />
                </button>
            </div>
        )
    }

    return (
        <button onClick={startListening} disabled={disabled} className="text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-40 flex-shrink-0" title="Voice input">
            <MicrophoneIcon className="w-4 h-4" />
        </button>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI CHATBUDDY
// ═══════════════════════════════════════════════════════════════════════════════

function MiniChatBuddy({ user, tasksByDate, setTasksByDate, upcomingExams, activeDate, weekDates, onClose, onTaskChanged, onOpenChatBuddy }) {
    const CRISIS_KEYWORDS = [
        'suicide', 'kill myself', 'end my life', 'want to die',
        'self harm', 'self-harm', 'hurt myself', 'no reason to live',
        'want to disappear', 'better off dead', 'cant go on', "can't go on",
        'give up on life', 'not worth living', 'ending it all',
    ]
    const [messages, setMessages]         = useState([])
    const [inputMessage, setInputMessage] = useState('')
    const [isLoading, setIsLoading]       = useState(false)

    const agentHistoryRef = useRef([])
    const messagesEndRef  = useRef(null)
    const inputRef        = useRef(null)

    const buildSystemPrompt = () => {
        const weekTasksSummary = weekDates
            .map(date => {
                const dateTasks = tasksByDate[date] || []
                if (!dateTasks.length) return null
                const lines = dateTasks.map(t =>
                    `    • [ID:${t.id}] "${t.title}" ${t.startTime}–${t.endTime}${t.completed ? ' ✓' : ''}`
                ).join('\n')
                return `  ${dayLabel(date)}, ${shortDateLabel(date)} (${date}):\n${lines}`
            })
            .filter(Boolean)
            .join('\n')

        const examsSummary = upcomingExams?.length
            ? upcomingExams.map(e =>
                `  • ${e.subjectName} in ${e.daysRemaining} day(s) [${e.urgency}]`
              ).join('\n')
            : '  None'

        return `You are a smart, friendly Schedule Agent for a student learning platform called MyMercurie.
Your job is to help the student manage their study schedule through conversation.

STUDENT INFO:
  Name: ${user?.firstName || 'Student'} ${user?.lastName || ''}
  Student ID: ${user?.id}
  Currently viewing: ${dayLabel(activeDate)}, ${shortDateLabel(activeDate)} (${activeDate})

THIS WEEK'S TASKS:
${weekTasksSummary || '  No tasks scheduled yet'}

UPCOMING EXAMS:
${examsSummary}

YOUR BEHAVIOUR:
1. Be warm, encouraging, and concise. Use emojis sparingly.
2. When the student wants to ADD a task, gather title, date, start time, and end time — then IMMEDIATELY call add_task. Do NOT ask for confirmation. Do NOT say "just to confirm". Do NOT repeat the details back and ask "is that correct?". Just call the tool.
3. If the student doesn't mention a date, assume they mean the date currently being viewed (${activeDate}) unless they say "tomorrow", a weekday name, or another date.
4. If the student gives partial info like "add Math at 3pm for 1 hour", infer endTime = 16:00 yourself and call add_task immediately without confirming.
5. If the student says "yes", "yes add", "proceed", "go ahead", or any affirmative — you already have all the info. CALL THE TOOL IMMEDIATELY. Never ask again.
6. When the student wants to DELETE a task, identify it from the task list, then call delete_task immediately. No confirmation needed.
7. When the student wants to EDIT a task, ask only what changed, then call edit_task immediately.
8. When marking complete, identify the task and call mark_task_complete immediately.
9. For queries like "what's on my schedule" or "am I on track", answer directly from the task list — no tool needed.
10. IMPORTANT: If the student sends ANY emotional message, expresses stress, sadness, anxiety, loneliness, crisis, or any personal or mental health concern — DO NOT engage with it. Simply say: "I'm only able to help with your schedule here 😊 Please head over to ChatBuddy for support — opening it for you now! 💙" and stop. The app will automatically open ChatBuddy.
11. IMPORTANT: If the student asks any general knowledge or subject question — DO NOT answer it. Say: "That's a great question! Head over to ChatBuddy for subject help — I only manage your schedule here 😊"
12. NEVER provide emotional support, crisis response, mental health advice, or academic tutoring. Always redirect non-schedule topics to ChatBuddy.
13. After any schedule action, briefly confirm what was done and offer to help further.
14. Always use 24-hour format (HH:MM) when calling tools, and ISO "yyyy-MM-dd" format for dates.
15. Never make up task IDs — only use IDs from the task list above.
16. Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
17. CRITICAL: Once you have title + date + startTime + endTime, call the tool. Period. No more questions.`
    }

    const buildWelcomeMessage = () => {
        const activeTasks    = tasksByDate[activeDate] || []
        const completedCount = activeTasks.filter(t => t.completed).length
        const totalCount     = activeTasks.length
        const nearestExam    = upcomingExams?.[0]
        const label          = `${dayLabel(activeDate)}, ${shortDateLabel(activeDate)}`

        let msg = `Hi **${user?.firstName || 'there'}**! 👋 I'm your Schedule Assistant.\n\n`

        if (totalCount > 0) {
            msg += `📅 You have **${totalCount} task${totalCount > 1 ? 's' : ''}** planned for ${label}`
            if (completedCount > 0) msg += ` and you've completed **${completedCount}** — great work!`
            else msg += ` and none completed yet.`
            msg += '\n\n'
        } else {
            msg += `📅 You have **no tasks planned** for ${label} yet.\n\n`
        }

        if (nearestExam) {
            msg += `📝 Your **${nearestExam.subjectName}** exam is in **${nearestExam.daysRemaining} day${nearestExam.daysRemaining === 1 ? '' : 's'}**`
            if (nearestExam.urgency === 'URGENT') msg += ` — coming up soon!`
            msg += '\n\n'
        }

        msg += `I can **add**, **edit**, **delete**, or **complete** tasks — or just tell you about your week. What would you like to do?`
        return msg
    }

    useEffect(() => {
        agentHistoryRef.current = [{ role: 'system', content: buildSystemPrompt() }]
        setMessages([{ id: 'welcome', role: 'assistant', content: buildWelcomeMessage() }])
        inputRef.current?.focus()
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    const logTurnToBackend = useCallback(async (userText, assistantText) => {
        try {
            await chatService.logScheduleMessage(userText, assistantText)
        } catch (err) {
            console.warn('Schedule Assistant: failed to log message:', err.message)
        }
    }, [])

    const executeTool = async (toolName, toolInput) => {
        try {
            switch (toolName) {
                case 'add_task': {
                    const result = await addTask(user.id, toolInput.date, toolInput.title, toolInput.startTime, toolInput.endTime, toolInput.notes || '')
                    setTasksByDate(prev => ({
                        ...prev,
                        [toolInput.date]: [...(prev[toolInput.date] || []), { ...result, completed: false }]
                    }))
                    onTaskChanged?.()
                    return { success: true, message: `Task "${toolInput.title}" added on ${toolInput.date} from ${toolInput.startTime} to ${toolInput.endTime}.`, task: result }
                }
                case 'edit_task': {
                    const result = await editTask(toolInput.taskId, user.id, toolInput.date, toolInput.title, toolInput.startTime, toolInput.endTime, toolInput.notes || '')
                    setTasksByDate(prev => ({
                        ...prev,
                        [toolInput.date]: (prev[toolInput.date] || []).map(t =>
                            t.id === toolInput.taskId ? { ...t, ...result } : t
                        )
                    }))
                    onTaskChanged?.()
                    return { success: true, message: `Task updated to "${toolInput.title}" on ${toolInput.date} from ${toolInput.startTime} to ${toolInput.endTime}.`, task: result }
                }
                case 'delete_task': {
                    await deleteTask(toolInput.taskId)
                    setTasksByDate(prev => {
                        const updated = {}
                        for (const date of Object.keys(prev)) {
                            updated[date] = prev[date].filter(t => t.id !== toolInput.taskId)
                        }
                        return updated
                    })
                    onTaskChanged?.()
                    return { success: true, message: `Task "${toolInput.taskTitle}" has been deleted.` }
                }
                case 'mark_task_complete': {
                    const result = await toggleTaskComplete(toolInput.taskId)
                    setTasksByDate(prev => {
                        const updated = {}
                        for (const date of Object.keys(prev)) {
                            updated[date] = prev[date].map(t =>
                                t.id === toolInput.taskId
                                    ? { ...t, completed: result.completed }
                                    : t
                            )
                        }
                        return updated
                    })
                    onTaskChanged?.()
                    return { success: true, message: `Task "${toolInput.taskTitle}" completion status toggled.`, task: result }
                }
                default:
                    return { success: false, error: `Unknown tool: ${toolName}` }
            }
        } catch (err) {
            return { success: false, error: err?.message || 'Action failed. Please try again.' }
        }
    }

    const runAgentLoop = async (history, userText) => {
        let currentHistory    = history
        const MAX_ITERATIONS  = 6
        let lastAssistantText = ''

        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const response = await apiRequest('/api/agent/chat', {
                method: 'POST',
                body: JSON.stringify({
                    model:       'gpt-4o',
                    messages:    currentHistory,
                    tools:       AGENT_TOOLS,
                    tool_choice: 'auto',
                    max_tokens:  1024,
                }),
            })

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}))
                throw new Error(errBody?.error?.message || 'Agent request failed')
            }

            const data = await response.json().catch(() => {
                throw new Error('Response was too large or was cut off. Please try a shorter question.')
            })

            const choice  = data.choices?.[0]
            const message = choice?.message

            if (message?.content?.trim()) {
                lastAssistantText = message.content.trim()
                setMessages(prev => [...prev, {
                    id:      `a-${Date.now()}-${i}`,
                    role:    'assistant',
                    content: lastAssistantText,
                }])
            }

            if (!message?.tool_calls?.length || choice?.finish_reason === 'stop') {
                agentHistoryRef.current = [
                    ...currentHistory,
                    { role: 'assistant', content: message.content || '' }
                ]
                if (lastAssistantText) {
                    logTurnToBackend(userText, lastAssistantText)
                }
                break
            }

            currentHistory = [
                ...currentHistory,
                {
                    role:       'assistant',
                    content:    message.content || '',
                    tool_calls: message.tool_calls,
                },
            ]

            for (const toolCall of message.tool_calls) {
                const toolName  = toolCall.function.name
                const toolInput = JSON.parse(toolCall.function.arguments)
                const result    = await executeTool(toolName, toolInput)

                currentHistory = [
                    ...currentHistory,
                    {
                        role:         'tool',
                        tool_call_id: toolCall.id,
                        content:      JSON.stringify(result),
                    },
                ]
            }

            agentHistoryRef.current = currentHistory
        }
    }

    const handleSend = async () => {
        const text = inputMessage.trim()
        if (!text || isLoading) return

        const lower = text.toLowerCase()
        const isCrisis = CRISIS_KEYWORDS.some(kw => lower.includes(kw))
        if (isCrisis) {
            setInputMessage('')
            onClose()
            onOpenChatBuddy?.(text)
            return
        }

        const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text }
        setMessages(prev => [...prev, userMsg])
        setInputMessage('')
        setIsLoading(true)

        const newHistory = [
            ...agentHistoryRef.current,
            { role: 'user', content: text },
        ]

        try {
            await runAgentLoop(newHistory, text)
        } catch (err) {
            setMessages(prev => [...prev, {
                id:      `err-${Date.now()}`,
                role:    'assistant',
                content: `Sorry, something went wrong: ${err.message || 'Please try again.'}`,
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleVoiceTranscript = (text) => {
        setInputMessage(prev => prev ? `${prev} ${text}` : text)
        inputRef.current?.focus()
    }

    const QUICK_CHIPS = [
        'What should I study today?',
        'Add a task for me',
        'Am I on track this week?',
        'Help me plan my evening',
    ]

    return (
        <div
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl border border-violet-100 shadow-2xl flex flex-col overflow-hidden"
            style={{ height: '480px', maxHeight: 'calc(100vh - 120px)' }}
        >
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <SparklesIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-black text-sm">Schedule Assistant</p>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                            <p className="text-violet-200 text-[10px] font-medium">Online · AI Agent</p>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <XMarkIcon className="w-4 h-4 text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/40">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                                <SparklesIcon className="w-3.5 h-3.5 text-violet-600" />
                            </div>
                        )}
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-violet-600 text-white rounded-br-sm shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                        }`}>
                            {msg.role === 'assistant' ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p:      ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                        ul:     ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                                        ol:     ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
                                        li:     ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
                                        strong: ({ children }) => <strong className="font-black text-gray-900">{children}</strong>,
                                    }}
                                >{msg.content}</ReactMarkdown>
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                            <SparklesIcon className="w-3.5 h-3.5 text-violet-600" />
                        </div>
                        <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1 shadow-sm">
                            {[0, 1, 2].map(i => (
                                <span key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-2 border-t border-gray-100 bg-white flex-shrink-0">
                <div className="flex flex-wrap gap-1.5">
                    {QUICK_CHIPS.map(chip => (
                        <button
                            key={chip}
                            onClick={() => setInputMessage(chip)}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-[10px] font-bold hover:bg-violet-100 transition-colors disabled:opacity-50"
                        >
                            {chip}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                <div className="flex gap-2 items-end">
                    <div className="flex-1 flex items-center border-2 border-gray-100 focus-within:border-violet-300 rounded-xl px-3 py-2 bg-white gap-2 transition-colors">
                        <textarea
                            ref={inputRef}
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your schedule…"
                            rows={1}
                            disabled={isLoading}
                            className="flex-1 resize-none focus:outline-none bg-transparent text-xs text-gray-800 placeholder-gray-400 max-h-20 disabled:opacity-60"
                            style={{ fieldSizing: 'content' }}
                        />
                        <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={isLoading} />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !inputMessage.trim()}
                        className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white rounded-xl px-3 py-2.5 transition-colors flex items-center shadow-sm shrink-0"
                    >
                        {isLoading
                            ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            : <PaperAirplaneIcon className="w-4 h-4" />
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}
// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCHEDULE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Schedule({ tasks, setTasks, activeDay, setActiveDay, user, onOpenChatBuddy, onXpEarned }) {

    const tasksByDate    = tasks
    const setTasksByDate = setTasks
    const activeDate     = activeDay || todayISO()
    const setActiveDate  = setActiveDay

    const [viewMonth, setViewMonth] = useState(() => firstOfMonth(new Date()))
    const [scheduleView, setScheduleView] = useState('day')
    const [showEarlyMorning, setShowEarlyMorning] = useState(false)
    const [showLateNight, setShowLateNight] = useState(false)
    const calendarCells = useMemo(() => monthGridDates(viewMonth), [viewMonth])
    const contextWeekDates = useMemo(
        () => weekDatesFrom(mondayOf(new Date(activeDate + 'T00:00:00'))),
        [activeDate]
    )

    const [showAddTask, setShowAddTask]               = useState(false)
    const [newTask, setNewTask]                       = useState({ startTime: '09:00', endTime: '10:00', title: '', notes: '' })
    const [overlapError, setOverlapError]             = useState('')
    const [showPushModal, setShowPushModal]           = useState(false)
    const [pushNonConflicts, setPushNonConflicts]     = useState([])
    const [pushConflicts, setPushConflicts]           = useState([])
    const [conflictTimes, setConflictTimes]           = useState({})
    const [pushError, setPushError]                   = useState('')
    const [expandedTask, setExpandedTask]             = useState(null)
    const [editingTask, setEditingTask]               = useState(null)
    const [editData, setEditData]                     = useState({})
    const [editError, setEditError]                   = useState('')
    const [addWarnings, setAddWarnings]               = useState([])
    const [editWarnings, setEditWarnings]             = useState([])
    const [dayWarnings, setDayWarnings]               = useState([])
    const [isSaving, setIsSaving]                     = useState(false)

    const [blockedWindows, setBlockedWindows]         = useState([])
    const [busySlotBlocks, setBusySlotBlocks]         = useState([])
    const [upcomingExams, setUpcomingExams]           = useState([])
    const [suggestions, setSuggestions]               = useState([])
    const [recsLoading, setRecsLoading]               = useState(false)
    const [recsTrigger, setRecsTrigger]               = useState(0)
    const [suggestionStates, setSuggestionStates]     = useState({})
    const [suggestionTimePicker, setSuggestionTimePicker] = useState(null)
    const [showRecModal, setShowRecModal]             = useState(false)
    const [recModalData, setRecModalData]             = useState({
        taskType: '',
        originalTitle: '',
        titleInput: '',
        subjectSelect: 'Mathematics',
        startTime: '15:00',
        endTime: '15:45',
        notes: '',
        error: '',
        warnings: []
    })
    const [successMessage, setSuccessMessage]         = useState('')
    const [showConfirmModal, setShowConfirmModal]     = useState(false)
    const [confirmModalConfig, setConfirmModalConfig] = useState({
        title: '', message: '', confirmText: '', confirmBg: '', onConfirm: () => {}
    })
    const [showWarningModal, setShowWarningModal]     = useState(false)
    const [warningModalMessage, setWarningModalMessage] = useState('')

    const [prefStatus, setPrefStatus]                 = useState('checking')
    const [preferredStudyTime, setPreferredStudyTime] = useState(null)
    const [cachedPrefs, setCachedPrefs]               = useState(null)
    const [showEditPrefs, setShowEditPrefs]           = useState(false)
    const [showMiniChat, setShowMiniChat]             = useState(false)

    const roundUpTo15 = (mins) => Math.ceil(mins / 15) * 15
    const [currentTimeMins, setCurrentTimeMins] = useState(() => {
        const now = new Date(); return roundUpTo15(now.getHours() * 60 + now.getMinutes())
    })

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date(); setCurrentTimeMins(roundUpTo15(now.getHours() * 60 + now.getMinutes()))
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!user?.id) return
        getPreferences(user.id)
            .then(data => {
                const hasPrefs = data?.preferredStudyTime
                if (hasPrefs) {
                    setPreferredStudyTime(data.preferredStudyTime)
                    setCachedPrefs({ preferredStudyTime: data.preferredStudyTime, busySlots: data.busySlots || [] })
                    setPrefStatus('ready')
                    setRecsTrigger(t => t + 1)
                } else {
                    setPrefStatus('first-time')
                }
            })
            .catch(() => {
                setPrefStatus('ready')
                setRecsTrigger(t => t + 1)
            })
    }, [user?.id])

    const handleFirstTimeComplete = (savedPrefs) => {
        setPreferredStudyTime(savedPrefs.preferredStudyTime)
        setCachedPrefs(savedPrefs)
        setPrefStatus('ready')
        setActiveDate(todayISO())
        setRecsTrigger(t => t + 1)
    }

    const handleFirstTimeSkip = () => {
        setPrefStatus('ready')
        setRecsTrigger(t => t + 1)
    }

    const handleEditPrefsComplete = (savedPrefs) => {
        setPreferredStudyTime(savedPrefs.preferredStudyTime)
        setCachedPrefs(savedPrefs)
        setShowEditPrefs(false)
        setRecsTrigger(t => t + 1)
    }

    const isPastDay   = (iso) => iso < todayISO()
    const isTodayDay  = (iso) => iso === todayISO()

    useEffect(() => {
        if (!user?.id || prefStatus !== 'ready') return
        let cancelled = false
        const monthsNeeded = new Set(calendarCells.map(c => c.iso.slice(0, 7)))
        const fetches = Array.from(monthsNeeded).map(ym => {
            const [y, m] = ym.split('-').map(Number)
            return getMonthTasks(user.id, y, m).catch(() => ({}))
        })
        Promise.all(fetches).then(results => {
            if (cancelled) return
            const merged = Object.assign({}, ...results)
            setTasksByDate(prev => ({ ...prev, ...merged }))
        })
        return () => { cancelled = true }
    }, [user?.id, viewMonth, prefStatus])

    useEffect(() => {
        if (!user?.id || prefStatus !== 'ready') return
        setRecsLoading(true)
        getRecommendations(user.id, activeDate)
            .then(data => {
                setBlockedWindows(data?.blockedWindows || [])
                setBusySlotBlocks(data?.busySlots || [])
                setUpcomingExams(data?.upcomingExams || [])
                setPreferredStudyTime(data?.preferredStudyTime || null)
                setSuggestions(isPastDay(activeDate) ? [] : (data?.suggestions || []))
                setSuggestionStates({}); setSuggestionTimePicker(null)
            })
            .catch(() => { setBlockedWindows([]); setBusySlotBlocks([]); setUpcomingExams([]); setSuggestions([]) })
            .finally(() => setRecsLoading(false))
    }, [user?.id, activeDate, recsTrigger, prefStatus])

    const normaliseTask = (task) => {
        if (task.startTime) return task
        const raw = task.time || ''; const match = raw.match(/(\d+):(\d+)\s*(AM|PM)?/i)
        if (!match) return { ...task, startTime: '00:00', endTime: '01:00' }
        let h = parseInt(match[1]); const m = match[2]; const ap = (match[3] || '').toUpperCase()
        if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0
        return { ...task, startTime: `${String(h).padStart(2,'0')}:${m}`, endTime: `${String((h+1)%24).padStart(2,'0')}:${m}` }
    }

    const toMins  = (t) => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m }
    const fmtTime = (t) => {
        if (!t) return ''
        const [h,m] = t.split(':').map(Number)
        const period = h >= 12 ? 'PM' : 'AM'
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
        return `${displayH}:${String(m).padStart(2,'0')} ${period}`
    }
    const getDur  = (s,e) => { const d = toMins(e)-toMins(s); if(d<=0) return ''; const h=Math.floor(d/60),m=d%60; return h&&m?`${h}h ${m}m`:h?`${h}h`:`${m}m` }

    const hasOverlap = useCallback((date,s,e,excl=null) =>
        (tasksByDate[date] || []).some(r => { const t = normaliseTask(r); if(t.id===excl) return false; return toMins(s)<toMins(t.endTime)&&toMins(e)>toMins(t.startTime) }),
    [tasksByDate])

    const isBlockedBySchool = useCallback((s,e) => {
        const schoolBlocked = blockedWindows.some(w => toMins(s)<toMins(w.endTime)&&toMins(e)>toMins(w.startTime))
        const busyBlocked   = busySlotBlocks.some(b => toMins(s)<toMins(b.endTime)&&toMins(e)>toMins(b.startTime))
        return schoolBlocked || busyBlocked
    }, [blockedWindows, busySlotBlocks])

    const isOverdue = (t) => {
        if (t.completed) return false
        if (isPastDay(activeDate)) return true
        if (isTodayDay(activeDate)) { const n = new Date(); return toMins(t.endTime) < n.getHours()*60+n.getMinutes() }
        return false
    }

    const getMaxDailyStudyMins = (className, weekend) => {
        if (!className) return 120
        const match = className.match(/(\d{1,2})/); const n = match ? parseInt(match[1]) : 8
        const caps = weekend ? [[2,90],[4,120],[6,180],[8,240],[10,300],[12,360]] : [[2,60],[4,90],[6,120],[8,180],[10,240],[12,300]]
        for (const [max,mins] of caps) if (n<=max) return mins; return 300
    }

    const activeDayIsLocked = isPastDay(activeDate)
    const normTasks  = useMemo(
        () => (tasksByDate[activeDate] || []).map(normaliseTask),
        [tasksByDate, activeDate]
    )
    const totalT     = normTasks.length
    const doneT      = normTasks.filter(t => t.completed).length
    const pct        = totalT > 0 ? Math.round((doneT/totalT)*100) : 0
    const incomplete = (tasksByDate[activeDate] || []).filter(t => !t.completed).length
    const sorted     = useMemo(
        () => [...normTasks].sort((a,b) => a.startTime.localeCompare(b.startTime)),
        [normTasks]
    )
    const tMins      = normTasks.reduce((a,t) => { const d = toMins(t.endTime)-toMins(t.startTime); return a+(d>0?d:0) }, 0)
    const tHrs       = Math.floor(tMins/60)
    const tMin       = tMins % 60
    const nextDate   = toISO(addDays(new Date(activeDate + 'T00:00:00'), 1))
    const maxDailyStudyMins = getMaxDailyStudyMins(user?.className, isWeekendISO(activeDate))

    // Aggregate stats for progress donut
    const progressStats = useMemo(() => {
        const studyMins = normTasks.filter(t => t.detectedType?.toLowerCase() === 'study')
            .reduce((a, t) => a + Math.max(0, toMins(t.endTime) - toMins(t.startTime)), 0)
        const wellnessMins = normTasks.filter(t => t.detectedType?.toLowerCase() === 'wellness')
            .reduce((a, t) => a + Math.max(0, toMins(t.endTime) - toMins(t.startTime)), 0)
        const otherMins = normTasks.filter(t => {
            const type = t.detectedType?.toLowerCase()
            return type !== 'study' && type !== 'wellness'
        }).reduce((a, t) => a + Math.max(0, toMins(t.endTime) - toMins(t.startTime)), 0)

        const fmt = (m) => {
            const h = Math.floor(m / 60), mm = m % 60
            if (h && mm) return `${h}h ${mm}m`
            if (h) return `${h}h`
            return `${mm}m`
        }
        return {
            studyLabel: fmt(studyMins) || '0m',
            wellnessLabel: fmt(wellnessMins) || '0m',
            otherLabel: fmt(otherMins) || '0m',
            studyCount: normTasks.filter(t => t.detectedType?.toLowerCase() === 'study').length,
            wellnessCount: normTasks.filter(t => t.detectedType?.toLowerCase() === 'wellness').length,
            otherCount: normTasks.filter(t => {
                const type = t.detectedType?.toLowerCase()
                return type !== 'study' && type !== 'wellness'
            }).length,
        }
    }, [normTasks])

    const urgencyColors = {
        URGENT:  'bg-red-100 text-red-700 border-red-200',
        UPCOMING:'bg-yellow-100 text-yellow-700 border-yellow-200',
        NORMAL:  'bg-green-100 text-green-700 border-green-200',
    }
    const suggestionTypeStyle = {
        STUDY:   { badge: 'bg-blue-100 text-blue-700 border-blue-200' },
        WELLNESS:{ badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        INTERVENTION: { badge: 'bg-purple-100 text-purple-700 border-purple-200' },
        OTHER:   { badge: 'bg-violet-100 text-violet-700 border-violet-200' },
    }
    const getSuggestionStyle = (taskType) => suggestionTypeStyle[taskType] || suggestionTypeStyle.OTHER

    const findFreeSlot = useCallback((durationMins, taskType='STUDY') => {
        const existing = [...normTasks].sort((a,b) => toMins(a.startTime)-toMins(b.startTime))
        const allBlocks = [
            ...existing,
            ...blockedWindows.map(w => ({startTime:w.startTime,endTime:w.endTime,detectedType:'school'})),
            ...busySlotBlocks.map(b => ({startTime:b.startTime,endTime:b.endTime,detectedType:'busy'})),
        ].sort((a,b) => toMins(a.startTime)-toMins(b.startTime))
        const prefWindows = { MORNING:[6,12], AFTERNOON:[12,17], EVENING:[17,21], NIGHT:[21,23] }
        const prefWindow  = preferredStudyTime ? prefWindows[preferredStudyTime] : null
        const dayStartMins = isTodayDay(activeDate) ? currentTimeMins : 6*60
        const tryFindSlot = (searchStart, searchEnd) => {
            for (let startMins = Math.max(searchStart,dayStartMins); startMins <= searchEnd-durationMins; startMins += 15) {
                const endMins   = startMins + durationMins
                const startTime = `${String(Math.floor(startMins/60)).padStart(2,'0')}:${String(startMins%60).padStart(2,'0')}`
                const endTime   = `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`
                if (isBlockedBySchool(startTime,endTime)) continue
                if (hasOverlap(activeDate,startTime,endTime)) continue
                if (taskType === 'STUDY') {
                    const studyBlocks = allBlocks.filter(t => t.detectedType?.toLowerCase()==='study')
                    const tooClose = studyBlocks.some(t => {
                        const gapAfter  = toMins(startTime)-toMins(t.endTime)
                        const gapBefore = toMins(t.startTime)-toMins(endTime)
                        return (gapAfter>=0&&gapAfter<10)||(gapBefore>=0&&gapBefore<10)
                    })
                    if (tooClose) continue
                }
                return { startTime, endTime }
            }
            return null
        }
        if (prefWindow) { const slot = tryFindSlot(prefWindow[0]*60, prefWindow[1]*60); if (slot) return slot }
        return tryFindSlot(dayStartMins, 22*60)
    }, [normTasks, blockedWindows, busySlotBlocks, activeDate, currentTimeMins, preferredStudyTime, hasOverlap, isBlockedBySchool])

    const handleRecommendationClick = (suggestion) => {
        if (activeDayIsLocked) return
        const durationMins = suggestion.estimatedMinutes || 30
        const slot = findFreeSlot(durationMins, suggestion.taskType) || { startTime: '15:00', endTime: '15:45' }

        let titleInputVal = suggestion.title
        if (suggestion.taskType === 'STUDY') {
            titleInputVal = ''
        } else if (suggestion.taskType === 'WELLNESS' && suggestion.title === 'Relax') {
            titleInputVal = ''
        }

        const matchedWellnessOption = suggestion.taskType === 'WELLNESS'
            ? WELLNESS_ACTIVITY_OPTIONS.find(o => o.toLowerCase() === suggestion.title?.toLowerCase())
            : null
        const matchedOtherOption = suggestion.taskType !== 'STUDY' && suggestion.taskType !== 'WELLNESS'
            ? OTHER_ACTIVITY_OPTIONS.find(o => o.toLowerCase() === suggestion.title?.toLowerCase())
            : null

        let defaultSubjectSelect = 'Mathematics'
        if (suggestion.taskType === 'WELLNESS') {
            defaultSubjectSelect = matchedWellnessOption || WELLNESS_ACTIVITY_OPTIONS[WELLNESS_ACTIVITY_OPTIONS.length - 1]
        } else if (suggestion.taskType !== 'STUDY') {
            defaultSubjectSelect = matchedOtherOption || OTHER_ACTIVITY_OPTIONS[0]
        }

        setRecModalData({
            taskType: suggestion.taskType,
            originalTitle: suggestion.title,
            titleInput: titleInputVal,
            subjectSelect: defaultSubjectSelect,
            startTime: slot.startTime,
            endTime: slot.endTime,
            notes: '',
            error: '',
            warnings: []
        })
        setShowRecModal(true)
    }

    const saveRecommendationTask = async () => {
        if (activeDayIsLocked) return
        setRecModalData(p => ({ ...p, error: '', warnings: [] }))

        let finalTitle = ''
        if (recModalData.taskType === 'STUDY') {
            const subject = recModalData.subjectSelect === 'Other' ? recModalData.titleInput : recModalData.subjectSelect
            if (!subject || !subject.trim()) {
                setRecModalData(p => ({ ...p, error: 'Please enter or select a subject.' }))
                return
            }
            finalTitle = `Study session - ${subject.trim()}`
        } else if (recModalData.taskType === 'WELLNESS') {
            const isOther = recModalData.subjectSelect === 'Other (Custom Activity)'
            const activity = isOther ? recModalData.titleInput : recModalData.subjectSelect
            if (!activity || !activity.trim()) {
                setRecModalData(p => ({ ...p, error: isOther ? 'Please enter a relaxing activity name.' : 'Please select an activity.' }))
                return
            }
            finalTitle = activity.trim()
        } else {
            const isOtherCustom = recModalData.subjectSelect === 'Other (Custom Activity)'
            const activity = isOtherCustom ? recModalData.titleInput : recModalData.subjectSelect
            if (!activity || !activity.trim()) {
                setRecModalData(p => ({ ...p, error: isOtherCustom ? 'Please enter the activity name.' : 'Please select an activity.' }))
                return
            }
            finalTitle = activity.trim()
        }

        const { startTime, endTime, notes } = recModalData
        if (toMins(endTime) <= toMins(startTime)) {
            setRecModalData(p => ({ ...p, error: 'End time must be after start time.' }))
            return
        }
        if (isBlockedBySchool(startTime, endTime)) {
            setRecModalData(p => ({ ...p, error: 'This time slot is blocked.' }))
            return
        }
        if (hasOverlap(activeDate, startTime, endTime)) {
            setRecModalData(p => ({ ...p, error: 'This slot overlaps with another task.' }))
            return
        }

        setIsSaving(true)
        try {
            const saved = await addTask(user.id, activeDate, finalTitle, startTime, endTime, notes, recModalData.taskType)
            setTasksByDate(prev => ({ ...prev, [activeDate]: [...(prev[activeDate] || []), { ...saved, completed: false }] }))
            setShowRecModal(false)
            setSuccessMessage("Activity added successfully!")
            setTimeout(() => setSuccessMessage(''), 3000)
            if (saved.warnings?.length > 0) {
                setDayWarnings(saved.warnings)
                setTimeout(() => setDayWarnings([]), 6000)
            }
            setTimeout(() => setRecsTrigger(t => t + 1), 400)
        } catch (err) {
            setRecModalData(p => ({ ...p, error: err.message || 'Could not save task.' }))
        } finally {
            setIsSaving(false)
        }
    }

    const handleAdd = async () => {
        if (activeDayIsLocked) return; setOverlapError(''); setAddWarnings([])
        if (!newTask.title||!newTask.startTime||!newTask.endTime) return
        if (toMins(newTask.endTime)<=toMins(newTask.startTime)) { setOverlapError('End time must be after start time.'); return }
        if (isBlockedBySchool(newTask.startTime,newTask.endTime)) { setOverlapError('This time slot is blocked.'); return }
        if (hasOverlap(activeDate, newTask.startTime, newTask.endTime)) { setOverlapError('This slot overlaps with another task.'); return }
        setIsSaving(true)
        try {
            const saved = await addTask(user.id, activeDate, newTask.title, newTask.startTime, newTask.endTime, newTask.notes)
            setTasksByDate(prev => ({...prev,[activeDate]:[...(prev[activeDate] || []),{...saved,completed:false}]}))
            setSuccessMessage("Activity added successfully!")
            setTimeout(() => setSuccessMessage(''), 3000)
            if (saved.warnings?.length>0) {
                setAddWarnings(saved.warnings); setDayWarnings(saved.warnings)
                setTimeout(()=>{ setAddWarnings([]); setShowAddTask(false); setNewTask({startTime:'09:00',endTime:'10:00',title:'',notes:''}) }, 4000)
                setTimeout(()=>setDayWarnings([]), 8000)
            } else { setNewTask({startTime:'09:00',endTime:'10:00',title:'',notes:''}); setShowAddTask(false) }
            setTimeout(()=>setRecsTrigger(t=>t+1), 400)
        } catch (err) { setOverlapError(err.message||'Could not save task.') }
        finally { setIsSaving(false) }
    }

    const handleDelete = (e, id) => {
        e.stopPropagation(); if (activeDayIsLocked) return
        const task = (tasksByDate[activeDate] || []).find(t => String(t.id) === String(id))
        if (!task) return

        setConfirmModalConfig({
            title: 'Delete Task?',
            message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
            confirmText: 'Yes, Delete',
            confirmBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
            onConfirm: async () => {
                try {
                    await deleteTask(id)
                    setTasksByDate(prev => ({...prev,[activeDate]:(prev[activeDate] || []).filter(t=>String(t.id)!==String(id))}))
                    if (expandedTask===id) setExpandedTask(null)
                    setTimeout(()=>setRecsTrigger(t=>t+1), 400)
                } catch (err) { console.error('Delete failed:', err.message) }
                setShowConfirmModal(false)
            }
        })
        setShowConfirmModal(true)
    }

    const toggleDone = async (id) => {
        if (activeDayIsLocked) return
        const task = (tasksByDate[activeDate] || []).find(t => String(t.id) === String(id))
        if (!task) return

        const isFutureDay = activeDate > todayISO()
        const isToday = activeDate === todayISO()
        const now = new Date()
        const currentMins = now.getHours() * 60 + now.getMinutes()
        const taskStartMins = toMins(task.startTime)

        if (isFutureDay || (isToday && currentMins < taskStartMins)) {
            setWarningModalMessage("You cannot mark a task as completed before its scheduled start time.")
            setShowWarningModal(true)
            return
        }

        const willComplete = !task.completed
        setConfirmModalConfig({
            title: willComplete ? 'Complete Task?' : 'Mark Incomplete?',
            message: willComplete
                ? `Are you sure you want to mark "${task.title}" as completed?`
                : `Are you sure you want to mark "${task.title}" as incomplete?`,
            confirmText: willComplete ? 'Yes, Complete' : 'Yes, Incomplete',
            confirmBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
            onConfirm: async () => {
                try {
                    const saved = await toggleTaskComplete(id)
                    setTasksByDate(prev => ({ ...prev, [activeDate]: (prev[activeDate] || []).map(t => String(t.id) === String(id) ? { ...t, completed: saved.completed } : t) }))
                } catch (err) { console.error('Toggle failed:', err.message) }
                setShowConfirmModal(false)
            }
        })
        setShowConfirmModal(true)
    }

    const openEdit = (e, task) => {
        e.stopPropagation(); if (activeDayIsLocked) return
        setEditingTask(task); setEditData({title:task.title,startTime:task.startTime,endTime:task.endTime,notes:task.notes||''})
        setEditError(''); setEditWarnings([])
    }

    const saveEdit = async () => {
        if (activeDayIsLocked) return; setEditError(''); setEditWarnings([])
        if (!editData.title||!editData.startTime||!editData.endTime) return
        if (toMins(editData.endTime)<=toMins(editData.startTime)) { setEditError('End time must be after start time.'); return }
        if (isBlockedBySchool(editData.startTime,editData.endTime)) { setEditError('This slot is blocked.'); return }
        setIsSaving(true)
        try {
            const saved = await editTask(editingTask.id, user.id, activeDate, editData.title, editData.startTime, editData.endTime, editData.notes)
            setTasksByDate(prev => ({...prev,[activeDate]:(prev[activeDate] || []).map(t => t.id===editingTask.id?{...t,...saved}:t)}))
            if (saved.warnings?.length>0) {
                setEditWarnings(saved.warnings); setDayWarnings(saved.warnings)
                setTimeout(()=>{ setEditWarnings([]); setEditingTask(null) }, 4000)
                setTimeout(()=>setDayWarnings([]), 8000)
            } else { setEditingTask(null) }
        } catch (err) { setEditError(err.message||'Could not save changes.') }
        finally { setIsSaving(false) }
    }

    const isValidConflict = (id) => {
        const t = conflictTimes[id]; if (!t) return false
        if (toMins(t.endTime)<=toMins(t.startTime)) return false
        if (hasOverlap(nextDate,t.startTime,t.endTime)) return false
        if (pushNonConflicts.some(x => toMins(t.startTime)<toMins(x.endTime)&&toMins(t.endTime)>toMins(x.startTime))) return false
        if (pushConflicts.some(x => { if(x.id===id) return false; const o=conflictTimes[x.id]; if(!o) return false; return toMins(t.startTime)<toMins(o.endTime)&&toMins(t.endTime)>toMins(o.startTime) })) return false
        return true
    }

    const initPush = () => {
        if (activeDayIsLocked) return
        const inc = (tasksByDate[activeDate] || []).filter(t => !t.completed).map(normaliseTask)
        const nc  = inc.filter(t => !hasOverlap(nextDate,t.startTime,t.endTime))
        const c   = inc.filter(t =>  hasOverlap(nextDate,t.startTime,t.endTime))
        setPushNonConflicts(nc); setPushConflicts(c)
        const init = {}; c.forEach(t => { init[t.id] = {startTime:t.startTime,endTime:t.endTime} })
        setConflictTimes(init); setPushError(''); setShowPushModal(true)
    }

    const doPush = async () => {
        setPushError('')
        for (const t of pushConflicts) {
            if (toMins(conflictTimes[t.id].endTime)<=toMins(conflictTimes[t.id].startTime)) { setPushError(`"${t.title}" has invalid times.`); return }
            if (!isValidConflict(t.id)) { setPushError(`"${t.title}" still conflicts.`); return }
        }
        setIsSaving(true)
        try {
            const moved = []
            for (const t of pushNonConflicts) {
                const saved = await addTask(user.id, nextDate, t.title, t.startTime, t.endTime, t.notes, t.detectedType)
                moved.push({ ...saved, completed: false })
                await deleteTask(t.id)
            }
            for (const t of pushConflicts) {
                const ct = conflictTimes[t.id]
                const saved = await addTask(user.id, nextDate, t.title, ct.startTime, ct.endTime, t.notes, t.detectedType)
                moved.push({ ...saved, completed: false })
                await deleteTask(t.id)
            }
            setTasksByDate(p => ({
                ...p,
                [activeDate]: (p[activeDate] || []).filter(t => t.completed),
                [nextDate]: [...(p[nextDate] || []), ...moved]
            }))
            setShowPushModal(false); setPushNonConflicts([]); setPushConflicts([]); setConflictTimes({}); setPushError('')
            setTimeout(() => setRecsTrigger(t => t + 1), 400)
        } catch (err) {
            setPushError(err.message || 'Failed to push tasks.')
        } finally {
            setIsSaving(false)
        }
    }

    const closePush = () => { setShowPushModal(false); setPushNonConflicts([]); setPushConflicts([]); setConflictTimes({}); setPushError('') }

    // Get task type key for styling
    const getTaskTypeKey = (task) => {
        const raw = task.detectedType?.toLowerCase() || 'other'
        if (raw === 'study') return 'Study'
        if (raw === 'wellness') return 'Wellness'
        if (raw === 'intervention') return 'Intervention'
        return 'Other'
    }

    // Build timeline hours (6 AM - 10 PM)
    const timelineHours = useMemo(() => {
        return Array.from({ length: 17 }, (_, i) => {
            const h = 6 + i
            const period = h >= 12 ? 'PM' : 'AM'
            const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
            return {
                hour: h,
                label: `${displayH} ${period}`,
                mins: h * 60,
            }
        })
    }, [])

    // Motivational banner message
    const bannerMessage = useMemo(() => {
        if (totalT === 0) return `Ready to plan your ${dayLabel(activeDate).toLowerCase()}? Add your first activity! ✨`
        if (pct === 100) return `Amazing! You've completed all ${totalT} tasks today! 🎉`
        if (isTodayDay(activeDate)) return `✨ Stay consistent! You have ${incomplete} task${incomplete !== 1 ? 's' : ''} planned for today.`
        return `${totalT} task${totalT !== 1 ? 's' : ''} scheduled for ${dayLabel(activeDate)}`
    }, [totalT, pct, incomplete, activeDate])

    const schoolBlocks = blockedWindows.map((w,i) => ({id:`school-${i}`,title:'School Hours',startTime:w.startTime,endTime:w.endTime,isSchoolBlock:true,isBusyBlock:false,completed:false}))
    const busyBlocks   = busySlotBlocks.map((b,i) => ({id:`busy-${i}`,title:b.reason||'Busy',startTime:b.startTime,endTime:b.endTime,isSchoolBlock:false,isBusyBlock:true,completed:false}))
    const allItems     = useMemo(
        () => [...sorted,...schoolBlocks,...busyBlocks].sort((a,b) => a.startTime.localeCompare(b.startTime)),
        [sorted, blockedWindows, busySlotBlocks]
    )

    const goPrevMonth = () => setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    const goNextMonth = () => setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    const goThisMonth = () => { setViewMonth(firstOfMonth(new Date())); setActiveDate(todayISO()) }

    if (prefStatus === 'checking') {
        return (
            <div className="font-lora flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-violet-100 rounded-full" />
                        <div className="absolute inset-0 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-black text-sm">Setting up your schedule</p>
                        <p className="text-gray-400 text-xs font-medium mt-0.5">Just a moment…</p>
                    </div>
                </div>
            </div>
        )
    }

    if (prefStatus === 'first-time') {
        return (
            <div className="font-lora">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-black mb-2">My Schedule 📅</h1>
                    <p className="text-gray-600 font-medium">Plan your week for success and balance</p>
                </div>
                <PreferencesModal
                    user={user}
                    initialPrefs={null}
                    isFirstTime={true}
                    onComplete={handleFirstTimeComplete}
                    onSkip={handleFirstTimeSkip}
                />
            </div>
        )
    }
        return (
        <div className="font-lora relative bg-gray-50/30 min-h-screen -mx-4 -my-4 px-4 py-4 sm:-mx-6 sm:-my-6 sm:px-6 sm:py-6">

            {/* ── Success Toast ── */}
            {successMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-white font-bold px-6 py-3 rounded-full shadow-2xl transition-all duration-300">
                    <CheckCircleIcon className="w-5 h-5 text-white" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* ── Preferences Modal ── */}
            {showEditPrefs && (
                <PreferencesModal
                    user={user}
                    initialPrefs={cachedPrefs}
                    isFirstTime={false}
                    onComplete={handleEditPrefsComplete}
                    onSkip={() => setShowEditPrefs(false)}
                />
            )}

            {/* ── Page Header ── */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
                        <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-black mb-1 flex items-center gap-2">
                            My Schedule 
                        </h1>
                        <p className="text-gray-500 font-medium text-sm">Plan your week for success and balance</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowEditPrefs(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all flex-shrink-0 shadow-sm"
                    title="Preferences"
                >
                    <Cog6ToothIcon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-bold text-gray-700 hidden sm:inline">Preferences</span>
                </button>
            </div>

            {/* ── Upcoming Exams ── */}
            {upcomingExams.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {upcomingExams.slice(0, 3).map(exam => (
                        <div key={exam.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${urgencyColors[exam.urgency] || urgencyColors.NORMAL}`}>
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            {exam.subjectName} exam in {exam.daysRemaining} day{exam.daysRemaining === 1 ? '' : 's'}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Main Grid: Sidebar + Timeline ── */}
            <div className="grid lg:grid-cols-[320px_1fr] gap-6">

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* LEFT SIDEBAR                                                 */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div className="space-y-4">

                    {/* ── Month Calendar Card ── */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-4">
                            <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <button onClick={goThisMonth} className="text-base font-black text-gray-800 hover:text-violet-600 transition-colors">
                                {monthLabel(viewMonth)}
                            </button>
                            <button onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Weekday header */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                <div key={i} className="text-center text-[11px] font-black text-gray-400 py-1">{d}</div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarCells.map(cell => {
                                const dt = tasksByDate[cell.iso] || []
                                const isActive = activeDate === cell.iso
                                const isPast = isPastDay(cell.iso)
                                const isToday = isTodayDay(cell.iso)
                                const dayNum = parseInt(cell.iso.slice(8, 10), 10)
                                return (
                                    <button
                                        key={cell.iso}
                                        onClick={() => setActiveDate(cell.iso)}
                                        className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-bold transition-all ${
                                            !cell.inMonth ? 'text-gray-300' :
                                            isActive ? 'bg-violet-600 text-white shadow-md shadow-violet-200' :
                                            isToday ? 'bg-violet-50 text-violet-700 ring-2 ring-violet-300' :
                                            isPast ? 'text-gray-400 hover:bg-gray-50' :
                                            'text-gray-700 hover:bg-violet-50'
                                        }`}
                                    >
                                        <span>{dayNum}</span>
                                        {dt.length > 0 && cell.inMonth && (
                                            <span className={`w-1 h-1 rounded-full mt-0.5 ${isActive ? 'bg-white' : 'bg-violet-500'}`} />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── Day Summary Card ── */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-base font-black text-gray-800">
                                {dayLabel(activeDate)}, {shortDateLabel(activeDate)}
                            </p>
                            {isTodayDay(activeDate) && (
                                <span className="flex items-center gap-1 text-[10px] font-black bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                                    <CalendarIcon className="w-3 h-3" />
                                    Today
                                </span>
                            )}
                        </div>

                        {/* Summary rows */}
                        <div className="space-y-2.5 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <BookOpenIcon className="w-4 h-4 text-violet-600" />
                                </div>
                                <p className="text-sm font-bold text-gray-700">
                                    {progressStats.studyCount} Study session{progressStats.studyCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <HeartIcon className="w-4 h-4 text-emerald-600" />
                                </div>
                                <p className="text-sm font-bold text-gray-700">
                                    {progressStats.wellnessCount} Relax time
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <ClipboardDocumentListIcon className="w-4 h-4 text-blue-600" />
                                </div>
                                <p className="text-sm font-bold text-gray-700">
                                    {progressStats.otherCount} Activit{progressStats.otherCount !== 1 ? 'ies' : 'y'}
                                </p>
                            </div>
                        </div>

                                                                        {/* View Day Plan button — switches to Day view + scrolls */}
                        <button
                            onClick={() => {
                                setScheduleView('day')
                                // Small delay to let Day view render first, then scroll
                                setTimeout(() => {
                                    const timelineEl = document.getElementById('day-timeline')
                                    if (timelineEl) {
                                        timelineEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    }
                                }, 100)
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-violet-200 text-violet-700 font-bold text-sm hover:bg-violet-50 transition-colors"
                        >
                            View Day Plan
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ── Progress This Week (Donut) ── */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <p className="text-base font-black text-gray-800 mb-4">Progress This Week</p>

                        <div className="flex items-center gap-5">
                            {/* Donut chart */}
                            <div className="relative flex-shrink-0">
                                <svg width="90" height="90" viewBox="0 0 90 90">
                                    <circle cx="45" cy="45" r="35" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                                    <circle
                                        cx="45"
                                        cy="45"
                                        r="35"
                                        fill="none"
                                        stroke="url(#progressGrad)"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(pct / 100) * 219.9} 219.9`}
                                        transform="rotate(-90 45 45)"
                                        className="transition-all duration-700"
                                    />
                                    <defs>
                                        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#8b5cf6" />
                                            <stop offset="100%" stopColor="#ec4899" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-black text-violet-700 leading-none">{pct}%</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Done</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                        <span className="text-xs font-bold text-gray-700">Study</span>
                                    </div>
                                    <span className="text-xs font-black text-gray-500">{progressStats.studyLabel}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-bold text-gray-700">Wellness</span>
                                    </div>
                                    <span className="text-xs font-black text-gray-500">{progressStats.wellnessLabel}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                        <span className="text-xs font-bold text-gray-700">Activities</span>
                                    </div>
                                    <span className="text-xs font-black text-gray-500">{progressStats.otherLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* RIGHT: TIMELINE VIEW                                         */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div id="day-timeline" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-6">

                    {/* Timeline header */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-2xl font-black text-black">
                                    {dayLabel(activeDate)}, <span className="text-gray-500 font-bold">{shortDateLabel(activeDate)}</span>
                                </h2>
                                {isTodayDay(activeDate) && (
                                    <span className="flex items-center gap-1 text-xs font-black bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        Today
                                    </span>
                                )}
                            </div>
                            {!activeDayIsLocked && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {incomplete > 0 && (
                                        <button onClick={initPush} className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-100 transition-all">
                                            <ArrowRightIcon className="w-4 h-4" />
                                            Push {incomplete} to {shortDateLabel(nextDate)}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setShowAddTask(true); setOverlapError(''); setAddWarnings([]) }}
                                        className="bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-700 transition-all flex items-center gap-2 shadow-sm shadow-violet-200"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add Activity
                                    </button>
                                </div>
                            )}
                        </div>

                                                                       {/* Day / Week / Month toggle */}
                        <div className="inline-flex bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => setScheduleView('day')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    scheduleView === 'day'
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Day
                            </button>
                            <button
                                onClick={() => setScheduleView('week')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    scheduleView === 'week'
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setScheduleView('month')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    scheduleView === 'month'
                                        ? 'bg-violet-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Month
                            </button>
                        </div>
                    </div>
                                        {/* ═══ DAY VIEW ═══ */}
                    {scheduleView === 'day' && (
                        <>
                            {/* All-Day Banner */}
                            <div className="px-6 py-3 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-black text-gray-400 uppercase w-14 flex-shrink-0">All Day</span>
                                    <div className="flex-1 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                        <p className="text-sm font-bold text-violet-700">{bannerMessage}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Day Warnings ── */}
                            {dayWarnings.length > 0 && (
                                <div className="px-6 py-3 border-b border-gray-100 space-y-2">
                                    {dayWarnings.map((w, i) => (
                                        <div key={i} className="flex items-start gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                                            <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">⚠️</span>
                                            <p className="text-sm font-medium text-amber-700 leading-snug">{w.replace(/^⚠\s*/, '')}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Timeline hour rows */}
                            <div className="px-6 py-2">
                                {allItems.length === 0 && suggestions.length === 0 && !recsLoading && activeDayIsLocked ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                                            <CalendarIcon className="w-8 h-8 text-violet-300" />
                                        </div>
                                        <p className="text-gray-600 font-bold mb-1">No plans for {dayLabel(activeDate)}</p>
                                        <p className="text-sm text-gray-400">Nothing was recorded for this day.</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                                                                {(() => {
                                            // Constants for day segments
                                            const EARLY_MORNING_END = 8   // Before 8 AM = early morning
                                            const LATE_NIGHT_START = 23   // 11 PM and after = late night
                                            const DEFAULT_START = 8       // 8 AM
                                            const DEFAULT_END = 22        // 10 PM (inclusive)

                                            // Check if any tasks fall into early/late zones
                                            const taskHours = allItems.map(item => Math.floor(toMins(item.startTime) / 60))
                                            const hasEarlyTask = taskHours.some(h => h < EARLY_MORNING_END)
                                            const hasLateTask  = taskHours.some(h => h >= LATE_NIGHT_START)

                                            // Determine visible range
                                            const showEarly = showEarlyMorning || hasEarlyTask
                                            const showLate  = showLateNight || hasLateTask

                                            const START_HOUR = showEarly ? 0 : DEFAULT_START
                                            const END_HOUR   = showLate ? 23 : DEFAULT_END

                                            const visibleHours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
                                                const h = START_HOUR + i
                                                const period = h >= 12 ? 'PM' : 'AM'
                                                const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
                                                return { hour: h, label: `${displayH} ${period}`, mins: h * 60 }
                                            })

                                            return (
                                                <>
                                                    {/* ── Show Early Morning toggle ── */}
                                                    {!showEarly && (
                                                        <button
                                                            onClick={() => setShowEarlyMorning(true)}
                                                            className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 rounded-xl text-xs font-bold text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-all border border-dashed border-gray-200 hover:border-violet-200"
                                                        >
                                                            <ChevronUpIcon className="w-3.5 h-3.5" />
                                                            Show early morning (12 AM – 7 AM)
                                                        </button>
                                                    )}
                                                    {showEarly && !hasEarlyTask && (
                                                        <button
                                                            onClick={() => setShowEarlyMorning(false)}
                                                            className="w-full flex items-center justify-center gap-2 py-2 mb-2 rounded-xl text-xs font-bold text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                                                        >
                                                            <ChevronDownIcon className="w-3.5 h-3.5" />
                                                            Hide early morning
                                                        </button>
                                                    )}

                                                    {visibleHours.map(({ hour, label, mins }) => {
                                                        const itemsInHour = allItems.filter(item => {
                                                            const start = toMins(item.startTime)
                                                            return start >= mins && start < mins + 60
                                                        })

                                                        const isLastRow = hour === END_HOUR
                                                        const hasItems = itemsInHour.length > 0

                                                        return (
                                                            <div key={hour} className="flex items-center gap-4">
                                                                <div className="w-14 flex-shrink-0">
                                                                    <span className="text-xs font-bold text-gray-400">{label}</span>
                                                                </div>

                                                                <div className={`flex-1 ${hasItems ? 'py-1' : 'h-11'}`}>
                                                                    {isLastRow && !hasItems && !activeDayIsLocked ? (
                                                                        <button
                                                                            onClick={() => { setShowAddTask(true); setOverlapError(''); setAddWarnings([]) }}
                                                                            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:text-violet-600"
                                                                        >
                                                                            <PlusIcon className="w-4 h-4" />
                                                                            Add Time Block
                                                                        </button>
                                                                    ) : hasItems ? (
                                                                        <div className="space-y-1.5">
                                                                            {itemsInHour.map(item => {
                                                                                if (item.isSchoolBlock) {
                                                                                    return (
                                                                                        <div key={item.id} className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
                                                                                            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                                                <ClockIcon className="w-4 h-4 text-white" />
                                                                                            </div>
                                                                                            <div className="flex-1">
                                                                                                <p className="font-bold text-orange-900 text-sm">School Hours</p>
                                                                                                <p className="text-xs text-orange-700 font-medium mt-0.5">{fmtTime(item.startTime)} – {fmtTime(item.endTime)}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                }

                                                                                if (item.isBusyBlock) {
                                                                                    return (
                                                                                        <div key={item.id} className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
                                                                                            <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                                                <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                                                                                            </div>
                                                                                            <div className="flex-1">
                                                                                                <p className="font-bold text-red-900 text-sm">{item.title}</p>
                                                                                                <p className="text-xs text-red-700 font-medium mt-0.5">{fmtTime(item.startTime)} – {fmtTime(item.endTime)}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                }

                                                                                const typeKey = getTaskTypeKey(item)
                                                                                const config = TASK_TYPE_CONFIG[typeKey] || TASK_TYPE_CONFIG.Other
                                                                                const IconEl = config.icon
                                                                                const overdue = isOverdue(item)
                                                                                const isExp = expandedTask === item.id
                                                                                const hasNote = item.notes?.trim().length > 0

                                                                                return (
                                                                                    <div key={item.id} className={`${config.bg} border ${config.border} rounded-xl transition-all ${item.completed ? 'opacity-60' : ''}`}>
                                                                                        <div className="px-4 py-2.5 flex items-center gap-3">
                                                                                            <button
                                                                                                onClick={e => { e.stopPropagation(); if (!activeDayIsLocked) toggleDone(item.id) }}
                                                                                                disabled={activeDayIsLocked}
                                                                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                                                                                    item.completed
                                                                                                        ? 'bg-green-500 border-green-500 shadow-sm'
                                                                                                        : activeDayIsLocked
                                                                                                            ? 'border-gray-200 bg-white cursor-not-allowed'
                                                                                                            : 'border-gray-300 bg-white hover:border-violet-400 hover:bg-violet-50'
                                                                                                }`}
                                                                                                title={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                                                                            >
                                                                                                {item.completed && <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                                                                            </button>

                                                                                            <div className={`w-9 h-9 ${config.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                                                                                <IconEl className="w-5 h-5 text-white" />
                                                                                            </div>

                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                                    <p className={`font-bold text-sm ${item.completed ? 'text-gray-500' : config.text}`}>
                                                                                                        {item.title}
                                                                                                    </p>
                                                                                                    {item.completed && (
                                                                                                        <span className="text-[10px] bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full border border-green-200">
                                                                                                            ✓ Done
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {overdue && !item.completed && (
                                                                                                        <span className="text-[10px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded-full border border-red-200">
                                                                                                            ⏰ Overdue
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <p className={`text-xs font-medium mt-0.5 ${item.completed ? 'text-gray-400' : config.subtext}`}>
                                                                                                    {fmtTime(item.startTime)} – {fmtTime(item.endTime)}
                                                                                                    {getDur(item.startTime, item.endTime) && (
                                                                                                        <span className="text-gray-400"> · {getDur(item.startTime, item.endTime)}</span>
                                                                                                    )}
                                                                                                </p>
                                                                                            </div>

                                                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                                                <button
                                                                                                    onClick={e => { e.stopPropagation(); setExpandedTask(isExp ? null : item.id) }}
                                                                                                    className={`p-1.5 rounded-lg transition-all ${isExp ? 'bg-white/70' : 'text-gray-500 hover:bg-white/70'}`}
                                                                                                    title="Show notes"
                                                                                                >
                                                                                                    {isExp ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                                                                                </button>
                                                                                                {!activeDayIsLocked && (
                                                                                                    <>
                                                                                                        <button
                                                                                                            onClick={e => openEdit(e, item)}
                                                                                                            className="p-1.5 rounded-lg text-gray-500 hover:bg-white/70 transition-all"
                                                                                                            title="Edit"
                                                                                                        >
                                                                                                            <PencilIcon className="w-3.5 h-3.5" />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={e => handleDelete(e, item.id)}
                                                                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-white/70 transition-all"
                                                                                                            title="Delete"
                                                                                                        >
                                                                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                                                                        </button>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        {isExp && (
                                                                                            <div className="px-4 pb-3">
                                                                                                <div className="pt-2 border-t border-white/60">
                                                                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">📝 Notes</p>
                                                                                                    {hasNote ? (
                                                                                                        <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{item.notes}</p>
                                                                                                    ) : (
                                                                                                        <p className="text-sm text-gray-400 italic">No notes recorded.</p>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}

                                                                                                        {/* ── Add Time Block if last row has content ── */}
                                                    {!activeDayIsLocked && allItems.some(item => {
                                                        const start = toMins(item.startTime)
                                                        return start >= END_HOUR * 60 && start < (END_HOUR + 1) * 60
                                                    }) && (
                                                        <div className="flex items-start gap-4 mt-2">
                                                            <div className="w-14 flex-shrink-0" />
                                                            <button
                                                                onClick={() => { setShowAddTask(true); setOverlapError(''); setAddWarnings([]) }}
                                                                className="flex-1 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:text-violet-600"
                                                            >
                                                                <PlusIcon className="w-4 h-4" />
                                                                Add Time Block
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* ── Show Late Night toggle ── */}
                                                    {!showLate && (
                                                        <button
                                                            onClick={() => setShowLateNight(true)}
                                                            className="w-full flex items-center justify-center gap-2 py-2.5 mt-3 rounded-xl text-xs font-bold text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-all border border-dashed border-gray-200 hover:border-violet-200"
                                                        >
                                                            <ChevronDownIcon className="w-3.5 h-3.5" />
                                                            Show late night (11 PM)
                                                        </button>
                                                    )}
                                                    {showLate && !hasLateTask && (
                                                        <button
                                                            onClick={() => setShowLateNight(false)}
                                                            className="w-full flex items-center justify-center gap-2 py-2 mt-2 rounded-xl text-xs font-bold text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                                                        >
                                                            <ChevronUpIcon className="w-3.5 h-3.5" />
                                                            Hide late night
                                                        </button>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                                        {/* ═══ WEEK VIEW (7-column grid) ═══ */}
                    {scheduleView === 'week' && (
                        <div className="p-6">
                            {(() => {
                                const weekStart = mondayOf(new Date(activeDate + 'T00:00:00'))
                                const weekDates = weekDatesFrom(weekStart)
                                const weekEndDate = addDays(weekStart, 6)
                                const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

                                const goPrevWeek = () => {
                                    const prev = addDays(weekStart, -7)
                                    setActiveDate(toISO(prev))
                                }
                                const goNextWeek = () => {
                                    const next = addDays(weekStart, 7)
                                    setActiveDate(toISO(next))
                                }
                                const goThisWeek = () => setActiveDate(todayISO())

                                return (
                                    <>
                                        {/* Week nav */}
                                        <div className="flex items-center justify-between mb-5">
                                            <button onClick={goPrevWeek} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                                <ChevronLeftIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={goThisWeek} className="text-base font-black text-gray-800 hover:text-violet-600 transition-colors">
                                                {weekLabel}
                                            </button>
                                            <button onClick={goNextWeek} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                                <ArrowRightIcon className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* 7-day column headers */}
                                        <div className="grid grid-cols-7 gap-2 mb-3">
                                            {weekDates.map(dateIso => {
                                                const d = new Date(dateIso + 'T00:00:00')
                                                const isActive = activeDate === dateIso
                                                const isToday = isTodayDay(dateIso)
                                                return (
                                                    <button
                                                        key={dateIso}
                                                        onClick={() => {
                                                            setActiveDate(dateIso)
                                                            setScheduleView('day')
                                                        }}
                                                        className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                                                            isActive
                                                                ? 'bg-violet-600 text-white shadow-sm'
                                                                : isToday
                                                                    ? 'bg-violet-50 text-violet-700 ring-2 ring-violet-200'
                                                                    : 'hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                    >
                                                        <span className={`text-[10px] font-black uppercase ${isActive ? 'text-violet-200' : 'text-gray-400'}`}>
                                                            {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                                        </span>
                                                        <span className="text-lg font-black mt-0.5">
                                                            {d.getDate()}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* 7-day task columns */}
                                        <div className="grid grid-cols-7 gap-2">
                                            {weekDates.map(dateIso => {
                                                const dayTasks = (tasksByDate[dateIso] || [])
                                                    .map(normaliseTask)
                                                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                                const isActive = activeDate === dateIso
                                                const isPast = isPastDay(dateIso)

                                                return (
                                                    <div
                                                        key={dateIso}
                                                        className={`min-h-[400px] rounded-xl border-2 p-2 space-y-1.5 transition-all ${
                                                            isActive
                                                                ? 'border-violet-300 bg-violet-50/30'
                                                                : 'border-gray-100 bg-gray-50/30 hover:bg-white'
                                                        }`}
                                                    >
                                                        {dayTasks.length === 0 ? (
                                                            <div className="flex items-center justify-center h-full text-center py-8">
                                                                <p className="text-[10px] text-gray-300 font-medium">No tasks</p>
                                                            </div>
                                                        ) : (
                                                            dayTasks.map(task => {
                                                                const typeKey = getTaskTypeKey(task)
                                                                const config = TASK_TYPE_CONFIG[typeKey] || TASK_TYPE_CONFIG.Other
                                                                const IconEl = config.icon

                                                                return (
                                                                    <button
                                                                        key={task.id}
                                                                        onClick={() => {
                                                                            setActiveDate(dateIso)
                                                                            setScheduleView('day')
                                                                        }}
                                                                        className={`w-full ${config.bg} border ${config.border} rounded-lg p-2 text-left hover:shadow-sm transition-all ${
                                                                            task.completed ? 'opacity-60' : ''
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-start gap-1.5">
                                                                            <div className={`w-5 h-5 ${config.iconBg} rounded flex items-center justify-center flex-shrink-0`}>
                                                                                {task.completed
                                                                                    ? <CheckIcon className="w-3 h-3 text-white stroke-[3]" />
                                                                                    : <IconEl className="w-3 h-3 text-white" />
                                                                                }
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className={`text-[10px] font-black leading-tight truncate ${task.completed ? 'text-gray-500' : config.text}`}>
                                                                                    {task.title}
                                                                                </p>
                                                                                <p className={`text-[9px] font-medium mt-0.5 ${config.subtext}`}>
                                                                                    {fmtTime(task.startTime)}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Legend + summary */}
                                        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                                    <span className="text-xs font-bold text-gray-600">Study</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                    <span className="text-xs font-bold text-gray-600">Wellness</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                                    <span className="text-xs font-bold text-gray-600">Activities</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium">
                                                Click any day to view its full schedule
                                            </p>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    )}

                    {/* ═══ MONTH VIEW ═══ */}
                    {scheduleView === 'month' && (
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={goPrevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                    <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                                <button onClick={goThisMonth} className="text-lg font-black text-gray-800 hover:text-violet-600 transition-colors">
                                    {monthLabel(viewMonth)}
                                </button>
                                <button onClick={goNextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                    <ArrowRightIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                    <div key={d} className="text-center text-xs font-black text-gray-400 py-2 uppercase">{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {calendarCells.map(cell => {
                                    const dt = tasksByDate[cell.iso] || []
                                    const isActive = activeDate === cell.iso
                                    const isPast = isPastDay(cell.iso)
                                    const isToday = isTodayDay(cell.iso)
                                    const dayNum = parseInt(cell.iso.slice(8, 10), 10)

                                    return (
                                        <button
                                            key={cell.iso}
                                            onClick={() => {
                                                setActiveDate(cell.iso)
                                                setScheduleView('day')
                                            }}
                                            className={`relative min-h-[90px] p-2 rounded-xl border-2 transition-all text-left ${
                                                !cell.inMonth ? 'border-transparent text-gray-300' :
                                                isActive ? 'border-violet-500 bg-violet-50 shadow-sm' :
                                                isToday ? 'border-violet-200 bg-violet-50/40' :
                                                'border-gray-100 hover:border-violet-200 hover:bg-violet-50/30'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-1">
                                                <span className={`text-sm font-black ${
                                                    !cell.inMonth ? 'text-gray-300' :
                                                    isActive ? 'text-violet-700' :
                                                    isToday ? 'text-violet-700' :
                                                    isPast ? 'text-gray-400' :
                                                    'text-gray-700'
                                                }`}>
                                                    {dayNum}
                                                </span>
                                                {isToday && cell.inMonth && (
                                                    <span className="text-[8px] font-black text-white bg-violet-600 px-1.5 py-0.5 rounded-full">
                                                        TODAY
                                                    </span>
                                                )}
                                            </div>

                                            {cell.inMonth && dt.length > 0 && (
                                                <div className="space-y-1">
                                                    {dt.slice(0, 2).map((t, i) => {
                                                        const type = t.detectedType?.toLowerCase()
                                                        const colorClass =
                                                            type === 'study' ? 'bg-violet-100 text-violet-700' :
                                                            type === 'wellness' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        return (
                                                            <div key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${colorClass}`}>
                                                                {t.title}
                                                            </div>
                                                        )
                                                    })}
                                                    {dt.length > 2 && (
                                                        <div className="text-[9px] font-bold text-gray-400 px-1">
                                                            +{dt.length - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                    <span className="text-xs font-bold text-gray-600">Study</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-bold text-gray-600">Wellness</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                                    <span className="text-xs font-bold text-gray-600">Activities</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── AI Suggestions Section ── */}
                     {scheduleView === 'day' && !activeDayIsLocked && (recsLoading || suggestions.length > 0) && (() => {
                        const SUBJECT_ALIAS_MAP = {
                            'math': 'Mathematics', 'maths': 'Mathematics', 'mathematics': 'Mathematics',
                            'algebra': 'Mathematics', 'geometry': 'Mathematics', 'arithmetic': 'Mathematics',
                            'trigonometry': 'Mathematics', 'calculus': 'Mathematics',
                            'science': 'Science', 'sci': 'Science', 'physics': 'Science',
                            'phy': 'Science', 'chemistry': 'Science', 'chem': 'Science',
                            'biology': 'Science', 'bio': 'Science',
                            'sst': 'SST', 'social': 'SST', 'social studies': 'SST',
                            'history': 'SST', 'geography': 'SST', 'geo': 'SST',
                            'civics': 'SST', 'economics': 'SST', 'political science': 'SST',
                            'english': 'English', 'eng': 'English', 'grammar': 'English',
                            'literature': 'English', 'comprehension': 'English',
                            'hindi': 'Hindi', 'हिंदी': 'Hindi',
                        }

                        const extractSubject = (title) => {
                            if (!title) return null
                            const lower = title.toLowerCase()
                            for (const [alias, subject] of Object.entries(SUBJECT_ALIAS_MAP)) {
                                if (lower.includes(alias)) return subject
                            }
                            return null
                        }

                        const filteredSuggestions = recsLoading ? [] : suggestions.filter(s => {
                            const alreadyAdded = normTasks.some(t => t.title?.toLowerCase() === s.title?.toLowerCase())
                            if (alreadyAdded) return false
                            const suggestionSubject = extractSubject(s.title)
                            if (suggestionSubject) {
                                const subjectAlreadyScheduled = normTasks.some(t => extractSubject(t.title) === suggestionSubject)
                                if (subjectAlreadyScheduled) return false
                            }
                            if (isTodayDay(activeDate)) {
                                const durationMins = s.estimatedMinutes || 45
                                if (currentTimeMins + durationMins > 22 * 60) return false
                                if (s.taskType === 'STUDY' && preferredStudyTime) {
                                    const prefWindowEnds = { MORNING: 12 * 60, AFTERNOON: 17 * 60, EVENING: 21 * 60, NIGHT: 23 * 60 }
                                    const windowEnd = prefWindowEnds[preferredStudyTime]
                                    if (windowEnd && currentTimeMins >= windowEnd) return false
                                }
                            }
                            if (s.taskType === 'STUDY') {
                                const studyTasksToday = normTasks.filter(t => t.detectedType?.toLowerCase() === 'study')
                                if (studyTasksToday.length >= 3) return false
                            }
                            return true
                        })

                        return (
                            <div className="border-t border-gray-100">
                                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                                <SparklesIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-white font-black text-sm tracking-wide">AI Study Planner</p>
                                                <p className="text-violet-200 text-[11px] font-medium">Personalised for {dayLabel(activeDate)}</p>
                                            </div>
                                        </div>
                                        {!recsLoading && filteredSuggestions.length > 0 && (
                                            <span className="bg-white/20 text-white text-xs font-black px-2.5 py-1 rounded-full backdrop-blur-sm">
                                                {filteredSuggestions.length} task{filteredSuggestions.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-b from-violet-50/60 to-white px-6 py-4 space-y-2">
                                    {recsLoading && (
                                        <div className="flex items-center gap-3 py-4 justify-center">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            <span className="text-sm text-violet-500 font-medium">Analysing your schedule...</span>
                                        </div>
                                    )}
                                    {filteredSuggestions.map((s, i) => {
                                        const state = suggestionStates[s.title] || 'idle'
                                        const style = getSuggestionStyle(s.taskType)
                                        const typeEmoji = s.taskType === 'WELLNESS' ? '🧘' : s.taskType === 'OTHER' ? '📋' : '📚'
                                        const typeLabel = s.taskType === 'WELLNESS' ? 'Wellness' : s.taskType === 'OTHER' ? 'Other' : 'Study'
                                        return (
                                            <div key={s.title} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-200 ${
                                                state === 'added' ? 'bg-green-50 border-green-200' :
                                                state === 'error' ? 'bg-red-50 border-red-200' :
                                                'bg-white border-gray-100 hover:border-violet-200 hover:shadow-sm'
                                            }`}>
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
                                                    s.taskType === 'WELLNESS' ? 'bg-emerald-100' :
                                                    s.taskType === 'OTHER' ? 'bg-violet-100' : 'bg-blue-100'
                                                }`}>{typeEmoji}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${state === 'added' ? 'text-green-700' : 'text-gray-800'}`}>
                                                        {state === 'added' ? '✓ Added!' : s.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[10px] text-gray-400 font-medium">~{s.estimatedMinutes}min</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>{typeLabel}</span>
                                                        <span className="text-[10px] text-gray-400">·</span>
                                                        <span className="text-[10px] text-gray-500 font-medium italic">{s.reasonLabel}</span>
                                                    </div>
                                                </div>
                                                {state === 'adding' && (
                                                    <div className="w-16 h-8 flex items-center justify-center">
                                                        <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                                                    </div>
                                                )}
                                                {state === 'added' && (
                                                    <div className="w-16 h-8 bg-green-500 rounded-xl flex items-center justify-center">
                                                        <CheckCircleIcon className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                                {(state === 'idle' || state === 'error') && (
                                                    <button
                                                        onClick={() => handleRecommendationClick(s)}
                                                        className="shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm"
                                                    >
                                                        <PlusIcon className="w-3.5 h-3.5" />
                                                        Add
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {!recsLoading && filteredSuggestions.length === 0 && (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-violet-500 font-medium">✨ All suggestions added for {dayLabel(activeDate)}!</p>
                                        </div>
                                    )}
                                    {!recsLoading && filteredSuggestions.length > 0 && (
                                        <p className="text-[10px] text-gray-400 text-center pt-1 font-medium">
                                            Powered by MyMercurie · Based on your exams, goals & schedule
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })()}
                </div>
            </div>
                        {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODALS                                                       */}
            {/* ═══════════════════════════════════════════════════════════ */}

            {/* ── Recommendation Detail Modal ── */}
            {showRecModal && !activeDayIsLocked && (
                <div onClick={() => setShowRecModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-sm border border-violet-100 shadow-2xl relative">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-black text-black">
                                {recModalData.taskType === 'STUDY' ? 'Schedule Study Session' :
                                 recModalData.taskType === 'WELLNESS' ? 'Schedule Relaxing Activity' :
                                 'Schedule Activity'}
                            </h3>
                            <button
                                onClick={() => setShowRecModal(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {recModalData.taskType === 'STUDY' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Select Subject</label>
                                        <select
                                            value={recModalData.subjectSelect}
                                            onChange={e => setRecModalData({ ...recModalData, subjectSelect: e.target.value, error: '' })}
                                            className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none text-sm bg-white"
                                        >
                                            <option value="Mathematics">Mathematics</option>
                                            <option value="Science">Science</option>
                                            <option value="SST">SST (Social Studies)</option>
                                            <option value="English">English</option>
                                            <option value="Hindi">Hindi</option>
                                            <option value="Other">Other (Custom Subject)</option>
                                        </select>
                                    </div>
                                    {recModalData.subjectSelect === 'Other' && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Enter Subject Name</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={recModalData.titleInput}
                                                onChange={e => setRecModalData({ ...recModalData, titleInput: e.target.value, error: '' })}
                                                placeholder="e.g. History, Art, etc."
                                                className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none text-sm"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {recModalData.taskType === 'WELLNESS' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Select Activity</label>
                                        <select
                                            value={recModalData.subjectSelect}
                                            onChange={e => setRecModalData({ ...recModalData, subjectSelect: e.target.value, error: '' })}
                                            className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none text-sm bg-white"
                                        >
                                            {WELLNESS_ACTIVITY_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {recModalData.subjectSelect === 'Other (Custom Activity)' && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Enter Activity Name</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={recModalData.titleInput}
                                                onChange={e => setRecModalData({ ...recModalData, titleInput: e.target.value, error: '' })}
                                                placeholder="e.g. Paint a portrait, Play guitar, etc."
                                                className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none text-sm"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {recModalData.taskType !== 'STUDY' && recModalData.taskType !== 'WELLNESS' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Select Activity</label>
                                        <select
                                            value={recModalData.subjectSelect}
                                            onChange={e => setRecModalData({ ...recModalData, subjectSelect: e.target.value, error: '' })}
                                            className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none text-sm bg-white"
                                        >
                                            {OTHER_ACTIVITY_OPTIONS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {recModalData.subjectSelect === 'Other (Custom Activity)' && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Enter Activity Name</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={recModalData.titleInput}
                                                onChange={e => setRecModalData({ ...recModalData, titleInput: e.target.value, error: '' })}
                                                placeholder="e.g. Follow-up Session"
                                                className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none text-sm"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <TimeSelect label="Start Time" value={recModalData.startTime} onChange={v => setRecModalData({ ...recModalData, startTime: v, error: '' })} is24h={true} />
                                <TimeSelect label="End Time" value={recModalData.endTime} onChange={v => setRecModalData({ ...recModalData, endTime: v, error: '' })} is24h={true} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Notes <span className="text-gray-400 font-medium">(optional)</span></label>
                                <textarea
                                    value={recModalData.notes}
                                    onChange={e => setRecModalData({ ...recModalData, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none resize-none text-sm"
                                />
                            </div>

                            {recModalData.error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-red-600 text-sm font-medium">
                                    ⚠️ {recModalData.error}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowRecModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 border border-gray-200">Cancel</button>
                            <button onClick={saveRecommendationTask} disabled={isSaving} className="flex-1 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-violet-700 disabled:opacity-50 shadow-sm shadow-violet-200">
                                {isSaving ? 'Saving...' : 'Add to Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Task Modal ── */}
            {editingTask && !activeDayIsLocked && (
                <div onClick={() => setEditingTask(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-sm border border-violet-100 shadow-2xl">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                                <PencilIcon className="w-4 h-4 text-violet-600" />
                            </div>
                            <h3 className="text-xl font-black text-black">Edit Activity</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Activity Name</label>
                                <input autoFocus type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <TimeSelect label="Start Time" value={editData.startTime} onChange={v => setEditData({ ...editData, startTime: v })} is24h={true} />
                                <TimeSelect label="End Time" value={editData.endTime} onChange={v => setEditData({ ...editData, endTime: v })} is24h={true} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Notes <span className="text-gray-400 font-medium">(optional)</span></label>
                                <textarea value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={3} className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none resize-none text-sm" />
                            </div>
                            {editError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-red-600 text-sm font-medium">⚠️ {editError}</div>}
                            {editWarnings.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-amber-700 text-sm font-medium space-y-1">
                                    {editWarnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
                                    <p className="text-xs text-amber-500 font-normal">Changes saved — closing in a moment...</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setEditingTask(null)} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 border border-gray-200">Cancel</button>
                            <button onClick={saveEdit} disabled={!editData.title || isSaving} className="flex-1 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-200">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Task Modal ── */}
            {showAddTask && !activeDayIsLocked && (
                <div onClick={() => { setShowAddTask(false); setOverlapError(''); setAddWarnings([]) }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-sm border border-violet-100 shadow-2xl">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                                <PlusIcon className="w-4 h-4 text-violet-600" />
                            </div>
                            <h3 className="text-xl font-black text-black">Add New Activity</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Activity Name</label>
                                <input autoFocus type="text" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="e.g. Math Revision" className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <TimeSelect label="Start Time" value={newTask.startTime} onChange={v => setNewTask({ ...newTask, startTime: v })} is24h={true} />
                                <TimeSelect label="End Time" value={newTask.endTime} onChange={v => setNewTask({ ...newTask, endTime: v })} is24h={true} />
                            </div>
                            {(blockedWindows.length > 0 || busySlotBlocks.length > 0) && (
                                <div className="space-y-1.5">
                                    {blockedWindows.length > 0 && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
                                            <ClockIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                            <p className="text-xs text-orange-700 font-medium">School: {blockedWindows.map(w => `${fmtTime(w.startTime)}–${fmtTime(w.endTime)}`).join(', ')}</p>
                                        </div>
                                    )}
                                    {busySlotBlocks.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                            <p className="text-xs text-red-700 font-medium">Busy: {busySlotBlocks.map(b => `${fmtTime(b.startTime)}–${fmtTime(b.endTime)} (${b.reason || 'Busy'})`).join(', ')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Notes <span className="text-gray-400 font-medium">(optional)</span></label>
                                <textarea value={newTask.notes} onChange={e => setNewTask({ ...newTask, notes: e.target.value })} rows={2} className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-300 outline-none resize-none text-sm" />
                            </div>
                            {overlapError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-red-600 text-sm font-medium">⚠️ {overlapError}</div>}
                            {addWarnings.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-amber-700 text-sm font-medium space-y-1">
                                    {addWarnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
                                    <p className="text-xs text-amber-500 font-normal">Task saved — closing in a moment...</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setShowAddTask(false); setOverlapError(''); setAddWarnings([]) }} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 border border-gray-200">Cancel</button>
                            <button onClick={handleAdd} disabled={!newTask.title || isSaving} className="flex-1 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-violet-200">
                                {isSaving ? 'Saving...' : 'Add Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Push Modal ── */}
            {showPushModal && !activeDayIsLocked && (
                <div onClick={closePush} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md border border-amber-200 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <ArrowRightIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-black">Push to {shortDateLabel(nextDate)}</h3>
                                <p className="text-xs text-gray-500 font-medium">Moving {pushNonConflicts.length + pushConflicts.length} task(s)</p>
                            </div>
                        </div>
                        {pushNonConflicts.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-violet-500 rounded-full" />
                                    <span className="text-sm font-bold text-gray-700">Ready ({pushNonConflicts.length})</span>
                                </div>
                                <div className="space-y-2">
                                    {pushNonConflicts.map(t => (
                                        <div key={t.id} className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex justify-between">
                                            <span className="font-bold text-violet-800 text-sm">{t.title}</span>
                                            <span className="text-xs text-violet-600">{fmtTime(t.startTime)} → {fmtTime(t.endTime)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {pushConflicts.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-bold text-gray-700">Conflicts ({pushConflicts.length})</span>
                                </div>
                                <div className="space-y-3">
                                    {pushConflicts.map(task => {
                                        const ct = conflictTimes[task.id] || { startTime: task.startTime, endTime: task.endTime }
                                        const ok = isValidConflict(task.id)
                                        return (
                                            <div key={task.id} className={`border rounded-xl p-3 ${ok ? 'bg-violet-50 border-violet-200' : 'bg-amber-50 border-amber-300'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-gray-800 text-sm">{task.title}</span>
                                                    {ok
                                                        ? <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">✓ OK</span>
                                                        : <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">⚠️ Conflict</span>
                                                    }
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">Original: {fmtTime(task.startTime)} → {fmtTime(task.endTime)}</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-1">New Start</label>
                                                        <TimeSelect value={ct.startTime} onChange={v => setConflictTimes(p => ({ ...p, [task.id]: { ...p[task.id], startTime: v } }))} is24h={true} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-1">New End</label>
                                                        <TimeSelect value={ct.endTime} onChange={v => setConflictTimes(p => ({ ...p, [task.id]: { ...p[task.id], endTime: v } }))} is24h={true} />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {pushError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-red-600 text-sm font-medium mb-4">⚠️ {pushError}</div>}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 font-medium">Total:</span>
                                <span className="font-black">{pushNonConflicts.length + pushConflicts.length}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closePush} disabled={isSaving} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 border border-gray-200 disabled:opacity-50">Cancel</button>
                            <button onClick={doPush} disabled={isSaving} className="flex-1 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-amber-600 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-amber-200">
                                {isSaving ? 'Pushing...' : <><ArrowRightIcon className="w-4 h-4" />Push All</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Confirmation Modal ── */}
            {showConfirmModal && (
                <div onClick={() => setShowConfirmModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-sm border border-violet-100 shadow-2xl flex flex-col items-center text-center animate-scale-up">
                        <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-4">
                            <SparklesIcon className="w-6 h-6 text-violet-600 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-black text-black mb-2">{confirmModalConfig.title}</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
                            {confirmModalConfig.message}
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModalConfig.onConfirm}
                                className={`flex-1 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md ${confirmModalConfig.confirmBg}`}
                            >
                                {confirmModalConfig.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Warning Modal ── */}
            {showWarningModal && (
                <div onClick={() => setShowWarningModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-sm border border-red-100 shadow-2xl flex flex-col items-center text-center animate-scale-up">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500 text-xl animate-bounce">⚠️</div>
                        <h3 className="text-lg font-black text-black mb-2">Notice</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
                            {warningModalMessage}
                        </p>
                        <button
                            onClick={() => setShowWarningModal(false)}
                            className="w-full bg-violet-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200"
                        >
                            Okay
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* FLOATING AI ASSISTANT CARD                                   */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {!showMiniChat && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={() => setShowMiniChat(true)}
                        className="group bg-white rounded-2xl shadow-2xl border border-violet-100 px-4 py-3 flex items-center gap-3 hover:shadow-violet-200 hover:border-violet-300 transition-all max-w-xs"
                    >
                        <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-200 flex-shrink-0">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <p className="font-black text-sm text-gray-800">AI Assistant</p>
                                <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-violet-600 transition-colors" />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                <p className="text-[10px] text-gray-500 font-bold">Online</p>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1 leading-tight">
                                Need help planning your day? <span className="font-bold text-gray-700">Ask me anything!</span>
                            </p>
                        </div>
                    </button>
                </div>
            )}

            {/* Close button when chat is open */}
            {showMiniChat && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={() => setShowMiniChat(false)}
                        className="w-14 h-14 rounded-full bg-gray-800 hover:bg-gray-900 text-white shadow-2xl flex items-center justify-center transition-all"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            )}

            {/* ── MiniChatBuddy ── */}
            {showMiniChat && (
                <MiniChatBuddy
                    user={user}
                    tasksByDate={tasksByDate}
                    setTasksByDate={setTasksByDate}
                    upcomingExams={upcomingExams}
                    activeDate={activeDate}
                    weekDates={contextWeekDates}
                    onClose={() => setShowMiniChat(false)}
                    onTaskChanged={() => setRecsTrigger(t => t + 1)}
                    onOpenChatBuddy={(message) => {
                        setShowMiniChat(false)
                        onOpenChatBuddy?.(message)
                    }}
                />
            )}
        </div>
    )
}