import { useState, useEffect, useCallback, useRef } from 'react'
import {
    addTask, editTask, deleteTask, toggleTaskComplete, getRecommendations,
    savePreferences, getPreferences
} from '../../../api/scheduleApi.js'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { apiRequest } from '../../../api/apiClient.js'
import 'katex/dist/katex.min.css'
import {
    CalendarIcon, PlusIcon, TrashIcon, CheckCircleIcon,
    ArrowRightIcon, ChevronDownIcon, ChevronUpIcon,
    PencilIcon, ExclamationTriangleIcon,
    ClockIcon, AcademicCapIcon, SparklesIcon,
    XMarkIcon, ArrowPathIcon, PaperAirplaneIcon,
    PencilSquareIcon, ChatBubbleLeftIcon, Cog6ToothIcon,
    MicrophoneIcon, CheckIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

// ═══════════════════════════════════════════════════════════════════════════════
// TIME SELECT
// ═══════════════════════════════════════════════════════════════════════════════

function TimeSelect({ value, onChange, label }) {
    const toH  = (v) => { if (!v) return '12'; const [h] = v.split(':').map(Number); return h % 12 === 0 ? '12' : String(h % 12) }
    const toM  = (v) => { if (!v) return '00'; return v.split(':')[1] }
    const toAP = (v) => { if (!v) return 'AM'; const [h] = v.split(':').map(Number); return h >= 12 ? 'PM' : 'AM' }
    const hours   = ['12','1','2','3','4','5','6','7','8','9','10','11']
    const minutes = ['00','05','10','15','20','25','30','35','40','45','50','55']
    const emit = (h, m, ap) => {
        let hour = parseInt(h)
        if (ap === 'PM' && hour !== 12) hour += 12
        if (ap === 'AM' && hour === 12) hour = 0
        onChange(`${String(hour).padStart(2,'0')}:${m}`)
    }
    const sel = "flex-1 px-2 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-200 outline-none text-sm font-bold text-gray-700 bg-white appearance-none text-center cursor-pointer"
    return (
        <div>
            {label && <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>}
            <div className="flex gap-1.5 items-center">
                <select value={toH(value)}  onChange={e => emit(e.target.value, toM(value), toAP(value))} className={sel}>{hours.map(h => <option key={h}>{h}</option>)}</select>
                <span className="text-gray-400 font-black text-sm">:</span>
                <select value={toM(value)}  onChange={e => emit(toH(value), e.target.value, toAP(value))} className={sel}>{minutes.map(m => <option key={m}>{m}</option>)}</select>
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

// ═══════════════════════════════════════════════════════════════════════════════
// PREFERENCES MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function PreferencesModal({ user, initialPrefs, isFirstTime, onComplete, onSkip }) {
    const [loading, setLoading]                       = useState(!initialPrefs)
    const [preferredStudyTime, setPreferredStudyTime] = useState(initialPrefs?.preferredStudyTime || null)
    const [busySlots, setBusySlots]                   = useState(initialPrefs?.busySlots || [])
    const [saving, setSaving]                         = useState(false)
    const [error, setError]                           = useState('')
    const [step, setStep]                             = useState(0)
    const [busyForm, setBusyForm]                     = useState({ day: getTodayName(), startTime: '16:00', endTime: '18:00' })
    const [busyFormError, setBusyFormError]           = useState('')
    const [reasons, setReasons]                       = useState({})

    const toM = (t) => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m }
    const fmt = (t) => { if (!t) return ''; const [h,m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }

    useEffect(() => {
        if (initialPrefs) {
            const r = {}
            ;(initialPrefs.busySlots || []).forEach((s, i) => { r[i] = s.reason || '' })
            setReasons(r)
            setLoading(false)
            return
        }
        getPreferences(user.id)
            .then(data => {
                setPreferredStudyTime(data.preferredStudyTime || null)
                setBusySlots(data.busySlots || [])
                const r = {}
                ;(data.busySlots || []).forEach((s, i) => { r[i] = s.reason || '' })
                setReasons(r)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [user.id, initialPrefs])

    const addBusySlot = () => {
        setBusyFormError('')
        if (!busyForm.startTime || !busyForm.endTime) { setBusyFormError('Set both times.'); return }
        if (toM(busyForm.endTime) <= toM(busyForm.startTime)) { setBusyFormError('End must be after start.'); return }
        const sameDay = busySlots.filter(s => s.day === busyForm.day)
        if (sameDay.some(s => toM(busyForm.startTime) < toM(s.endTime) && toM(busyForm.endTime) > toM(s.startTime))) {
            setBusyFormError('Overlaps with existing slot.'); return
        }
        const newSlots = [...busySlots, { day: busyForm.day, startTime: busyForm.startTime, endTime: busyForm.endTime, reason: '' }]
        setBusySlots(newSlots)
        setReasons(prev => ({ ...prev, [newSlots.length - 1]: '' }))
        setBusyForm({ day: getTodayName(), startTime: '16:00', endTime: '18:00' })
    }

    const removeBusySlot = (index) => {
        const newSlots = busySlots.filter((_, i) => i !== index)
        setBusySlots(newSlots)
        const newReasons = {}
        newSlots.forEach((s, i) => { newReasons[i] = s.reason || reasons[i > index ? i + 1 : i] || '' })
        setReasons(newReasons)
    }

    const handleSave = async () => {
        if (!preferredStudyTime) { setError('Please select a preferred study time.'); return }
        setSaving(true); setError('')
        try {
            const slotsWithReasons = busySlots.map((slot, i) => ({
                ...slot, reason: reasons[i] || slot.reason || 'Busy'
            }))
            await savePreferences(user.id, preferredStudyTime, slotsWithReasons)
            onComplete({ preferredStudyTime, busySlots: slotsWithReasons })
        } catch (err) {
            setError(err.message || 'Failed to save.')
            setSaving(false)
        }
    }

    const STEPS = ['Study Time', 'Busy Hours', 'Reasons']
    const inputClass = "border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-violet-300 outline-none bg-white w-full transition-colors"

    if (loading) return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center font-lora">
            <div className="bg-white rounded-2xl p-10 border-2 border-violet-200 shadow-2xl flex flex-col items-center gap-4">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-lora">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-2 border-violet-100 max-h-[92vh] overflow-hidden flex flex-col">

                <div className="relative bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-600 px-6 pt-6 pb-8 rounded-t-3xl overflow-hidden flex-shrink-0">
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
                    <div className="absolute top-4 right-16 w-8 h-8 bg-white/10 rounded-full" />

                    <div className="relative flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                                {isFirstTime ? <SparklesIcon className="w-6 h-6 text-white" /> : <Cog6ToothIcon className="w-6 h-6 text-white" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest mb-0.5">EmpathAI</p>
                                <h3 className="text-xl font-black text-white leading-tight">
                                    {isFirstTime ? 'Setup Your Preferences' : 'Edit Preferences'}
                                </h3>
                            </div>
                        </div>
                        {onSkip && (
                            <button onClick={onSkip} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10">
                                <XMarkIcon className="w-4 h-4 text-white/70" />
                            </button>
                        )}
                    </div>

                    {isFirstTime && (
                        <div className="relative mb-5 bg-white/10 rounded-2xl px-4 py-3 border border-white/20">
                            <p className="text-white/90 text-xs font-bold leading-relaxed">
                                👋 Welcome! This is a <span className="text-white font-black">one-time setup</span> — we'll use these preferences to personalise your study plan every day.
                            </p>
                        </div>
                    )}

                    <div className="relative flex items-center justify-between">
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/20 mx-6" />
                        <div
                            className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-white/60 transition-all duration-500"
                            style={{ width: step === 0 ? '0%' : step === 1 ? '50%' : '100%', right: 'auto' }}
                        />
                        {STEPS.map((label, i) => {
                            const done    = i < step
                            const current = i === step
                            return (
                                <button key={i}
                                    onClick={() => { if (i === 0 || (i >= 1 && preferredStudyTime)) setStep(i) }}
                                    className="relative flex flex-col items-center gap-1.5 z-10"
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 border-2 ${
                                        done    ? 'bg-white border-white text-violet-600 shadow-lg shadow-violet-900/30' :
                                        current ? 'bg-violet-700 border-white text-white shadow-lg shadow-violet-900/30 scale-110' :
                                                  'bg-white/10 border-white/30 text-white/50'
                                    }`}>{done ? '✓' : i + 1}</div>
                                    <span className={`text-[10px] font-black whitespace-nowrap transition-colors ${
                                        current ? 'text-white' : done ? 'text-violet-200' : 'text-white/40'
                                    }`}>{label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">

                        {step === 0 && (
                            <div>
                                <div className="mb-5">
                                    <h4 className="text-base font-black text-black mb-1">When do you study best?</h4>
                                    <p className="text-sm text-gray-500 font-medium">We'll prioritise suggestions within this window</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {STUDY_TIME_OPTIONS.map(opt => {
                                        const isSelected = preferredStudyTime === opt.value
                                        return (
                                            <button key={opt.value} onClick={() => setPreferredStudyTime(opt.value)}
                                                className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-200 text-left overflow-hidden ${
                                                    isSelected ? opt.activeColor + ' shadow-sm' : opt.color + ' hover:opacity-90 hover:shadow-sm'
                                                }`}>
                                                {isSelected && (
                                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-[9px] font-black">✓</span>
                                                    </div>
                                                )}
                                                <span className="text-2xl mb-2">{opt.emoji}</span>
                                                <span className="font-black text-sm text-black block">{opt.label}</span>
                                                <span className="text-[11px] font-medium text-gray-500 mt-0.5">{opt.time}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <button onClick={() => { if (preferredStudyTime) setStep(1) }} disabled={!preferredStudyTime}
                                    className="w-full bg-black text-white py-3 rounded-xl font-black text-sm hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                                    Continue <ArrowRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {step === 1 && (
                            <div>
                                <div className="mb-5">
                                    <h4 className="text-base font-black text-black mb-1">Any busy hours this week?</h4>
                                    <p className="text-sm text-gray-500 font-medium">We'll skip these slots when suggesting tasks</p>
                                </div>
                                <div className="bg-violet-50 border-2 border-violet-100 rounded-2xl p-4 mb-4">
                                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-3">Add a busy slot</p>
                                    <div className="grid grid-cols-3 gap-2.5 mb-3">
                                        <div className="col-span-3 sm:col-span-1">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">Day</label>
                                            <select value={busyForm.day} onChange={e => { setBusyForm(p => ({ ...p, day: e.target.value })); setBusyFormError('') }} className={inputClass}>
                                                {DAYS.map(d => <option key={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                                            <input type="time" value={busyForm.startTime} onChange={e => { setBusyForm(p => ({ ...p, startTime: e.target.value })); setBusyFormError('') }} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                                            <input type="time" value={busyForm.endTime} onChange={e => { setBusyForm(p => ({ ...p, endTime: e.target.value })); setBusyFormError('') }} className={inputClass} />
                                        </div>
                                    </div>
                                    {busyFormError && (
                                        <p className="text-[11px] text-red-500 font-bold mb-2.5 flex items-center gap-1">
                                            <ExclamationTriangleIcon className="w-3 h-3" /> {busyFormError}
                                        </p>
                                    )}
                                    <button onClick={addBusySlot} className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-colors shadow-sm shadow-violet-200">
                                        <PlusIcon className="w-3.5 h-3.5" /> Add Slot
                                    </button>
                                </div>

                                {busySlots.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-2xl mb-4 text-center">
                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                            <ClockIcon className="w-5 h-5 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400">No busy slots added</p>
                                        <p className="text-[11px] text-gray-300 font-medium mt-0.5">Your schedule is wide open!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                                        {busySlots.map((slot, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white border-2 border-red-100 rounded-xl px-3.5 py-2.5">
                                                <div className="w-1.5 h-8 bg-red-400 rounded-full flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-xs text-red-700">{slot.day}</p>
                                                    <p className="text-[10px] text-red-400 font-medium">{fmt(slot.startTime)} – {fmt(slot.endTime)}</p>
                                                </div>
                                                {slot.reason && <span className="text-[9px] font-bold text-gray-400 italic hidden sm:block">{slot.reason}</span>}
                                                <button onClick={() => removeBusySlot(i)} className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2.5">
                                    <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl font-black text-sm text-gray-500 hover:bg-gray-100 border-2 border-gray-100 transition-colors">← Back</button>
                                    <button onClick={() => {
                                        if (busySlots.length === 0) { handleSave(); return }
                                        const r = {}; busySlots.forEach((s, i) => { r[i] = reasons[i] || s.reason || '' }); setReasons(r); setStep(2)
                                    }} className="flex-1 bg-black text-white py-3 rounded-xl font-black text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                        {busySlots.length === 0 ? '✨ Save & Go' : <>Continue <ArrowRightIcon className="w-4 h-4" /></>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div>
                                <div className="mb-5">
                                    <h4 className="text-base font-black text-black mb-1">What keeps you busy?</h4>
                                    <p className="text-sm text-gray-500 font-medium">Helps us understand your weekly rhythm</p>
                                </div>
                                <div className="space-y-3 mb-5 max-h-64 overflow-y-auto pr-1">
                                    {busySlots.map((slot, i) => (
                                        <div key={i} className="border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-1.5 h-6 bg-red-400 rounded-full" />
                                                <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{slot.day}</span>
                                                <span className="text-[10px] text-gray-400 font-medium">{fmt(slot.startTime)} – {fmt(slot.endTime)}</span>
                                            </div>
                                            <input type="text" value={reasons[i] || ''} onChange={e => setReasons(p => ({ ...p, [i]: e.target.value }))}
                                                placeholder="e.g. Football practice"
                                                className="w-full border-2 border-gray-100 focus:border-violet-200 rounded-xl px-3 py-2 text-sm font-medium outline-none bg-white mb-3 transition-colors" />
                                            <div className="flex flex-wrap gap-1.5">
                                                {REASON_SUGGESTIONS.map(r => (
                                                    <button key={r} onClick={() => setReasons(p => ({ ...p, [i]: r }))}
                                                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border-2 transition-all ${
                                                            reasons[i] === r ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600'
                                                        }`}>{r}</button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2.5">
                                    <button onClick={() => setStep(1)} disabled={saving} className="flex-1 py-3 rounded-xl font-black text-sm text-gray-500 hover:bg-gray-100 border-2 border-gray-100 disabled:opacity-40 transition-colors">← Back</button>
                                    <button onClick={handleSave} disabled={saving}
                                        className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl font-black text-sm hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md shadow-violet-200">
                                        {saving ? (<><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>) : '✨ Save & Continue'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 flex items-center gap-2.5 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3">
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <p className="text-red-600 text-sm font-bold">{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                {isFirstTime && (
                    <div className="px-6 pb-5 pt-1 flex-shrink-0 border-t border-gray-50">
                        <button onClick={onSkip} className="w-full text-center text-xs text-gray-400 hover:text-violet-500 font-bold py-2.5 transition-colors">
                            Skip for now — I'll set this up later →
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT TOOL DEFINITIONS  (OpenAI function-calling format)
// ═══════════════════════════════════════════════════════════════════════════════

const AGENT_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'add_task',
            description: "Add a new task or study session to the student's weekly schedule. Always gather title, day, start time, and end time before calling. Ask one or two questions at a time if info is missing — never assume times.",
            parameters: {
                type: 'object',
                properties: {
                    title:     { type: 'string', description: 'Short descriptive task title e.g. "Math revision", "Physics chapter 4"' },
                    dayOfWeek: { type: 'string', enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], description: 'Day of the week for the task' },
                    startTime: { type: 'string', description: 'Start time in 24-hr HH:MM format e.g. "09:00", "14:30"' },
                    endTime:   { type: 'string', description: 'End time in 24-hr HH:MM format e.g. "10:00", "16:00"' },
                    notes:     { type: 'string', description: 'Optional extra notes or reminders for the task' },
                },
                required: ['title', 'dayOfWeek', 'startTime', 'endTime'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'edit_task',
            description: "Edit an existing task — change its title, start time, end time, or notes. Confirm new details with the student before calling. Only use IDs from the task list in the system prompt.",
            parameters: {
                type: 'object',
                properties: {
                    taskId:    { type: 'string', description: 'The unique ID of the task to edit' },
                    title:     { type: 'string', description: 'New title for the task' },
                    dayOfWeek: { type: 'string', enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], description: 'Day of the week (same or updated)' },
                    startTime: { type: 'string', description: 'New start time in 24-hr HH:MM format' },
                    endTime:   { type: 'string', description: 'New end time in 24-hr HH:MM format' },
                    notes:     { type: 'string', description: 'Updated notes (optional)' },
                },
                required: ['taskId', 'title', 'dayOfWeek', 'startTime', 'endTime'],
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
                <button
                    onClick={handleCancel}
                    className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                    title="Cancel"
                >
                    <XMarkIcon className="w-3 h-3" />
                </button>
                <button
                    onClick={handleConfirm}
                    className="w-5 h-5 rounded-full bg-green-100 hover:bg-green-200 text-green-600 flex items-center justify-center transition-colors"
                    title="Use this text"
                >
                    <CheckIcon className="w-3 h-3" />
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={startListening}
            disabled={disabled}
            className="text-gray-400 hover:text-violet-600 transition-colors disabled:opacity-40 flex-shrink-0"
            title="Voice input"
        >
            <MicrophoneIcon className="w-4 h-4" />
        </button>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE SESSION HELPERS  (localStorage persistence)
// ═══════════════════════════════════════════════════════════════════════════════

const SA_SESSIONS_KEY = 'scheduleAssistant_sessions'
const MAX_SESSIONS    = 20

function loadStoredSessions() {
    try {
        return JSON.parse(localStorage.getItem(SA_SESSIONS_KEY) || '[]')
    } catch { return [] }
}

function saveStoredSessions(sessions) {
    try {
        localStorage.setItem(SA_SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
    } catch { /* quota exceeded – silently skip */ }
}

function formatSessionDate(iso) {
    if (!iso) return 'Session'
    const d = new Date(iso)
    const now = new Date()
    const diffD = Math.floor((now - d) / 864e5)
    if (diffD === 0) return 'Today'
    if (diffD === 1) return 'Yesterday'
    if (diffD < 7)  return `${diffD} days ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI CHATBUDDY
// ═══════════════════════════════════════════════════════════════════════════════

function MiniChatBuddy({ user, tasks, upcomingExams, activeDay, onClose, onTaskChanged }) {
    const [messages, setMessages]           = useState([])
    const [inputMessage, setInputMessage]   = useState('')
    const [isLoading, setIsLoading]         = useState(false)
    const [view, setView]                   = useState('chat')       // 'chat' | 'history'
    const [sessions, setSessions]           = useState([])
    const [historySearch, setHistorySearch] = useState('')

    // agentHistoryRef holds the raw OpenAI-format message history across turns
    const agentHistoryRef = useRef([])
    const messagesEndRef  = useRef(null)
    const inputRef        = useRef(null)

    // ── FIX: ref that always holds the latest messages for the unmount handler ──
    const messagesRef = useRef([])

    // Keep messagesRef in sync with state on every render
    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    // ── build system prompt with full schedule context ─────────────────────────
    const buildSystemPrompt = () => {
        const allTasksSummary = Object.entries(tasks)
            .map(([day, dayTasks]) => {
                if (!dayTasks?.length) return null
                const lines = dayTasks.map(t =>
                    `    • [ID:${t.id}] "${t.title}" ${t.startTime}–${t.endTime}${t.completed ? ' ✓' : ''}`
                ).join('\n')
                return `  ${day}:\n${lines}`
            })
            .filter(Boolean)
            .join('\n')

        const examsSummary = upcomingExams?.length
            ? upcomingExams.map(e => `  • ${e.subjectName} in ${e.daysRemaining} day(s) [${e.urgency}]`).join('\n')
            : '  None'

        return `You are a smart, friendly Schedule Agent for a student learning platform called EmpathAI.
Your job is to help the student manage their weekly study schedule through conversation.

STUDENT INFO:
  Name: ${user?.firstName || 'Student'} ${user?.lastName || ''}
  Student ID: ${user?.id}
  Currently viewing: ${activeDay}

CURRENT WEEK'S TASKS:
${allTasksSummary || '  No tasks scheduled yet'}

UPCOMING EXAMS:
${examsSummary}

YOUR BEHAVIOUR:
1. Be warm, encouraging, and concise. Use emojis sparingly.
2. When the student wants to ADD a task, gather ALL required info before calling add_task:
   - Task title (what subject/activity?)
   - Day of week
   - Start time AND end time
   Ask one or two questions at a time if info is missing. Never assume times.
3. If the student gives partial info like "add Math at 3pm for 1 hour on Tuesday", infer endTime = 16:00 yourself and confirm before calling.
4. When the student wants to DELETE a task, identify it from the task list above, confirm once, then call delete_task.
5. When the student wants to EDIT a task, ask what they want to change, confirm, then call edit_task.
6. When marking complete, identify the task and call mark_task_complete.
7. For queries like "what's on my schedule" or "am I on track", answer directly from the task list — no tool needed.
8. After any action, briefly confirm what was done and offer to help further.
9. Always use 24-hour format (HH:MM) when calling tools.
10. Never make up task IDs — only use IDs from the task list above.
11. Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`
    }

    // ── welcome message ────────────────────────────────────────────────────────
    const buildWelcomeMessage = () => {
        const todayTasks     = tasks[activeDay] || []
        const completedCount = todayTasks.filter(t => t.completed).length
        const totalCount     = todayTasks.length
        const nearestExam    = upcomingExams?.[0]
        let msg = `Hi **${user?.firstName || 'there'}**! 👋 I'm your Schedule Assistant.\n\n`
        if (totalCount > 0) {
            msg += `📅 You have **${totalCount} task${totalCount > 1 ? 's' : ''}** planned for ${activeDay}`
            if (completedCount > 0) msg += ` and you've completed **${completedCount}** — great work!`
            else msg += ` and none completed yet.`
            msg += '\n\n'
        } else {
            msg += `📅 You have **no tasks planned** for ${activeDay} yet.\n\n`
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
        // Seed history with system prompt; show welcome bubble
        agentHistoryRef.current = [{ role: 'system', content: buildSystemPrompt() }]
        setMessages([{ id: 'welcome', role: 'assistant', content: buildWelcomeMessage() }])
        // Load stored sessions
        setSessions(loadStoredSessions())
        inputRef.current?.focus()
    }, [])

    // ── FIX: Save session to localStorage when component unmounts ─────────────
    useEffect(() => {
        return () => {
            const currentMessages = messagesRef.current
            const realMessages = currentMessages.filter(m => m.id !== 'welcome')
            // Only save if there's actual conversation content
            if (realMessages.length > 0) {
                const session = {
                    id:        Date.now(),
                    startedAt: new Date().toISOString(),
                    preview:   realMessages[0]?.content?.slice(0, 60) || 'Schedule session',
                    messages:  currentMessages,
                }
                const updated = [session, ...loadStoredSessions()]
                saveStoredSessions(updated)
            }
        }
    }, []) // empty deps — runs cleanup only on unmount

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    // ── execute a tool call returned by the agent ──────────────────────────────
    const executeTool = async (toolName, toolInput) => {
        try {
            switch (toolName) {
                case 'add_task': {
                    const result = await addTask(
                        user.id,
                        toolInput.dayOfWeek,
                        toolInput.title,
                        toolInput.startTime,
                        toolInput.endTime,
                        toolInput.notes || ''
                    )
                    onTaskChanged?.()
                    return { success: true, message: `Task "${toolInput.title}" added on ${toolInput.dayOfWeek} from ${toolInput.startTime} to ${toolInput.endTime}.`, task: result }
                }
                case 'edit_task': {
                    const result = await editTask(
                        toolInput.taskId,
                        user.id,
                        toolInput.dayOfWeek,
                        toolInput.title,
                        toolInput.startTime,
                        toolInput.endTime,
                        toolInput.notes || ''
                    )
                    onTaskChanged?.()
                    return { success: true, message: `Task updated to "${toolInput.title}" on ${toolInput.dayOfWeek} from ${toolInput.startTime} to ${toolInput.endTime}.`, task: result }
                }
                case 'delete_task': {
                    await deleteTask(toolInput.taskId)
                    onTaskChanged?.()
                    return { success: true, message: `Task "${toolInput.taskTitle}" has been deleted.` }
                }
                case 'mark_task_complete': {
                    const result = await toggleTaskComplete(toolInput.taskId)
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

    // ── agentic loop (OpenAI) ──────────────────────────────────────────────────
    const runAgentLoop = async (history) => {
        let currentHistory = history
        const MAX_ITERATIONS = 6

        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const response = await apiRequest('/api/openai/chat', {
                method: 'POST',
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: currentHistory,
                    tools: AGENT_TOOLS,
                    tool_choice: 'auto',
                }),
            })
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}))
                throw new Error(errBody?.error?.message || 'Agent request failed')
            }

            const data    = await response.json()
            const choice  = data.choices?.[0]
            const message = choice?.message

            if (message?.content?.trim()) {
                setMessages(prev => [...prev, {
                    id: `a-${Date.now()}-${i}`,
                    role: 'assistant',
                    content: message.content.trim(),
                }])
            }

            if (!message?.tool_calls?.length || choice?.finish_reason === 'stop') {
                agentHistoryRef.current = currentHistory
                break
            }

            currentHistory = [
                ...currentHistory,
                { role: 'assistant', content: message.content || '', tool_calls: message.tool_calls },
            ]

            for (const toolCall of message.tool_calls) {
                const toolName  = toolCall.function.name
                const toolInput = JSON.parse(toolCall.function.arguments)
                const result    = await executeTool(toolName, toolInput)

                currentHistory = [
                    ...currentHistory,
                    {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result),
                    },
                ]
            }

            agentHistoryRef.current = currentHistory
        }
    }

    // ── send handler ───────────────────────────────────────────────────────────
    const handleSend = async () => {
        const text = inputMessage.trim()
        if (!text || isLoading) return

        const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text }
        setMessages(prev => [...prev, userMsg])
        setInputMessage('')
        setIsLoading(true)

        const newHistory = [
            ...agentHistoryRef.current,
            { role: 'user', content: text },
        ]

        try {
            await runAgentLoop(newHistory)
        } catch (err) {
            setMessages(prev => [...prev, {
                id: `err-${Date.now()}`,
                role: 'assistant',
                content: `Sorry, something went wrong: ${err.message || 'Please try again.'}`,
            }])
        } finally {
            setIsLoading(false)
        }
    }

    // ── save current session to localStorage, then start fresh ────────────────
    const handleNewChat = () => {
        // Only save if there's real conversation (more than just the welcome msg)
        const realMessages = messages.filter(m => m.id !== 'welcome')
        if (realMessages.length > 0) {
            const session = {
                id:        Date.now(),
                startedAt: new Date().toISOString(),
                preview:   realMessages[0]?.content?.slice(0, 60) || 'Schedule session',
                messages,
            }
            const updated = [session, ...loadStoredSessions()]
            saveStoredSessions(updated)
            setSessions(updated)
        }

        // ── FIX: Clear the ref so the unmount effect doesn't double-save ──
        messagesRef.current = []

        agentHistoryRef.current = [{ role: 'system', content: buildSystemPrompt() }]
        setMessages([{ id: 'welcome', role: 'assistant', content: buildWelcomeMessage() }])
        setView('chat')
        inputRef.current?.focus()
    }

    // ── restore a past session ─────────────────────────────────────────────────
    const handleLoadSession = (session) => {
        setMessages(session.messages || [])
        // Rebuild agent history from restored messages (system prompt + restored exchanges)
        agentHistoryRef.current = [
            { role: 'system', content: buildSystemPrompt() },
            ...session.messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content })),
        ]
        setView('chat')
    }

    const handleVoiceTranscript = (text) => {
        setInputMessage(prev => prev ? `${prev} ${text}` : text)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

    const QUICK_CHIPS = ['What should I study today?', 'Add a task for me', 'Am I on track this week?', 'Help me plan my evening']

    const filteredSessions = sessions.filter(s =>
        !historySearch ||
        (s.preview || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        formatSessionDate(s.startedAt).toLowerCase().includes(historySearch.toLowerCase())
    )

    return (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl border-2 border-violet-200 shadow-2xl flex flex-col overflow-hidden" style={{ height: '520px' }}>

            {/* ── Header ── */}
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
                <div className="flex items-center gap-1">
                    {/* History toggle */}
                    <button
                        onClick={() => setView(v => v === 'history' ? 'chat' : 'history')}
                        title="Chat History"
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            view === 'history' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                        }`}
                    >
                        <ChatBubbleLeftIcon className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={handleNewChat} title="New Chat" className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <PencilSquareIcon className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <XMarkIcon className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {/* ── HISTORY VIEW ── */}
            {view === 'history' && (
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {/* Search */}
                    <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search sessions…"
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 font-medium"
                            />
                        </div>
                    </div>

                    {/* Session list */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                        {filteredSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-center">
                                <ChatBubbleLeftIcon className="w-8 h-8 text-gray-200 mb-2" />
                                <p className="text-xs text-gray-400 font-medium">
                                    {sessions.length === 0
                                        ? 'No history yet — start chatting!'
                                        : 'No sessions match your search.'}
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 pb-1">Past Sessions</p>
                                {filteredSessions.map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => handleLoadSession(session)}
                                        className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-violet-50 border border-transparent hover:border-violet-100 transition-colors text-left group"
                                    >
                                        <ChatBubbleLeftIcon className="w-4 h-4 mt-0.5 text-gray-300 group-hover:text-violet-500 flex-shrink-0 transition-colors" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">
                                                {session.preview || 'Schedule session'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                <ClockIcon className="w-3 h-3" />
                                                {formatSessionDate(session.startedAt)}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Footer: back to chat */}
                    <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                        <button
                            onClick={() => setView('chat')}
                            className="w-full py-2 rounded-xl text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
                        >
                            ← Back to Chat
                        </button>
                    </div>
                </div>
            )}

            {/* ── CHAT VIEW ── */}
            {view === 'chat' && (
                <>
                    {/* Chat area */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/40">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                                        <SparklesIcon className="w-3.5 h-3.5 text-violet-600" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-br-sm shadow-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                                    {msg.role === 'assistant' ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                p:      ({children}) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                                ul:     ({children}) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                                                ol:     ({children}) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
                                                li:     ({children}) => <li className="leading-relaxed pl-1">{children}</li>,
                                                strong: ({children}) => <strong className="font-black text-gray-900">{children}</strong>,
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
                                    {[0,1,2].map(i => (
                                        <span key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick chips */}
                    <div className="px-4 py-2 border-t border-gray-100 bg-white flex-shrink-0">
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_CHIPS.map(chip => (
                                <button key={chip} onClick={() => setInputMessage(chip)} disabled={isLoading}
                                    className="px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-[10px] font-bold hover:bg-violet-100 transition-colors disabled:opacity-50">
                                    {chip}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input */}
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
                                    style={{fieldSizing:'content'}}
                                />
                                <VoiceInputButton
                                    onTranscript={handleVoiceTranscript}
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !inputMessage.trim()}
                                className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white rounded-xl px-3 py-2.5 transition-colors flex items-center shadow-sm shrink-0">
                                {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCHEDULE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const jsToWeekIdx     = (jsDay) => (jsDay === 0 ? 6 : jsDay - 1)
const weekIdx         = (day)   => DAYS.indexOf(day)
const getTodayWeekIdx = ()      => jsToWeekIdx(new Date().getDay())

export default function Schedule({ tasks, setTasks, activeDay, setActiveDay, user }) {

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
        setActiveDay(DAYS[getTodayWeekIdx()])
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

    const isPastDay   = (d) => weekIdx(d) < getTodayWeekIdx()
    const isTodayDay  = (d) => weekIdx(d) === getTodayWeekIdx()

    useEffect(() => {
        if (!user?.id || prefStatus !== 'ready') return
        setRecsLoading(true)
        getRecommendations(user.id, activeDay)
            .then(data => {
                setBlockedWindows(data?.blockedWindows || [])
                setBusySlotBlocks(data?.busySlots || [])
                setUpcomingExams(data?.upcomingExams || [])
                setPreferredStudyTime(data?.preferredStudyTime || null)
                setSuggestions(isPastDay(activeDay) ? [] : (data?.suggestions || []))
                setSuggestionStates({}); setSuggestionTimePicker(null)
            })
            .catch(() => { setBlockedWindows([]); setBusySlotBlocks([]); setUpcomingExams([]); setSuggestions([]) })
            .finally(() => setRecsLoading(false))
    }, [user?.id, activeDay, recsTrigger, prefStatus])

    const normaliseTask = (task) => {
        if (task.startTime) return task
        const raw = task.time || ''; const match = raw.match(/(\d+):(\d+)\s*(AM|PM)?/i)
        if (!match) return { ...task, startTime: '00:00', endTime: '01:00' }
        let h = parseInt(match[1]); const m = match[2]; const ap = (match[3] || '').toUpperCase()
        if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0
        return { ...task, startTime: `${String(h).padStart(2,'0')}:${m}`, endTime: `${String((h+1)%24).padStart(2,'0')}:${m}` }
    }

    const toMins  = (t) => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m }
    const fmtTime = (t) => { if (!t) return ''; const [h,m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }
    const getDur  = (s,e) => { const d = toMins(e)-toMins(s); if(d<=0) return ''; const h=Math.floor(d/60),m=d%60; return h&&m?`${h}h ${m}m`:h?`${h}h`:`${m}m` }
    const totalMins = () => normTasks.reduce((a,t) => { const d = toMins(t.endTime)-toMins(t.startTime); return a+(d>0?d:0) }, 0)

    const hasOverlap = (day,s,e,excl=null) =>
        tasks[day].some(r => { const t = normaliseTask(r); if(t.id===excl) return false; return toMins(s)<toMins(t.endTime)&&toMins(e)>toMins(t.startTime) })

    const isBlockedBySchool = (s,e) => {
        const schoolBlocked = blockedWindows.some(w => toMins(s)<toMins(w.endTime)&&toMins(e)>toMins(w.startTime))
        const busyBlocked   = busySlotBlocks.some(b => toMins(s)<toMins(b.endTime)&&toMins(e)>toMins(b.startTime))
        return schoolBlocked || busyBlocked
    }

    const isOverdue = (t) => {
        if (t.completed) return false
        if (isPastDay(activeDay)) return true
        if (isTodayDay(activeDay)) { const n = new Date(); return toMins(t.endTime) < n.getHours()*60+n.getMinutes() }
        return false
    }

    const getMaxDailyStudyMins = (className, weekend) => {
        if (!className) return 120
        const match = className.match(/(\d{1,2})/); const n = match ? parseInt(match[1]) : 8
        const caps = weekend ? [[2,90],[4,120],[6,180],[8,240],[10,300],[12,360]] : [[2,60],[4,90],[6,120],[8,180],[10,240],[12,300]]
        for (const [max,mins] of caps) if (n<=max) return mins; return 300
    }

    const activeDayIsLocked = isPastDay(activeDay)
    const normTasks  = tasks[activeDay].map(normaliseTask)
    const totalT     = normTasks.length
    const doneT      = normTasks.filter(t => t.completed).length
    const pct        = totalT > 0 ? Math.round((doneT/totalT)*100) : 0
    const incomplete = tasks[activeDay].filter(t => !t.completed).length
    const sorted     = [...normTasks].sort((a,b) => a.startTime.localeCompare(b.startTime))
    const tMins      = totalMins()
    const tHrs       = Math.floor(tMins/60)
    const tMin       = tMins % 60
    const nextDay    = DAYS[(DAYS.indexOf(activeDay)+1)%7]
    const maxDailyStudyMins = getMaxDailyStudyMins(user?.className, activeDay==='Saturday'||activeDay==='Sunday')

    const typeColors = {
        Study:   { bg:'bg-blue-500',    light:'bg-blue-100',   text:'text-blue-700',   border:'border-blue-200' },
        Wellness:{ bg:'bg-emerald-500',  light:'bg-emerald-100',text:'text-emerald-700',border:'border-emerald-200' },
        Other:   { bg:'bg-violet-400',   light:'bg-violet-100', text:'text-violet-600', border:'border-violet-200' },
    }
    const urgencyColors = {
        URGENT:  'bg-red-100 text-red-700 border-red-200',
        UPCOMING:'bg-yellow-100 text-yellow-700 border-yellow-200',
        NORMAL:  'bg-green-100 text-green-700 border-green-200',
    }
    const suggestionTypeStyle = {
        STUDY:   { badge: 'bg-blue-100 text-blue-700 border-blue-200' },
        WELLNESS:{ badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
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
        const dayStartMins = isTodayDay(activeDay) ? currentTimeMins : 6*60
        const tryFindSlot = (searchStart, searchEnd) => {
            for (let startMins = Math.max(searchStart,dayStartMins); startMins <= searchEnd-durationMins; startMins += 15) {
                const endMins   = startMins + durationMins
                const startTime = `${String(Math.floor(startMins/60)).padStart(2,'0')}:${String(startMins%60).padStart(2,'0')}`
                const endTime   = `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`
                if (isBlockedBySchool(startTime,endTime)) continue
                if (hasOverlap(activeDay,startTime,endTime)) continue
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
    }, [normTasks, blockedWindows, busySlotBlocks, activeDay, currentTimeMins, preferredStudyTime])

    const handleQuickAdd = async (suggestion, index) => {
        if (activeDayIsLocked) return
        const key = suggestion.title; const durationMins = suggestion.estimatedMinutes || 45
        const slot = findFreeSlot(durationMins, suggestion.taskType)
        if (!slot) { setSuggestionTimePicker({index,startTime:'15:00',endTime:'15:45',error:'No auto-slot found. Pick a time manually.'}); return }
        setSuggestionStates(p => ({...p,[key]:'adding'}))
        try {
            const saved = await addTask(user.id, activeDay, suggestion.title, slot.startTime, slot.endTime, '')
            setTasks(prev => ({...prev,[activeDay]:[...prev[activeDay],{...saved,completed:false}]}))
            setSuggestions(prev => prev.filter((_,i) => i!==index))
            setSuggestionStates(p => ({...p,[key]:'added'}))
            setTimeout(() => setRecsTrigger(t => t+1), 400)
        } catch (err) {
            setSuggestionStates(p => ({...p,[key]:'idle'}))
            setSuggestionTimePicker({index,startTime:slot.startTime,endTime:slot.endTime,error:err.message||'Could not auto-schedule. Pick a time manually.'})
        }
    }

    const confirmTimePicker = async () => {
        if (!suggestionTimePicker || activeDayIsLocked) return
        const { index, startTime, endTime } = suggestionTimePicker; const suggestion = suggestions[index]; const key = suggestion.title
        if (toMins(endTime)<=toMins(startTime))       { setSuggestionTimePicker(p=>({...p,error:'End time must be after start time.'})); return }
        if (isBlockedBySchool(startTime,endTime))      { setSuggestionTimePicker(p=>({...p,error:'This slot is blocked.'})); return }
        if (hasOverlap(activeDay,startTime,endTime))   { setSuggestionTimePicker(p=>({...p,error:'This slot overlaps with another task.'})); return }
        setSuggestionStates(p => ({...p,[key]:'adding'}))
        try {
            const saved = await addTask(user.id, activeDay, suggestion.title, startTime, endTime, '')
            setTasks(prev => ({...prev,[activeDay]:[...prev[activeDay],{...saved,completed:false}]}))
            setSuggestions(prev => prev.filter((_,i) => i!==index)); setSuggestionTimePicker(null)
            setTimeout(() => setRecsTrigger(t => t+1), 400)
            if (saved.warnings?.length>0) { setDayWarnings(saved.warnings); setTimeout(()=>setDayWarnings([]),6000) }
        } catch (err) {
            setSuggestionTimePicker(p=>({...p,error:err.message||'Could not save task.'}))
            setSuggestionStates(p=>({...p,[key]:'idle'}))
        }
    }

    const handleAdd = async () => {
        if (activeDayIsLocked) return; setOverlapError(''); setAddWarnings([])
        if (!newTask.title||!newTask.startTime||!newTask.endTime) return
        if (toMins(newTask.endTime)<=toMins(newTask.startTime)) { setOverlapError('End time must be after start time.'); return }
        if (isBlockedBySchool(newTask.startTime,newTask.endTime)) { setOverlapError('This time slot is blocked.'); return }
        setIsSaving(true)
        try {
            const saved = await addTask(user.id, activeDay, newTask.title, newTask.startTime, newTask.endTime, newTask.notes)
            setTasks(prev => ({...prev,[activeDay]:[...prev[activeDay],{...saved,completed:false}]}))
            if (saved.warnings?.length>0) {
                setAddWarnings(saved.warnings); setDayWarnings(saved.warnings)
                setTimeout(()=>{ setAddWarnings([]); setShowAddTask(false); setNewTask({startTime:'09:00',endTime:'10:00',title:'',notes:''}) }, 4000)
                setTimeout(()=>setDayWarnings([]), 8000)
            } else { setNewTask({startTime:'09:00',endTime:'10:00',title:'',notes:''}); setShowAddTask(false) }
            setTimeout(()=>setRecsTrigger(t=>t+1), 400)
        } catch (err) { setOverlapError(err.message||'Could not save task.') }
        finally { setIsSaving(false) }
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation(); if (activeDayIsLocked) return
        try {
            await deleteTask(id)
            setTasks(prev => ({...prev,[activeDay]:prev[activeDay].filter(t=>t.id!==id)}))
            if (expandedTask===id) setExpandedTask(null)
            setTimeout(()=>setRecsTrigger(t=>t+1), 400)
        } catch (err) { console.error('Delete failed:', err.message) }
    }

    const toggleDone = async (id) => {
        if (activeDayIsLocked) return
        try {
            const saved = await toggleTaskComplete(id)
            setTasks(prev => ({...prev,[activeDay]:prev[activeDay].map(t => t.id===id?{...t,completed:saved.completed}:t)}))
        } catch (err) { console.error('Toggle failed:', err.message) }
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
            const saved = await editTask(editingTask.id, user.id, activeDay, editData.title, editData.startTime, editData.endTime, editData.notes)
            setTasks(prev => ({...prev,[activeDay]:prev[activeDay].map(t => t.id===editingTask.id?{...t,...saved}:t)}))
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
        if (hasOverlap(nextDay,t.startTime,t.endTime)) return false
        if (pushNonConflicts.some(x => toMins(t.startTime)<toMins(x.endTime)&&toMins(t.endTime)>toMins(x.startTime))) return false
        if (pushConflicts.some(x => { if(x.id===id) return false; const o=conflictTimes[x.id]; if(!o) return false; return toMins(t.startTime)<toMins(o.endTime)&&toMins(t.endTime)>toMins(o.startTime) })) return false
        return true
    }

    const initPush = () => {
        if (activeDayIsLocked) return
        const inc = tasks[activeDay].filter(t => !t.completed).map(normaliseTask)
        const nc  = inc.filter(t => !hasOverlap(nextDay,t.startTime,t.endTime))
        const c   = inc.filter(t =>  hasOverlap(nextDay,t.startTime,t.endTime))
        setPushNonConflicts(nc); setPushConflicts(c)
        const init = {}; c.forEach(t => { init[t.id] = {startTime:t.startTime,endTime:t.endTime} })
        setConflictTimes(init); setPushError(''); setShowPushModal(true)
    }

    const doPush = () => {
        setPushError('')
        for (const t of pushConflicts) {
            if (toMins(conflictTimes[t.id].endTime)<=toMins(conflictTimes[t.id].startTime)) { setPushError(`"${t.title}" has invalid times.`); return }
            if (!isValidConflict(t.id)) { setPushError(`"${t.title}" still conflicts.`); return }
        }
        const toMove = [
            ...pushNonConflicts.map(t => ({...t,id:Date.now()+Math.random()})),
            ...pushConflicts.map(t => ({...t,...conflictTimes[t.id],id:Date.now()+Math.random()}))
        ]
        setTasks(p => ({...p,[activeDay]:p[activeDay].filter(t=>t.completed),[nextDay]:[...p[nextDay],...toMove]}))
        setShowPushModal(false); setPushNonConflicts([]); setPushConflicts([]); setConflictTimes({}); setPushError('')
    }

    const closePush = () => { setShowPushModal(false); setPushNonConflicts([]); setPushConflicts([]); setConflictTimes({}); setPushError('') }

    const schoolBlocks = blockedWindows.map((w,i) => ({id:`school-${i}`,title:'School Hours',startTime:w.startTime,endTime:w.endTime,isSchoolBlock:true,isBusyBlock:false,completed:false}))
    const busyBlocks   = busySlotBlocks.map((b,i) => ({id:`busy-${i}`,title:b.reason||'Busy',startTime:b.startTime,endTime:b.endTime,isSchoolBlock:false,isBusyBlock:true,completed:false}))
    const allItems     = [...sorted,...schoolBlocks,...busyBlocks].sort((a,b) => a.startTime.localeCompare(b.startTime))

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
        <div className="font-lora relative">

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
                <div>
                    <h1 className="text-3xl font-black text-black mb-2">My Schedule 📅</h1>
                    <p className="text-gray-600 font-medium">Plan your week for success and balance</p>
                </div>
                <button
                    onClick={() => setShowEditPrefs(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-violet-200 hover:border-violet-400 hover:bg-violet-50 transition-all flex-shrink-0 shadow-sm"
                    title="Edit Preferences"
                >
                    <Cog6ToothIcon className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-bold text-violet-700 hidden sm:inline">Preferences</span>
                    {preferredStudyTime && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">
                            {STUDY_TIME_OPTIONS.find(o => o.value === preferredStudyTime)?.emoji}
                            {STUDY_TIME_OPTIONS.find(o => o.value === preferredStudyTime)?.label}
                        </span>
                    )}
                </button>
            </div>

            {upcomingExams.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    {upcomingExams.slice(0,3).map(exam => (
                        <div key={exam.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${urgencyColors[exam.urgency]||urgencyColors.NORMAL}`}>
                            <AcademicCapIcon className="w-3.5 h-3.5" />{exam.subjectName} exam in {exam.daysRemaining} day{exam.daysRemaining===1?'':'s'}
                        </div>
                    ))}
                </div>
            )}

            {totalT > 0 && (
                <div className="mb-6 bg-white border-2 border-violet-200 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-black text-sm">{activeDay}'s Progress</span>
                            {pct===100 && <span className="text-xs bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-full border border-green-200">✓ All done!</span>}
                            {tMins>0 && <span className="text-xs bg-violet-50 text-violet-500 font-black px-2 py-0.5 rounded-full border border-violet-100">⏱ {tHrs>0?`${tHrs}h `:''}{tMin>0?`${tMin}m`:''} scheduled</span>}
                        </div>
                        <span className="text-sm font-bold text-black">{doneT}/{totalT} tasks</span>
                    </div>
                    <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-700 ease-out bg-gradient-to-r from-green-400 to-emerald-500" style={{width:`${pct}%`}} />
                    </div>
                    <div className="relative h-1.5 mt-2">
                        {[25,50,75,100].map(m => (
                            <span key={m} className={`absolute text-[10px] font-bold -translate-x-1/2 ${pct>=m?'text-green-500':'text-gray-300'}`} style={{left:`${m}%`}}>{m}%</span>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 bg-white border-2 border-violet-200 rounded-2xl p-4 h-fit">
                    <div className="space-y-2">
                        {DAYS.map(day => {
                            const dt = tasks[day]; const dc = dt.filter(t => t.completed).length
                            const dp = dt.length > 0 ? (dc/dt.length)*100 : 0
                            const isActive = activeDay===day; const isPast = isPastDay(day); const isToday = isTodayDay(day)
                            return (
                                <button key={day} onClick={() => setActiveDay(day)}
                                    className={`group w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                                        isActive
                                            ? isPast ? 'bg-white text-gray-400 border-2 border-gray-200 shadow-sm'
                                                     : 'bg-white text-black border-2 border-violet-500 shadow-lg shadow-violet-100'
                                            : isPast  ? 'text-gray-400 bg-gray-50 border-2 border-gray-100 opacity-60 hover:opacity-80'
                                            : isToday ? 'text-black hover:bg-violet-50 border-2 border-violet-200'
                                                      : 'text-black hover:bg-[#f3f0fb] border-2 border-transparent'
                                    }`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <span>{day}</span>
                                            {isToday && <span className="text-[9px] font-black bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Today</span>}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${isPast?'bg-gray-100 text-gray-400':'bg-violet-100 text-violet-500'}`}>{dt.length}</span>
                                    </div>
                                    {dt.length > 0 && (
                                        <div className="h-1 rounded-full overflow-hidden bg-gray-100">
                                            <div className="h-full rounded-full transition-all duration-500 bg-green-400" style={{width:`${dp}%`}} />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white border-2 border-violet-200 rounded-2xl p-6 min-h-[600px]">

                        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-2xl font-black text-black">{activeDay}'s Plan</h2>
                                {isTodayDay(activeDay) && <span className="text-xs font-black bg-violet-100 text-violet-600 border border-violet-200 px-3 py-1.5 rounded-full">📅 Today</span>}
                            </div>
                            {!activeDayIsLocked && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {incomplete > 0 && (
                                        <button onClick={initPush} className="flex items-center gap-2 bg-purple-50 text-purple-600 border-2 border-purple-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-100 transition-all">
                                            <ArrowRightIcon className="w-4 h-4" />Push {incomplete} to {nextDay}
                                        </button>
                                    )}
                                    <button onClick={() => { setShowAddTask(true); setOverlapError(''); setAddWarnings([]) }}
                                        className="bg-black text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all flex items-center gap-2">
                                        <PlusIcon className="w-4 h-4" />Add Activity
                                    </button>
                                </div>
                            )}
                        </div>

                        {allItems.length===0 && suggestions.length===0 && !recsLoading && (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mb-4"><CalendarIcon className="w-8 h-8 text-violet-300" /></div>
                                <p className="text-gray-500 font-medium">No plans for {activeDay}</p>
                                {activeDayIsLocked
                                    ? <p className="text-sm text-gray-400 mt-1">Nothing was recorded for this day.</p>
                                    : <>
                                        <p className="text-sm text-violet-400 mb-4">Add your first activity to get started!</p>
                                        <button onClick={() => { setShowAddTask(true); setOverlapError(''); setAddWarnings([]) }}
                                            className="flex items-center gap-2 text-sm text-violet-500 font-bold bg-violet-50 px-4 py-2 rounded-xl border border-violet-200 hover:bg-violet-100 transition-colors cursor-pointer">
                                            <PlusIcon className="w-4 h-4" />Add your first activity
                                        </button>
                                      </>
                                }
                            </div>
                        )}

                        {allItems.length > 0 && (
                            <div className="space-y-3 mb-6">
                                {allItems.map(task => {
                                    if (task.isSchoolBlock) {
                                        const dur = getDur(task.startTime,task.endTime)
                                        return (
                                            <div key={task.id} className={`border-2 rounded-xl bg-white ${activeDayIsLocked?'border-orange-100 opacity-80':'border-orange-200'}`}>
                                                <div className="flex items-center gap-3 p-4">
                                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${activeDayIsLocked?'border-orange-200':'border-orange-300'}`}>
                                                        <ClockIcon className="w-4 h-4 text-orange-400" />
                                                    </div>
                                                    <div className="w-1 h-10 rounded-full flex-shrink-0 bg-orange-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h3 className="font-bold text-lg text-black">School Hours</h3>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {dur && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{dur}</span>}
                                                                <span className="text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide bg-orange-100 text-orange-600">School</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-medium mt-0.5 text-gray-500">{fmtTime(task.startTime)} → {fmtTime(task.endTime)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    if (task.isBusyBlock) {
                                        const dur = getDur(task.startTime,task.endTime)
                                        return (
                                            <div key={task.id} className={`border-2 rounded-xl bg-white ${activeDayIsLocked?'border-red-100 opacity-80':'border-red-200'}`}>
                                                <div className="flex items-center gap-3 p-4">
                                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${activeDayIsLocked?'border-red-200':'border-red-300'}`}>
                                                        <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                                                    </div>
                                                    <div className="w-1 h-10 rounded-full flex-shrink-0 bg-red-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h3 className="font-bold text-lg text-black">{task.title}</h3>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {dur && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{dur}</span>}
                                                                <span className="text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide bg-red-100 text-red-600">Busy</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-medium mt-0.5 text-gray-500">{fmtTime(task.startTime)} → {fmtTime(task.endTime)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }

                                    const detectedType = task.detectedType ? task.detectedType.charAt(0).toUpperCase()+task.detectedType.slice(1).toLowerCase() : 'Other'
                                    const colors = typeColors[detectedType] || typeColors.Other
                                    const overdue = isOverdue(task); const dur = getDur(task.startTime,task.endTime)
                                    const isExp = expandedTask===task.id; const hasNote = task.notes?.trim().length>0

                                    return (
                                        <div key={task.id} className={`border-2 rounded-xl transition-all duration-300 ${
                                            activeDayIsLocked ? `bg-white ${task.completed?colors.border:'border-gray-200'}` : task.completed ? `bg-white ${colors.border}` : 'bg-gray-50 border-gray-300'
                                        }`}>
                                            <div className={`group flex items-center gap-3 p-4 ${activeDayIsLocked?'cursor-default':'cursor-pointer hover:opacity-90'}`}
                                                onClick={() => !activeDayIsLocked && toggleDone(task.id)}>
                                                <button disabled={activeDayIsLocked} onClick={e=>{e.stopPropagation();if(!activeDayIsLocked)toggleDone(task.id)}}
                                                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                                        task.completed?'bg-green-500 border-green-500 text-white':activeDayIsLocked?'border-gray-200 bg-white cursor-default':'border-gray-300 bg-white opacity-70 group-hover:opacity-100'
                                                    }`}>
                                                    {task.completed && <CheckCircleIcon className="w-5 h-5" />}
                                                </button>
                                                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${activeDayIsLocked?(task.completed?colors.bg:'bg-gray-200'):colors.bg}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h3 className={`font-bold text-lg ${task.completed?'text-black':activeDayIsLocked?'text-gray-500':'text-gray-400'}`}>{task.title}</h3>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            {overdue&&!task.completed&&<span className="text-xs bg-red-100 text-red-600 font-black px-2 py-0.5 rounded-full border border-red-200">⏰ Overdue</span>}
                                                            {dur&&<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{dur}</span>}
                                                            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide ${activeDayIsLocked?'bg-gray-100 text-gray-400':`${colors.light} ${colors.text}`}`}>{detectedType}</span>
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm font-medium mt-0.5 ${task.completed?'text-gray-500':'text-gray-400'}`}>{fmtTime(task.startTime)} → {fmtTime(task.endTime)}</p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button onClick={e=>{e.stopPropagation();setExpandedTask(isExp?null:task.id)}}
                                                        className={`p-2 rounded-lg transition-all ${isExp?'bg-violet-100 text-violet-500':hasNote?'text-violet-300 hover:bg-violet-50':'text-gray-300 hover:text-gray-400 hover:bg-gray-50'}`}>
                                                        {isExp?<ChevronUpIcon className="w-4 h-4"/>:<ChevronDownIcon className="w-4 h-4"/>}
                                                    </button>
                                                    {!activeDayIsLocked && (<>
                                                        <button onClick={e=>openEdit(e,task)} className="p-2 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition-all"><PencilIcon className="w-4 h-4"/></button>
                                                        <button onClick={e=>handleDelete(e,task.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"><TrashIcon className="w-4 h-4"/></button>
                                                    </>)}
                                                </div>
                                            </div>
                                            {isExp && (
                                                <div className="px-4 pb-4">
                                                    <div className="h-px bg-gray-100 mb-3" />
                                                    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-3">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">📝 Notes</p>
                                                        {hasNote
                                                            ? <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{task.notes}</p>
                                                            : <p className="text-sm text-gray-300 italic">No notes recorded.</p>
                                                        }
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {dayWarnings.length > 0 && (
                            <div className="mb-4 space-y-2">
                                {dayWarnings.map((w,i) => (
                                    <div key={i} className="flex items-start gap-3 px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl">
                                        <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">⚠️</span>
                                        <p className="text-sm font-medium text-amber-700 leading-snug">{w.replace(/^⚠\s*/,'')}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!activeDayIsLocked && (recsLoading || suggestions.length > 0) && (() => {
                            const filteredSuggestions = recsLoading ? [] : suggestions.filter(s => {
                                const alreadyAdded = normTasks.some(t => t.title?.toLowerCase()===s.title?.toLowerCase())
                                if (alreadyAdded) return false
                                if (isTodayDay(activeDay)) {
                                    const durationMins = s.estimatedMinutes || 45
                                    if (currentTimeMins + durationMins > 22*60) return false
                                    if (s.taskType==='STUDY' && preferredStudyTime) {
                                        const prefWindowEnds = { MORNING:12*60, AFTERNOON:17*60, EVENING:21*60, NIGHT:23*60 }
                                        const windowEnd = prefWindowEnds[preferredStudyTime]
                                        if (windowEnd && currentTimeMins >= windowEnd) return false
                                    }
                                }
                                if (s.taskType==='STUDY') {
                                    const studyTasksToday = normTasks.filter(t => t.detectedType?.toLowerCase()==='study')
                                    if (studyTasksToday.length >= 3) return false
                                }
                                return true
                            })

                            return (
                                <div className="mt-2 rounded-2xl overflow-hidden border border-violet-100 shadow-sm">
                                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"><SparklesIcon className="w-5 h-5 text-white"/></div>
                                                <div>
                                                    <p className="text-white font-black text-sm tracking-wide">AI Study Planner</p>
                                                    <p className="text-violet-200 text-[11px] font-medium">Personalised suggestions for {activeDay}</p>
                                                </div>
                                            </div>
                                            {!recsLoading && filteredSuggestions.length > 0 && (
                                                <span className="bg-white/20 text-white text-xs font-black px-2.5 py-1 rounded-full backdrop-blur-sm">{filteredSuggestions.length} task{filteredSuggestions.length>1?'s':''}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-b from-violet-50/60 to-white px-4 py-4 space-y-2">
                                        {recsLoading && (
                                            <div className="flex items-center gap-3 py-4 justify-center">
                                                <div className="flex gap-1">
                                                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                                                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                                                    <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                                                </div>
                                                <span className="text-sm text-violet-500 font-medium">Analysing your schedule...</span>
                                            </div>
                                        )}
                                        {filteredSuggestions.map((s, i) => {
                                            const state = suggestionStates[s.title] || 'idle'
                                            const isPickerOpen = suggestionTimePicker?.index === i
                                            const style = getSuggestionStyle(s.taskType)
                                            const typeEmoji = s.taskType==='WELLNESS'?'🧘':s.taskType==='OTHER'?'📋':'📚'
                                            const typeLabel = s.taskType==='WELLNESS'?'Wellness':s.taskType==='OTHER'?'Other':'Study'
                                            return (
                                                <div key={s.title} className="group">
                                                    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition-all duration-200 ${
                                                        state==='added'?'bg-green-50 border-green-200':state==='error'?'bg-red-50 border-red-200':
                                                        isPickerOpen?'bg-white border-violet-300 shadow-sm':'bg-white border-gray-100 hover:border-violet-200 hover:shadow-sm'
                                                    }`}>
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${s.taskType==='WELLNESS'?'bg-emerald-100':s.taskType==='OTHER'?'bg-violet-100':'bg-blue-100'}`}>{typeEmoji}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-bold truncate ${state==='added'?'text-green-700':'text-gray-800'}`}>{state==='added'?'✓ Added!':s.title}</p>
                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                <span className="text-[10px] text-gray-400 font-medium">~{s.estimatedMinutes}min</span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>{typeLabel}</span>
                                                                <span className="text-[10px] text-gray-400">·</span>
                                                                <span className="text-[10px] text-gray-500 font-medium italic">{s.reasonLabel}</span>
                                                            </div>
                                                        </div>
                                                        {state==='adding' && <div className="w-16 h-8 flex items-center justify-center"><div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin"/></div>}
                                                        {state==='added' && <div className="w-16 h-8 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircleIcon className="w-4 h-4 text-white"/></div>}
                                                        {(state==='idle'||state==='error') && !isPickerOpen && (
                                                            <button onClick={() => handleQuickAdd(s,i)} className="shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm">
                                                                <PlusIcon className="w-3.5 h-3.5"/>Add
                                                            </button>
                                                        )}
                                                    </div>
                                                    {isPickerOpen && (
                                                        <div className="mx-1 mt-1 bg-violet-50 border-2 border-violet-200 rounded-xl p-4">
                                                            <p className="text-xs text-violet-600 font-bold mb-3">📅 Pick a time for "{s.title}"</p>
                                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                                <TimeSelect label="Start Time" value={suggestionTimePicker.startTime} onChange={v=>setSuggestionTimePicker(p=>({...p,startTime:v,error:''}))}/>
                                                                <TimeSelect label="End Time" value={suggestionTimePicker.endTime} onChange={v=>setSuggestionTimePicker(p=>({...p,endTime:v,error:''}))}/>
                                                            </div>
                                                            {suggestionTimePicker.error && <p className="text-xs text-red-500 font-medium mb-2">⚠️ {suggestionTimePicker.error}</p>}
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setSuggestionTimePicker(null)} className="flex-1 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                                                                <button onClick={confirmTimePicker} className="flex-1 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 flex items-center justify-center gap-1">
                                                                    <PlusIcon className="w-3.5 h-3.5"/> Add to Plan
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        {!recsLoading && filteredSuggestions.length===0 && (
                                            <div className="text-center py-4"><p className="text-sm text-violet-400 font-medium">✨ All suggestions added for {activeDay}!</p></div>
                                        )}
                                        {!recsLoading && filteredSuggestions.length > 0 && (
                                            <p className="text-[10px] text-gray-400 text-center pt-1 font-medium">Powered by EmpathAI · Based on your exams, goals & schedule</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* ── Edit Task Modal ── */}
            {editingTask && !activeDayIsLocked && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm border-2 border-violet-200 shadow-xl">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center"><PencilIcon className="w-4 h-4 text-violet-500"/></div>
                            <h3 className="text-xl font-black text-black">Edit Activity</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Activity Name</label>
                                <input autoFocus type="text" value={editData.title} onChange={e=>setEditData({...editData,title:e.target.value})} className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-200 outline-none"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <TimeSelect label="Start Time" value={editData.startTime} onChange={v=>setEditData({...editData,startTime:v})}/>
                                <TimeSelect label="End Time" value={editData.endTime} onChange={v=>setEditData({...editData,endTime:v})}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Notes <span className="text-gray-400 font-medium">(optional)</span></label>
                                <textarea value={editData.notes} onChange={e=>setEditData({...editData,notes:e.target.value})} rows={3} className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-200 outline-none resize-none text-sm"/>
                            </div>
                            {editError && <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-red-600 text-sm font-medium">⚠️ {editError}</div>}
                            {editWarnings.length > 0 && (
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-2 text-amber-700 text-sm font-medium space-y-1">
                                    {editWarnings.map((w,i) => <p key={i}>⚠️ {w}</p>)}
                                    <p className="text-xs text-amber-500 font-normal">Changes saved — closing in a moment...</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setEditingTask(null)} className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                            <button onClick={saveEdit} disabled={!editData.title||isSaving} className="flex-1 bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSaving?'Saving...':'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Task Modal ── */}
            {showAddTask && !activeDayIsLocked && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm border-2 border-violet-200 shadow-xl">
                        <h3 className="text-xl font-black text-black mb-4">Add New Activity</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Activity Name</label>
                                <input autoFocus type="text" value={newTask.title} onChange={e=>setNewTask({...newTask,title:e.target.value})} placeholder="e.g. Math Revision" className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-200 outline-none"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <TimeSelect label="Start Time" value={newTask.startTime} onChange={v=>setNewTask({...newTask,startTime:v})}/>
                                <TimeSelect label="End Time" value={newTask.endTime} onChange={v=>setNewTask({...newTask,endTime:v})}/>
                            </div>
                            {(blockedWindows.length>0||busySlotBlocks.length>0) && (
                                <div className="space-y-1.5">
                                    {blockedWindows.length>0 && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
                                            <ClockIcon className="w-3.5 h-3.5 text-orange-400 shrink-0"/>
                                            <p className="text-xs text-orange-600 font-medium">School: {blockedWindows.map(w=>`${fmtTime(w.startTime)}–${fmtTime(w.endTime)}`).join(', ')}</p>
                                        </div>
                                    )}
                                    {busySlotBlocks.length>0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400 shrink-0"/>
                                            <p className="text-xs text-red-600 font-medium">Busy: {busySlotBlocks.map(b=>`${fmtTime(b.startTime)}–${fmtTime(b.endTime)} (${b.reason||'Busy'})`).join(', ')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Notes <span className="text-gray-400 font-medium">(optional)</span></label>
                                <textarea value={newTask.notes} onChange={e=>setNewTask({...newTask,notes:e.target.value})} rows={2} className="w-full px-4 py-2 rounded-xl border-2 border-gray-100 focus:border-violet-200 outline-none resize-none text-sm"/>
                            </div>
                            {overlapError && <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-red-600 text-sm font-medium">⚠️ {overlapError}</div>}
                            {addWarnings.length > 0 && (
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-2 text-amber-700 text-sm font-medium space-y-1">
                                    {addWarnings.map((w,i) => <p key={i}>⚠️ {w}</p>)}
                                    <p className="text-xs text-amber-500 font-normal">Task saved — closing in a moment...</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setShowAddTask(false); setOverlapError(''); setAddWarnings([]) }} className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                            <button onClick={handleAdd} disabled={!newTask.title||isSaving} className="flex-1 bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSaving?'Saving...':'Add Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Push Modal ── */}
            {showPushModal && !activeDayIsLocked && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md border-2 border-amber-200 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center"><ArrowRightIcon className="w-5 h-5 text-amber-600"/></div>
                            <div>
                                <h3 className="text-lg font-black text-black">Push to {nextDay}</h3>
                                <p className="text-xs text-gray-500 font-medium">Moving {pushNonConflicts.length+pushConflicts.length} task(s)</p>
                            </div>
                        </div>
                        {pushNonConflicts.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 bg-violet-400 rounded-full"/><span className="text-sm font-bold text-gray-700">Ready ({pushNonConflicts.length})</span></div>
                                <div className="space-y-2">
                                    {pushNonConflicts.map(t => (
                                        <div key={t.id} className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex justify-between">
                                            <span className="font-bold text-violet-800 text-sm">{t.title}</span>
                                            <span className="text-xs text-violet-500">{fmtTime(t.startTime)} → {fmtTime(t.endTime)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {pushConflicts.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2"><ExclamationTriangleIcon className="w-4 h-4 text-amber-500"/><span className="text-sm font-bold text-gray-700">Conflicts ({pushConflicts.length})</span></div>
                                <div className="space-y-3">
                                    {pushConflicts.map(task => {
                                        const ct = conflictTimes[task.id] || {startTime:task.startTime,endTime:task.endTime}
                                        const ok = isValidConflict(task.id)
                                        return (
                                            <div key={task.id} className={`border-2 rounded-xl p-3 ${ok?'bg-violet-50 border-violet-200':'bg-amber-50 border-amber-300'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-gray-800 text-sm">{task.title}</span>
                                                    {ok ? <span className="text-xs bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-full">✓ OK</span>
                                                        : <span className="text-xs bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full">⚠️ Conflict</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">Original: {fmtTime(task.startTime)} → {fmtTime(task.endTime)}</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-1">New Start</label>
                                                        <TimeSelect value={ct.startTime} onChange={v=>setConflictTimes(p=>({...p,[task.id]:{...p[task.id],startTime:v}}))}/>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-600 mb-1">New End</label>
                                                        <TimeSelect value={ct.endTime} onChange={v=>setConflictTimes(p=>({...p,[task.id]:{...p[task.id],endTime:v}}))}/>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {pushError && <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-red-600 text-sm font-medium mb-4">⚠️ {pushError}</div>}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5">
                            <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Total:</span><span className="font-black">{pushNonConflicts.length+pushConflicts.length}</span></div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={closePush} className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                            <button onClick={doPush} className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-600 flex items-center justify-center gap-2">
                                <ArrowRightIcon className="w-4 h-4"/>Push All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Floating ChatBuddy Button ── */}
            <div className="fixed bottom-6 right-6 z-40">
                <button onClick={() => setShowMiniChat(prev => !prev)}
                    className={`group relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
                        showMiniChat ? 'bg-gray-700 hover:bg-gray-800' : 'bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 hover:scale-110'
                    }`}>
                    {showMiniChat ? (
                        <XMarkIcon className="w-6 h-6 text-white" />
                    ) : (
                        <>
                            <SparklesIcon className="w-6 h-6 text-white" />
                            <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-20" />
                            <span className="absolute right-16 bg-black text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                                Ask Schedule Assistant
                            </span>
                        </>
                    )}
                </button>
            </div>

            {/* ── MiniChatBuddy ── */}
            {showMiniChat && (
                <MiniChatBuddy
                    user={user}
                    tasks={tasks}
                    upcomingExams={upcomingExams}
                    activeDay={activeDay}
                    onClose={() => setShowMiniChat(false)}
                    onTaskChanged={() => setRecsTrigger(t => t + 1)}
                />
            )}
        </div>
    )
}