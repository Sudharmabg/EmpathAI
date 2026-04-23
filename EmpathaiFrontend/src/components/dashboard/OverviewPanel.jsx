import { useState, useEffect } from 'react'
import { ShieldCheckIcon, CalculatorIcon, BeakerIcon, BookOpenIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { fetchMyBadges } from '../../api/rewardsApi.js'
import { getBadgeMeta, toDataUrl, formatDate } from './BadgesModal.jsx'

export default function OverviewPanel({ user, setActiveTab }) {
    const [badges, setBadges] = useState([])
    const [badgesLoading, setBadgesLoading] = useState(true)
    const [badgesError, setBadgesError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                setBadgesLoading(true)
                setBadgesError('')
                const data = await fetchMyBadges()
                setBadges(data || [])
            } catch (err) {
                if (err.message.includes('Unauthorized')) setBadgesError('Session expired. Please log in again.')
                else if (err.message.includes('Forbidden')) setBadgesError('Access denied. Please contact support.')
                else setBadgesError('Could not load badges. Please refresh.')
            } finally {
                setBadgesLoading(false)
            }
        }
        load()
    }, [])

    const subjects = [
        { name: 'Mathematics', chapter: 'Algebra', progress: 75, icon: CalculatorIcon, color: 'blue' },
        { name: 'Science', chapter: 'Light & Sound', progress: 60, icon: BeakerIcon, color: 'green' },
        { name: 'English', chapter: 'Poetry', progress: 85, icon: BookOpenIcon, color: 'purple' },
        { name: 'Social Studies', chapter: 'Indian History', progress: 45, icon: GlobeAltIcon, color: 'orange' },
    ]

    return (
        <div className="font-lora">
            {/* Welcome */}
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-black text-dark-navy mb-1.5 tracking-tight">
                    Welcome back, {(user.name || user.firstName)?.split(' ')[0]}!
                </h1>
                <p className="text-base text-gray-500 font-medium tracking-tight">
                    Ready to continue your personalized emotional and academic journey?
                </p>
            </div>

            {/* Badges */}
            <div className="mb-10">
                <h2 className="text-lg font-black text-dark-navy mb-5 flex items-center justify-center gap-2">
                    <span className="w-6 h-1 bg-yellow-300 rounded-full" />Your Rewards and Badges<span className="w-6 h-1 bg-yellow-300 rounded-full" />
                </h2>
                {badgesLoading ? (
                    <div className="flex items-center justify-center py-10 gap-3">
                        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400 font-medium">Loading your badges...</p>
                    </div>
                ) : badgesError ? (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-center">
                        <p className="text-sm font-bold text-red-600 mb-2">{badgesError}</p>
                        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">Retry</button>
                    </div>
                ) : badges.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-purple-200 rounded-3xl p-8 text-center">
                        <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">🏅</div>
                        <h4 className="font-black text-gray-700 mb-1">No badges earned yet</h4>
                        <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">Keep logging in daily and completing wellbeing sessions to unlock your first badge!</p>
                        <div className="mt-4 flex justify-center gap-3 text-xs">
                            <span className="bg-blue-50 border border-blue-100 text-blue-600 font-bold px-3 py-1.5 rounded-full">Login milestones</span>
                            <span className="bg-green-50 border border-green-100 text-green-600 font-bold px-3 py-1.5 rounded-full">Wellbeing sessions</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {badges.map((badge) => {
                            const meta = getBadgeMeta(badge.triggerType)
                            return (
                                <div key={badge.id} className={'relative rounded-2xl border-2 ' + meta.border + ' ' + meta.bg + ' p-4 flex flex-col items-center text-center gap-2 hover:shadow-lg hover:-translate-y-1 transition-all duration-300'}>
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

            {/* Ongoing Learning */}
            <div className="mb-10 text-center">
                <h2 className="text-lg font-black text-dark-navy mb-6 flex items-center justify-center gap-2">
                    <span className="w-6 h-1 bg-purple-200 rounded-full" />Ongoing Learning<span className="w-6 h-1 bg-purple-200 rounded-full" />
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {subjects.slice(0, 2).map((subject, index) => (
                        <div key={index} className={'group bg-white p-5 rounded-3xl border-2 border-purple-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ' + (index === 0 ? 'lg:col-start-2' : '')}>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-[40px] -z-0" />
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className={'w-10 h-10 bg-' + subject.color + '-50 rounded-xl flex items-center justify-center group-hover:rotate-3 transition-transform shadow-sm'}>
                                        <subject.icon className={'w-5 h-5 text-' + subject.color + '-500'} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-base font-black text-dark-navy leading-none mb-1">{subject.name}</h3>
                                        <p className="text-gray-400 font-bold uppercase text-[7px] tracking-widest">Chapter: {subject.chapter}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-base font-black text-green-600 leading-none">{subject.progress}%</p>
                                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">Progress</p>
                                </div>
                            </div>
                            <div className="mb-4 relative z-10 px-1">
                                <div className="bg-purple-50 rounded-full h-1 overflow-hidden">
                                    <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: subject.progress + '%' }} />
                                </div>
                            </div>
                            <button className="w-fit mx-auto px-6 bg-black text-white font-black rounded-xl py-2.5 hover:bg-gray-800 transition-all relative z-10 text-[10px] uppercase tracking-widest shadow-md hover:shadow-lg active:scale-95">
                                Continue Learning
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mindfulness CTA */}
            <div className="mb-6">
                <div className="relative group overflow-hidden rounded-3xl border-2 border-purple-200 bg-purple-50/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-200/50 to-transparent" />
                    <div className="p-6 flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-3xl shadow-lg border-2 border-purple-200">🧘</div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-black text-dark-navy mb-1 italic">Feeling Overwhelmed?</h3>
                            <p className="text-gray-600 font-medium text-base leading-relaxed">Take a quick 5-minute mindfulness break to recalibrate your emotions.</p>
                        </div>
                        <button onClick={() => setActiveTab('activities')} className="bg-black text-white font-bold px-8 py-3 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-black/10 whitespace-nowrap text-sm">
                            Start Session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}