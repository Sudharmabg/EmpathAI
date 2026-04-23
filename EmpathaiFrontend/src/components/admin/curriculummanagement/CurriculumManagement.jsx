import { useState, useEffect, useRef } from 'react'
import {
    PlusIcon, TrashIcon, PencilIcon, VideoCameraIcon,
    DocumentTextIcon, ListBulletIcon, QuestionMarkCircleIcon,
    ChevronRightIcon, ChevronDownIcon, AcademicCapIcon,
    PhotoIcon, CheckCircleIcon, PlayIcon, ExclamationTriangleIcon,
    XMarkIcon, BookOpenIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import {
    getAllSyllabi, createSyllabus, updateSyllabus, deleteSyllabus,
    createModule, updateModule, deleteModule,
    createSubTopic, updateSubTopic, deleteSubTopic,
    syncQuizQuestions
} from '../../../api/curriculumApi'

const CLASS_LEVELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']

const SUBJECT_OPTIONS = [
    'Mathematics',
    'Science',
    'English',
    'Social Studies',
    'Hindi',
    'Art & Craft'
]

function splitObjectives(raw) {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(o => o && o.trim())
    return raw.split(/\n|\\n/).map(o => o.trim()).filter(o => o.length > 0)
}

function backendToFrontendQ(q) {
    const options = [q.optionA ?? '', q.optionB ?? '', q.optionC ?? '', q.optionD ?? '']
    return {
        id: `bq-${q.id}`,
        backendId: q.id,
        question: q.questionText,
        options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? ''
    }
}

const inputCls =
    'block w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm outline-none ' +
    'transition-all focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]'

const textareaCls =
    'block w-full border border-gray-300 rounded-lg py-2.5 px-3 text-sm outline-none ' +
    'transition-all focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]'

const innerInputCls =
    'block w-full border border-gray-200 rounded-lg py-2 px-3 text-sm outline-none ' +
    'transition-all focus:border-purple-500 focus:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]'

// ── Success Toast ─────────────────────────────────────

function SuccessToast({ message, onDismiss }) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 3500)
        return () => clearTimeout(t)
    }, [onDismiss])
    return (
        <div className="fixed top-5 right-5 z-[100] animate-[slideIn_0.25s_ease-out]">
            <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(-10px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
            <div className="flex items-center gap-3 bg-white border border-green-200 shadow-lg rounded-xl px-4 py-3 min-w-[260px] max-w-sm">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-800 flex-1">{message}</p>
                <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

// ── Field Error ───────────────────────────────────────

function FieldError({ msg }) {
    if (!msg) return null
    return (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />{msg}
        </p>
    )
}

// ── Tab Scroller ──────────────────────────────────────

function TabScroller({ tabs, currentTab, onTabChange }) {
    const scrollRef = useRef(null)
    const [canLeft, setCanLeft] = useState(false)
    const [canRight, setCanRight] = useState(false)

    const checkScroll = () => {
        const el = scrollRef.current
        if (!el) return
        setCanLeft(el.scrollLeft > 4)
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    useEffect(() => {
        const t = setTimeout(checkScroll, 50)
        const el = scrollRef.current
        if (el) el.addEventListener('scroll', checkScroll, { passive: true })
        window.addEventListener('resize', checkScroll)
        return () => { clearTimeout(t); if (el) el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll) }
    }, [tabs])

    return (
        <div className="relative border-b border-gray-200">
            <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200 bg-gradient-to-r from-white to-transparent" style={{ opacity: canLeft ? 1 : 0 }} />
            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200 bg-gradient-to-l from-white to-transparent" style={{ opacity: canRight ? 1 : 0 }} />
            <div ref={scrollRef} className="flex overflow-x-auto px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tabs.map(cls => (
                    <button key={cls} onClick={() => onTabChange(cls)}
                        className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap mr-2
                            ${currentTab === cls ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {cls}
                    </button>
                ))}
            </div>
        </div>
    )
}

// ── Generic Dropdown (reused for both Subject and Class Level) ────

function SelectDropdown({ value, onChange, options, placeholder = 'Select...' }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between rounded-lg py-2.5 px-3 text-sm transition-all outline-none border
                    ${open
                        ? 'border-purple-500 shadow-[0_0_0_3px_rgba(147,51,234,0.15)] bg-white'
                        : 'border-gray-300 bg-white hover:border-purple-400'
                    } ${!value ? 'text-gray-400' : 'text-gray-800 font-medium'}`}
            >
                <span>{value || placeholder}</span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-1.5 max-h-56 overflow-y-auto">
                        {options.map(opt => {
                            const isSelected = value === opt
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => { onChange(opt); setOpen(false) }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all
                                        ${isSelected
                                            ? 'bg-purple-600 text-white'
                                            : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                                        }`}
                                >
                                    <span>{opt}</span>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Class Level Dropdown (uses SelectDropdown) ────────

function ClassLevelDropdown({ value, onChange }) {
    
    const classDisplayOptions = CLASS_LEVELS.map(l => `Class ${l}`)
    
    const valueToDisplay = (val) => {
        if (!val) return ''; 
        return `Class ${val.replace(' Standard', '')}`;
    };
    const displayToValue = (display) => {
        return display.replace('Class ', '') + ' Standard';
    };

    return (
        <SelectDropdown
            value={valueToDisplay(value)}
            onChange={(display) => onChange(displayToValue(display))}
            options={classDisplayOptions}
            placeholder="Select class level..."
        />
    );
}
   

// ── Subject Name Dropdown (uses SelectDropdown) ───────

function SubjectNameDropdown({ value, onChange, hasError }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between rounded-lg py-2.5 px-3 text-sm transition-all outline-none border
                    ${hasError
                        ? 'border-red-400 bg-red-50'
                        : open
                            ? 'border-purple-500 shadow-[0_0_0_3px_rgba(147,51,234,0.15)] bg-white'
                            : 'border-gray-300 bg-white hover:border-purple-400'
                    } ${!value ? 'text-gray-400' : 'text-gray-800 font-medium'}`}
            >
                <span>{value || 'Select a subject...'}</span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="p-1.5">
                        {SUBJECT_OPTIONS.map(subject => {
                            const isSelected = value === subject
                            return (
                                <button
                                    key={subject}
                                    type="button"
                                    onClick={() => { onChange(subject); setOpen(false) }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                        ${isSelected
                                            ? 'bg-purple-600 text-white'
                                            : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                                        }`}
                                >
                                    <span>{subject}</span>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Quiz Player (read-only view) ──────────────────────

function QuizPlayer({ quiz }) {
    if (!quiz || quiz.length === 0) return null
    return (
        <div className="border border-purple-100 rounded-xl overflow-hidden">
            <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-purple-800">Quiz Questions</span>
                <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">{quiz.length} Question{quiz.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="bg-white p-4 space-y-5">
                {quiz.map((q, qIdx) => (
                    <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <p className="text-sm font-semibold text-gray-800 mb-3">{qIdx + 1}. {q.question}</p>
                        <div className="space-y-2">
                            {q.options.map((opt, oIdx) => {
                                const isCorrect = oIdx === q.correctAnswer
                                return (
                                    <div key={oIdx} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm
                                        ${isCorrect ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700'}`}>
                                        <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0">{String.fromCharCode(65 + oIdx)}</span>
                                        <span className="flex-1">{opt}</span>
                                        {isCorrect && <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                    </div>
                                )
                            })}
                        </div>
                        <p className="text-xs text-green-700 font-semibold mt-3">Correct Answer: {String.fromCharCode(65 + q.correctAnswer)}</p>
                        {q.explanation && <p className="text-xs text-purple-700 mt-1">Explanation: {q.explanation}</p>}
                    </div>
                ))}
            </div>
        </div>
    )
}

function getYouTubeId(url) {
    if (!url) return null
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
}

// ── Unit Content View ─────────────────────────────────

function SubTopicContent({ subTopic, onEdit, onDelete, syllabus }) {
    const [expanded, setExpanded] = useState(false)
    const objectives = splitObjectives(subTopic.learningObjectives)
    const quizFE = (subTopic.quizzes || []).map(backendToFrontendQ)
    const missing = [
        !subTopic.videoUrl && 'Video',
        !subTopic.summary && 'Summary',
        objectives.length === 0 && 'Objectives',
        quizFE.length === 0 && 'Quiz'
    ].filter(Boolean)

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${expanded ? 'bg-purple-50/50' : 'hover:bg-gray-50'}`}
                onClick={() => setExpanded(e => !e)}>
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <BookOpenIcon className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{subTopic.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {subTopic.videoUrl
                            ? <span className="text-xs text-blue-500 flex items-center gap-0.5"><VideoCameraIcon className="w-3 h-3" />Video</span>
                            : <span className="text-xs text-gray-300 flex items-center gap-0.5"><VideoCameraIcon className="w-3 h-3" />No Video</span>}
                        {objectives.length > 0
                            ? <span className="text-xs text-green-600 flex items-center gap-0.5"><ListBulletIcon className="w-3 h-3" />{objectives.length} Objectives</span>
                            : <span className="text-xs text-gray-300 flex items-center gap-0.5"><ListBulletIcon className="w-3 h-3" />No Objectives</span>}
                        {quizFE.length > 0
                            ? <span className="text-xs text-blue-500 flex items-center gap-0.5"><QuestionMarkCircleIcon className="w-3 h-3" />{quizFE.length} Question{quizFE.length !== 1 ? 's' : ''}</span>
                            : <span className="text-xs text-gray-300 flex items-center gap-0.5"><QuestionMarkCircleIcon className="w-3 h-3" />No Quiz</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); onEdit(subTopic) }}
                        className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors rounded">
                        <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDelete(subTopic.id) }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded">
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                    {expanded ? <ChevronDownIcon className="w-4 h-4 text-purple-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-300" />}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 bg-white p-4 space-y-4">
                    {missing.length > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                <span className="text-xs text-purple-600 font-medium">Missing:</span>
                                <span className="text-xs text-purple-500">{missing.join(' · ')}</span>
                            </div>
                            <button onClick={() => onEdit(subTopic)}
                                className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-0.5 ml-3">
                                <PlusIcon className="w-3 h-3" />Add
                            </button>
                        </div>
                    )}

                    {subTopic.videoUrl && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Video Lesson</p>
                            {getYouTubeId(subTopic.videoUrl) ? (
                                <div>
                                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video w-full max-w-xl">
                                        <iframe src={`https://www.youtube.com/embed/${getYouTubeId(subTopic.videoUrl)}`}
                                            title={subTopic.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen className="w-full h-full" />
                                    </div>
                                    <div className="mt-2">
                                        <a href={subTopic.videoUrl} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-all">
                                            <PlayIcon className="w-3.5 h-3.5" />Open on YouTube
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <a href={subTopic.videoUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                                    <PlayIcon className="w-4 h-4" />Open Video
                                </a>
                            )}
                        </div>
                    )}

                    {subTopic.summary && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Summary</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{subTopic.summary}</p>
                        </div>
                    )}

                    {objectives.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Learning Objectives</p>
                            <ul className="space-y-1.5">
                                {objectives.map((obj, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />{obj}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {quizFE.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quiz</p>
                                <button onClick={() => onEdit(subTopic)} className="text-xs text-purple-600 hover:underline font-medium">Edit questions</button>
                            </div>
                            <QuizPlayer quiz={quizFE} />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Quiz Builder ──────────────────────────────────────

function QuizBuilder({ quiz, quizErrors, onAdd, onRemove, onUpdateQuestion, onUpdateOption }) {
    return (
        <div className="border border-purple-100 rounded-xl overflow-hidden">
            <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-purple-900 flex items-center gap-1">
                    <QuestionMarkCircleIcon className="w-4 h-4" />Quiz Questions
                </h4>
                <button onClick={onAdd} className="text-xs font-semibold text-purple-600 hover:text-purple-800">+ Add Question</button>
            </div>
            <div className="p-4 space-y-4 bg-white">
                {quiz.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No quiz questions yet.</p>
                ) : (
                    quiz.map((q, qIdx) => {
                        const qErr = quizErrors[qIdx] || {}
                        return (
                            <div key={q.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Question {qIdx + 1}</span>
                                    <button onClick={() => onRemove(qIdx)} className="text-red-400 hover:text-red-600">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div>
                                    <input type="text" value={q.question}
                                        onChange={e => onUpdateQuestion(qIdx, 'question', e.target.value)}
                                        placeholder="Enter question text..."
                                        className={innerInputCls} />
                                    <FieldError msg={qErr.question} />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-500">Options (select correct answer)</p>
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx}>
                                            <div className={`flex items-center gap-2 px-2.5 rounded-lg border ${q.correctAnswer === oIdx ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'}`}>
                                                <input type="radio" name={`correct-${q.id}`}
                                                    checked={q.correctAnswer === oIdx}
                                                    onChange={() => onUpdateQuestion(qIdx, 'correctAnswer', oIdx)}
                                                    className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                                <input type="text" value={opt}
                                                    onChange={e => onUpdateOption(qIdx, oIdx, e.target.value)}
                                                    placeholder={`Option ${String.fromCharCode(65 + oIdx)} *`}
                                                    className="flex-1 bg-transparent text-sm outline-none py-2.5 text-gray-700 placeholder-gray-300" />
                                            </div>
                                        </div>
                                    ))}
                                    <FieldError msg={qErr.options} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Explanation</label>
                                    <textarea value={q.explanation || ''}
                                        onChange={e => onUpdateQuestion(qIdx, 'explanation', e.target.value)}
                                        rows="2" placeholder="Explain why the correct answer is right..."
                                        className={innerInputCls} />
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────

export default function CurriculumManagement() {
    const [syllabi, setSyllabi] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeClassTab, setActiveClassTab] = useState(null)
    const [expandedSubject, setExpandedSubject] = useState(null)
    const [expandedModule, setExpandedModule] = useState(null)
    const [toast, setToast] = useState(null)

    // Syllabus modal
    const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false)
    const [editingSyllabus, setEditingSyllabus] = useState(null)
    const [syllabusForm, setSyllabusForm] = useState({ subject: '', classLevel: '' })
    const [syllabusErrors, setSyllabusErrors] = useState({})

    // Module modal
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false)
    const [editingModule, setEditingModule] = useState(null)
    const [selectedSyllabusId, setSelectedSyllabusId] = useState(null)
    const [moduleForm, setModuleForm] = useState({ title: '' })
    const [moduleErrors, setModuleErrors] = useState({})

    // SubTopic modal
    const [isSubTopicModalOpen, setIsSubTopicModalOpen] = useState(false)
    const [editingSubTopic, setEditingSubTopic] = useState(null)
    const [selectedModuleId, setSelectedModuleId] = useState(null)
    const [subTopicForm, setSubTopicForm] = useState({
        title: '', videoUrl: '', summary: '', summaryImage: '', learningObjectives: '', quiz: []
    })
    const [subTopicErrors, setSubTopicErrors] = useState({})
    const [quizErrors, setQuizErrors] = useState({})

    const showToast = (msg) => setToast({ message: msg })
    const dismissToast = () => setToast(null)

    useEffect(() => {
        getAllSyllabi()
            .then(data => { setSyllabi(data); setLoading(false) })
            .catch(err => { console.error(err); setLoading(false) })
    }, [])

    const classTabs = [...new Set(
        CLASS_LEVELS.map(l => `${l} Standard`).filter(lvl => syllabi.some(s => s.classLevel === lvl))
    )]
    syllabi.forEach(s => { if (!classTabs.includes(s.classLevel)) classTabs.push(s.classLevel) })
    classTabs.sort((a, b) => parseInt(a.match(/\d+/)?.[0] ?? '0') - parseInt(b.match(/\d+/)?.[0] ?? '0'))

    const currentClass = activeClassTab || classTabs[0]
    const subjectsForClass = syllabi.filter(s => s.classLevel === currentClass)

    const refreshSyllabi = async () => {
        const fresh = await getAllSyllabi()
        setSyllabi(fresh)
    }

    const validateSyllabusForm = () => {
        const errors = {}
        if (!syllabusForm.subject.trim()) {
            errors.subject = 'Please select a subject'
        } else {
            const duplicate = syllabi.some(s =>
                s.subject.trim().toLowerCase() === syllabusForm.subject.trim().toLowerCase() &&
                s.classLevel === syllabusForm.classLevel &&
                s.id !== editingSyllabus?.id
            )
            if (duplicate) errors.subject = `"${syllabusForm.subject}" already exists for ${syllabusForm.classLevel}`
        }
        setSyllabusErrors(errors)
        return Object.keys(errors).length === 0
    }

    const validateModuleForm = () => {
        const errors = {}
        if (!moduleForm.title.trim()) {
            errors.title = 'Module title is required'
        } else {
            const parentSyllabus = syllabi.find(s => s.id === selectedSyllabusId)
            const duplicate = (parentSyllabus?.modules || []).some(m =>
                m.title.trim().toLowerCase() === moduleForm.title.trim().toLowerCase() &&
                m.id !== editingModule?.id
            )
            if (duplicate) errors.title = `"${moduleForm.title.trim()}" already exists in this subject`
        }
        setModuleErrors(errors)
        return Object.keys(errors).length === 0
    }

    const validateSubTopicForm = () => {
        const sErrors = {}
        const qErrors = {}

        if (!subTopicForm.title.trim()) {
            sErrors.title = 'Unit title is required'
        } else {
            const parentModule = syllabi.flatMap(s => s.modules || []).find(m => m.id === selectedModuleId)
            const duplicate = (parentModule?.subTopics || []).some(st =>
                st.title.trim().toLowerCase() === subTopicForm.title.trim().toLowerCase() &&
                st.id !== editingSubTopic?.id
            )
            if (duplicate) sErrors.title = `"${subTopicForm.title.trim()}" already exists in this module`
        }

        subTopicForm.quiz.forEach((q, idx) => {
            const allBlank = !q.question.trim() && q.options.every(o => !o?.trim()) && !q.explanation?.trim()
            if (allBlank) return
            const e = {}
            if (!q.question.trim()) e.question = 'Enter the question you want to ask students'
            if (!q.options[0]?.trim() || !q.options[1]?.trim() || !q.options[2]?.trim() || !q.options[3]?.trim())
                e.options = 'Please fill in all 4 options before saving'
            if (Object.keys(e).length > 0) qErrors[idx] = e
        })

        setSubTopicErrors(sErrors)
        setQuizErrors(qErrors)
        return Object.keys(sErrors).length === 0 && Object.keys(qErrors).length === 0
    }

    const openSyllabusModal = (syllabus = null) => {
        setEditingSyllabus(syllabus)
        setSyllabusErrors({})
        setSyllabusForm(syllabus
            ? { subject: syllabus.subject, classLevel: syllabus.classLevel }
            : { subject: '', classLevel: currentClass || '' })
        setIsSyllabusModalOpen(true)
    }

    const saveSyllabusHandler = async () => {
        if (!validateSyllabusForm()) return
        setSaving(true)
        try {
            if (editingSyllabus) {
                await updateSyllabus(editingSyllabus.id, syllabusForm.subject, syllabusForm.classLevel)
            } else {
                await createSyllabus(syllabusForm.subject, syllabusForm.classLevel)
            }
            await refreshSyllabi()
            setIsSyllabusModalOpen(false)
            showToast(editingSyllabus ? 'Syllabus updated successfully!' : 'Syllabus added successfully!')
        } catch (e) { console.error(e) }
        finally { setSaving(false) }
    }

    const deleteSyllabusHandler = async (id) => {
        if (!window.confirm('Delete this syllabus and all its modules?')) return
        await deleteSyllabus(id)
        setSyllabi(prev => prev.filter(s => s.id !== id))
        showToast('Syllabus deleted.')
    }

    const openModuleModal = (syllabusId, mod = null) => {
        setSelectedSyllabusId(syllabusId)
        setEditingModule(mod)
        setModuleErrors({})
        setModuleForm({ title: mod ? mod.title : '' })
        setIsModuleModalOpen(true)
    }

    const saveModuleHandler = async () => {
        if (!validateModuleForm()) return
        setSaving(true)
        try {
            if (editingModule) {
                await updateModule(editingModule.id, selectedSyllabusId, moduleForm.title)
            } else {
                await createModule(selectedSyllabusId, moduleForm.title)
            }
            await refreshSyllabi()
            setIsModuleModalOpen(false)
            showToast(editingModule ? 'Module updated successfully!' : 'Module added successfully!')
        } catch (e) { console.error(e) }
        finally { setSaving(false) }
    }

    const deleteModuleHandler = async (syllabusId, moduleId) => {
        if (!window.confirm('Delete this module and all its units?')) return
        try {
            await deleteModule(moduleId)
            setSyllabi(prev => prev.map(s =>
                s.id === syllabusId ? { ...s, modules: (s.modules || []).filter(m => m.id !== moduleId) } : s
            ))
            showToast('Module deleted.')
        } catch (e) { console.error(e) }
    }

    const openSubTopicModal = (moduleId, subTopic = null) => {
        setSelectedModuleId(moduleId)
        setEditingSubTopic(subTopic)
        setSubTopicErrors({})
        setQuizErrors({})
        if (subTopic) {
            setSubTopicForm({
                title: subTopic.title || '',
                videoUrl: subTopic.videoUrl || '',
                summary: subTopic.summary || '',
                summaryImage: '',
                learningObjectives: subTopic.learningObjectives || '',
                quiz: (subTopic.quizzes || []).map(backendToFrontendQ)
            })
        } else {
            setSubTopicForm({ title: '', videoUrl: '', summary: '', summaryImage: '', learningObjectives: '', quiz: [] })
        }
        setIsSubTopicModalOpen(true)
    }

    const saveSubTopicHandler = async () => {
        if (!validateSubTopicForm()) return
        setSaving(true)
        try {
            const cleanedQuiz = subTopicForm.quiz.filter(q =>
                q.question.trim() || q.options.some(o => o?.trim()) || q.explanation?.trim()
            )
            const formToSave = { ...subTopicForm, quiz: cleanedQuiz }

            let subTopicId
            if (editingSubTopic) {
                await updateSubTopic(editingSubTopic.id, selectedModuleId, formToSave)
                subTopicId = editingSubTopic.id
            } else {
                const created = await createSubTopic(selectedModuleId, formToSave)
                subTopicId = created.id
            }

            try {
                await syncQuizQuestions(subTopicId, formToSave.quiz, editingSubTopic?.quizzes || [])
            } catch (quizErr) {
                console.error('Quiz sync failed:', quizErr)
                alert('Unit saved but quiz failed: ' + quizErr.message)
            }

            await refreshSyllabi()
            setIsSubTopicModalOpen(false)
            showToast(editingSubTopic ? 'Unit updated successfully!' : 'Unit added successfully!')
        } catch (e) {
            console.error(e)
            alert('Failed to save unit: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const deleteSubTopicHandler = async (moduleId, subTopicId) => {
        if (!window.confirm('Delete this unit?')) return
        try {
            await deleteSubTopic(subTopicId)
            await refreshSyllabi()
            showToast('Unit deleted.')
        } catch (e) { console.error(e) }
    }

    const addQuestion = () => {
        const newQ = { id: `new-${Date.now()}`, backendId: null, question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
        setSubTopicForm(prev => ({ ...prev, quiz: [...prev.quiz, newQ] }))
    }
    const removeQuestion = (idx) => {
        setSubTopicForm(prev => ({ ...prev, quiz: prev.quiz.filter((_, i) => i !== idx) }))
        setQuizErrors(prev => { const c = { ...prev }; delete c[idx]; return c })
    }
    const updateQuestion = (idx, field, value) => {
        setSubTopicForm(prev => ({ ...prev, quiz: prev.quiz.map((q, i) => i === idx ? { ...q, [field]: value } : q) }))
        if (field === 'question' && quizErrors[idx]?.question)
            setQuizErrors(prev => ({ ...prev, [idx]: { ...prev[idx], question: undefined } }))
    }
    const updateOption = (qIdx, oIdx, value) => {
        setSubTopicForm(prev => ({
            ...prev,
            quiz: prev.quiz.map((q, i) => {
                if (i !== qIdx) return q
                const opts = [...q.options]; opts[oIdx] = value
                return { ...q, options: opts }
            })
        }))
        if (quizErrors[qIdx]?.options)
            setQuizErrors(prev => ({ ...prev, [qIdx]: { ...prev[qIdx], options: undefined } }))
    }

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading curriculum...</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            {toast && <SuccessToast message={toast.message} onDismiss={dismissToast} />}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Education Curriculum</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Manage syllabi and structured learning content</p>
                </div>
                <button onClick={() => openSyllabusModal()}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors gap-1.5">
                    <PlusIcon className="w-4 h-4" />Add Syllabus
                </button>
            </div>

            {/* Class Tabs + Content */}
            {classTabs.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <TabScroller tabs={classTabs} currentTab={currentClass}
                        onTabChange={cls => { setActiveClassTab(cls); setExpandedSubject(null); setExpandedModule(null) }} />

                    <div className="p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Subjects —Class {currentClass}</h4>
                            <button onClick={() => openSyllabusModal()}
                                className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                                <PlusIcon className="w-4 h-4" />Add Subject
                            </button>
                        </div>

                        {subjectsForClass.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                <AcademicCapIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">No subjects for this class yet.</p>
                                <button onClick={() => openSyllabusModal()} className="mt-2 text-sm text-purple-600 font-medium hover:underline">Add a subject</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {subjectsForClass.map(syllabus => (
                                    <div key={syllabus.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors ${expandedSubject === syllabus.id ? 'bg-purple-50' : 'bg-white hover:bg-gray-50'}`}
                                            onClick={() => setExpandedSubject(expandedSubject === syllabus.id ? null : syllabus.id)}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                                                    <AcademicCapIcon className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{syllabus.subject}</p>
                                                    <p className="text-xs text-gray-400">{syllabus.modules?.length || 0} Module{syllabus.modules?.length !== 1 ? 's' : ''}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={e => { e.stopPropagation(); openSyllabusModal(syllabus) }}
                                                    className="p-1.5 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); deleteSyllabusHandler(syllabus.id) }}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                                {expandedSubject === syllabus.id
                                                    ? <ChevronDownIcon className="w-4 h-4 text-purple-400 ml-1" />
                                                    : <ChevronRightIcon className="w-4 h-4 text-gray-400 ml-1" />}
                                            </div>
                                        </div>

                                        {expandedSubject === syllabus.id && (
                                            <div className="border-t border-gray-100 bg-gray-50/40 px-4 pb-4 pt-3">
                                                <div className="flex justify-between items-center mb-3">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Modules</p>
                                                    <button onClick={() => openModuleModal(syllabus.id)}
                                                        className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-0.5">
                                                        <PlusIcon className="w-3.5 h-3.5" />New Module
                                                    </button>
                                                </div>

                                                {!syllabus.modules || syllabus.modules.length === 0 ? (
                                                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                                                        <p className="text-xs text-gray-400">No modules yet. Add one above.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {syllabus.modules.map((mod, idx) => (
                                                            <div key={mod.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                                                                <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${expandedModule === mod.id ? 'bg-purple-50/50' : 'hover:bg-gray-50'}`}
                                                                    onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}>
                                                                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-semibold text-gray-800">{mod.title}</p>
                                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                                            {mod.subTopics?.length || 0} Unit{mod.subTopics?.length !== 1 ? 's' : ''}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <button onClick={e => { e.stopPropagation(); openModuleModal(syllabus.id, mod) }}
                                                                            className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors rounded">
                                                                            <PencilIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button onClick={e => { e.stopPropagation(); deleteModuleHandler(syllabus.id, mod.id) }}
                                                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded">
                                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        {expandedModule === mod.id
                                                                            ? <ChevronDownIcon className="w-4 h-4 text-purple-400" />
                                                                            : <ChevronRightIcon className="w-4 h-4 text-gray-300" />}
                                                                    </div>
                                                                </div>

                                                                {expandedModule === mod.id && (
                                                                    <div className="border-t border-gray-100 bg-gray-50/30 px-4 pb-4 pt-3">
                                                                        <div className="flex justify-between items-center mb-3">
                                                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Units</p>
                                                                            <button onClick={() => openSubTopicModal(mod.id)}
                                                                                className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-0.5">
                                                                                <PlusIcon className="w-3 h-3" />Add Unit
                                                                            </button>
                                                                        </div>

                                                                        {!mod.subTopics || mod.subTopics.length === 0 ? (
                                                                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                                                                                <BookOpenIcon className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                                                                                <p className="text-xs text-gray-400">No units yet. Add one above.</p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="space-y-2">
                                                                                {mod.subTopics.map(st => (
                                                                                    <SubTopicContent
                                                                                        key={st.id}
                                                                                        subTopic={st}
                                                                                        onEdit={st => openSubTopicModal(mod.id, st)}
                                                                                        onDelete={stId => deleteSubTopicHandler(mod.id, stId)}
                                                                                        syllabus={syllabus}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-xl">
                    <AcademicCapIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-semibold">No curriculum yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Syllabus" to get started</p>
                </div>
            )}

            {/* ── Syllabus Modal ── */}
            {isSyllabusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setIsSyllabusModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl sm:max-w-lg w-full z-10">
                        <div className="px-6 pt-6 pb-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                {editingSyllabus ? 'Edit Syllabus' : 'Add New Syllabus'}
                            </h3>
                            <div className="space-y-4">
                                {/* ── Subject Name — now a dropdown ── */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject Name <span className="text-red-500">*</span>
                                    </label>
                                    <SubjectNameDropdown
                                        value={syllabusForm.subject}
                                        onChange={val => {
                                            setSyllabusForm({ ...syllabusForm, subject: val })
                                            if (syllabusErrors.subject) setSyllabusErrors(p => ({ ...p, subject: undefined }))
                                        }}
                                        hasError={!!syllabusErrors.subject}
                                    />
                                    <FieldError msg={syllabusErrors.subject} />
                                </div>

                                {/* ── Class Level ── */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Class Level <span className="text-red-500">*</span>
                                    </label>
                                    <ClassLevelDropdown
                                        value={syllabusForm.classLevel}
                                        onChange={val => setSyllabusForm({ ...syllabusForm, classLevel: val })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={saveSyllabusHandler} disabled={saving}
                                className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setIsSyllabusModalOpen(false)}
                                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Module Modal ── */}
            {isModuleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setIsModuleModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl sm:max-w-lg w-full z-10">
                        <div className="px-6 pt-6 pb-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                {editingModule ? 'Edit Module' : 'Add New Module'}
                            </h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Module Title <span className="text-red-500">*</span></label>
                                <input type="text" value={moduleForm.title}
                                    onChange={e => { setModuleForm({ ...moduleForm, title: e.target.value }); if (moduleErrors.title) setModuleErrors(p => ({ ...p, title: undefined })) }}
                                    placeholder="e.g. Algebra" className={inputCls} />
                                <FieldError msg={moduleErrors.title} />
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={saveModuleHandler} disabled={saving}
                                className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setIsModuleModalOpen(false)}
                                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Unit Modal ── */}
            {isSubTopicModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setIsSubTopicModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl sm:max-w-2xl w-full z-10 flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-6 pb-3 border-b border-gray-100 flex-shrink-0 rounded-t-2xl">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingSubTopic ? 'Edit Unit' : 'Add New Unit'}
                            </h3>
                        </div>

                        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Title <span className="text-red-500">*</span></label>
                                <input type="text" value={subTopicForm.title}
                                    onChange={e => { setSubTopicForm({ ...subTopicForm, title: e.target.value }); if (subTopicErrors.title) setSubTopicErrors(p => ({ ...p, title: undefined })) }}
                                    placeholder="e.g. Introduction to Variables" className={inputCls} />
                                <FieldError msg={subTopicErrors.title} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <VideoCameraIcon className="w-4 h-4 text-gray-400" />Video URL
                                </label>
                                <input type="text" value={subTopicForm.videoUrl}
                                    onChange={e => setSubTopicForm({ ...subTopicForm, videoUrl: e.target.value })}
                                    placeholder="https://youtube.com/..." className={inputCls} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <ListBulletIcon className="w-4 h-4 text-gray-400" />Learning Objectives (one per line)
                                </label>
                                <textarea value={subTopicForm.learningObjectives}
                                    onChange={e => setSubTopicForm({ ...subTopicForm, learningObjectives: e.target.value })}
                                    rows="3" placeholder={'Understand key concepts\nApply in real scenarios'}
                                    className={textareaCls} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <DocumentTextIcon className="w-4 h-4 text-gray-400" />Content Summary
                                </label>
                                <textarea value={subTopicForm.summary}
                                    onChange={e => setSubTopicForm({ ...subTopicForm, summary: e.target.value })}
                                    rows="2" className={textareaCls} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <PhotoIcon className="w-4 h-4 text-gray-400" />Summary Image URL (Optional)
                                </label>
                                <input type="text" value={subTopicForm.summaryImage}
                                    onChange={e => setSubTopicForm({ ...subTopicForm, summaryImage: e.target.value })}
                                    placeholder="https://example.com/image.jpg" className={inputCls} />
                            </div>

                            <QuizBuilder
                                quiz={subTopicForm.quiz}
                                quizErrors={quizErrors}
                                onAdd={addQuestion}
                                onRemove={removeQuestion}
                                onUpdateQuestion={updateQuestion}
                                onUpdateOption={updateOption}
                            />
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0 rounded-b-2xl">
                            <button onClick={saveSubTopicHandler} disabled={saving}
                                className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                                {saving ? 'Saving...' : 'Save Unit'}
                            </button>
                            <button onClick={() => setIsSubTopicModalOpen(false)}
                                className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
