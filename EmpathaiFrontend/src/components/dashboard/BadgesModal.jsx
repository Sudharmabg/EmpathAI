import { useState, useEffect } from 'react'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { fetchMyBadges } from '../../api/rewardsApi.js'

export function toDataUrl(imageBase64, imageType) {
    if (!imageBase64) return null
    return 'data:' + (imageType || 'image/png') + ';base64,' + imageBase64
}

export const BADGE_META = {
    login: { emoji: '🔑', color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Login Milestone' },
    intervention: { emoji: '💪', color: 'from-green-400 to-emerald-500', bg: 'bg-green-50', border: 'border-green-200', label: 'Wellbeing Milestone' },
    video: { emoji: '🎬', color: 'from-pink-400 to-rose-500', bg: 'bg-pink-50', border: 'border-pink-200', label: 'Video Completion' },
    module: { emoji: '📚', color: 'from-orange-400 to-amber-500', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Module Completion' },
    default: { emoji: '🏅', color: 'from-purple-400 to-violet-500', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Achievement' },
}

export function getBadgeMeta(triggerType) {
    return BADGE_META[triggerType] || BADGE_META.default
}

export function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function BadgesModal({ user }) {
    const [badges, setBadges] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeFilter, setActiveFilter] = useState('all')

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                setError('')
                const data = await fetchMyBadges()
                setBadges(data || [])
            } catch (e) {
                if (e.message.includes('Unauthorized')) setError('Session expired. Please log in again.')
                else if (e.message.includes('Forbidden')) setError('Access denied. Please contact support.')
                else setError('Could not load your badges. Please try again.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const filters = [
        { id: 'all', label: 'All' },
        { id: 'login', label: 'Login' },
        { id: 'intervention', label: 'Wellbeing' },
    ]

    const filtered = activeFilter === 'all' ? badges : badges.filter(b => b.triggerType === activeFilter)
    const earnedLoginValues = badges.filter(b => b.triggerType === 'login').map(b => parseInt(b.triggerValue))
    const maxLoginEarned = earnedLoginValues.length > 0 ? Math.max(...earnedLoginValues) : 0

    return (
        <div>
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-200">
                    <span className="text-3xl">🏆</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900">Your Badges</h3>
                <p className="text-sm text-gray-500 mt-1">
                    {badges.length === 0
                        ? 'Earn badges by logging in and completing sessions'
                        : `You have earned ${badges.length} badge${badges.length !== 1 ? 's' : ''} so far!`}
                </p>
            </div>

            {badges.some(b => b.triggerType === 'login') && (
                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-blue-700 uppercase tracking-wide">Login Journey</span>
                        <span className="text-xs font-bold text-blue-500">{maxLoginEarned} logins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {[1, 2, 5, 10, 25, 50, 100].map(m => {
                            const earned = earnedLoginValues.includes(m)
                            return (
                                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                                    <div className={'w-full h-2 rounded-full transition-all ' + (earned ? 'bg-blue-500' : 'bg-blue-100')} />
                                    <span className={'text-[9px] font-bold ' + (earned ? 'text-blue-600' : 'text-blue-200')}>{m}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {badges.length > 0 && (
                <div className="flex gap-2 mb-5">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={'px-3 py-1.5 rounded-full text-xs font-bold transition-all ' +
                                (activeFilter === f.id ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Loading your badges...</p>
                </div>
            ) : error ? (
                <div className="text-center py-8 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-sm text-red-600 font-medium mb-2">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">Retry</button>
                </div>
            ) : badges.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl opacity-40">🏅</span>
                    </div>
                    <h4 className="font-black text-gray-800 mb-2">No badges yet</h4>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">Keep logging in and completing your sessions to earn your first badge!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {filtered.map((badge) => {
                        const meta = getBadgeMeta(badge.triggerType)
                        return (
                            <div key={badge.id} className={'relative rounded-2xl border-2 ' + meta.border + ' ' + meta.bg + ' p-4 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow'}>
                                <div className={'w-14 h-14 rounded-xl bg-gradient-to-br ' + meta.color + ' flex items-center justify-center shadow-md overflow-hidden'}>
                                    {badge.imageBase64
                                        ? <img src={toDataUrl(badge.imageBase64, badge.imageType)} alt={badge.title} className="w-full h-full object-cover" />
                                        : <span className="text-2xl">{meta.emoji}</span>}
                                </div>
                                <h4 className="font-black text-gray-900 text-sm leading-tight">{badge.title}</h4>
                                {badge.description && <p className="text-[11px] text-gray-500 leading-snug">{badge.description}</p>}
                                <span className="inline-flex items-center gap-1 bg-white/80 border border-gray-200 rounded-full px-2 py-0.5 text-[10px] font-black text-gray-600">
                                    <ShieldCheckIcon className="w-3 h-3 text-green-500" />
                                    {meta.label}
                                </span>
                                {badge.earnedAt && <p className="text-[10px] text-gray-400">Earned {formatDate(badge.earnedAt)}</p>}
                                <span className="absolute top-2 right-2 text-xs">✨</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}