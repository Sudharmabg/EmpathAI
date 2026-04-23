import React, { useState, useEffect, useCallback, useRef } from 'react'

import {
    PlusIcon, PencilIcon, TrashIcon, UserPlusIcon, ChevronDownIcon, ChevronRightIcon,
    MagnifyingGlassIcon, ArrowLeftIcon, BuildingLibraryIcon, AcademicCapIcon,
    ClockIcon, PhoneIcon
} from '@heroicons/react/24/outline'

import {
    getStudents, getSchoolAdmins, getPsychologists, getContentAdmins,
    createUser, updateUser, deleteUser, resetPassword,
    getSchools, createSchool, deleteSchool, getUserById,
    getClassesBySchool, getStudentsByClass, getStudentDetail
} from '../../../api/usermanagementapi.js'

import TeacherTab from './Teachertab.jsx'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '../../../styles/datepicker.css'

const TAB_ROLE_MAP = {
    student: 'STUDENT',
    school_admin: 'SCHOOL_ADMIN',
    psychologist: 'PSYCHOLOGIST',
    content_admin: 'CONTENT_ADMIN',
    teacher: 'TEACHER',
}

const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const formatClassName = (name) => {
    if (!name) return 'No Class'
    const match = name.match(/\d+/)
    if (match) {
        const num = parseInt(match[0])
        return 'Class ' + ordinal(num) + ' Standard'
    }
    return name.startsWith('Class') ? name : 'Class ' + name
}

const CLASS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => ({
    label: 'Class ' + ordinal(n),
    value: ordinal(n) + ' Standard',
}))

const calculateAgeFromDOB = (dob) => {
    if (!dob) return null
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
    return age > 0 ? age : null
}

const formatTimeSpent = (seconds) => {
    if (seconds == null) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return h + 'h ' + m + 'm'
    if (m > 0) return m + 'm ' + s + 's'
    return s + 's'
}

const EMPTY_FORM = {
    name: '', email: '', role: 'student',
    class: '', section: '', school: '', parentName: '',
    parentPhone: '', phoneNumber: '', dateOfBirth: '',
    gender: '', contactName: '', rollNo: '',
    password: '',
}

export default function UserManagement({ user }) {
    const [activeTab, setActiveTab] = useState('student')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedSchool, setSelectedSchool] = useState(null)
    const [selectedClass, setSelectedClass] = useState(null)
    const [schoolsData, setSchoolsData] = useState([])
    const [classesData, setClassesData] = useState([])
    const [studentsData, setStudentsData] = useState([])
    const [users, setUsers] = useState([])
    const [expandedRow, setExpandedRow] = useState(null)
    const [expandedUserData, setExpandedUserData] = useState({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const [saving, setSaving] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState(null)
    const [validationErrors, setValidationErrors] = useState({})
    const [formData, setFormData] = useState({ ...EMPTY_FORM })
    const schoolsForFormRef = useRef([])

    const roles = [
        { id: 'student', label: 'Students' },
        { id: 'school_admin', label: 'School Admin' },
        { id: 'psychologist', label: 'Psychologists' },
        { id: 'content_admin', label: 'Content Admins' },
        { id: 'schools', label: 'Schools' },
        { id: 'teacher', label: 'Teachers' },
    ].filter(r => {
        if (user?.role === 'SUPER_ADMIN') return true
        if (user?.role === 'SCHOOL_ADMIN') return r.id === 'student' || r.id === 'teacher'
        return false
    })

    const loadSchools = useCallback(async () => {
        setLoading(true)
        setApiError(null)
        try {
            const res = await getSchools()
            const list = res || []
            setSchoolsData(list)
            schoolsForFormRef.current = list
        } catch (err) {
            setApiError(err.message || 'Failed to load schools')
        } finally {
            setLoading(false)
        }
    }, [])

    const loadClasses = useCallback(async (schoolId) => {
        setLoading(true)
        setApiError(null)
        try {
            const res = await getClassesBySchool(schoolId)
            setClassesData(res || [])
        } catch (err) {
            setApiError(err.message || 'Failed to load classes')
        } finally {
            setLoading(false)
        }
    }, [])

    const loadStudents = useCallback(async (schoolId, className) => {
        setLoading(true)
        setApiError(null)
        setExpandedRow(null)
        setExpandedUserData({})
        try {
            const res = await getStudentsByClass(schoolId, className)
            setStudentsData(res || [])
        } catch (err) {
            setApiError(err.message || 'Failed to load students')
        } finally {
            setLoading(false)
        }
    }, [])

    const loadNonStudentTab = useCallback(async () => {
        if (activeTab === 'teacher' || activeTab === 'schools') return
        setLoading(true)
        setApiError(null)
        try {
            const opts = { search: searchTerm || undefined, page: 0, size: 200 }
            let result
            if (activeTab === 'school_admin') {
                result = await getSchoolAdmins(opts)
                setUsers((result.content || []).map(u => ({ ...u, role: 'school_admin' })))
            } else if (activeTab === 'psychologist') {
                result = await getPsychologists(opts)
                setUsers((result.content || []).map(u => ({ ...u, role: 'psychologist' })))
            } else if (activeTab === 'content_admin') {
                result = await getContentAdmins(opts)
                setUsers((result.content || []).map(u => ({ ...u, role: 'content_admin' })))
            }
        } catch (err) {
            setApiError(err.message || 'Failed to load users')
        } finally {
            setLoading(false)
        }
    }, [activeTab, searchTerm])

    useEffect(() => {
        setSelectedSchool(null)
        setSelectedClass(null)
        setExpandedRow(null)
        setExpandedUserData({})
        setUsers([])
        setClassesData([])
        setStudentsData([])
        if (activeTab === 'student' || activeTab === 'schools') loadSchools()
        else if (activeTab === 'teacher') { }
        else loadNonStudentTab()
    }, [activeTab, loadSchools, loadNonStudentTab])

    useEffect(() => {
        if (!['student', 'schools', 'teacher'].includes(activeTab)) loadNonStudentTab()
    }, [searchTerm, activeTab, loadNonStudentTab])

    useEffect(() => {
        if (selectedSchool && activeTab === 'student') {
            setSelectedClass(null)
            setStudentsData([])
            loadClasses(selectedSchool.id || selectedSchool)
        }
    }, [selectedSchool, activeTab, loadClasses])

    useEffect(() => {
        if (selectedSchool && selectedClass && activeTab === 'student')
            loadStudents(selectedSchool.id || selectedSchool, selectedClass)
    }, [selectedClass, selectedSchool, activeTab, loadStudents])

    const handleBack = () => {
        if (selectedClass) {
            setSelectedClass(null)
            setStudentsData([])
        } else if (selectedSchool) {
            setSelectedSchool(null)
            setClassesData([])
        }
    }

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
        let pass = ''
        for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
        setFormData(prev => ({ ...prev, password: pass }))
    }

    const handleOpenModal = async (item = null) => {
        setValidationErrors({})
        if (item) {
            let full = item
            if (item.id) {
                try {
                    full = await getUserById(item.id)
                } catch (e) {
                    console.error('Failed to fetch full user', e)
                }
            }
            setEditingUser(full)
            setFormData({
                name: full.name || '',
                email: full.email || '',
                role: activeTab,
                password: '',
                class: full.className || full.class || '',
                section: full.section || '',
                school: full.school || '',
                parentName: full.parentName || '',
                parentPhone: full.parentPhone || '',
                phoneNumber: full.phoneNumber || '',
                dateOfBirth: full.dateOfBirth || '',
                gender: full.gender || '',
                contactName: full.contactName || '',
                rollNo: full.rollNo || '',
            })
        } else {
            setEditingUser(null)
            const schoolName = selectedSchool?.name || (typeof selectedSchool === 'string' ? selectedSchool : '')
            setFormData({
                ...EMPTY_FORM,
                role: activeTab,
                school: activeTab === 'student' && schoolName ? schoolName : '',
            })
        }
        setIsModalOpen(true)
    }

    const validateForm = () => {
        const errors = {}
        const { name, email, school, rollNo, section, parentName,
            dateOfBirth, password, phoneNumber, parentPhone } = formData

        if (!name?.trim()) errors.name = 'Name is required'

        if (activeTab === 'schools') {
            if (!formData.contactName?.trim()) errors.contactName = 'Contact Name is required'
            if (!email?.trim()) errors.email = 'Email is required'
            const dup = schoolsData.find(s => s.name.toLowerCase() === name.trim().toLowerCase() &&
                (!editingUser || s.id !== editingUser.id))
            if (dup) errors.name = 'School name already exists'
        } else {
            if (!email?.trim()) errors.email = 'Email is required'
            else if (!email.includes('@')) errors.email = 'Invalid email format'

            if (activeTab === 'student') {
                if (!school?.trim()) errors.school = 'School is required'
                if (!rollNo?.trim()) errors.rollNo = 'Roll No is required'
                if (!formData.class?.trim()) errors.class = 'Class is required'
                if (!section?.trim()) errors.section = 'Section is required'
                if (!parentName?.trim()) errors.parentName = 'Parent Name is required'
                if (!dateOfBirth) errors.dateOfBirth = 'Date of Birth is required'
            }
        }

        if (phoneNumber?.trim() && phoneNumber.replace(/\D/g, '').length !== 10)
            errors.phoneNumber = 'Phone number must be 10 digits'
        if (parentPhone?.trim() && parentPhone.replace(/\D/g, '').length !== 10)
            errors.parentPhone = 'Parent phone must be 10 digits'

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSaveUser = async () => {
        setSuccessMessage(null)
        setApiError(null)
        if (!validateForm()) return
        setSaving(true)
        try {
            if (activeTab === 'schools') {
                await createSchool({
                    name: formData.name,
                    contactNumber: formData.phoneNumber,
                    contactName: formData.contactName,
                    email: formData.email,
                })
            } else {
                const payload = {
                    name: formData.name,
                    email: formData.email,
                    role: TAB_ROLE_MAP[formData.role] || formData.role,
                    password: formData.password?.trim() || undefined,
                    phoneNumber: formData.phoneNumber || undefined,
                    school: formData.school || undefined,
                    className: formData.class || undefined,
                    grade: formData.class || undefined,
                    parentName: formData.parentName || undefined,
                    parentPhone: formData.parentPhone || undefined,
                    dateOfBirth: formData.dateOfBirth || undefined,
                    age: formData.dateOfBirth ? calculateAgeFromDOB(formData.dateOfBirth) : undefined,
                    rollNo: formData.rollNo || undefined,
                    section: formData.section || undefined,
                    gender: formData.gender || undefined,
                }
                if (editingUser) await updateUser(editingUser.id, payload)
                else await createUser(payload)
            }

            setIsModalOpen(false)
            let msg
            if (!editingUser && activeTab !== 'schools') {
                if (formData.password?.trim()) {
                    msg = roleTitles[activeTab] + ' created successfully!'
                } else {
                    msg = roleTitles[activeTab] + ' created! Password setup email sent to ' + formData.email
                }
            } else {
                msg = (activeTab === 'schools' ? 'School' : 'User') + ' saved successfully!'
            }
            setSuccessMessage(msg)
            setTimeout(() => setSuccessMessage(null), 6000)

            if (activeTab === 'schools') await loadSchools()
            else if (activeTab === 'student') {
                if (selectedClass && selectedSchool) await loadStudents(selectedSchool.id || selectedSchool, selectedClass)
                else if (selectedSchool) await loadClasses(selectedSchool.id || selectedSchool)
                else await loadSchools()
            } else if (activeTab !== 'teacher') await loadNonStudentTab()
        } catch (err) {
            setApiError(err.message || 'Save failed')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteUser = (item) => {
        setUserToDelete(item)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!userToDelete) return
        setSaving(true)
        try {
            if (activeTab === 'schools') await deleteSchool(userToDelete.id)
            else await deleteUser(userToDelete.id)
            setSuccessMessage((activeTab === 'schools' ? 'School' : 'User') + ' deleted successfully!')
            setTimeout(() => setSuccessMessage(null), 3000)
            setIsDeleteModalOpen(false)
            setUserToDelete(null)
            if (activeTab === 'schools') await loadSchools()
            else if (activeTab === 'student') {
                if (selectedClass && selectedSchool) await loadStudents(selectedSchool.id || selectedSchool, selectedClass)
                else if (selectedSchool) await loadClasses(selectedSchool.id || selectedSchool)
                else await loadSchools()
            } else if (activeTab !== 'teacher') await loadNonStudentTab()
        } catch (err) {
            setApiError(err.message || 'Delete failed')
        } finally {
            setSaving(false)
        }
    }

    const toggleRow = async (studentId) => {
        if (expandedRow === studentId) {
            setExpandedRow(null)
            return
        }
        setExpandedRow(studentId)
        if (!expandedUserData[studentId]) {
            try {
                const full = await getUserById(studentId)
                setExpandedUserData(prev => ({ ...prev, [studentId]: full }))
            } catch (err) {
                console.error('Failed to fetch student detail', err)
            }
        }
    }

    const filteredStudents = studentsData.filter(u => {
        if (!searchTerm) return true
        const s = searchTerm.toLowerCase()
        return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s)
    })

    const filteredUsers = users.filter(u => {
        if (!searchTerm) return true
        const s = searchTerm.toLowerCase()
        return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s)
    })

    const addButtonLabels = {
        student: 'Add Students',
        school_admin: 'Add School Admins',
        psychologist: 'Add Psychologists',
        content_admin: 'Add Content Admins',
        schools: 'Add School',
        teacher: 'Add Teacher',
    }

    const roleTitles = {
        student: 'Student',
        school_admin: 'School Admin',
        psychologist: 'Psychologist',
        content_admin: 'Content Admin',
        schools: 'School',
        teacher: 'Teacher',
    }

    const getSaveLabel = () => {
        if (saving) return 'Saving...'
        if (editingUser) return 'Save'
        if (activeTab === 'schools') return 'Save'
        return formData.password?.trim() ? 'Create ' + roleTitles[activeTab] : 'Create & Send Email'
    }

    return (
        <div className="relative">
            {successMessage && (
                <div className="fixed top-4 right-4 z-[60] animate-fade-in-down">
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 shadow-lg rounded-md">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-green-800 whitespace-pre-wrap">{successMessage}</p>
                            </div>
                            <button onClick={() => setSuccessMessage(null)} className="ml-4 text-green-500">
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {apiError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-center gap-3">
                    <svg className="h-5 w-5 text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-red-800">{apiError}</p>
                </div>
            )}

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => setActiveTab(role.id)}
                            className={'whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ' + (activeTab === role.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}
                        >
                            {role.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'teacher' ? (
                <TeacherTab user={user} schoolsData={schoolsData} />
            ) : (
                <>
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            {(selectedSchool || selectedClass) && activeTab === 'student' && (
                                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                                </button>
                            )}
                            <h3 className="text-lg font-medium text-gray-900">
                                {!selectedSchool
                                    ? 'Manage ' + (roles.find(r => r.id === activeTab)?.label || '')
                                    : !selectedClass
                                        ? (selectedSchool.name || selectedSchool) + ' Classes'
                                        : (selectedSchool.name || selectedSchool) + ' — ' + formatClassName(selectedClass)}
                            </h3>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700"
                        >
                            <UserPlusIcon className="w-5 h-5 mr-2" />
                            {addButtonLabels[activeTab]}
                        </button>
                    </div>

                    <div className="mb-6 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                    </div>

                    {loading && (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                        </div>
                    )}

                    {!loading && (
                        <>
                            {/* School Cards */}
                            {activeTab === 'student' && !selectedSchool && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {schoolsData
                                        .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(school => (
                                            <div
                                                key={school.id}
                                                onClick={() => setSelectedSchool(school)}
                                                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                                        <BuildingLibraryIcon className="w-6 h-6 text-purple-600" />
                                                    </div>
                                                    <div className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                                                        {school.studentCount || 0} Students
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900">{school.name}</h3>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {/* Class Cards */}
                            {activeTab === 'student' && selectedSchool && !selectedClass && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {classesData
                                        .sort((a, b) => parseInt(a.className?.match(/\d+/)?.[0] || 0) - parseInt(b.className?.match(/\d+/)?.[0] || 0))
                                        .map(cls => (
                                            <div
                                                key={cls.className}
                                                onClick={() => setSelectedClass(cls.className)}
                                                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md cursor-pointer text-center"
                                            >
                                                <AcademicCapIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                                                <h3 className="text-xl font-bold">{formatClassName(cls.className)}</h3>
                                                <div className="text-xs text-purple-800 bg-purple-100 px-2 py-1 rounded-full inline-block mt-1">
                                                    {cls.studentCount} Students
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {/* Student Table */}
                            {activeTab === 'student' && selectedSchool && selectedClass && (
                                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Phone</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredStudents.map(u => {
                                                const full = expandedUserData[u.id] || u
                                                return (
                                                    <React.Fragment key={u.id}>
                                                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(u.id)}>
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                                <div className="flex items-center gap-2">
                                                                    {expandedRow === u.id
                                                                        ? <ChevronDownIcon className="w-4 h-4 text-purple-500" />
                                                                        : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                                                                    {u.name}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {full.section ? 'Section ' + full.section : '—'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                                {full.parentPhone ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                        <PhoneIcon className="w-3 h-3" />{full.parentPhone}
                                                                    </span>
                                                                ) : '—'}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-center" onClick={e => e.stopPropagation()}>
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <button onClick={() => handleOpenModal(u)} className="text-indigo-600 hover:text-indigo-800">
                                                                        <PencilIcon className="w-5 h-5" />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteUser(u)} className="text-red-600 hover:text-red-800">
                                                                        <TrashIcon className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* Expanded Row */}
                                                        {expandedRow === u.id && (
                                                            <tr className="bg-gray-50">
                                                                <td colSpan={5} className="px-8 py-4">
                                                                    {expandedUserData[u.id] ? (
                                                                        <div className="grid grid-cols-5 gap-4">
                                                                            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Gender</p>
                                                                                <p className="text-sm font-semibold text-gray-800">{expandedUserData[u.id].gender || '—'}</p>
                                                                            </div>
                                                                            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Roll No</p>
                                                                                <p className="text-sm font-semibold text-gray-800">{expandedUserData[u.id].rollNo || '—'}</p>
                                                                            </div>
                                                                            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Login Count</p>
                                                                                <p className="text-sm font-semibold text-gray-800">{expandedUserData[u.id].loginCount ?? 0}</p>
                                                                            </div>
                                                                            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Intervention</p>
                                                                                <p className="text-sm font-semibold text-gray-800">{expandedUserData[u.id].interventionSessionCount ?? 0}</p>
                                                                            </div>
                                                                            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Time Spent</p>
                                                                                <p className="text-sm font-semibold text-gray-800">{formatTimeSpent(expandedUserData[u.id].timeSpent)}</p>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex justify-center py-4">
                                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                )
                                            })}
                                            {filteredStudents.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">No students found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Schools Table */}
                            {activeTab === 'schools' && (
                                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {schoolsData
                                                .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map(school => (
                                                    <tr key={school.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{school.name}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">{school.studentCount || 0}</td>
                                                        <td className="px-6 py-4 text-sm text-center">
                                                            <div className="flex items-center justify-center gap-3">
                                                                <button onClick={() => handleOpenModal(school)} className="text-indigo-600 hover:text-indigo-800">
                                                                    <PencilIcon className="w-5 h-5" />
                                                                </button>
                                                                <button onClick={() => handleDeleteUser(school)} className="text-red-600 hover:text-red-800">
                                                                    <TrashIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Generic Non-Student Tables */}
                            {!['student', 'schools', 'teacher'].includes(activeTab) && (
                                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredUsers.map(u => (
                                                <tr key={u.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.name}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                                                    <td className="px-6 py-4 text-sm text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button onClick={() => handleOpenModal(u)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="w-5 h-5" /></button>
                                                            <button onClick={() => handleDeleteUser(u)} className="text-red-600 hover:text-red-800"><TrashIcon className="w-5 h-5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {/* CREATE / EDIT MODAL */}
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex items-center justify-center min-h-screen px-4">
                                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)} />
                                <div className="bg-white rounded-lg p-6 z-10 w-full max-w-2xl">
                                    <h3 className="text-lg font-bold mb-4">
                                        {editingUser ? 'Edit' : 'Create'} {roleTitles[activeTab]}
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium">Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.name ? 'border-red-500' : 'border-gray-300')}
                                            />
                                            {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
                                        </div>

                                        {activeTab === 'schools' ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium">Contact Person</label>
                                                        <input
                                                            type="text"
                                                            value={formData.contactName}
                                                            onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.contactName ? 'border-red-500' : 'border-gray-300')}
                                                        />
                                                        {validationErrors.contactName && <p className="text-red-500 text-xs mt-1">{validationErrors.contactName}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium">Official Email</label>
                                                        <input
                                                            type="email"
                                                            value={formData.email}
                                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.email ? 'border-red-500' : 'border-gray-300')}
                                                        />
                                                        {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium">Phone Number</label>
                                                    <input
                                                        type="text"
                                                        value={formData.phoneNumber}
                                                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                                    />
                                                </div>
                                            </>
                                        ) : activeTab === 'student' ? (
                                            <>
                                                {!editingUser && (
                                                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 flex gap-3">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2.01 2.01 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2" />
                                                        </svg>
                                                        <p className="text-sm text-purple-800">
                                                            Enter a password to set it directly, or <strong>leave it blank</strong> to send an email invite to the student.
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                                        <div className={'relative mt-1 rounded-md ' + (validationErrors.dateOfBirth ? 'ring-2 ring-red-300' : '')}>
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                                                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                            <DatePicker
                                                                selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : null}
                                                                onChange={(date) => setFormData({ ...formData, dateOfBirth: date ? date.toISOString().split('T')[0] : '' })}
                                                                dateFormat="dd/MM/yyyy"
                                                                maxDate={new Date()}
                                                                showMonthDropdown
                                                                showYearDropdown
                                                                dropdownMode="select"
                                                                placeholderText="Select date of birth"
                                                                className={'block w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition-all ' +
                                                                    (validationErrors.dateOfBirth ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-purple-300')}
                                                                wrapperClassName="w-full"
                                                            />
                                                        </div>
                                                        {validationErrors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{validationErrors.dateOfBirth}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium">Class</label>
                                                        <select
                                                            value={formData.class}
                                                            onChange={e => setFormData({ ...formData, class: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.class ? 'border-red-500' : 'border-gray-300')}
                                                        >
                                                            <option value="">Select Class</option>
                                                            {CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                        </select>
                                                        {validationErrors.class && <p className="text-red-500 text-xs mt-1">{validationErrors.class}</p>}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium">Section</label>
                                                        <select
                                                            value={formData.section}
                                                            onChange={e => setFormData({ ...formData, section: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.section ? 'border-red-500' : 'border-gray-300')}
                                                        >
                                                            <option value="">Select Section</option>
                                                            {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                                                        </select>
                                                        {validationErrors.section && <p className="text-red-500 text-xs mt-1">{validationErrors.section}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium">Roll No</label>
                                                        <input
                                                            type="text"
                                                            value={formData.rollNo}
                                                            onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.rollNo ? 'border-red-500' : 'border-gray-300')}
                                                        />
                                                        {validationErrors.rollNo && <p className="text-red-500 text-xs mt-1">{validationErrors.rollNo}</p>}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium">Gender</label>
                                                        <select
                                                            value={formData.gender}
                                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                                        >
                                                            <option value="">Select Gender</option>
                                                            <option value="Male">Male</option>
                                                            <option value="Female">Female</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium">Email</label>
                                                        <input
                                                            type="email"
                                                            value={formData.email}
                                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.email ? 'border-red-500' : 'border-gray-300')}
                                                        />
                                                        {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium">
                                                        Password
                                                        <span className="ml-1 text-xs text-gray-400 font-normal">(leave blank to send email invite)</span>
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={formData.password}
                                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                            placeholder="Enter password or leave blank for email"
                                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm"
                                                        />
                                                        <button type="button" onClick={generatePassword} className="mt-1 bg-gray-100 px-3 rounded-md text-sm border border-gray-300 whitespace-nowrap">Gen</button>
                                                        <button type="button" onClick={() => setFormData({ ...formData, password: '' })} className="mt-1 bg-purple-50 px-3 rounded-md text-sm border border-purple-200 text-purple-700 whitespace-nowrap">Email</button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium">Parent Name</label>
                                                        <input
                                                            type="text"
                                                            value={formData.parentName}
                                                            onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.parentName ? 'border-red-500' : 'border-gray-300')}
                                                        />
                                                        {validationErrors.parentName && <p className="text-red-500 text-xs mt-1">{validationErrors.parentName}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium">Parent Phone</label>
                                                        <input
                                                            type="text"
                                                            value={formData.parentPhone}
                                                            onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                                                            placeholder="10-digit number"
                                                            maxLength={10}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.parentPhone ? 'border-red-500' : 'border-gray-300')}
                                                        />
                                                        {validationErrors.parentPhone && <p className="text-red-500 text-xs mt-1">{validationErrors.parentPhone}</p>}
                                                    </div>
                                                </div>

                                                {(user?.role === 'SUPER_ADMIN' || editingUser) && (
                                                    <div>
                                                        <label className="block text-sm font-medium">School</label>
                                                        <select
                                                            value={formData.school}
                                                            onChange={e => setFormData({ ...formData, school: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.school ? 'border-red-500' : 'border-gray-300')}
                                                        >
                                                            <option value="">Select School</option>
                                                            {schoolsForFormRef.current.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                        </select>
                                                        {validationErrors.school && <p className="text-red-500 text-xs mt-1">{validationErrors.school}</p>}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium">Email</label>
                                                        <input
                                                            type="email"
                                                            value={formData.email}
                                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.email ? 'border-red-500' : 'border-gray-300')}
                                                        />
                                                        {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium">Phone Number</label>
                                                        <input
                                                            type="text"
                                                            value={formData.phoneNumber}
                                                            onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                                        />
                                                    </div>
                                                </div>
                                                {!editingUser && (
                                                    <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-md p-3">
                                                        <svg className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                                        </svg>
                                                        <p className="text-sm text-purple-700">
                                                            Enter a password to set it directly, or <strong>leave it blank</strong> to send an email invite.
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-sm font-medium">
                                                        Password {!editingUser && <span className="text-gray-400 font-normal">(leave blank to send email invite)</span>}
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder={!editingUser ? 'Enter password or leave blank for email' : ''}
                                                            value={formData.password}
                                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                            className={'mt-1 block w-full border rounded-md p-2 ' + (validationErrors.password ? 'border-red-500' : 'border-gray-300')}
                                                        />
                                                        <button type="button" onClick={generatePassword} className="mt-1 bg-gray-100 px-3 rounded-md text-sm border border-gray-300 whitespace-nowrap hover:bg-gray-200">Gen</button>
                                                        {!editingUser && (
                                                            <button type="button" onClick={() => setFormData({ ...formData, password: '' })} className="mt-1 border border-purple-300 text-purple-600 px-3 rounded-md text-sm whitespace-nowrap hover:bg-purple-50">Email</button>
                                                        )}
                                                    </div>
                                                    {validationErrors.password && <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
                                                </div>
                                                {activeTab === 'school_admin' && user?.role === 'SUPER_ADMIN' && (
                                                    <div>
                                                        <label className="block text-sm font-medium">School</label>
                                                        <select
                                                            value={formData.school}
                                                            onChange={e => setFormData({ ...formData, school: e.target.value })}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                                        >
                                                            <option value="">Select School</option>
                                                            {schoolsForFormRef.current.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                                        <button onClick={handleSaveUser} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-md disabled:opacity-50">
                                            {getSaveLabel()}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Modal */}
                    {isDeleteModalOpen && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsDeleteModalOpen(false)} />
                            <div className="bg-white p-6 rounded-lg z-10 max-w-sm w-full text-center">
                                <TrashIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
                                <h3 className="text-lg font-bold">Delete {activeTab === 'schools' ? 'School' : 'User'}?</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone.
                                </p>
                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md">Cancel</button>
                                    <button onClick={confirmDelete} disabled={saving} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-50">
                                        {saving ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}