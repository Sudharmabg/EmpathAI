import React, { useState, useEffect, useRef } from 'react'
import { PlusIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderPlusIcon } from '@heroicons/react/24/outline'
import {
    fetchGroups,
    fetchQuestions,
    fetchResponses,
    fetchResponseSheet,
    fetchAnalyticsSummary,
    fetchGroupAnalytics,
    createGroup,
    deleteGroup,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createResponse
} from '../../../api/Assessmentmanagement'

export default function AssessmentManagement() {
    const [questions, setQuestions] = useState([])
    const [groups, setGroups] = useState([])

    const calculateAgeFromDOB = (dob) => {
        if (!dob) return null
        const birth = new Date(dob)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
        return age > 0 ? age : null
    }

    const savedUser = localStorage.getItem('user')
    const currentUser = savedUser ? JSON.parse(savedUser) : null
    const isAdmin = currentUser?.role === 'SUPER_ADMIN' ||
        currentUser?.role === 'ADMIN' ||
        currentUser?.role === 'admin'

    const [studentResponses, setStudentResponses] = useState([])
    const [selectedResponse, setSelectedResponse] = useState(null)
    const [showResponseSheet, setShowResponseSheet] = useState(false)
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState(null)
    const [expandedQuestion, setExpandedQuestion] = useState(null)
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
    const [editingQuestion, setEditingQuestion] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterAge, setFilterAge] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [dateFilter, setDateFilter] = useState('ALL')
    const [filterGender, setFilterGender] = useState('')
    const [responseSheet, setResponseSheet] = useState([])

    const [llmSummaries, setLlmSummaries] = useState({})
    const [insightModal, setInsightModal] = useState({ open: false, data: null, parsed: null, studentName: '' })
    const [questionFormData, setQuestionFormData] = useState({
        question: '',
        domain: '',
        option1: '', option1OverallMeaning: '', option1Interpretation: '', option1Tag: '',
        option2: '', option2OverallMeaning: '', option2Interpretation: '', option2Tag: '',
        option3: '', option3OverallMeaning: '', option3Interpretation: '', option3Tag: '',
        option4: '', option4OverallMeaning: '', option4Interpretation: '', option4Tag: '',
        groups: [],
        optionCount: 4,
    })

    const [groupFormData, setGroupFormData] = useState({
        name: '',
        color: 'purple',
        className: ''
    })

    const [selectedFilter, setSelectedFilter] = useState('ALL')
    const [analytics, setAnalytics] = useState(null)
    const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false)

    const showResponseSheetRef = useRef(showResponseSheet)
    useEffect(() => { showResponseSheetRef.current = showResponseSheet }, [showResponseSheet])

    const selectedGroupRef = useRef(selectedGroup)
    useEffect(() => { selectedGroupRef.current = selectedGroup }, [selectedGroup])

    const groupsRef = useRef(groups)
    useEffect(() => { groupsRef.current = groups }, [groups])

    const matchesGender = (student) => {
        if (!filterGender) return true
        if (!student.gender) return true
        return student.gender.toLowerCase().startsWith(filterGender.toLowerCase())
    }

    const filterByDate = (student) => {
        if (dateFilter === 'ALL') return true
        const responseDate = student.submittedAt || student.createdAt || student.date
        if (!responseDate) return true
        const d = new Date(responseDate)
        const now = new Date()
        if (dateFilter === 'TODAY') return d.toDateString() === now.toDateString()
        if (dateFilter === 'THIS_WEEK') {
            const startOfWeek = new Date(now)
            startOfWeek.setDate(now.getDate() - now.getDay())
            startOfWeek.setHours(0, 0, 0, 0)
            return d >= startOfWeek
        }
        return true
    }

    useEffect(() => {
        fetchGroups()
            .then(data => {
                const groupList = Array.isArray(data) ? data : (data?.data || data || [])
                const sorted = [...groupList].sort((a, b) => {
                    if (!a.createdAt) return -1
                    if (!b.createdAt) return 1
                    return new Date(a.createdAt) - new Date(b.createdAt)
                })
                setGroups(sorted)
            })
            .catch(err => { console.error('Groups fetch failed:', err); setGroups([]) })

        fetchQuestions(0, 200)
            .then(data => {
                const questionList = data?.content || data || []
                setQuestions(questionList)
            })
            .catch(err => { console.error('Questions fetch error:', err); setQuestions([]) })

        fetchResponses()
            .then(data => {
                if (data?.content?.length > 0) setStudentResponses(data.content)
                else if (data?.length > 0) setStudentResponses(data)
            })
            .catch(err => console.error('Responses error:', err))

        fetchAnalyticsSummary('ALL')
            .then(data => setAnalytics(data))
            .catch(err => console.error('Analytics error:', err))
    }, [])

    const loadAnalytics = (filter, groupId) => {
        if (groupId) {
            const groupName = groups.find(g => g.id === groupId)?.name || groupId
            fetchGroupAnalytics(groupName, filter)
                .then(data => setAnalytics(data))
                .catch(err => console.error('Analytics error:', err))
        } else {
            fetchAnalyticsSummary(filter)
                .then(data => setAnalytics(data))
                .catch(err => console.error('Analytics error:', err))
        }
    }

    const colorOptions = [
        { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
        { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
        { value: 'green', label: 'Green', class: 'bg-green-500' },
        { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
        { value: 'red', label: 'Red', class: 'bg-red-500' },
        { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
        { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
        { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    ]

    const tagOptions = [
        { value: '', label: '— None —' },
        { value: 'Strength', label: '💪 Strength' },
        { value: 'Weakness', label: '⚠️ Weakness' },
        { value: 'Neutral', label: '😐 Neutral' },
        { value: 'Risk', label: '🔴 Risk' },
        { value: 'Growth', label: '🌱 Growth' },
    ]

    const getOrdinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd']
        const v = n % 100
        return n + (s[(v - 20) % 10] || s[v] || s[0])
    }

    const getColorClasses = (color) => {
        const colorMap = {
            purple: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', hover: 'hover:bg-purple-50' },
            blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hover: 'hover:bg-blue-50' },
            green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hover: 'hover:bg-green-50' },
            yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hover: 'hover:bg-yellow-50' },
            red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hover: 'hover:bg-red-50' },
            pink: { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', hover: 'hover:bg-pink-50' },
            indigo: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', hover: 'hover:bg-indigo-50' },
            orange: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', hover: 'hover:bg-orange-50' },
        }
        return colorMap[color] || colorMap.purple
    }

    const getOptionsArray = (question) => {
        if (question && (question.optionA || question.optionB || question.optionC || question.optionD)) {
            return [question.optionA, question.optionB, question.optionC, question.optionD].filter(o => o && o.trim())
        }
        const options = question?.options || question
        if (!options) return []
        if (Array.isArray(options)) return options
        if (typeof options === 'string') return options.split(',').map(o => o.trim())
        return []
    }

    const detectEmotion = (optionText) => {
        const text = optionText.toLowerCase()
        if (text.includes('very happy') || text.includes('happy') || text.includes('confident') || text.includes('very well')) return 'positive'
        if (text.includes('okay') || text.includes('somewhat') || text.includes('neutral')) return 'neutral'
        return 'negative'
    }

    const handleOpenQuestionModal = (question = null) => {
        if (question) {
            setEditingQuestion(question)
            const opts = getOptionsArray(question).map(opt => opt.replace(/^[A-D]-\s*/, '').trim())
            const grp = question.groupMapId ? [question.groupMapId] : []
            const filledCount = [opts[0], opts[1], opts[2], opts[3]].filter(o => o && o.trim()).length
            setQuestionFormData({
                question: question.questions || '',
                domain: question.domain || '',
                option1: opts[0] || '', option1OverallMeaning: question.option1OverallMeaning || '', option1Interpretation: question.option1Interpretation || '', option1Tag: question.option1Tag || '',
                option2: opts[1] || '', option2OverallMeaning: question.option2OverallMeaning || '', option2Interpretation: question.option2Interpretation || '', option2Tag: question.option2Tag || '',
                option3: opts[2] || '', option3OverallMeaning: question.option3OverallMeaning || '', option3Interpretation: question.option3Interpretation || '', option3Tag: question.option3Tag || '',
                option4: opts[3] || '', option4OverallMeaning: question.option4OverallMeaning || '', option4Interpretation: question.option4Interpretation || '', option4Tag: question.option4Tag || '',
                groups: grp,
                optionCount: Math.max(filledCount, 2),
            })
        } else {
            setEditingQuestion(null)
            setQuestionFormData({
                question: '',
                domain: '',
                option1: '', option1OverallMeaning: '', option1Interpretation: '', option1Tag: '',
                option2: '', option2OverallMeaning: '', option2Interpretation: '', option2Tag: '',
                option3: '', option3OverallMeaning: '', option3Interpretation: '', option3Tag: '',
                option4: '', option4OverallMeaning: '', option4Interpretation: '', option4Tag: '',
                groups: selectedGroup ? [selectedGroup] : [],
                optionCount: 4,
            })
        }
        setIsQuestionModalOpen(true)
    }

    const handleOpenGroupModal = () => {
        setGroupFormData({ name: '', color: 'purple', className: '' })
        setIsGroupModalOpen(true)
    }
const handleSaveQuestion = () => {
        if (isSubmittingQuestion) return
        setIsSubmittingQuestion(true)
        const options = [
            questionFormData.option1,
            questionFormData.option2,
            questionFormData.option3,
            questionFormData.option4
        ].slice(0, questionFormData.optionCount).filter(opt => opt.trim())

        if (!questionFormData.question || options.length < 2) {
            alert('Please provide a question and at least 2 options')
            setIsSubmittingQuestion(false)  
            return
        }
        if (questionFormData.groups.length === 0) {
            alert('Please select at least one group')
            setIsSubmittingQuestion(false)
            return
        }

        const questionData = {
            questionText: questionFormData.question,
            domain: questionFormData.domain || '',
            options: options.join(','),
        }

        const buildAnswerOptionPayloads = (questionId) =>
            options.map((opt, i) => {
                const n = i + 1
                return {
                    questionId,
                    optionLabel: opt,
                    overallMeaning: questionFormData[`option${n}OverallMeaning`] || '',
                    interpretation: questionFormData[`option${n}Interpretation`] || '',
                    tag: questionFormData[`option${n}Tag`] || '',
                    range: '',
                }
            }).filter(p => p.optionLabel.trim())

        const saveAnswerOptions = (questionId) => {
            if (!questionId || typeof questionId === 'object') {
                console.error('saveAnswerOptions: invalid questionId', questionId)
                return Promise.resolve()
            }
            const payloads = buildAnswerOptionPayloads(Number(questionId))
            if (payloads.length === 0) return Promise.resolve()
            console.log('[saveAnswerOptions] Posting', payloads.length, 'options for questionId=', questionId)
            return fetch('/api/assessment/answer-options/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token') || ''}`
                },
                body: JSON.stringify(payloads)
            })
            .then(res => {
                if (!res.ok) res.text().then(t => console.error('answer-options batch failed:', res.status, t))
                return res
            })
            .catch(err => console.error('Answer options save failed:', err))
        }

        const refetchQuestions = () =>
    fetchQuestions(0, 200)
        .then(data => {
            const list = data?.content || data || []
            if (list.length > 0) setQuestions(list)
        })
        .catch(err => console.error('Refetch error:', err))

        if (editingQuestion) {
            const groupIds = questionFormData.groups.map(id => Number(id))
            const originalGroupId = Number(editingQuestion.groupMapId)
            const newGroupIds = groupIds.filter(id => id !== originalGroupId)
            const keepOriginal = groupIds.includes(originalGroupId)

            const tasks = []
            if (keepOriginal) {
                tasks.push(updateQuestion(editingQuestion.id, { ...questionData, groupMapId: originalGroupId }))
            } else {
                tasks.push(updateQuestion(editingQuestion.id, { ...questionData, groupMapId: groupIds[0] }))
            }
            newGroupIds.forEach(gid => tasks.push(createQuestion({ ...questionData, groupMapId: gid })))

            Promise.all(tasks)
                .then(() => saveAnswerOptions(editingQuestion.id))
                .then(() => { setIsSubmittingQuestion(false); setIsQuestionModalOpen(false); refetchQuestions() })
                .catch(err => { console.error('❌ Question update failed:', err); setIsSubmittingQuestion(false); setIsQuestionModalOpen(false) })}  else {
            const groupIds = questionFormData.groups.map(id => Number(id))
            Promise.all(groupIds.map(gid => createQuestion({ ...questionData, groupMapId: gid })))
                .then(createdList => {
                    console.log('[createQuestion] responses:', createdList)
                    return Promise.all(createdList.map(created => {
                        const qid = typeof created === 'number' ? created
                            : created?.id ?? created?.data?.id ?? created?.content?.id ?? null
                        return saveAnswerOptions(qid)
                    }))
                })
                .then(() => { setIsSubmittingQuestion(false); setIsQuestionModalOpen(false); refetchQuestions() })
                .catch(err => { console.error('❌ Question NOT saved:', err); setIsSubmittingQuestion(false); setIsQuestionModalOpen(false) })
        }
    }

    const handleSaveGroup = () => {
        if (!groupFormData.name.trim()) { alert('Please provide a group name'); return }
        const ordinalPart = groupFormData.name.replace(/^Class\s+/, '').trim()
        const classNameForDB = ordinalPart + ' Standard'
        const groupData = {
            name: groupFormData.name + ' Standard',
            color: groupFormData.color,
            isDefault: false,
            className: classNameForDB
        }
        setIsGroupModalOpen(false)
        createGroup(groupData)
            .then(() => fetchGroups().then(data => {
                const groupList = Array.isArray(data) ? data : (data?.data || data || [])
                const sorted = [...groupList].sort((a, b) => {
                    if (!a.createdAt) return -1
                    if (!b.createdAt) return 1
                    return new Date(a.createdAt) - new Date(b.createdAt)
                })
                setGroups(sorted)
            }))
            .catch(err => { console.error('❌ Group NOT saved to DB:', err); alert(`Failed to save group: ${err.message}`) })
    }

    const handleDeleteGroup = (groupId) => {
        const group = groups.find(g => g.id === groupId)
        if (!group) return
        if (group.isDefault === true || group.isDefault === 'true') { alert('Cannot delete default groups'); return }
        const hasQuestions = questions.some(q => String(q.groupMapId) === String(groupId))
        if (hasQuestions) { alert('Cannot delete group with existing questions.'); return }
        if (window.confirm(`Delete group "${group.name}"?`)) {
            setGroups(prev => prev.filter(g => g.id !== groupId))
            if (selectedGroup === groupId) setSelectedGroup(null)
            deleteGroup(groupId)
                .catch(err => {
                    console.error('❌ Group NOT deleted from DB:', err)
                    setGroups(prev => [...prev, group])
                    alert(`Could not delete "${group.name}" from database. It has been restored.`)
                })
        }
    }

    const handleDeleteQuestion = (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            deleteQuestion(id)
                .then(() => setQuestions(questions.filter(q => q.id !== id)))
                .catch(err => console.error('Delete error:', err))
        }
    }

    const toggleQuestion = (id) => setExpandedQuestion(expandedQuestion === id ? null : id)

    const handleOptionClick = (question, option) => {
        const emotion = detectEmotion(option)
        const savedUser = localStorage.getItem('user')
        const user = savedUser ? JSON.parse(savedUser) : null
        const studentName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest'
        const currentGroupId = selectedGroupRef.current
        const currentGroupObj = groupsRef.current.find(g => g.id === currentGroupId)
        const groupName = currentGroupObj?.className || currentGroupObj?.name || currentGroupId
        const responseData = {
            studentId: user?.email || user?.id || 'guest_' + Date.now(),
            studentName,
            age: (() => {
                const fromDob = calculateAgeFromDOB(user?.dateOfBirth)
                if (fromDob != null) return fromDob
                const raw = user?.age
                if (raw == null) return null
                const n = Number(raw)
                return isNaN(n) ? null : n
            })(),
            gender: user?.gender ?? user?.sex ?? null,
            className: user?.className || groupName,
            groupId: currentGroupId,
            groupName,
            questionId: question.id,
            questionText: question.questions || question.question || question.text || '',
            emotion,
            answer: option
        }

        createResponse(responseData)
            .then(saved => {
                const toStore = { ...responseData, ...saved, answer: responseData.answer }
                setStudentResponses(prev => {
                    const filtered = prev.filter(r => !(r.studentId === responseData.studentId && r.questionId === question.id))
                    return [...filtered, toStore]
                })
                setSelectedResponse(saved)
                setIsResponseModalOpen(true)
                const currentGroups = groupsRef.current
                const currentGroupObj2 = currentGroups.find(g => g.id === selectedGroupRef.current)
                const currentGroupName = currentGroupObj2?.className || currentGroupObj2?.name || ''
                if (showResponseSheetRef.current && currentGroupName) {
                    fetchResponseSheet(currentGroupName)
                        .then(data => setResponseSheet(Array.isArray(data) ? data : data?.content || data || []))
                        .catch(err => console.error('Sheet refresh error:', err))
                }
            })
            .catch(err => {
                console.error('Save error:', err)
                const local = { ...responseData, date: new Date().toISOString() }
                setStudentResponses(prev => {
                    const filtered = prev.filter(r => !(r.studentId === responseData.studentId && r.questionId === question.id))
                    return [...filtered, local]
                })
                setSelectedResponse(local)
                setIsResponseModalOpen(true)
            })
    }

    const getGroupQuestions = (group) => {
        const groupId = typeof group === 'object' ? group.id : group
        return questions.filter(q => String(q.groupMapId) === String(groupId))
    }

    const filteredQuestions = selectedGroup
        ? questions.filter(q => String(q.groupMapId) === String(selectedGroup))
        : questions

    const searchedQuestions = filteredQuestions.filter(q => {
        if (!searchTerm) return true
        const text = q.questions || q.question || q.text || ''
        return text.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const isStudentResponsesSelected = selectedGroup === 'Student Responses'

    const getOptionCount = (questionId, option) =>
        studentResponses.filter(r => r.questionId === questionId && r.answer === option).length

    const uniqueStudents = Array.from(
        new Map(studentResponses.filter(r => r.questionId).map(r => [r.studentId, r])).values()
    )

    const sheetStudents = Array.from(
        new Map((Array.isArray(responseSheet) ? responseSheet : []).map(r => [r.studentId, r])).values()
    )
    const filteredSheet = sheetStudents.filter(s => matchesGender(s) && filterByDate(s))

    const fetchSummaryForStudent = (studentId, groupId) => {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
        fetch(`/api/assessment/reports/student/${encodeURIComponent(studentId)}/group/${groupId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (!d) return
                const summaryText = (d.summaryText || '').trim()
                const bulletPoints = (d.bulletPoints || '').trim()
                const sessionDate = d.sessionDate || null
                if (summaryText || bulletPoints) {
                    setLlmSummaries(prev => ({
                        ...prev,
                        [studentId]: { summaryText, bulletPoints, sessionDate }
                    }))
                }
            })
            .catch(() => { })
    }
    const stripEmoji = (text) =>
        (text || '').replace(/^[\p{Emoji}\s•\-–—*]+/u, '').trim()
const parseBulletPoints = (raw) => {
        if (!raw) return { strengths: [], improvements: [], tips: [], plain: [] }
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
        const strengths = []
        const improvements = []
        const tips = []
        const plain = []
        lines.forEach(line => {
            // Strip leading bullets/spaces/dashes
            const clean = line.replace(/^[\s•\-–—*]+/, '').trim()
            // Use includes check — more reliable than startsWith for multi-codepoint emoji
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
    // FIX: Try multiple name formats for fetchResponseSheet because the backend
    // may be keyed by className ("10th Standard") or group name ("Class 10th Standard").
    // We try className first (most likely match), then fall back to the full group name.
    const loadResponseSheet = async (groupObj) => {
        const candidates = []
        if (groupObj?.className) candidates.push(groupObj.className)           // "10th Standard"
        if (groupObj?.name)      candidates.push(groupObj.name)                // "Class 10th Standard"
        // Also try the class_name without "Standard" suffix as a fallback
        if (groupObj?.className) candidates.push(groupObj.className.replace(' Standard', '').trim())

        let sheet = []
        for (const name of candidates) {
            try {
                const data = await fetchResponseSheet(name)
                const rows = Array.isArray(data) ? data : data?.content || data || []
                if (rows.length > 0) {
                    sheet = rows
                    console.log(`[ResponseSheet] Loaded ${rows.length} rows using name="${name}"`)
                    break
                }
            } catch (err) {
                console.warn(`[ResponseSheet] fetchResponseSheet("${name}") failed:`, err.message)
            }
        }
        return sheet
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Feelings Explorer</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {selectedGroup
                                ? `Managing questions for: ${groups.find(g => g.id === selectedGroup)?.name}`
                                : 'Select a group to view and manage questions'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleOpenQuestionModal()}
                            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Add Question
                        </button>
                        <button
                            onClick={handleOpenGroupModal}
                            className="flex items-center px-4 py-2 border border-purple-600 text-purple-600 rounded-md shadow-sm text-sm font-medium hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            <FolderPlusIcon className="w-5 h-5 mr-2" />
                            Create Group
                        </button>
                    </div>
                </div>
            </div>

            {/* Groups Grid */}
            <div className="mb-8">
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Question Groups</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groups.map((group) => {
                        const questionCount = getGroupQuestions(group).length
                        const colors = getColorClasses(group.color)
                        const isSelected = selectedGroup === group.id
                        return (
                            <div
                                key={group.id}
                                onClick={() => {
                                    setSelectedGroup(group.id)
                                    setExpandedQuestion(null)
                                    setShowResponseSheet(false)
                                    setResponseSheet([])
                                    setFilterGender('')
                                    setDateFilter('ALL')
                                    loadAnalytics(selectedFilter, group.id)
                                }}
                                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? `${colors.border} ${colors.bg} shadow-md` : `border-gray-200 bg-white hover:shadow-md ${colors.hover}`}`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center">
                                        <FolderIcon className={`w-5 h-5 mr-2 ${colors.text}`} />
                                        <h5 className={`font-medium text-sm ${isSelected ? colors.text : 'text-gray-900'}`}>{group.name}</h5>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id) }}
                                            className="text-gray-400 hover:text-red-600"
                                            title="Delete Group"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        {group.id !== 'Student Responses' && <>{questionCount} {questionCount === 1 ? 'question' : 'questions'}</>}
                                    </span>
                                    {isSelected && <span className={`text-xs font-semibold ${colors.text}`}>Selected</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Questions Section */}
            {selectedGroup && !isStudentResponsesSelected && (
                <div>
                    <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Questions in {groups.find(g => g.id === selectedGroup)?.name}
                        </h4>
                        <button
                            onClick={async () => {
                                setShowResponseSheet(true)
                                setResponseSheet([])
                                setLlmSummaries({})
                                setFilterGender('')
                                setDateFilter('ALL')

                                const groupObj = groups.find(g => g.id === selectedGroup)
                                const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''

                                // FIX: use loadResponseSheet which tries className AND name formats
                                const sheet = await loadResponseSheet(groupObj)
                                setResponseSheet(sheet)

                                // Build unique student map and generate/fetch summaries
                                const uniqueStudentMap = new Map()
                                sheet.forEach(r => {
                                    if (r.studentId && !uniqueStudentMap.has(r.studentId)) {
                                        uniqueStudentMap.set(r.studentId, r)
                                    }
                                })

                                uniqueStudentMap.forEach((studentRow, sid) => {
                                    const studentAnswers = sheet
                                        .filter(r => r.studentId === sid && (r.responseValue || r.answer))
                                        .map(r => ({
                                            questionId: r.questionId,
                                            questionText: r.questionText || '',
                                            selectedOption: r.responseValue || r.answer || ''
                                        }))
                                        .filter(a => a.selectedOption.trim())

                                    if (studentAnswers.length === 0) {
                                        fetchSummaryForStudent(sid, selectedGroup)
                                        return
                                    }

                                    // Use className from the sheet row or fall back to group className
                                    const resolvedClassName = studentRow.className ||
                                        groupObj?.className || groupObj?.name || ''

                                    fetch('/api/assessment/reports/generate', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            Authorization: `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                            studentId: sid,
                                            studentName: studentRow.studentName || '',
                                            groupId: selectedGroup,
                                            groupName: groupObj?.name || '',
                                            className: resolvedClassName,
                                            answers: studentAnswers
                                        })
                                    })
                                    .then(r => r.ok ? r.json() : null)
                                    .then(d => {
                                        if (!d) return
                                        const summaryText = (d.summaryText || '').trim()
                                        const bulletPoints = (d.bulletPoints || '').trim()
                                        if (summaryText || bulletPoints) {
                                            setLlmSummaries(prev => ({
                                                ...prev,
                                                [sid]: { summaryText, bulletPoints, sessionDate: d.sessionDate }
                                            }))
                                        }
                                    })
                                    .catch(() => fetchSummaryForStudent(sid, selectedGroup))
                                })

                                loadAnalytics(selectedFilter, selectedGroup)
                            }}
                            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                        >
                            View Responses
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search questions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full px-4 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                    </div>

                    {/* Questions List */}
                    <div className="space-y-3">
                        {searchedQuestions.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">
                                    {searchTerm ? `No questions found for "${searchTerm}"` : 'No questions in this group yet.'}
                                </p>
                                <button onClick={() => handleOpenQuestionModal()} className="mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium">
                                    Add your first question
                                </button>
                            </div>
                        ) : (
                            searchedQuestions.map((question, index) => (
                                <div key={question.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start flex-1">
                                                <button onClick={() => toggleQuestion(question.id)} className="mr-3 mt-1 text-gray-400 hover:text-gray-600">
                                                    {expandedQuestion === question.id ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                                                </button>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-semibold text-gray-500">Q{index + 1}</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {question.questions || question.question || question.text || ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <button onClick={() => handleOpenQuestionModal(question)} className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md" title="Edit Question">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteQuestion(question.id)} className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md" title="Delete Question">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {expandedQuestion === question.id && (
                                            <div className="mt-4 pl-8 pt-3 border-t border-gray-100">
                                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Answer Options:</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {getOptionsArray(question).map((option, idx) => (
                                                        <div key={idx} className="flex flex-col">
                                                            <div
                                                                onClick={() => handleOptionClick(question, option)}
                                                                className="flex items-center p-2 bg-purple-50 rounded-md transition cursor-pointer hover:bg-purple-100"
                                                            >
                                                                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-purple-200 text-purple-700 rounded-full text-xs font-bold mr-2">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="text-sm text-gray-700">{option}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 ml-8 mt-1">
                                                                {getOptionCount(question.id, option)} students selected this
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── Add/Edit Question Modal ─────────────────────────────────────────────── */}
            {isQuestionModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsQuestionModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    {editingQuestion ? 'Edit Question' : 'Add New Question'}
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                                        <textarea
                                            value={questionFormData.question}
                                            onChange={(e) => setQuestionFormData({ ...questionFormData, question: e.target.value })}
                                            rows="2"
                                            placeholder="e.g., How are you feeling today?"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Groups</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md">
                                            {groups.map(group => (
                                                <label key={group.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={questionFormData.groups.includes(group.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setQuestionFormData(prev => ({ ...prev, groups: [...prev.groups, group.id] }))
                                                            } else {
                                                                setQuestionFormData(prev => ({ ...prev, groups: prev.groups.filter(id => id !== group.id) }))
                                                            }
                                                        }}
                                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">{group.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {questionFormData.groups.length === 0 && (
                                            <p className="mt-1 text-xs text-red-500">Please select at least one group.</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Domain <span className="text-xs font-normal text-gray-400">(e.g. Mood assessment)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={questionFormData.domain}
                                            onChange={(e) => setQuestionFormData({ ...questionFormData, domain: e.target.value })}
                                            placeholder="e.g. Mood assessment, Emotional Well-being"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Answer Options, Interpretation &amp; Tag
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={questionFormData.optionCount <= 2}
                                                    onClick={() => setQuestionFormData(prev => ({
                                                        ...prev,
                                                        optionCount: prev.optionCount - 1,
                                                        [`option${prev.optionCount}`]: '',
                                                        [`option${prev.optionCount}OverallMeaning`]: '',
                                                        [`option${prev.optionCount}Interpretation`]: '',
                                                        [`option${prev.optionCount}Tag`]: '',
                                                    }))}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-base font-bold"
                                                >−</button>
                                                <span className="text-sm text-gray-600 w-20 text-center">{questionFormData.optionCount} options</span>
                                                <button
                                                    type="button"
                                                    disabled={questionFormData.optionCount >= 4}
                                                    onClick={() => setQuestionFormData(prev => ({ ...prev, optionCount: prev.optionCount + 1 }))}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-base font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                        <div className="space-y-5">
                                            {Array.from({ length: questionFormData.optionCount }, (_, i) => i + 1).map((num) => (
                                                <div key={num} className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 border-b border-gray-200">
                                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-purple-200 text-purple-700 rounded-full text-xs font-bold">
                                                            {num}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={questionFormData[`option${num}`]}
                                                            onChange={(e) => setQuestionFormData({ ...questionFormData, [`option${num}`]: e.target.value })}
                                                            placeholder="Answer label — e.g. Very much"
                                                            className="flex-1 border border-gray-300 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-sm bg-white"
                                                        />
                                                    </div>

                                                    {questionFormData[`option${num}`].trim() && (
                                                        <div className="px-3 py-3 grid grid-cols-2 gap-x-4 gap-y-3 bg-white">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-500 mb-1">Overall Meaning</label>
                                                                <input
                                                                    type="text"
                                                                    value={questionFormData[`option${num}OverallMeaning`]}
                                                                    onChange={(e) => setQuestionFormData({ ...questionFormData, [`option${num}OverallMeaning`]: e.target.value })}
                                                                    placeholder="e.g. High concern"
                                                                    className="block w-full border border-gray-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-xs"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                                    Tag <span className="text-gray-400 font-normal">(guides the AI)</span>
                                                                </label>
                                                                <select
                                                                    value={questionFormData[`option${num}Tag`]}
                                                                    onChange={(e) => setQuestionFormData({ ...questionFormData, [`option${num}Tag`]: e.target.value })}
                                                                    className="block w-full border border-gray-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-xs bg-white"
                                                                >
                                                                    {tagOptions.map(t => (
                                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="col-span-2">
                                                                <label className="block text-xs font-medium text-gray-500 mb-1">Psychological Interpretation</label>
                                                                <textarea
                                                                    rows="2"
                                                                    value={questionFormData[`option${num}Interpretation`]}
                                                                    onChange={(e) => setQuestionFormData({ ...questionFormData, [`option${num}Interpretation`]: e.target.value })}
                                                                    placeholder="e.g. Overwhelmed and confused. May need help with emotional distress."
                                                                    className="block w-full border border-gray-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-xs"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <p className="mt-2 text-xs text-gray-400">
                                            Fill in the Answer label first — interpretation and tag fields expand below it.
                                            The <strong>Tag</strong> field tells the AI whether this answer is a Strength, Weakness, etc.,
                                            so it generates more targeted and distinct bullet points.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="button"
                                    onClick={handleSaveQuestion}
                                    disabled={isSubmittingQuestion}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:col-start-2 sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmittingQuestion ? 'Saving...' : (editingQuestion ? 'Update' : 'Add') + ' Question'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsQuestionModalOpen(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Response Sheet ──────────────────────────────────────────────────────── */}
            {showResponseSheet && (
                <div className="mt-8 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase">
                            Student Responses — {groups.find(g => g.id === selectedGroup)?.name || selectedGroup}
                        </h4>
                        <button
                            onClick={() => setShowResponseSheet(false)}
                            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                        >
                            ✕ Close
                        </button>
                    </div>

                    {/* Date filter */}
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-semibold text-gray-600">Filter by date:</span>
                        {[{ label: 'All time', value: 'ALL' }, { label: 'Today', value: 'TODAY' }, { label: 'This week', value: 'THIS_WEEK' }].map(({ label, value }) => (
                            <button
                                key={value}
                                onClick={() => setDateFilter(value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${dateFilter === value ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Gender filter */}
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-xs font-semibold text-gray-600">Filter by Gender:</span>
                        <button
                            onClick={() => setFilterGender(filterGender === 'male' ? '' : 'male')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${filterGender === 'male' ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                        >♂ Male</button>
                        <button
                            onClick={() => setFilterGender(filterGender === 'female' ? '' : 'female')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${filterGender === 'female' ? 'bg-pink-500 text-white border-pink-500' : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'}`}
                        >♀ Female</button>
                        {filterGender && (
                            <button
                                onClick={() => setFilterGender('')}
                                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
                            >Clear Filter</button>
                        )}
                    </div>

                    {responseSheet.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No responses yet for this group.</p>
                    ) : filteredSheet.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No {filterGender} students found.</p>
                    ) : (
                        <div className="overflow-x-auto mt-4">
                            <table className="min-w-full border border-gray-300 text-gray-800">
                                <thead className="bg-gray-200 text-sm font-semibold">
                                    <tr>
                                        <th className="border px-4 py-2 text-left">Field</th>
                                        {filteredSheet.map((student, index) => (
                                            // FIX: show student name in header instead of generic "R1, R2..."
                                            <th key={student.studentId || index} className="border px-4 py-2 text-center">
                                                {student.studentName || `Student ${index + 1}`}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    <tr>
                                        <td className="border px-4 py-2 font-medium">Class</td>
                                        {filteredSheet.map((student, i) => <td key={i} className="border px-4 py-2 text-center">{student.className || '-'}</td>)}
                                    </tr>
                                    <tr>
                                        <td className="border px-4 py-2 font-medium">Gender</td>
                                        {filteredSheet.map((student, i) => <td key={i} className="border px-4 py-2 text-center">{student.gender || '-'}</td>)}
                                    </tr>
                                    <tr>
                                        <td className="border px-4 py-2 font-medium">Age</td>
                                        {filteredSheet.map((student, i) => <td key={i} className="border px-4 py-2 text-center">{student.age || '-'}</td>)}
                                    </tr>
                                    <tr>
                                        <td className="border px-4 py-2 font-medium">School</td>
                                        {filteredSheet.map((student, i) => <td key={i} className="border px-4 py-2 text-center">{student.schoolName || '-'}</td>)}
                                    </tr>

                                    {/* Question rows */}
                                    {questions
                                        .filter(q => String(q.groupMapId) === String(selectedGroup))
                                        .map((question, qIndex) => (
                                            <tr key={question.id}>
                                                <td className="border px-4 py-2 font-medium">
                                                    Q{qIndex + 1}. {question.questions || question.question || question.text || ''}
                                                </td>
                                                {filteredSheet.map((student, i) => {
                                                    const questionText = question.questions || question.question || question.text || ''
                                                    const ans = responseSheet.find(
                                                        r => r.studentId === student.studentId &&
                                                            (r.questionId === question.id ||
                                                                r.questionText?.toLowerCase().trim() === questionText.toLowerCase().trim())
                                                    )?.responseValue || '-'
                                                    return <td key={i} className="border px-4 py-2 text-center">{ans}</td>
                                                })}
                                            </tr>
                                        ))}

                                    {/* AI Insights */}
                                    <tr className="bg-indigo-50">
                                        <td className="border px-4 py-2 font-semibold text-indigo-800">AI Insights</td>
                                        {filteredSheet.map((student, i) => {
                                            const data = llmSummaries[student.studentId]
                                            const parsed = parseBulletPoints(data?.bulletPoints)
                                            const hasContent = data?.bulletPoints
                                            return (
                                                <td key={i} className="border px-4 py-3 text-xs align-top max-w-xs">
                                                    {hasContent ? (
                                                        <div>
                                                            {data?.summaryText && (
                                                                <p className="text-gray-600 text-xs italic mb-1 line-clamp-2">{data.summaryText}</p>
                                                            )}
                                                            <div className="space-y-1 mb-2">
                                                               {parsed.strengths.length > 0 && (
                                                                    <p className="text-green-700 text-xs">{stripEmoji(parsed.strengths[0])}</p>
                                                                )}
                                                                 {parsed.improvements.length > 0 && (
                                                                    <p className="text-blue-700 text-xs">{stripEmoji(parsed.improvements[0])}</p>
                                                                )}
                                                                {parsed.tips.length > 0 && (
                                                                    <p className="text-amber-700 text-xs">{stripEmoji(parsed.tips[0])}</p>
                                                                )}

                                                                {parsed.plain.length > 0 && parsed.strengths.length === 0 && parsed.improvements.length === 0 && (
                                                                    <p className="text-purple-700 text-xs">{parsed.plain[0]}</p>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => setInsightModal({ open: true, data, parsed, studentName: student.studentName })}
                                                                className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-all"
                                                            >
                                                                View Full ✨
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No insights yet</span>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Create Group Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="group-modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsGroupModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="group-modal-title">Create New Group</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                                        <select
                                            value={groupFormData.name}
                                            onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white"
                                        >
                                            <option value="">-- Select a Class --</option>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                                                <option key={num} value={`Class ${getOrdinal(num)}`}>Class {getOrdinal(num)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Color Theme</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {colorOptions.map((color) => (
                                                <button
                                                    key={color.value}
                                                    type="button"
                                                    onClick={() => setGroupFormData({ ...groupFormData, color: color.value })}
                                                    className={`p-3 rounded-md border-2 transition-all ${groupFormData.color === color.value ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200 hover:border-gray-400'}`}
                                                >
                                                    <div className={`w-full h-6 rounded ${color.class}`}></div>
                                                    <p className="text-xs mt-1 text-center text-gray-600">{color.label}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="button"
                                    onClick={handleSaveGroup}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:col-start-2 sm:text-sm"
                                >Create Group</button>
                                <button
                                    type="button"
                                    onClick={() => setIsGroupModalOpen(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                >Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {groups.find(g => g.id === selectedGroup)?.name === 'Daily Check-in' && (
                <div className="mb-10 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Groups Overview</h4>
                        <ul className="space-y-2">
                            {groups.map(group => {
                                const count = getGroupQuestions(group).length 
                                const colors = getColorClasses(group.color)
                                return (
                                    <li key={group.id} className="flex justify-between items-center text-sm">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>{group.name}</span>
                                        <span className="text-gray-500 text-xs">{count} questions</span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>
            )}

            {/* Full AI Insight Modal */}
            {insightModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative max-h-[85vh] overflow-y-auto">
                        <button
                            onClick={() => setInsightModal({ open: false, data: null, parsed: null, studentName: '' })}
                            className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-lg"
                        >✕</button>
                        <h3 className="text-lg font-bold text-indigo-800 mb-1">
                            ✨ AI Insight — {insightModal.studentName}
                        </h3>
                       {insightModal.data?.summaryText && (
                            <p className="text-sm text-gray-600 italic mb-4 border-b pb-3">
                                {insightModal.data.summaryText
                                    .replace(/\bshe's\b/gi, "they're")
                                    .replace(/\bhe's\b/gi, "they're")
                                    .replace(/\bshe\b/gi, 'they')
                                    .replace(/\bhe\b/gi, 'they')
                                    .replace(/\bher\b/gi, 'their')
                                    .replace(/\bhis\b/gi, 'their')
                                    .replace(/\bthey're\b/gi, "they're")
                                    .replace(/\bthem\b/gi, 'them')}
                            </p>
                        )}
                        <div className="space-y-4">
                            {insightModal.parsed?.strengths?.length > 0 && (
                                <div>
                                    <p className="text-green-700 font-semibold text-sm mb-1">✅ Strengths</p>
                                    {insightModal.parsed.strengths.map((s, i) => (
                                        <p key={i} className="text-green-800 text-sm leading-snug ml-3 mb-1">• {stripEmoji(s)}</p>
                                    ))}
                                </div>
                            )}
                            {insightModal.parsed?.improvements?.length > 0 && (
                                <div>
                                    <p className="text-blue-700 font-semibold text-sm mb-1">🔹 Areas to Improve</p>
                                    {insightModal.parsed.improvements.map((s, i) => (
                                        <p key={i} className="text-blue-800 text-sm leading-snug ml-3 mb-1">• {stripEmoji(s)}</p>
                                    ))}
                                </div>
                            )}
                            {insightModal.parsed?.tips?.length > 0 && (
                                <div>
                                    <p className="text-amber-700 font-semibold text-sm mb-1">💡 Suggested Action</p>
                                    {insightModal.parsed.tips.map((s, i) => (
                                        <p key={i} className="text-amber-800 text-sm leading-snug ml-3 mb-1">• {stripEmoji(s)}</p>
                                    ))}
                                </div>
                            )}
                            {insightModal.parsed?.plain?.length > 0 &&
                             insightModal.parsed?.strengths?.length === 0 &&
                             insightModal.parsed?.improvements?.length === 0 && (
                                <div className="space-y-1">
                                    {insightModal.parsed.plain.map((line, li) => (
                                        <p key={li} className="text-purple-700 text-sm leading-snug">• {line}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setInsightModal({ open: false, data: null, parsed: null, studentName: '' })}
                            className="mt-5 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                        >Close</button>
                    </div>
                </div>
            )}
        </div>
    )
}