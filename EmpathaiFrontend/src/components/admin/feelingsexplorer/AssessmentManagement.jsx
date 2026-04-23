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
      const calculateAgeFromDOB = (dob) => {
    if (!dob) return null
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age > 0 ? age : null
} 

    const [groups, setGroups] = useState([])
    
    // Get current user role
const savedUser = localStorage.getItem('user')
const currentUser = savedUser ? JSON.parse(savedUser) : null
const isAdmin = currentUser?.role === 'SUPER_ADMIN' || 
                currentUser?.role === 'ADMIN' || 
                currentUser?.role === 'admin';

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
    const [questionFormData, setQuestionFormData] = useState({
        question: '',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        groups: [],
        
    })

    const [groupFormData, setGroupFormData] = useState({
        name: '',
        color: 'purple',
        className: ''
    })
 
const [selectedFilter, setSelectedFilter] = useState('ALL')
const [analytics, setAnalytics] = useState(null)
const showResponseSheetRef = useRef(showResponseSheet)
useEffect(() => {
    showResponseSheetRef.current = showResponseSheet
}, [showResponseSheet])

const selectedGroupRef = useRef(selectedGroup)
useEffect(() => {
    selectedGroupRef.current = selectedGroup
}, [selectedGroup])

const groupsRef = useRef(groups)
useEffect(() => {
    groupsRef.current = groups
}, [groups])
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
    if (dateFilter === 'TODAY') {
        return d.toDateString() === now.toDateString()
    }
    if (dateFilter === 'THIS_WEEK') {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        return d >= startOfWeek
    }
    return true
}



// NOTE: Default groups removed — they used string IDs ('Daily Check-in', 'Class 8th', etc.)
// which caused groupMapId to be sent as a string to the backend (which expects a Long),
// resulting in null being saved to the DB. All groups must come from the DB with numeric IDs.


useEffect(() => {

    

    const defaultQuestions = [
        {
            id: 1,
            text: 'How are you feeling today?',
            options: ['Very Happy 😊', 'Happy 🙂', 'Okay 😐', 'Sad 😢'],
            groups: ['Daily Check-in']
        },
        {
            id: 2,
            text: 'How well did you sleep last night?',
            options: ['Very Well 😴', 'Good 😌', 'Not Great 😪', 'Poorly 😫'],
            groups: ['Daily Check-in']
        },
        {
            id: 3,
            text: 'How confident do you feel about your studies?',
            options: ['Very Confident 💪', 'Confident 👍', 'Somewhat Confident 🤔', 'Not Confident 😟'],
            groups: ['Class 8th']
        },
    ]

    // Fetch Groups
  fetchGroups()
.then(data => {
    console.log('Groups from API:', data)
    const groupList = Array.isArray(data) ? data : (data?.data || data || [])
    const sorted = [...groupList].sort((a, b) => {
        if (!a.createdAt) return -1
        if (!b.createdAt) return 1
        return new Date(a.createdAt) - new Date(b.createdAt)
    })
    // Only use real DB groups — all groups must have numeric IDs from the DB
    setGroups(sorted)
})
.catch((err) => {
    console.error('Groups fetch failed:', err)
    setGroups([])
})

    // Fetch Questions
fetchQuestions(0,50)
    .then(data => {
        console.log('Questions from DB:', data)
        const questionList = data?.content || data || []
        // always use DB data, never fall back to hardcoded defaults
        setQuestions(questionList)
    })
    .catch(err => {
        console.error('Questions fetch error:', err)
        // only use defaults if DB completely unreachable
        setQuestions(defaultQuestions)
    })

    // Fetch Responses from DB for counts/alerts
    fetchResponses()
        .then(data => {
            if (data && data.content && data.content.length > 0)
                setStudentResponses(data.content)
            else if (data && data.length > 0)
                setStudentResponses(data)
        })
        /* .catch(err => console.error('Responses error:', err)) */
        .catch(err => console.error('Responses error:', err))

    // Load analytics on start
    fetchAnalyticsSummary('ALL')
        .then(data => setAnalytics(data))
        .catch(err => console.error('Analytics error:', err))

}, [])

const loadAnalytics = (filter, groupId) => {
    if (groupId) {
        // Find the group name from the groups array
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
const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"]
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
    // New separate columns from DB
    if (question && (question.optionA || question.optionB || question.optionC || question.optionD)) {
        return [question.optionA, question.optionB, question.optionC, question.optionD]
            .filter(o => o && o.trim())
    }
    // Fallback for old comma-separated format
    const options = question?.options || question
    if (!options) return []
    if (Array.isArray(options)) return options
    if (typeof options === 'string') return options.split(',').map(o => o.trim())
    return []
}
    const detectEmotion = (optionText) => {
    const text = optionText.toLowerCase()

    if (
        text.includes('very happy') ||
        text.includes('happy') ||
        text.includes('confident') ||
        text.includes('very well')
    ) return 'positive'

    if (
        text.includes('okay') ||
        text.includes('somewhat') ||
        text.includes('neutral')
    ) return 'neutral'

    return 'negative'
}    



  const handleOpenQuestionModal = (question = null) => {
        if (question) {
            setEditingQuestion(question)
    const opts = getOptionsArray(question).map(opt => 
    opt.replace(/^[A-D]-\s*/, '').trim() 
)
const grp = question.groupMapId ? [question.groupMapId] : [];
            setQuestionFormData({
                question: question.questions || '',
                option1: opts[0] || '',
                option2: opts[1] || '',
                option3: opts[2] || '',
                option4: opts[3] || '',
                groups: grp
            })
        } else {
            setEditingQuestion(null)
            setQuestionFormData({
                question: '',
                option1: '',
                option2: '',
                option3: '',
                option4: '',
                groups: selectedGroup ? [selectedGroup] : []
            })
        }
        setIsQuestionModalOpen(true)
    }
   const handleOpenGroupModal = () => {
    setGroupFormData({ name: '', color: 'purple', className: '' })
    setIsGroupModalOpen(true)
}


     const handleSaveQuestion = () => {
    const options = [
        questionFormData.option1,
        questionFormData.option2,
        questionFormData.option3,
        questionFormData.option4
    ].filter(opt => opt.trim())

    if (!questionFormData.question || options.length < 2) {
        alert('Please provide a question and at least 2 options')
        return
    }

    if (questionFormData.groups.length === 0) {
        alert('Please select at least one group')
        return
    }

   

const formattedOptions = options.map((opt) => `${opt}`)
// IMPORTANT: groupMapId must be a Number (Long), not a string.
// Sending a string causes the backend to receive null for the Long field,
// which means group_map_id is saved as NULL in DB → question disappears on refresh.
const rawGroupId = questionFormData.groups.length > 0 ? questionFormData.groups[0] : null
const groupMapId = rawGroupId !== null && rawGroupId !== undefined ? Number(rawGroupId) : null
const questionData = {
    questionText: questionFormData.question,
    options: formattedOptions.join(','),
    groupMapId: groupMapId
}
    if (editingQuestion) {
        updateQuestion(editingQuestion.id, questionData)
            .then(updated => {
                const merged = updated && updated.id
                    ? updated
                    : { ...editingQuestion, ...questionData }
                setQuestions(prev => prev.map(q =>
                    q.id === editingQuestion.id ? merged : q
                ))
                setIsQuestionModalOpen(false)
            })
            .catch(() => {
                setQuestions(prev => prev.map(q =>
                    q.id === editingQuestion.id
                        ? { ...editingQuestion, ...questionData }
                        : q
                ))
                setIsQuestionModalOpen(false)
            })
    } else {
        // Replace the createQuestion call in handleSaveQuestion:
const groupIds = questionFormData.groups.map(id => Number(id))

Promise.all(
    groupIds.map(gid =>
        createQuestion({ ...questionData, groupMapId: gid })
    )
).then(results => {
    console.log('✅ Questions saved for all groups:', results)
    setIsQuestionModalOpen(false)
    fetchQuestions(0, 100)
        .then(data => {
            const questionList = data?.content || data || []
            if (questionList.length > 0) setQuestions(questionList)
        })
        .catch(err => console.error('Refetch error:', err))
}).catch(err => {
    console.error('❌ Question NOT saved:', err)
    setIsQuestionModalOpen(false)
})
    }
}
   const handleSaveGroup = () => {
    if (!groupFormData.name.trim()) {
        alert('Please provide a group name')
        return
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FIX: className must be stored as "1st Standard", "2nd Standard", etc.
    // groupFormData.name comes from the select as "Class 1st", "Class 2nd", etc.
    // Strip the leading "Class " prefix so className = "1st Standard".
    // This matches the existing DB rows (e.g. "1st Standard", "2nd Standard").
    // ─────────────────────────────────────────────────────────────────────────
    const ordinalPart = groupFormData.name.replace(/^Class\s+/, '').trim() // "1st"
    const classNameForDB = ordinalPart + ' Standard'                        // "1st Standard"

    const groupData = {
        name: groupFormData.name + ' Standard',   // "Class 1st Standard"
        color: groupFormData.color,
        isDefault: false,
        className: classNameForDB                  // "1st Standard" ← FIXED
    }

    console.log('✅ Creating group — sending to DB:', groupData)

   setIsGroupModalOpen(false)

createGroup(groupData)
    .then(() => {
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
    })
    .catch(err => {
        console.error('❌ Group NOT saved to DB:', err)
        alert(`Failed to save group: ${err.message}`)
    })
}

   

const handleDeleteGroup = (groupId) => {
    console.log(' Delete clicked for:', groupId)
    const group = groups.find(g => g.id === groupId)
    console.log(' Found group:', group)
    if (!group) return

    console.log('isDefault value:', group.isDefault)
    console.log('typeof isDefault:', typeof group.isDefault)  

    if (group.isDefault === true || group.isDefault === 'true') {  
        alert('Cannot delete default groups')
        return
    }

  const hasQuestions = questions.some(q => String(q.groupMapId) === String(groupId));
    if (hasQuestions) {
        alert('Cannot delete group with existing questions.')
        return
    }

    if (window.confirm(`Delete group "${group.name}"?`)) {
        // remove from UI immediately
        setGroups(prev => prev.filter(g => g.id !== groupId))
        if (selectedGroup === groupId) setSelectedGroup(null)

        console.log('📤 Deleting group from DB:', groupId)
        deleteGroup(groupId)
            .then(() => {
                console.log('✅ Group deleted from DB successfully:', groupId)
            })
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
            .then(() => {
                setQuestions(questions.filter(q => q.id !== id))
            })
            .catch(err => console.error('Delete error:', err))
    }
}

    const toggleQuestion = (id) => {
        setExpandedQuestion(expandedQuestion === id ? null : id)
    }


const handleOptionClick = (question, option) => {

    const emotion = detectEmotion(option)

    const savedUser = localStorage.getItem('user')
    const user = savedUser ? JSON.parse(savedUser) : null

    const studentName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : 'Guest'

    const currentGroupId = selectedGroupRef.current
    const currentGroupObj = groupsRef.current.find(g => g.id === currentGroupId)
    
    const groupName = currentGroupObj?.className || currentGroupObj?.name || currentGroupId
    const responseData = {
    studentId: user?.email || user?.id || 'guest_' + Date.now(),
    studentName: studentName,
   
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
    groupName: groupName,
    questionId: question.id,
    questionText: question.questions || question.question || question.text || '',
    emotion: emotion,
    answer: option
}
   console.log('Saving response:', JSON.stringify(responseData))
   console.log('groupName:', groupName)
   console.log('currentGroupId:', currentGroupId)
   console.log('groupsRef.current:', JSON.stringify(groupsRef.current))
   createResponse(responseData)
       .then(saved => {
    const toStore = { ...responseData, ...saved, answer: responseData.answer } 
    setStudentResponses(prev => {
        const filtered = prev.filter(
            r => !(r.studentId === responseData.studentId && r.questionId === question.id)
        )
        return [...filtered, toStore]
    })
            setSelectedResponse(saved)
            setIsResponseModalOpen(true)

           
    // ─────────────────────────────────────────────────────────────────────
    // FIX: After saving a response, refresh the response sheet using the
    // group's stored name (same key used by fetchResponseSheet).
    // Previously this re-filtered locally using className string matching
    // which was fragile. Now we just re-fetch from the API by groupName.
    // ─────────────────────────────────────────────────────────────────────
    const currentGroups = groupsRef.current
    const currentGroupObj2 = currentGroups.find(g => g.id === selectedGroupRef.current)
    // Use className to match stored group_name in DB
    const currentGroupName = currentGroupObj2?.className || currentGroupObj2?.name || ''

    if (showResponseSheetRef.current && currentGroupName) {
        fetchResponseSheet(currentGroupName)
            .then(data => {
                const sheet = Array.isArray(data)
                    ? data
                    : data?.content || data || []
                setResponseSheet(sheet)
            })
            .catch(err => console.error('Sheet refresh error:', err))
    }
        })
        .catch(err => {
            console.error('Save error:', err)
            const local = {
                ...responseData,
                date: new Date().toISOString()
            }
            setStudentResponses(prev => {
                const filtered = prev.filter(
                    r => !(r.studentId === responseData.studentId &&
                           r.questionId === question.id)
                )
                return [...filtered, local]
            })
            setSelectedResponse(local)
            setIsResponseModalOpen(true)
        })
}

const getGroupQuestions = (group) => {
    const groupId = typeof group === 'object' ? group.id : group;
    return questions.filter(q => String(q.groupMapId) === String(groupId));
}
  const filteredQuestions = selectedGroup
    ? questions.filter(q => String(q.groupMapId) === String(selectedGroup))
    : questions;
    const searchedQuestions = filteredQuestions.filter(q => {
        if (!searchTerm) return true
        const text = q.questions || q.question || q.text || ''
        return text.toLowerCase().includes(searchTerm.toLowerCase())
    })




const isDailyCheckinSelected =
    selectedGroup === 'Daily Check-in'

const isStudentResponsesSelected =
    selectedGroup === 'Student Responses'
const isMainPage = !selectedGroup



// Total responses (all groups)
const totalAllResponses = studentResponses.length

// Total negative responses (all groups)
const totalNegativeResponses = studentResponses.filter(
    r => r.emotion === 'negative'
).length

// Last added question
const lastQuestion =
    questions.length > 0 ? questions[questions.length - 1] : null



const getOptionCount = (questionId, option) => {
    return studentResponses.filter(
        response =>
            response.questionId === questionId &&
            response.answer === option
    ).length
}



const getQuestionLabel = (questionId) => {
    const index = questions.findIndex(q => q.id === questionId)
    return index !== -1 ? `Q${index + 1}` : "-"
}

// Get unique students
const uniqueStudents = Array.from(
    new Map(
        studentResponses
            .filter(r => r.questionId)
            .map(r => [r.studentId, r])
    ).values()
)
// Filter students based on admin filters
const filteredStudents = uniqueStudents.filter(student => {
    const matchesAge = filterAge ? student.age == filterAge : true
    const matchesClass = filterClass ? (student.className || '').toLowerCase().includes(filterClass.toLowerCase()) : true
    const matchesGender = filterGender ? (student.gender || student.sex || '').toLowerCase().startsWith(filterGender.toLowerCase()) : true
    return matchesAge && matchesClass && matchesGender
})
const classStudents = filteredStudents.filter(
student => student.className === selectedGroup
)
//Reponse full
const getStudentAnswer = (studentId, questionId) => {
    const response = studentResponses.find(
        r => r.studentId === studentId && r.questionId === questionId
    )

    if (!response) return "-"

    const question = questions.find(q => q.id === questionId)
    if (!question) return "-"

   const opts = getOptionsArray(question)
    const optionIndex = opts.indexOf(response.answer)

    if (optionIndex === -1) return "-"

    const letter = String.fromCharCode(65 + optionIndex)
    const fullAnswer = opts[optionIndex]

    return `${letter} - ${fullAnswer}`
}

const sheetStudents = Array.from(
    new Map(
        (Array.isArray(responseSheet) ? responseSheet : [])
            .map(r => [r.studentId, r])
    ).values()
)
const filteredSheet = sheetStudents.filter(s => matchesGender(s) && filterByDate(s))
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
                                className={`
                  relative p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected
                                        ? `${colors.border} ${colors.bg} shadow-md`
                                        : `border-gray-200 bg-white hover:shadow-md ${colors.hover}`}
                `}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center">
                                        <FolderIcon className={`w-5 h-5 mr-2 ${colors.text}`} />
                                        <h5 className={`font-medium text-sm ${isSelected ? colors.text : 'text-gray-900'}`}>
                                            {group.name}
                                        </h5>
                                    </div>
                                    {isAdmin && (
    <button
        onClick={(e) => {
            e.stopPropagation()
            handleDeleteGroup(group.id)
        }}
        className="text-gray-400 hover:text-red-600"
        title="Delete Group"
    >
        <TrashIcon className="w-4 h-4" />
    </button>
)}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                       {group.id !== 'Student Responses' && (
    <>
      {questionCount} {questionCount === 1 ? 'question' : 'questions'}
    </>
  )}
</span>
                                    {isSelected && (
                                        <span className={`text-xs font-semibold ${colors.text}`}>Selected</span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Questions Section */}
            {selectedGroup && !isStudentResponsesSelected &&(
                <div>
 <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200">

<h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
Questions in {groups.find(g => g.id === selectedGroup)?.name}
</h4>

<button
onClick={() => {
    setShowResponseSheet(true)
    setResponseSheet([])
    setFilterGender('')
    setDateFilter('ALL') //new filter
    const groupObj = groups.find(g => g.id === selectedGroup)
    // Use className (e.g. "4th Standard") to match what's stored in student_responses.group_name
    const groupName = groupObj?.className || groupObj?.name || selectedGroup
    fetchResponseSheet(groupName)
        .then(data => {
            const sheet = Array.isArray(data)
                ? data
                : data?.content || data || []
            setResponseSheet(sheet)
        })
        .catch(err => console.error('Sheet error:', err))
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
                                <button
                                    onClick={() => handleOpenQuestionModal()}
                                    className="mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
                                >
                                    Add your first question
                                </button>
                            </div>
                        ) : (
                            searchedQuestions.map((question, index) => (
                                <div key={question.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start flex-1">
                                                <button
                                                    onClick={() => toggleQuestion(question.id)}
                                                    className="mr-3 mt-1 text-gray-400 hover:text-gray-600"
                                                >
                                                    {expandedQuestion === question.id ? (
                                                        <ChevronDownIcon className="w-5 h-5" />
                                                    ) : (
                                                        <ChevronRightIcon className="w-5 h-5" />
                                                    )}
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
                                                <button
                                                    onClick={() => handleOpenQuestionModal(question)}
                                                    className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md"
                                                    title="Edit Question"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(question.id)}
                                                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md"
                                                    title="Delete Question"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Options */}
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

        {/*  Student Count */}
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

            {/* Add/Edit Question Modal */}
            {isQuestionModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsQuestionModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    {editingQuestion ? 'Edit Question' : 'Add New Question'}
                                </h3>

                                <div className="space-y-4">
                                    {/* Question Text */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Question Text
                                        </label>
                                        <textarea
                                            value={questionFormData.question}
                                            onChange={(e) => setQuestionFormData({ ...questionFormData, question: e.target.value })}
                                            rows="2"
                                            placeholder="e.g., How are you feeling today?"
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                        />
                                    </div>

                                    {/* Group Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Assign to Groups
                                        </label>
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

                                    {/* Answer Options */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Answer Options (4 options)
                                        </label>
                                        <div className="space-y-2">
                                            {[1, 2, 3, 4].map((num) => (
                                                <div key={num} className="flex items-center">
                                                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full text-xs font-bold mr-2">
                                                        {num}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={questionFormData[`option${num}`]}
                                                        onChange={(e) => setQuestionFormData({ ...questionFormData, [`option${num}`]: e.target.value })}
                                                        placeholder={`Option ${num} (e.g., Very Happy 😊)`}
                                                        className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            💡 Tip: You can use emojis to make options more engaging!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="button"
                                    onClick={handleSaveQuestion}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:col-start-2 sm:text-sm"
                                >
                                    {editingQuestion ? 'Update' : 'Add'} Question
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
    {[
        { label: 'All time', value: 'ALL' },
        { label: 'Today', value: 'TODAY' },
        { label: 'This week', value: 'THIS_WEEK' },
    ].map(({ label, value }) => (
        <button
            key={value}
            onClick={() => setDateFilter(value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                ${dateFilter === value
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
        >
            {label}
        </button>
    ))}
</div>




    <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-semibold text-gray-600">
            Filter by Gender:
        </span>
        <button
            onClick={() => setFilterGender(filterGender === 'male' ? '' : 'male')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                ${filterGender === 'male'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
        >
            ♂ Male
        </button>
        <button
            onClick={() => setFilterGender(filterGender === 'female' ? '' : 'female')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                ${filterGender === 'female'
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'}`}
        >
            ♀ Female
        </button>
        {filterGender && (
            <button
                onClick={() => setFilterGender('')}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
            >
                Clear Filter
            </button>
        )}
    </div>

    {responseSheet.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
            No responses yet for this group.
        </p>
    ) : filteredSheet.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
            No {filterGender} students found.
        </p>
    ) : (
        <div className="overflow-x-auto mt-4">
        <table className="min-w-full border border-gray-300 text-gray-800">
            <thead className="bg-gray-200 text-sm font-semibold">
                <tr>
                    <th className="border px-4 py-2 text-left">Field</th>
                    {filteredSheet.map((student, index) => (
                        <th key={student.studentId || index} className="border px-4 py-2">
                            R{index + 1}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="text-sm">
                <tr>
                    <td className="border px-4 py-2 font-medium">Name</td>
                    {filteredSheet.map((student, i) => (
                        <td key={i} className="border px-4 py-2">
                            {student.studentName || '-'}
                        </td>
                    ))}
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-medium">Class</td>
                    {filteredSheet.map((student, i) => (
                        <td key={i} className="border px-4 py-2">
                            {student.className || '-'}
                        </td>
                    ))}
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-medium">Gender</td>
                    {filteredSheet.map((student, i) => (
                        <td key={i} className="border px-4 py-2">
                            {student.gender || '-'}
                        </td>
                    ))}
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-medium">Age</td>
                    {filteredSheet.map((student, i) => (
                        <td key={i} className="border px-4 py-2">
                            {student.age || '-'}
                        </td>
                    ))}
                </tr>
                <tr>
                    <td className="border px-4 py-2 font-medium">School</td>
                    {filteredSheet.map((student, i) => (
                        <td key={i} className="border px-4 py-2">
                            {student.schoolName || '-'}
                        </td>
                    ))}
                </tr>
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
    
    return (
        <td key={i} className="border px-4 py-2 text-center">
            {ans}
        </td>
    )
})}
                    </tr>
                ))}
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
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="group-modal-title">
                                    Create New Group
                                </h3>

                                <div className="space-y-4">
                                   
                                   <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Group Name
    </label>
    <select
        value={groupFormData.name}
        onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white"
    >
        <option value="">-- Select a Class --</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
    <option key={num} value={`Class ${getOrdinal(num)}`}>
        Class {getOrdinal(num)}
    </option>
))}
    </select>
</div>


                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Color Theme
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {colorOptions.map((color) => (
                                                <button
                                                    key={color.value}
                                                    type="button"
                                                    onClick={() => setGroupFormData({ ...groupFormData, color: color.value })}
                                                    className={`
                            p-3 rounded-md border-2 transition-all
                            ${groupFormData.color === color.value
                                                            ? 'border-gray-900 ring-2 ring-gray-900'
                                                            : 'border-gray-200 hover:border-gray-400'}
                          `}
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
                                >
                                    Create Group
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsGroupModalOpen(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>     
                        </div>
                    </div>
                </div>
            )}
 

{groups.find(g => g.id === selectedGroup)?.name === 'Daily Check-in' && (
<div className="mb-10 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

  {/* Group Summary */}
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
      Groups Overview
    </h4>
    <ul className="space-y-2">
      {groups.map(group => {
        const count = getGroupQuestions(group.id).length
        const colors = getColorClasses(group.color)
        return (
          <li key={group.id} className="flex justify-between items-center text-sm">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
              {group.name}
            </span>
            <span className="text-gray-500 text-xs">{count} questions</span>
          </li>
        )
      })}
    </ul>
  </div>

</div>
)}

            
{isResponseModalOpen && selectedResponse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Response Submitted ✅
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Your answer:
                            <span className="font-medium"> {selectedResponse.answer}</span>
                        </p>
                        <button
                            onClick={() => setIsResponseModalOpen(false)}
                            className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

        </div>
    )
}