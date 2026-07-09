import React, { useState, useEffect, useRef } from 'react'
import { PlusIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderPlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { apiRequest } from '../../../api/apiClient'
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
    createResponse,
    updateInsight,
    confirmInsight
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
    const [activeSubTab, setActiveSubTab] = useState('questions') // 'questions' or 'responses'
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
    const [filterConfirmation, setFilterConfirmation] = useState('ALL')
    const [responseSheet, setResponseSheet] = useState([])

    const [llmSummaries, setLlmSummaries] = useState({})
    const [insightModal, setInsightModal] = useState({ open: false, data: null, parsed: null, studentName: '', studentId: '', studentClass: '', studentGender: '', studentAge: '', studentAnswers: [] })
const [editingInsight, setEditingInsight] = useState(false)
const [editedInsightText, setEditedInsightText] = useState('')
const [isSavingInsight, setIsSavingInsight] = useState(false)
const [isConfirming, setIsConfirming] = useState(false)
const [toast, setToast] = useState(null) 
const toastTimerRef = useRef(null)

const showToast = (type, message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ type, message })
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
}
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
    const lastFetchedAtRef = useRef(0)

    const activeSubTabRef = useRef(activeSubTab)
    useEffect(() => { activeSubTabRef.current = activeSubTab }, [activeSubTab])

    const selectedGroupRef = useRef(selectedGroup)
    useEffect(() => { selectedGroupRef.current = selectedGroup }, [selectedGroup])

    const groupsRef = useRef(groups)
    useEffect(() => { groupsRef.current = groups }, [groups])

    const matchesGender = (student) => {
        if (!filterGender) return true
        if (!student.gender) return true
        return student.gender.toLowerCase().startsWith(filterGender.toLowerCase())
    }

    const matchesConfirmation = (student) => {
        if (filterConfirmation === 'ALL') return true
        const data = llmSummaries[student.studentId]
        const isConfirmed = data?.confirmed === 'Y'
        if (filterConfirmation === 'CONFIRMED') return isConfirmed
        if (filterConfirmation === 'UNCONFIRMED') return !isConfirmed
        return true
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
                lastFetchedAtRef.current = Date.now()
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

    useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            if (isQuestionModalOpen) {
                setIsQuestionModalOpen(false)
            } else if (isGroupModalOpen) {
                setIsGroupModalOpen(false)
            } else if (activeSubTab === 'responses') {
                setActiveSubTab('questions')
            } else if (insightModal.open) {
                setInsightModal({ open: false, data: null, parsed: null, studentName: '' })
            } else if (toast) {
                setToast(null)
            }
        }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
}, [isQuestionModalOpen, isGroupModalOpen, activeSubTab, insightModal, toast])

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
        if (Date.now() - lastFetchedAtRef.current > 30000) {
            fetchQuestions(0, 200)
                .then(data => {
                    const questionList = data?.content || data || []
                    setQuestions(questionList)
                    lastFetchedAtRef.current = Date.now()
                })
                .catch(err => console.error('Questions auto-refetch error:', err))
        }

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
            showToast('error', 'Please provide a question and at least 2 options')
            setIsSubmittingQuestion(false)  
            return
        }

        const cleanedOptions = options.map(opt => opt.trim().toLowerCase())
        const hasDuplicates = cleanedOptions.some((val, index) => cleanedOptions.indexOf(val) !== index)
        if (hasDuplicates) {
            showToast('error', 'Each option text must be unique. Duplicate options are not allowed.')
            setIsSubmittingQuestion(false)
            return
        }

        if (questionFormData.groups.length === 0) {
            showToast('error', 'Please select at least one group')
            setIsSubmittingQuestion(false)
            return
        }

        const questionData = {
            questionText: questionFormData.question,
            domain: questionFormData.domain || '',
            options: options.join(','),
        }

        const rawOptions = [
            questionFormData.option1,
            questionFormData.option2,
            questionFormData.option3,
            questionFormData.option4
        ];

        const buildAnswerOptionPayloads = (questionId) =>
            rawOptions.slice(0, questionFormData.optionCount).map((opt, i) => {
                const n = i + 1
                if (!opt || !opt.trim()) return null;
                return {
                    questionId,
                    optionLabel: opt.trim(),
                    optionIndex: i,
                    overallMeaning: questionFormData[`option${n}OverallMeaning`] || '',
                    interpretation: questionFormData[`option${n}Interpretation`] || '',
                    tag: questionFormData[`option${n}Tag`] || '',
                    range: '',
                }
            }).filter(p => p !== null)

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
            lastFetchedAtRef.current = Date.now()
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
    .then(() => { setIsSubmittingQuestion(false); setIsQuestionModalOpen(false); refetchQuestions(); showToast('success', 'Question updated successfully') })
    .catch(err => { console.error('❌ Question update failed:', err); setIsSubmittingQuestion(false); setIsQuestionModalOpen(false); showToast('error', 'Failed to update question') }) }else {
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
                .then(() => { setIsSubmittingQuestion(false); setIsQuestionModalOpen(false); refetchQuestions(); showToast('success', 'Question added successfully') })
.catch(err => { console.error('❌ Question NOT saved:', err); setIsSubmittingQuestion(false); setIsQuestionModalOpen(false); showToast('error', 'Failed to add question') })
        }
    }

    const handleSaveGroup = () => {
        if (!groupFormData.name.trim()) { showToast('error', 'Please provide a group name'); return }
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
        if (group.isDefault === true || group.isDefault === 'true') { showToast('error', 'Cannot delete default groups'); return }
        const hasQuestions = questions.some(q => String(q.groupMapId) === String(groupId))
        if (hasQuestions) { showToast('error', 'Cannot delete group with existing questions.'); return }
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
                if (activeSubTabRef.current === 'responses' && currentGroupName) {
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
    const filteredSheet = sheetStudents.filter(s => matchesGender(s) && filterByDate(s) && matchesConfirmation(s))

    const fetchSummaryForStudent = (studentId, groupId) => {
        apiRequest(`/api/assessment/reports/student/${encodeURIComponent(studentId)}/group/${groupId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (!d) return
                const summaryText  = (d.summaryText  || '').trim()
                const bulletPoints = (d.bulletPoints || '').trim()
                if (summaryText || bulletPoints) {
                    setLlmSummaries(prev => ({
                        ...prev,
                        [studentId]: {
                            id:                d.id   || null,
                            summaryText,
                            bulletPoints,
                            editedSummaryText: d.editedSummaryText || null,
                            editedBy:          d.editedBy          || null,
                            confirmed:         d.confirmed         || 'N',
                            sessionDate:       d.sessionDate       || null
                        }
                    }))
                }
            })
            .catch(() => { })
    }
    const stripEmoji = (text) =>
        (text || '').replace(/^[\p{Emoji}\s•\-–—*]+/u, '').trim()

    const handleGenerateInsight = async (studentId, studentName, studentClass, studentAnswers) => {
        try {
            setIsConfirming(true)
            const groupObj = groups.find(g => g.id === selectedGroup)
            const resolvedClassName = studentClass || groupObj?.className || groupObj?.name || ''
            
            const response = await apiRequest('/api/assessment/reports/generate', {
                method: 'POST',
                body: JSON.stringify({
                    studentId,
                    studentName: studentName || '',
                    groupId: selectedGroup,
                    groupName: groupObj?.name || '',
                    className: resolvedClassName,
                    answers: studentAnswers
                })
            })
            
            if (response.ok) {
                const d = await response.json()
                const summaryText = (d.summaryText || '').trim()
                const bulletPoints = (d.bulletPoints || '').trim()
                const updatedData = {
                    id: d.id || null,
                    summaryText,
                    bulletPoints,
                    editedSummaryText: d.editedSummaryText || null,
                    editedBy: d.editedBy || null,
                    confirmed: d.confirmed || 'N',
                    sessionDate: d.sessionDate || null
                }
                
                setLlmSummaries(prev => ({
                    ...prev,
                    [studentId]: updatedData
                }))
                
                setInsightModal(prev => ({
                    ...prev,
                    data: updatedData,
                    parsed: parseBulletPoints(bulletPoints)
                }))
                showToast('success', 'AI Insight generated successfully!')
            } else {
                showToast('error', 'Failed to generate AI Insight.')
            }
        } catch (err) {
            console.error('Error generating AI Insight:', err)
            showToast('error', 'Error generating AI Insight.')
        } finally {
            setIsConfirming(false)
        }
    }
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
            {toast && (
    <div className="fixed top-5 right-5 z-[60] animate-fade-in">
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm ${
            toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
        }`}>
            <span className="text-lg leading-none mt-0.5">
                {toast.type === 'success' ? '✅' : '⚠️'}
            </span>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
                onClick={() => setToast(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
)}
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
                                    setActiveSubTab('questions')
                                    setResponseSheet([])
                                    setFilterGender('')
                                    setFilterConfirmation('ALL')
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

            {/* Sub-tabs for the selected group */}
            {selectedGroup && !isStudentResponsesSelected && (
                <div className="border-b border-gray-200 mb-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                            {groups.find(g => g.id === selectedGroup)?.name}
                        </h4>
                    </div>
                    <nav className="-mb-px flex space-x-8 overflow-x-auto">
                        <button
                            onClick={() => setActiveSubTab('questions')}
                            className={'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ' + (activeSubTab === 'questions' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}
                        >
                            Questions
                        </button>
                        <button
                            onClick={async () => {
                                if (activeSubTab === 'responses') return;
                                setActiveSubTab('responses')
                                setResponseSheet([])
                                setLlmSummaries({})
                                setFilterGender('')
                                setFilterConfirmation('ALL')
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

                                    apiRequest('/api/assessment/reports/generate', {
                                        method: 'POST',
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
                                                [sid]: {
                                                    id:                d.id   || null,
                                                    summaryText,
                                                    bulletPoints,
                                                    editedSummaryText: d.editedSummaryText || null,
                                                    editedBy:          d.editedBy          || null,
                                                    confirmed:         d.confirmed         || 'N',
                                                    sessionDate:       d.sessionDate       || null
                                                }
                                            }))
                                        }
                                    })
                                    .catch(() => fetchSummaryForStudent(sid, selectedGroup))
                                })

                                loadAnalytics(selectedFilter, selectedGroup)
                            }}
                            className={'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ' + (activeSubTab === 'responses' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}
                        >
                            Responses
                        </button>
                        <button
                            onClick={() => {
                                if (activeSubTab === 'knowledge_base') return;
                                setActiveSubTab('knowledge_base')
                            }}
                            className={'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ' + (activeSubTab === 'knowledge_base' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}
                        >
                            Knowledge Base
                        </button>
                    </nav>
                </div>
            )}

            {/* Questions Section */}
            {selectedGroup && !isStudentResponsesSelected && activeSubTab === 'questions' && (
                <div>
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
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6 relative">
                            <button
                                onClick={() => setIsQuestionModalOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
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
            {activeSubTab === 'responses' && selectedGroup && (
                <div className="mt-8 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase">
                            Student Responses — {groups.find(g => g.id === selectedGroup)?.name || selectedGroup}
                        </h4>
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

                    {/* Confirmation Status filter */}
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-xs font-semibold text-gray-600">Confirmation Status:</span>
                        {[
                            { label: 'All', value: 'ALL', activeClass: 'bg-purple-600 text-white border-purple-600', inactiveClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                            { label: 'Confirmed Only', value: 'CONFIRMED', activeClass: 'bg-green-600 text-white border-green-600', inactiveClass: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
                            { label: 'Unconfirmed Only', value: 'UNCONFIRMED', activeClass: 'bg-amber-600 text-white border-amber-600', inactiveClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' }
                        ].map(({ label, value, activeClass, inactiveClass }) => (
                            <button
                                key={value}
                                onClick={() => setFilterConfirmation(value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${filterConfirmation === value ? activeClass : inactiveClass}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {responseSheet.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No responses yet for this group.</p>
                    ) : filteredSheet.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No {filterGender} students found.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
                            {filteredSheet.map((student, index) => {
                                const data = llmSummaries[student.studentId]
                                const parsed = parseBulletPoints(data?.bulletPoints)
                                const hasContent = !!data?.bulletPoints
                                
                                const studentAnswers = questions
                                    .filter(q => String(q.groupMapId) === String(selectedGroup))
                                    .map((question, qIndex) => {
                                        const questionText = question.questions || question.question || question.text || ''
                                        const ans = responseSheet.find(
                                            r => r.studentId === student.studentId &&
                                                (r.questionId === question.id ||
                                                    r.questionText?.toLowerCase().trim() === questionText.toLowerCase().trim())
                                        )?.responseValue || '-'
                                        return { qIndex, questionText, ans }
                                    })

                                return (
                                    <div key={student.studentId || index} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col">
                                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">
                                                    {`Student ${student.studentId || index + 1}`}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {student.className && <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs rounded-full font-medium">{student.className}</span>}
                                                    {student.gender && <span className="px-2.5 py-0.5 bg-pink-50 text-pink-700 border border-pink-200 text-xs rounded-full font-medium">{student.gender}</span>}
                                                    {student.age && <span className="px-2.5 py-0.5 bg-green-50 text-green-700 border border-green-200 text-xs rounded-full font-medium">{student.age} yrs</span>}
                                                </div>
                                            </div>
                                            {hasContent && (
                                                <button
                                                    onClick={() => setInsightModal({
                                                        open: true,
                                                        data,
                                                        parsed,
                                                        studentName: `Student ${student.studentId || index + 1}`,
                                                        studentId: student.studentId,
                                                        studentClass: student.className,
                                                        studentGender: student.gender,
                                                        studentAge: student.age,
                                                        studentAnswers
                                                    })}
                                                    className="shrink-0 flex items-center justify-center w-10 h-10 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-full transition-colors shadow-sm"
                                                    title="View Full AI Insights"
                                                >
                                                    <span className="text-lg">✨</span>
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="p-5 flex-1 bg-white">
                                            {hasContent ? (
                                                <div>
                                                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-3">AI Insights</h4>
                                                    {data?.summaryText && (
                                                        <p className="text-gray-600 text-sm italic mb-3 line-clamp-2 leading-relaxed">{data.summaryText}</p>
                                                    )}
                                                    <div className="space-y-2">
                                                        {parsed.strengths.length > 0 && (
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-green-600 mt-0.5">✅</span>
                                                                <p className="text-green-800 text-xs line-clamp-2 leading-tight">{stripEmoji(parsed.strengths[0])}</p>
                                                            </div>
                                                        )}
                                                        {parsed.improvements.length > 0 && (
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-blue-600 mt-0.5">🔹</span>
                                                                <p className="text-blue-800 text-xs line-clamp-2 leading-tight">{stripEmoji(parsed.improvements[0])}</p>
                                                            </div>
                                                        )}
                                                        {parsed.tips.length > 0 && parsed.strengths.length === 0 && parsed.improvements.length === 0 && (
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-amber-600 mt-0.5">💡</span>
                                                                <p className="text-amber-800 text-xs line-clamp-2 leading-tight">{stripEmoji(parsed.tips[0])}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic py-4">
                                                    No insights generated yet
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-gray-100 bg-gray-50 p-5">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Survey Answers</h4>
                                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                {studentAnswers.map((item, idx) => (
                                                    <div key={idx} className="flex flex-col bg-white p-2 rounded border border-gray-100">
                                                        <span className="text-xs font-medium text-gray-600 mb-1">Q{item.qIndex + 1}. {item.questionText}</span>
                                                        <span className="text-sm text-purple-700 font-semibold">{item.ans}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 bg-gray-50 px-5 pb-5">
                                            <button
                                                onClick={() => setInsightModal({
                                                    open: true,
                                                    data,
                                                    parsed,
                                                    studentName: `Student ${student.studentId || index + 1}`,
                                                    studentId: student.studentId,
                                                    studentClass: student.className,
                                                    studentGender: student.gender,
                                                    studentAge: student.age,
                                                    studentAnswers
                                                })}
                                                className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 hover:border-indigo-400 text-gray-700 hover:text-indigo-600 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                                            >
                                                🔍 View & Edit Details
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Knowledge Base Section */}
            {selectedGroup && !isStudentResponsesSelected && activeSubTab === 'knowledge_base' && (
                <OverviewKnowledgeBase />
            )}

            {/* Create Group Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="group-modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsGroupModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6 relative">
                            <button
                                onClick={() => setIsGroupModalOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
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
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl relative max-h-[90vh] overflow-hidden flex flex-col">
                        <button
                            onClick={() => setInsightModal({ open: false, data: null, parsed: null, studentName: '', studentId: '', studentClass: '', studentGender: '', studentAge: '', studentAnswers: [] })}
                            className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-lg"
                        >✕</button>
                        
                        <h3 className="text-xl font-bold text-indigo-800 mb-4 border-b pb-2 flex items-center gap-2">
                            <span>✨</span> AI Insight & Student Details — {insightModal.studentName}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {/* Left Column: Student Details & Survey Answers */}
                            <div className="border-r border-gray-100 pr-6 space-y-4">
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                                    <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider mb-2">Student Profile</h4>
                                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-indigo-950">
                                        <div><span className="text-gray-500 text-xs">Class:</span> <span className="font-semibold">{insightModal.studentClass || '-'}</span></div>
                                        <div><span className="text-gray-500 text-xs">Gender:</span> <span className="font-semibold capitalize">{insightModal.studentGender || '-'}</span></div>
                                        <div><span className="text-gray-500 text-xs">Age:</span> <span className="font-semibold">{insightModal.studentAge ? `${insightModal.studentAge} yrs` : '-'}</span></div>
                                        <div><span className="text-gray-500 text-xs">Student ID:</span> <span className="font-semibold">{insightModal.studentId || '-'}</span></div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Survey Answers</h4>
                                    {insightModal.studentAnswers && insightModal.studentAnswers.length > 0 ? (
                                        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                                            {insightModal.studentAnswers.map((item, idx) => (
                                                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <p className="text-xs font-semibold text-gray-700">Q{item.qIndex + 1}. {item.questionText}</p>
                                                    <p className="text-sm text-purple-700 font-bold mt-1">{item.ans}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">No survey answers found.</p>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: AI Insights & Editing UI */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">AI Insights</h4>
                                
                                {insightModal.data ? (
                                    <>
                                        {insightModal.data.summaryText && (
                                            <p className="text-sm text-gray-600 italic mb-4 border-b pb-3 leading-relaxed">
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
                                        <div className="space-y-3">
                                            {insightModal.parsed?.strengths?.length > 0 && (
                                                <div>
                                                    <p className="text-green-700 font-bold text-xs uppercase tracking-wider mb-1">✅ Strengths</p>
                                                    {insightModal.parsed.strengths.map((s, i) => (
                                                        <p key={i} className="text-green-800 text-sm leading-snug ml-3 mb-1">• {stripEmoji(s)}</p>
                                                    ))}
                                                </div>
                                            )}
                                            {insightModal.parsed?.improvements?.length > 0 && (
                                                <div>
                                                    <p className="text-blue-700 font-bold text-xs uppercase tracking-wider mb-1">🔹 Areas to Improve</p>
                                                    {insightModal.parsed.improvements.map((s, i) => (
                                                        <p key={i} className="text-blue-800 text-sm leading-snug ml-3 mb-1">• {stripEmoji(s)}</p>
                                                    ))}
                                                </div>
                                            )}
                                            {insightModal.parsed?.tips?.length > 0 && (
                                                <div>
                                                    <p className="text-amber-700 font-bold text-xs uppercase tracking-wider mb-1">💡 Suggested Action</p>
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
                                    </>
                                ) : (
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
                                        <p className="text-sm text-gray-500 italic mb-4">No AI Insight has been generated for this student yet.</p>
                                        {insightModal.studentAnswers && insightModal.studentAnswers.length > 0 ? (
                                            <button
                                                disabled={isConfirming}
                                                onClick={() => handleGenerateInsight(
                                                    insightModal.studentId,
                                                    insightModal.studentName,
                                                    insightModal.studentClass,
                                                    insightModal.studentAnswers
                                                )}
                                                className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-60 shadow-sm flex items-center justify-center gap-2 mx-auto"
                                            >
                                                ✨ {isConfirming ? 'Generating...' : 'Generate AI Insight Now'}
                                            </button>
                                        ) : (
                                            <p className="text-xs text-red-500">Student must complete assessment answers before AI Insight can be generated.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {insightModal.data && (
                            <div className="mt-5 pt-4 border-t flex gap-3">
                                {insightModal.data?.confirmed === 'Y' ? (
                                    <>
                                        <div className="flex-1 py-2 bg-green-50 border-2 border-green-500 text-green-700 rounded-lg text-sm font-semibold text-center flex items-center justify-center gap-1.5">
                                            <span>✅</span> Confirmed
                                        </div>
                                        <button
                                            onClick={() => {
                                                setInsightModal({ open: false, data: null, parsed: null, studentName: '', studentId: '', studentClass: '', studentGender: '', studentAge: '', studentAnswers: [] })
                                                setEditingInsight(false)
                                                setEditedInsightText('')
                                            }}
                                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
                                        >Close</button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setEditingInsight(true)
                                                setEditedInsightText(
                                                    (insightModal.data?.bulletPoints || '') +
                                                    (insightModal.data?.summaryText ? '\n\nSummary:\n' + insightModal.data.summaryText : '')
                                                )
                                            }}
                                            className="flex-1 py-2.5 bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                                        >✏️ Edit</button>
                                        <button
                                            disabled={isConfirming}
                                            onClick={async () => {
                                                const reportId = insightModal.data?.id
                                                if (!reportId) {
                                                    console.error('Confirm failed: reportId is missing from insightModal.data', insightModal.data)
                                                    return
                                                }
                                                try {
                                                    setIsConfirming(true)
                                                    const result = await confirmInsight(reportId)
                                                    const updatedData = { 
                                                        ...insightModal.data, 
                                                        confirmed: 'Y',
                                                        editedBy: result?.editedBy || insightModal.data?.editedBy || ''
                                                    }
                                                    setLlmSummaries(prev => ({ ...prev, [insightModal.studentId]: updatedData }))
                                                    setInsightModal(prev => ({
                                                        ...prev,
                                                        data: updatedData
                                                    }))
                                                    setEditingInsight(false)
                                                    setEditedInsightText('')
                                                } catch (err) {
                                                    console.error('Confirm insight failed:', err)
                                                } finally {
                                                    setIsConfirming(false)
                                                }
                                            }}
                                            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
                                        >{isConfirming ? 'Confirming...' : '✅ Confirm'}</button>
                                        <button
                                            onClick={() => {
                                                setInsightModal({ open: false, data: null, parsed: null, studentName: '', studentId: '', studentClass: '', studentGender: '', studentAge: '', studentAnswers: [] })
                                                setEditingInsight(false)
                                                setEditedInsightText('')
                                            }}
                                            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                                        >Close</button>
                                    </>
                                )}
                            </div>
                        )}

                        {!insightModal.data && (
                            <div className="mt-5 pt-4 border-t flex justify-end">
                                <button
                                    onClick={() => {
                                        setInsightModal({ open: false, data: null, parsed: null, studentName: '', studentId: '', studentClass: '', studentGender: '', studentAge: '', studentAnswers: [] })
                                        setEditingInsight(false)
                                        setEditedInsightText('')
                                    }}
                                    className="py-2.5 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                                >Close</button>
                            </div>
                        )}

                        {insightModal.data && insightModal.data?.confirmed !== 'Y' && editingInsight && (
                            <div className="mt-4 border-t pt-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Edit AI Response</p>
                                <textarea
                                    rows={10}
                                    value={editedInsightText}
                                    onChange={e => setEditedInsightText(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                                />
                                <div className="flex gap-3 mt-3">
                                    <button
                                        onClick={() => { setEditingInsight(false); setEditedInsightText('') }}
                                        className="flex-1 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium"
                                    >Cancel</button>
                                    <button
                                        disabled={isSavingInsight}
                                        onClick={async () => {
                                            const lines = editedInsightText.split('\n')
                                            const summaryMarker = lines.findIndex(l => l.trim() === 'Summary:')
                                            let bulletPoints = editedInsightText
                                            let summaryText = insightModal.data?.summaryText || ''
                                            if (summaryMarker !== -1) {
                                                bulletPoints = lines.slice(0, summaryMarker).join('\n').trim()
                                                summaryText  = lines.slice(summaryMarker + 1).join('\n').trim()
                                            }

                                            const reportId = insightModal.data?.id
                                            let updatedData = {
                                                ...insightModal.data,
                                                bulletPoints,
                                                summaryText,
                                                editedSummaryText: editedInsightText
                                            }

                                            if (reportId) {
                                                try {
                                                    setIsSavingInsight(true)
                                                    const saved = await updateInsight(reportId, editedInsightText)
                                                 
                                                    updatedData = {
                                                        ...updatedData,
                                                        editedSummaryText: saved.editedSummaryText || editedInsightText,
                                                        editedBy:          saved.editedBy          || '',
                                                        confirmed:         saved.confirmed          || 'N',
                                                        bulletPoints,
                                                        summaryText
                                                    }
                                                } catch (err) {
                                                    console.error('Save insight failed:', err)
                                                } finally {
                                                    setIsSavingInsight(false)
                                                }
                                            }

                                            const newParsed = parseBulletPoints(bulletPoints)
                                            setLlmSummaries(prev => ({ ...prev, [insightModal.studentId]: updatedData }))
                                            setInsightModal(prev => ({
                                                ...prev,
                                                data: updatedData,
                                                parsed: newParsed
                                            }))
                                            setEditingInsight(false)
                                            setEditedInsightText('')
                                        }}
                                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                                    >{isSavingInsight ? 'Saving...' : 'Save Changes'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const loadXlsx = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      resolve(window.XLSX)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX)
      } else {
        reject(new Error('XLSX loaded but not found on window'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load XLSX library from CDN'))
    document.body.appendChild(script)
  })
}

function OverviewKnowledgeBase() {
    const [overviews, setOverviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState(null)
    const toastTimerRef = useRef(null)

    const showToast = (type, message) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast({ type, message })
        toastTimerRef.current = setTimeout(() => setToast(null), 4000)
    }

    const loadOverviewsData = () => {
        setLoading(true)
        apiRequest('/api/assessment/overviews')
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                setOverviews(Array.isArray(data) ? data : [])
            })
            .catch(err => console.error('Failed to load overviews:', err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        loadOverviewsData()
        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        }
    }, [])

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to clear all psychologist overviews from the database? This cannot be undone.")) return;
        try {
            setLoading(true)
            const res = await apiRequest('/api/assessment/overviews/clear', { method: 'DELETE' })
            if (res.ok) {
                showToast('success', 'Cleared all overviews successfully!')
                setOverviews([])
            } else {
                showToast('error', 'Failed to clear overviews.')
            }
        } catch (e) {
            console.error(e)
            showToast('error', 'Error clearing overviews.')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteOverview = async (docId) => {
        if (!window.confirm("Delete this overview doc?")) return;
        try {
            const res = await apiRequest(`/api/assessment/overviews/${encodeURIComponent(docId)}`, { method: 'DELETE' })
            if (res.ok) {
                showToast('success', 'Deleted overview successfully!')
                setOverviews(prev => prev.filter(o => o.doc_id !== docId))
            } else {
                showToast('error', 'Failed to delete overview.')
            }
        } catch (e) {
            console.error(e)
            showToast('error', 'Error deleting overview.')
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        try {
            setUploading(true)
            const XLSX = await loadXlsx()
            const reader = new FileReader()
            
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result)
                    const workbook = XLSX.read(data, { type: 'array' })
                    
                    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('interpretation')) || workbook.SheetNames[0]
                    const sheet = workbook.Sheets[sheetName]
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
                    
                    if (rows.length < 2) {
                        showToast('error', 'Excel sheet is empty or invalid.')
                        setUploading(false)
                        return
                    }

                    const startRowIdx = 1
                    let currentQuestion = ''
                    let currentDomain = ''
                    const groups = {}
                    
                    for (let idx = startRowIdx; idx < rows.length; idx++) {
                        const row = rows[idx]
                        if (!row || row.length === 0) continue
                        
                        let question = String(row[0] || '').trim()
                        let domain = String(row[1] || '').trim()
                        const answers = String(row[2] || '').trim()
                        const range = String(row[3] || '').trim()
                        const overallMeaning = String(row[4] || '').trim()
                        const interpretation = String(row[5] || '').trim()
                        
                        if (question) {
                            currentQuestion = question
                        }
                        if (domain) {
                            currentDomain = domain
                        }
                        
                        if (!currentQuestion) continue
                        
                        if (!groups[currentQuestion]) {
                            groups[currentQuestion] = {
                                domain: currentDomain,
                                rows: []
                            }
                        }
                        
                        if (answers || range || overallMeaning || interpretation) {
                            groups[currentQuestion].rows.push({
                                answers,
                                range,
                                overallMeaning,
                                interpretation
                            })
                        }
                    }

                    const uploadItems = Object.keys(groups).map((qText, index) => {
                        const groupObj = groups[qText]
                        const overviewParts = [
                            `Question: ${qText}`,
                            `Domain: ${groupObj.domain}`,
                            ""
                        ]
                        
                        groupObj.rows.forEach(r => {
                            const parts = []
                            if (r.answers) parts.push(`Answer Option: ${r.answers}`)
                            if (r.range) parts.push(`Range: ${r.range}`)
                            if (r.overallMeaning) parts.push(`Overall Meaning: ${r.overallMeaning}`)
                            if (r.interpretation) parts.push(`Psychological Interpretation: ${r.interpretation}`)
                            if (parts.length > 0) {
                                overviewParts.push(parts.join(" | "))
                            }
                        })
                        
                        return {
                            doc_id: `question_${Date.now()}_${index + 1}`,
                            document: overviewParts.join("\n"),
                            metadata: {
                                question_id: index + 1,
                                question_text: qText.substring(0, 200),
                                domain: groupObj.domain
                            }
                        }
                    })

                    if (uploadItems.length === 0) {
                        showToast('error', 'No valid questions/interpretations found in sheet.')
                        setUploading(false)
                        return
                    }

                    const res = await apiRequest('/api/assessment/overviews/batch-upsert', {
                        method: 'POST',
                        body: JSON.stringify({ items: uploadItems })
                    })
                    
                    if (res.ok) {
                        showToast('success', `Successfully uploaded ${uploadItems.length} overviews!`)
                        loadOverviewsData()
                    } else {
                        showToast('error', 'Failed to upload overviews batch.')
                    }
                } catch (err) {
                    console.error(err)
                    showToast('error', 'Error reading Excel file content.')
                } finally {
                    setUploading(false)
                }
            }
            
            reader.readAsArrayBuffer(file)
        } catch (err) {
            console.error(err)
            showToast('error', 'Failed to load excel parsing engine.')
            setUploading(false)
        }
    }

    const handlePasteData = async (e) => {
        const text = e.target.value
        if (!text.trim()) return
        
        try {
            const lines = text.split('\n').filter(Boolean)
            const rows = lines.map(line => line.split('\t'))
            
            if (rows.length === 0) {
                showToast('error', 'No pasted content detected.')
                return
            }

            let currentQuestion = ''
            let currentDomain = ''
            const groups = {}
            
            for (let idx = 0; idx < rows.length; idx++) {
                const row = rows[idx]
                if (!row || row.length === 0) continue
                
                let question = String(row[0] || '').trim()
                let domain = String(row[1] || '').trim()
                const answers = String(row[2] || '').trim()
                const range = String(row[3] || '').trim()
                const overallMeaning = String(row[4] || '').trim()
                const interpretation = String(row[5] || '').trim()
                
                if (question) {
                    currentQuestion = question
                }
                if (domain) {
                    currentDomain = domain
                }
                
                if (!currentQuestion) continue
                
                if (!groups[currentQuestion]) {
                    groups[currentQuestion] = {
                        domain: currentDomain,
                        rows: []
                    }
                }
                
                if (answers || range || overallMeaning || interpretation) {
                    groups[currentQuestion].rows.push({
                        answers,
                        range,
                        overallMeaning,
                        interpretation
                    })
                }
            }

            const uploadItems = Object.keys(groups).map((qText, index) => {
                const groupObj = groups[qText]
                const overviewParts = [
                    `Question: ${qText}`,
                    `Domain: ${groupObj.domain}`,
                    ""
                ]
                
                groupObj.rows.forEach(r => {
                    const parts = []
                    if (r.answers) parts.push(`Answer Option: ${r.answers}`)
                    if (r.range) parts.push(`Range: ${r.range}`)
                    if (r.overallMeaning) parts.push(`Overall Meaning: ${r.overallMeaning}`)
                    if (r.interpretation) parts.push(`Psychological Interpretation: ${r.interpretation}`)
                    if (parts.length > 0) {
                        overviewParts.push(parts.join(" | "))
                    }
                })
                
                return {
                    doc_id: `question_${Date.now()}_${index + 1}`,
                    document: overviewParts.join("\n"),
                    metadata: {
                        question_id: index + 1,
                        question_text: qText.substring(0, 200),
                        domain: groupObj.domain
                    }
                }
            })

            if (uploadItems.length === 0) {
                showToast('error', 'Could not parse any valid questions/interpretations from pasted content.')
                return
            }

            setLoading(true)
            const res = await apiRequest('/api/assessment/overviews/batch-upsert', {
                method: 'POST',
                body: JSON.stringify({ items: uploadItems })
            })
            
            if (res.ok) {
                showToast('success', `Successfully loaded ${uploadItems.length} pasted overviews!`)
                e.target.value = '' // Clear textarea
                loadOverviewsData()
            } else {
                showToast('error', 'Failed to upload pasted overviews.')
            }
        } catch (err) {
            console.error(err)
            showToast('error', 'Failed to process pasted data.')
        } finally {
            setLoading(false)
        }
    }

    const filteredOverviews = overviews.filter(o => {
        const docText = (o.document || '').toLowerCase()
        const domText = (o.metadata?.domain || '').toLowerCase()
        const query = searchQuery.toLowerCase()
        return docText.includes(query) || domText.includes(query)
    })

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
            {toast && (
                <div className={`fixed top-4 right-4 z-[999] px-4 py-3 rounded-lg shadow-xl border text-sm font-semibold transition-all duration-300 ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {toast.message}
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Psychologist AI Knowledge Base</h3>
                    <p className="text-xs text-gray-500 mt-1">Upload and manage question-level psychological interpretations used by the AI engine to evaluate student profiles.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                        🗑️ Clear All
                    </button>
                    <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm">
                        <span>📤</span> {uploading ? 'Uploading...' : 'Upload Excel Sheet'}
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {/* Paste Excel Data Box */}
            <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-5 space-y-3">
                <h4 className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                    <span>📋</span> Quick Paste from Excel
                </h4>
                <p className="text-xs text-purple-700 leading-normal">
                    Instead of uploading a file, you can copy cells directly from your Excel sheet (Columns A to F) and paste them below to load them instantly.
                </p>
                <textarea
                    rows={3}
                    placeholder="Paste Excel columns here (TSV format)..."
                    className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white placeholder-purple-300"
                    onChange={handlePasteData}
                />
            </div>

            <div className="max-w-md">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by domain or question..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500 italic">Loading overviews data...</div>
            ) : filteredOverviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No psychologist overviews found. Upload an excel sheet to start.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-3 text-left w-1/4">Domain</th>
                                <th className="px-6 py-3 text-left">Question & Interpretation Details</th>
                                <th className="px-6 py-3 text-center w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-gray-900 bg-white">
                            {filteredOverviews.map((o) => {
                                const domain = o.metadata?.domain || 'General'
                                const lines = (o.document || '').split('\n').filter(Boolean)
                                const question = lines.find(l => l.startsWith('Question:'))?.replace('Question:', '').trim() || ''
                                const interpretationDetails = lines.filter(l => !l.startsWith('Question:') && !l.startsWith('Domain:'))
                                
                                return (
                                    <tr key={o.doc_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 valign-top font-semibold text-purple-700 whitespace-nowrap">{domain}</td>
                                        <td className="px-6 py-4 space-y-2">
                                            <p className="font-bold text-gray-900">{question}</p>
                                            <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100 max-h-36 overflow-y-auto custom-scrollbar">
                                                {interpretationDetails.map((detail, dIdx) => (
                                                    <p key={dIdx}>{detail}</p>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center valign-middle">
                                            <button
                                                onClick={() => handleDeleteOverview(o.doc_id)}
                                                className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-full transition-colors"
                                                title="Delete entry"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}