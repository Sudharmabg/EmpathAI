import { useState, useEffect } from 'react'
import { getLatestMood, getLatestSleep, saveMoodEntry, saveSleepEntry } from '../../api/wellnessApi.js'
import { completeIntervention } from '../../api/activitiesApi.js'

const MOOD_OPTIONS = [
    { emoji: '😊', label: 'Happy', value: 'happy' },
    { emoji: '😐', label: 'Okay', value: 'neutral' },
    { emoji: '😔', label: 'Sad', value: 'sad' },
    { emoji: '😰', label: 'Anxious', value: 'anxious' },
    { emoji: '😡', label: 'Angry', value: 'angry' },
]

const MOOD_EMOJI = { happy: '😊', neutral: '😐', sad: '😔', anxious: '😰', angry: '😡' }

const QUALITY_LABEL = { excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor' }

const QUALITY_COLOR = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    fair: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    poor: 'text-red-600 bg-red-50 border-red-200',
}

function getSleepLabel(h) {
    if (h < 4) return 'Very Low'
    if (h < 6) return 'Low'
    if (h < 7) return 'Fair'
    if (h < 9) return 'Good'
    return 'Excellent'
}

function getSleepColor(h) {
    if (h < 4) return 'text-red-600'
    if (h < 6) return 'text-orange-600'
    if (h < 7) return 'text-yellow-600'
    if (h < 9) return 'text-green-600'
    return 'text-blue-600'
}

function getSliderBg(h) {
    const pct = ((h - 1) / 11) * 100
    const colors = h < 4 ? '#ef4444' : h < 6 ? '#f97316' : h < 7 ? '#eab308' : h < 9 ? '#22c55e' : '#3b82f6'
    return `linear-gradient(to right, ${colors} 0%, ${colors} ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`
}

export default function RightSidebarPanel({ user }) {
    const [completedTasks, setCompletedTasks] = useState({})

    // Mood
    const [latestMood, setLatestMood] = useState(null)
    const [moodLoading, setMoodLoading] = useState(true)
    const [selectedMood, setSelectedMood] = useState(null)
    const [moodNote, setMoodNote] = useState('')
    const [moodSaving, setMoodSaving] = useState(false)
    const [moodSaved, setMoodSaved] = useState(false)

    // Sleep
    const [latestSleep, setLatestSleep] = useState(null)
    const [sleepLoading, setSleepLoading] = useState(true)
    const [sleepHours, setSleepHours] = useState(7)
    const [sleepQuality, setSleepQuality] = useState('')
    const [sleepSaving, setSleepSaving] = useState(false)
    const [sleepSaved, setSleepSaved] = useState(false)

    useEffect(() => {
        if (!user?.id) return
        getLatestMood(user.id)
            .then(data => setLatestMood(data))
            .catch(err => console.error('Failed to load latest mood:', err))
            .finally(() => setMoodLoading(false))

        getLatestSleep(user.id)
            .then(data => setLatestSleep(data))
            .catch(err => console.error('Failed to load latest sleep:', err))
            .finally(() => setSleepLoading(false))
    }, [user?.id])

    const saveMood = async () => {
        if (!selectedMood || !user?.id) return
        setMoodSaving(true)
        try {
            const saved = await saveMoodEntry(user.id, selectedMood, moodNote)
            setLatestMood(saved)
            setMoodSaved(true)
            setSelectedMood(null)
            setMoodNote('')
            setTimeout(() => setMoodSaved(false), 3000)
            await completeIntervention(user.id, 'mood').catch(e => console.error('mood intervention:', e))
        } catch (err) {
            console.error('Failed to save mood:', err)
        } finally {
            setMoodSaving(false)
        }
    }

    const saveSleep = async () => {
        if (!sleepQuality || !user?.id) return
        setSleepSaving(true)
        const totalMinutes = Math.round(sleepHours * 60)
        const bedMinutes = (7 * 60) - totalMinutes
        const bedHour = Math.floor(((bedMinutes % 1440) + 1440) % 1440 / 60)
        const bedMin = ((bedMinutes % 1440) + 1440) % 1440 % 60
        const bedtime = (bedHour < 10 ? '0' : '') + bedHour + ':' + (bedMin < 10 ? '0' : '') + bedMin
        try {
            const saved = await saveSleepEntry(user.id, bedtime, '07:00', sleepQuality)
            setLatestSleep(saved)
            setSleepSaved(true)
            setSleepQuality('')
            setSleepHours(7)
            setTimeout(() => setSleepSaved(false), 3000)
            await completeIntervention(user.id, 'sleep').catch(e => console.error('sleep intervention:', e))
        } catch (err) {
            console.error('Failed to save sleep:', err)
        } finally {
            setSleepSaving(false)
        }
    }

    return (
        <div className="font-lora">

            {/* Mood Tracker */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-400 rounded-full" />How are you feeling?
                </h3>
                <div className="bg-white border-2 border-purple-200 rounded-xl p-4">
                    {moodLoading ? (
                        <div className="flex justify-center py-3">
                            <div className="w-5 h-5 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                        </div>
                    ) : moodSaved ? (
                        <div className="text-center py-2">
                            <span className="text-3xl">{MOOD_EMOJI[latestMood?.mood] || '😊'}</span>
                            <p className="text-sm text-green-600 font-bold mt-2">Mood saved!</p>
                        </div>
                    ) : (
                        <div>
                            {latestMood && !selectedMood && (
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                                    <span className="text-2xl">{MOOD_EMOJI[latestMood.mood] || '😐'}</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-700 capitalize">Last: {latestMood.mood}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(latestMood.loggedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between mb-3">
                                {MOOD_OPTIONS.map(mood => (
                                    <button
                                        key={mood.value}
                                        onClick={() => setSelectedMood(mood.value)}
                                        className={'flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ' +
                                            (selectedMood === mood.value ? 'bg-purple-100 scale-110 border-2 border-purple-400' : 'hover:bg-gray-50 border-2 border-transparent')}
                                    >
                                        <span className="text-2xl">{mood.emoji}</span>
                                        <span className="text-[9px] font-bold text-gray-500">{mood.label}</span>
                                    </button>
                                ))}
                            </div>
                            {selectedMood && (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={moodNote}
                                        onChange={e => setMoodNote(e.target.value)}
                                        placeholder="Add a note (optional)"
                                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                                    />
                                    <button onClick={saveMood} disabled={moodSaving} className="w-full bg-black text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                                        {moodSaving ? 'Saving...' : 'Save Mood'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sleep Tracker */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-400 rounded-full" />Last Night's Sleep
                </h3>
                <div className="bg-white border-2 border-purple-200 rounded-xl p-4">
                    {sleepLoading ? (
                        <div className="flex justify-center py-3">
                            <div className="w-5 h-5 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                        </div>
                    ) : sleepSaved ? (
                        <div className="text-center py-2">
                            <span className="text-3xl">🌙</span>
                            <p className="text-sm text-green-600 font-bold mt-2">Sleep logged!</p>
                        </div>
                    ) : (
                        <div>
                            {latestSleep && (
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                                    <span className="text-xl">🌙</span>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500">Last: {latestSleep.bedtime} - {latestSleep.wakeTime}</p>
                                        <span className={'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ' +
                                            (QUALITY_COLOR[latestSleep.quality] || 'text-gray-600 bg-gray-50 border-gray-200')}>
                                            {QUALITY_LABEL[latestSleep.quality] || latestSleep.quality}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="mb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-gray-700">Hours of sleep</span>
                                    <span className={'text-sm font-black ' + getSleepColor(sleepHours)}>
                                        {sleepHours}h — {getSleepLabel(sleepHours)}
                                    </span>
                                </div>
                                <input
                                    type="range" min="1" max="12" step="0.5"
                                    value={sleepHours}
                                    onChange={e => setSleepHours(parseFloat(e.target.value))}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                    style={{ background: getSliderBg(sleepHours) }}
                                />
                                <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                                    {['1h', '4h', '7h', '10h', '12h'].map(l => <span key={l}>{l}</span>)}
                                </div>
                            </div>
                            <div className="mb-3">
                                <p className="text-xs font-bold text-gray-700 mb-2">How did you sleep?</p>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {['poor', 'fair', 'good', 'excellent'].map(q => (
                                        <button
                                            key={q}
                                            onClick={() => setSleepQuality(q)}
                                            className={'px-2 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all capitalize ' +
                                                (sleepQuality === q
                                                    ? (QUALITY_COLOR[q] || 'text-gray-600 bg-gray-50 border-gray-200') + ' ring-2 ring-purple-300'
                                                    : 'text-gray-500 bg-gray-50 border-gray-100 hover:border-gray-300')}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={saveSleep}
                                disabled={!sleepQuality || sleepSaving}
                                className="w-full bg-black text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                {sleepSaving ? 'Saving...' : 'Log Sleep'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tasks */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Tasks to be done</h3>
                <div className="bg-white border-2 border-purple-200 rounded-xl p-4 space-y-3">
                    {[
                        { id: 'task1', text: 'Complete Math Chapter 5 exercises' },
                        { id: 'task2', text: 'Science project submission' },
                        { id: 'task3', text: 'English essay writing' },
                    ].map(task => (
                        <div key={task.id} className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                className="rounded text-green-600 focus:ring-green-500"
                                checked={completedTasks[task.id] || false}
                                onChange={() => setCompletedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                            />
                            <span className={'text-sm ' + (completedTasks[task.id] ? 'text-green-600 line-through' : 'text-gray-700')}>
                                {task.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full" />Recent Activity
                </h3>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
                    {[
                        { bg: 'bg-green-50/50', border: 'border-green-100', iconBg: 'bg-green-100', icon: '✓', iconColor: 'text-green-600', title: 'Completed Math Quiz', time: '2 hours ago' },
                        { bg: 'bg-blue-50/50', border: 'border-blue-100', iconBg: 'bg-blue-100', icon: '💬', iconColor: 'text-blue-600', title: 'ChatBuddy session', time: 'Yesterday' },
                        { bg: 'bg-primary/5', border: 'border-primary/10', iconBg: 'bg-primary/10', icon: '📝', iconColor: 'text-primary', title: 'Feelings Explorer', time: '2 days ago' },
                    ].map((item, i) => (
                        <div key={i} className={'flex items-center space-x-3 p-3 rounded-xl border ' + item.bg + ' ' + item.border}>
                            <div className={'w-10 h-10 ' + item.iconBg + ' rounded-lg flex items-center justify-center shrink-0'}>
                                <span className={'text-sm font-bold ' + item.iconColor}>{item.icon}</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{item.title}</p>
                                <p className="text-xs text-gray-500 font-medium">{item.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}