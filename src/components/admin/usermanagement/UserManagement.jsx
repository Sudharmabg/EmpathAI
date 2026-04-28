import React, { useState, useEffect, useCallback } from 'react'

import {
    PlusIcon, PencilIcon, TrashIcon, UserPlusIcon, ChevronDownIcon, ChevronRightIcon,
    MagnifyingGlassIcon, KeyIcon, ArrowLeftIcon, BuildingLibraryIcon, AcademicCapIcon,
    ClockIcon, PhoneIcon, MapPinIcon, CalendarIcon, UserCircleIcon, IdentificationIcon,
    EnvelopeIcon, BuildingOfficeIcon, GlobeAltIcon
} from '@heroicons/react/24/outline'
import {
    getStudents, getSchoolAdmins, getPsychologists, getContentAdmins,
    createUser, updateUser, deleteUser, resetPassword,
    getSchools, createSchool, deleteSchool, getUserById
} from '../../../api/usermanagementapi.js'

const TAB_ROLE_MAP = {
    student: 'STUDENT',
    school_admin: 'SCHOOL_ADMIN',
    psychologist: 'PSYCHOLOGIST',
    content_admin: 'CONTENT_ADMIN',
}
const formatClassName = (name) => {
    if (!name) return 'No Class';
    const match = name.match(/\d+/);
    if (match) return `Class ${ordinal(parseInt(match[0]))} Standard`;
    return name.startsWith('Class') ? name : `Class ${name}`;
};

const ordinal = n => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const CLASS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => ({
    label: `Class ${ordinal(n)}`,
    value: `${ordinal(n)} Standard`,
}))
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


const formatTimeSpent = (seconds) => {
    if (!seconds && seconds !== 0) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
}

export default function UserManagement({ user }) {
    const [activeTab, setActiveTab] = useState('student')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedSchool, setSelectedSchool] = useState(null)
    const [selectedClass, setSelectedClass] = useState(null)
    const [resetPasswordUser, setResetPasswordUser] = useState(null)
    const [newPassword, setNewPassword] = useState('')
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [expandedRow, setExpandedRow] = useState(null)
    const [saving, setSaving] = useState(false)
    const [schoolsData, setSchoolsData] = useState([])
    const [successMessage, setSuccessMessage] = useState(null)
    const [validationErrors, setValidationErrors] = useState({})
    const [userToDelete, setUserToDelete] = useState(null)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'student',
        password: '',
        class: '',
        section: '',
        school: '',
        parentName: '',
        parentPhone: '',
        phoneNumber: '',
        dateOfBirth: '',
        emergencyContact: '',
        contactName: '',
        rollNo: '',
        gender: '',
        loginCount: 0,
        intervention: '',
        timeSpent: 0,
    })

    const loadUsers = useCallback(async () => {
        setLoading(true)
        setApiError(null)
        try {
            let result
            const opts = { search: searchTerm || undefined, page: 0, size: 200 }
            if (activeTab === 'student') {
                const schoolParam = user?.role === 'SCHOOL_ADMIN' ? user.school : (selectedSchool || undefined)
                result = await getStudents({ ...opts, school: schoolParam })
                const studentList = (result.content || []).map(u => ({
                    ...u,
                    role: 'student',
                    class: u.className,
                }))
                setUsers(studentList)

                // Pre-fetch full details so Section & Parent Phone show in the table immediately
                const fullDetails = await Promise.all(
                    studentList.map(u => getUserById(u.id).catch(() => null))
                )
                const detailsMap = {}
                fullDetails.forEach(full => {
                    if (full) detailsMap[full.id] = full
                })
                setExpandedUserData(prev => ({ ...prev, ...detailsMap }))
            }
            else if (activeTab === 'school_admin') {
                result = await getSchoolAdmins(opts)
                setUsers((result.content || []).map(u => ({ ...u, role: 'school_admin' })))
            } else if (activeTab === 'psychologist') {
                result = await getPsychologists(opts)
                setUsers((result.content || []).map(u => ({ ...u, role: 'psychologist' })))
            } else if (activeTab === 'content_admin') {
                result = await getContentAdmins(opts)
                setUsers((result.content || []).map(u => ({ ...u, role: 'content_admin' })))
            } else if (activeTab === 'schools') {
                const schoolsRes = await getSchools()
                setSchoolsData(schoolsRes || [])
                setUsers([])
            }
        } catch (err) {
            setApiError(err.message || 'Failed to load users')
        } finally {
            setLoading(false)
        }
    }, [activeTab, selectedSchool, searchTerm, user])

    const loadSchools = useCallback(async () => {
        try {
            const res = await getSchools()
            setSchoolsData(res || [])
        } catch (err) {
            console.error('Failed to load schools', err)
        }
    }, [])

    useEffect(() => {
        loadUsers()
        if (activeTab !== 'schools') loadSchools()
    }, [loadUsers, loadSchools, activeTab])

    useEffect(() => {
        if (user?.role === 'SCHOOL_ADMIN' && user.school) {
            setSelectedSchool(user.school)
        }
    }, [user])

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
        let pass = ''
        for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
        setFormData(prev => ({ ...prev, password: pass }))
    }

    const handleOpenModal = async (userToEdit = null) => {
        setValidationErrors({})
        if (userToEdit) {
            // If it has an id and is a user (not a school), fetch full details from API
            // because the list response is now lean and missing fields like
            // section, bloodGroup, parentName, parentEmail, address, dateOfBirth
            let fullUser = userToEdit
            if (userToEdit.id && activeTab !== 'schools') {
                try {
                    fullUser = await getUserById(userToEdit.id)
                } catch (err) {
                    console.error('Failed to fetch user details', err)
                    // fallback to whatever data we have from the list
                    fullUser = userToEdit
                }
            }

            setEditingUser(fullUser)
            setFormData({
                name: fullUser.name || '',
                email: fullUser.email || '',
                role: fullUser.role || activeTab,
                password: '',
                class: fullUser.className || fullUser.class || '',
                section: fullUser.section || '',
                school: fullUser.school || '',
                parentName: fullUser.parentName || '',
                parentPhone: fullUser.parentEmail || '',   // parentEmail field stores parent phone
                phoneNumber: fullUser.phoneNumber || '',
                dateOfBirth: fullUser.dateOfBirth || '',
                emergencyContact: fullUser.emergencyContact || '',
                contactName: fullUser.contactName || '',
                rollNo: fullUser.rollNo || '',
                gender: fullUser.gender || '',
                loginCount: fullUser.loginCount ?? 0,
                intervention: fullUser.intervention || '',
                timeSpent: fullUser.timeSpent ?? 0,
            })
        } else {
            setEditingUser(null)
            setFormData({
                name: '',
                email: '',
                role: activeTab,
                password: '',
                class: '',
                section: '',
                school: activeTab === 'student' && selectedSchool ? selectedSchool : '',
                parentName: '',
                parentPhone: '',
                phoneNumber: '',
                dateOfBirth: '',
                emergencyContact: '',
                contactName: '',
                rollNo: '',
                loginCount: 0,
                intervention: '',
                timeSpent: 0,
            })
            if (activeTab !== 'schools') generatePassword()
        }
        setIsModalOpen(true)
    }

    const validateForm = () => {
        const errors = {}
        const { name, email, school, rollNo, section, parentName,  dateOfBirth, password, phoneNumber, parentPhone } = formData

        if (!name.trim()) errors.name = "Name is required"

        if (activeTab === 'schools') {
            
            if (!formData.contactName?.trim()) errors.contactName = "Contact Name is required"
            if (!email?.trim()) errors.email = "Email is required"
            const dup = schoolsData.find(s => s.name.toLowerCase() === name.trim().toLowerCase() && (!editingUser || s.id !== editingUser.id))
            if (dup) errors.name = "School name already exists"
        } else {
            if (!email.trim()) {
                errors.email = "Email is required"
            } else if (!email.includes('@')) {
                errors.email = "Invalid email format"
            }
            if (!editingUser && !password?.trim()) errors.password = "Password is required"

            if (activeTab === 'student') {
                if (!school?.trim()) errors.school = "School is required"
                if (!rollNo?.trim()) errors.rollNo = "Roll No is required"
                if (!formData.class?.trim()) errors.class = "Class is required"
                if (!section?.trim()) errors.section = "Section is required"
                if (!parentName?.trim()) errors.parentName = "Parent Name is required"
                if (!dateOfBirth) errors.dateOfBirth = "Date of Birth is required"
            }
        }

        if (phoneNumber && phoneNumber.trim()) {
            const cleaned = phoneNumber.replace(/\D/g, '')
            if (cleaned.length !== 10) errors.phoneNumber = "Phone number must be 10 digits"
        }

        if (parentPhone && parentPhone.trim()) {
            const cleaned = parentPhone.replace(/\D/g, '')
            if (cleaned.length !== 10) errors.parentPhone = "Parent phone must be 10 digits"
        }

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
                    address: formData.address || undefined,
                    contactNumber: formData.phoneNumber || undefined,
                    contactName: formData.contactName || undefined,
                    email: formData.email || undefined
                })
            } else {
               const payload = {
    name: formData.name,
    email: formData.email,
    role: TAB_ROLE_MAP[formData.role] || formData.role,
    password: formData.password || undefined,
    phoneNumber: formData.phoneNumber || undefined,
    school: formData.school || undefined,
    className: formData.class || undefined,
    grade: formData.class || undefined,
    parentName: formData.parentName || undefined,
    parentEmail: formData.parentPhone || undefined,
    dateOfBirth: formData.dateOfBirth || undefined,
    age: formData.dateOfBirth ? calculateAgeFromDOB(formData.dateOfBirth) : undefined,
    emergencyContact: formData.emergencyContact || undefined,
    rollNo: formData.rollNo || undefined,
    section: formData.section || undefined,
    gender: formData.gender || undefined,
    loginCount: formData.loginCount !== undefined ? Number(formData.loginCount) : undefined,
    intervention: formData.intervention || undefined,
    timeSpent: formData.timeSpent !== undefined ? Number(formData.timeSpent) : undefined,
}
                if (editingUser) {
                    await updateUser(editingUser.id, payload)
                } else {
                    await createUser(payload)
                }
            }
            setIsModalOpen(false)
            setSuccessMessage(`${activeTab === 'schools' ? 'School' : 'User'} saved successfully!`)
            const savedUser = localStorage.getItem('user')
            const currentUser = savedUser ? JSON.parse(savedUser) : null
            if (editingUser && currentUser && currentUser.id === editingUser.id && formData.dateOfBirth) {
                localStorage.setItem('user', JSON.stringify({
                    ...currentUser,
                    age: formData.dateOfBirth ? calculateAgeFromDOB(formData.dateOfBirth) : (currentUser.age || null),
                    dateOfBirth: formData.dateOfBirth || null,
                    gender: formData.gender || null,
                }))
            }
            setTimeout(() => setSuccessMessage(null), 3000)
            await loadUsers()
        } catch (err) {
            setApiError(err.message || 'Save failed')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteUser = (userOrId) => {
        setUserToDelete(userOrId)
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!userToDelete) return
        setSaving(true)
        try {
            const id = userToDelete.id || userToDelete
            if (activeTab === 'schools') {
                await deleteSchool(id)
            } else {
                await deleteUser(id)
            }
            setSuccessMessage(`${activeTab === 'schools' ? 'School' : 'User'} deleted successfully!`)
            setTimeout(() => setSuccessMessage(null), 3000)
            await loadUsers()
            setIsDeleteModalOpen(false)
            setUserToDelete(null)
        } catch (err) {
            setApiError(err.message || 'Delete failed')
        } finally {
            setSaving(false)
        }
    }

    const [expandedUserData, setExpandedUserData] = useState({})

    const toggleRow = async (userId) => {
        if (expandedRow === userId) {
            setExpandedRow(null)
            return
        }
        setExpandedRow(userId)
        // Only fetch if we don't already have the full data cached
        if (!expandedUserData[userId]) {
            try {
                const fullUser = await getUserById(userId)
                setExpandedUserData(prev => ({ ...prev, [userId]: fullUser }))
            } catch (err) {
                console.error('Failed to fetch student details', err)
            }
        }
    }

    const handleResetPassword = (userToReset) => {
        setResetPasswordUser(userToReset)
        setNewPassword('')
    }

    const generatePasswordForReset = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
        let pass = ''
        for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length))
        setNewPassword(pass)
    }

    const confirmResetPassword = async () => {
        if (!resetPasswordUser) return
        setSaving(true)
        try {
            const result = await resetPassword(resetPasswordUser.id)
            const tempPwd = result.newPassword || result.temporaryPassword || '(check server logs)'
            setSuccessMessage(`Password reset for ${resetPasswordUser.name}!\nTemporary Password: ${tempPwd}`)
            setTimeout(() => setSuccessMessage(null), 10000)
            setResetPasswordUser(null)
            setNewPassword('')
        } catch (err) {
            setApiError(err.message || 'Password reset failed')
        } finally {
            setSaving(false)
        }
    }

    const filteredUsers = users
        .filter(u => u.role === activeTab)
        .filter(u => !selectedSchool || u.school === selectedSchool)
        .filter(u => !selectedClass || formatClassName(u.class || u.className) === selectedClass)
        .filter(u => {
            if (!searchTerm) return true
            const search = searchTerm.toLowerCase()
            return (
                u.name.toLowerCase().includes(search) ||
                (u.email && u.email.toLowerCase().includes(search)) ||
                (u.school && u.school.toLowerCase().includes(search))
            )
        })

    const roles = [
        { id: 'student', label: 'Students' },
        { id: 'school_admin', label: 'School Admin' },
        { id: 'psychologist', label: 'Psychologists' },
        { id: 'content_admin', label: 'Content Admins' },
        { id: 'schools', label: 'Schools' },
    ].filter(r => {
        if (user?.role === 'SUPER_ADMIN') return true
        if (user?.role === 'SCHOOL_ADMIN') return r.id === 'student'
        return false
    })

    const addButtonLabels = {
        student: "Add Students",
        school_admin: "Add School Admins",
        psychologist: "Add Psychologists",
        content_admin: "Add Content Admins",
        schools: "Add School",
    }

    const roleTitles = {
        student: "Student",
        school_admin: "School Admin",
        psychologist: "Psychologist",
        content_admin: "Content Admin",
        schools: "School",
    }

    return (
        <div className="relative">
            {/* Notifications */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-[60] animate-fade-in-down">
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 shadow-lg rounded-md">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-green-800 whitespace-pre-wrap">{successMessage}</p>
                            </div>
                            <div className="ml-4 flex-shrink-0 flex">
                                <button onClick={() => setSuccessMessage(null)} className="text-green-500">
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {apiError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                    <div className="flex">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <p className="ml-3 text-sm font-medium text-red-800">{apiError}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => { setActiveTab(role.id); setExpandedRow(null); setSelectedSchool(null); setSelectedClass(null) }}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === role.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            {role.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Action Bar */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    {selectedSchool && activeTab === 'student' && (
                        <button onClick={() => { if (selectedClass) setSelectedClass(null); else setSelectedSchool(null) }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>
                    )}
                    <h3 className="text-lg font-medium text-gray-900">
                        {selectedSchool ? (selectedClass ? `${selectedSchool} - ${selectedClass}` : `${selectedSchool} Classes`) : `Manage ${roles.find(r => r.id === activeTab)?.label}`}
                    </h3>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700">
                    <UserPlusIcon className="w-5 h-5 mr-2" />
                    {addButtonLabels[activeTab]}
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
            </div>

            {/* ── VIEWS ── */}
            {activeTab === 'student' && !selectedSchool ? (
                /* School cards */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                        const schoolsMap = {}
                        users.filter(u => u.role === 'student' && (!searchTerm || u.school?.toLowerCase().includes(searchTerm.toLowerCase()) || u.name.toLowerCase().includes(searchTerm.toLowerCase())))
                            .forEach(u => {
                                const sName = u.school || 'Unknown School'
                                if (!schoolsMap[sName]) schoolsMap[sName] = { count: 0, students: [] }
                                schoolsMap[sName].count++
                                schoolsMap[sName].students.push(u)
                            })
                        return Object.keys(schoolsMap).map(sName => (
                            <div key={sName} onClick={() => setSelectedSchool(sName)} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg cursor-pointer">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><BuildingLibraryIcon className="w-6 h-6 text-purple-600" /></div>
                                    <div className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">{schoolsMap[sName].count} Students</div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">{sName}</h3>
                            </div>
                        ))
                    })()}
                </div>
            ) : activeTab === 'student' && selectedSchool && !selectedClass ? (
                /* Class cards — FIX: group by normalized class name to avoid duplicates */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(() => {
                        const classesMap = {}
                        users.filter(u => u.role === 'student' && u.school === selectedSchool)
                            .forEach(u => {
                                // Define rawClass before using it
                                const rawClass = u.class || u.className || 'No Class'
                                const cName = formatClassName(rawClass)

                                if (!classesMap[cName]) classesMap[cName] = { count: 0 }
                                classesMap[cName].count++
                            })
                        // Sort by class number
                        return Object.keys(classesMap)
                            .sort((a, b) => {
                                const na = parseInt(a.match(/\d+/)?.[0] || 0)
                                const nb = parseInt(b.match(/\d+/)?.[0] || 0)
                                return na - nb
                            })
                            .map(cName => (
                                <div key={cName} onClick={() => setSelectedClass(cName)} className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md cursor-pointer text-center">
                                    <AcademicCapIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                                    <h3 className="text-xl font-bold">{cName}</h3>
                                    <div className="text-xs text-purple-800 bg-purple-100 px-2 py-1 rounded-full inline-block mt-1">{classesMap[cName].count} Students</div>
                                </div>
                            ))
                    })()}
                </div>
            ) : activeTab === 'schools' ? (
                /* Schools table */
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {schoolsData.filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(school => (
                                <tr key={school.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{school.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{school.address || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="font-semibold">{school.contactName || '-'}</div>
                                        <div className="text-xs text-gray-400">{school.email || school.contactNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button onClick={() => handleOpenModal(school)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDeleteUser(school)} className="text-red-600 hover:text-red-800"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : activeTab === 'student' && selectedSchool && selectedClass ? (
                /* ── STUDENT TABLE with expandable rows ── */
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login Count</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intervention</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Spent</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {/* FIX: match students whose class normalizes to the selected class */}
                            {filteredUsers
                                .filter(u => {
                                    const studentClass = u.class || u.className || 'No Class'
                                    return formatClassName(studentClass) === selectedClass
                                })
                                .map(u => {
                                    const full = expandedUserData[u.id] || u   // 👈 THIS is what was missing
                                    return (
                                        <React.Fragment key={u.id}>
                                            <tr
                                                className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => toggleRow(u.id)}
                                            >
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        {expandedRow === u.id
                                                            ? <ChevronDownIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                            : <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        }
                                                        {u.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                        {formatClassName(u.class || u.className || 'No Class')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {full.section ? `Section ${full.section}` : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {full.parentEmail
                                                        ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            <PhoneIcon className="w-3 h-3" />{full.parentEmail}
                                                        </span>
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {full.loginCount != null
                                                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{full.loginCount}</span>
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {full.intervention
                                                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{full.intervention}</span>
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {full.timeSpent != null
                                                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{formatTimeSpent(full.timeSpent)}</span>
                                                        : <span className="text-gray-300">—</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-center" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-3">
                                                        <button onClick={() => handleOpenModal(u)} className="text-indigo-600 hover:text-indigo-800" title="Edit">
                                                            <PencilIcon className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteUser(u)} className="text-red-500 hover:text-red-700" title="Delete">
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRow === u.id && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={9} className="px-8 py-4">
                                                        {(() => {
                                                            const full = expandedUserData[u.id] || u
                                                            return (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    
                                                                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Roll No</p>
                                                                        <p className="text-sm font-semibold text-gray-800">{full.rollNo || '—'}</p>
                                                                    </div>
                                                                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Login Count</p>
                                                                        <p className="text-sm font-semibold text-gray-800">{full.loginCount ?? '—'}</p>
                                                                    </div>
                                                                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Intervention</p>
                                                                        <p className="text-sm font-semibold text-gray-800">{full.intervention || '—'}</p>
                                                                    </div>
                                                                    <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                                                                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Time Spent</p>
                                                                        <p className="text-sm font-semibold text-gray-800">{full.timeSpent != null ? formatTimeSpent(full.timeSpent) : '—'}</p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })()}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>

                                    )
                                })}
                            {filteredUsers.filter(u => {
                                const rawClass = u.class || u.className || 'No Class';
                                return formatClassName(rawClass) === selectedClass;
                            }).length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">No students found</td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Generic table for school_admin / psychologist / content_admin */
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
            )
            }

            {/* ── CREATE / EDIT MODAL ── */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen px-4">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)}></div>
                            <div className="bg-white rounded-lg p-6 z-10 w-full max-w-2xl">
                                <h3 className="text-lg font-bold mb-4">{editingUser ? 'Edit' : 'Create'} {roleTitles[activeTab]}</h3>
                                <div className="space-y-4">

                                    <div>
                                        <label className="block text-sm font-medium">Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
                                    </div>

                                    {activeTab === 'schools' ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium">Physical Address</label>
                                                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.address ? 'border-red-500' : 'border-gray-300'}`} />
                                                {validationErrors.address && <p className="text-red-500 text-xs mt-1">{validationErrors.address}</p>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium">Contact Person</label>
                                                    <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.contactName ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.contactName && <p className="text-red-500 text-xs mt-1">{validationErrors.contactName}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium">Official Email</label>
                                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Phone Number</label>
                                                <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`} />
                                                {validationErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{validationErrors.phoneNumber}</p>}
                                            </div>
                                        </>
                                    ) : activeTab === 'student' ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium">Date of Birth</label>
                                                    <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{validationErrors.dateOfBirth}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium">Class</label>
                                                    <select value={formData.class} onChange={(e) => setFormData({ ...formData, class: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.class ? 'border-red-500' : 'border-gray-300'}`}>
                                                        <option value="">Select Class</option>
                                                        {CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                    </select>
                                                    {validationErrors.class && <p className="text-red-500 text-xs mt-1">{validationErrors.class}</p>}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium">Section</label>
                                                    <select value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.section ? 'border-red-500' : 'border-gray-300'}`}>
                                                        <option value="">Select Section</option>
                                                        <option value="A">Section A</option>
                                                        <option value="B">Section B</option>
                                                        <option value="C">Section C</option>
                                                        <option value="D">Section D</option>
                                                    </select>
                                                    {validationErrors.section && <p className="text-red-500 text-xs mt-1">{validationErrors.section}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium">Roll No</label>
                                                    <input type="text" value={formData.rollNo} onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.rollNo ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.rollNo && <p className="text-red-500 text-xs mt-1">{validationErrors.rollNo}</p>}
                                                </div>
                                            </div>
          
                                            <div className="grid grid-cols-2 gap-4">
                                                
                                                <div>
                                                    <label className="block text-sm font-medium">Email</label>
                                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                                </div>
                                                <div>
        <label className="block text-sm font-medium">Gender</label>
        <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
        </select>
    </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium">Password</label>
                                                    <div className="flex gap-2">
                                                        <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.password ? 'border-red-500' : 'border-gray-300'}`} />
                                                        <button onClick={generatePassword} type="button" className="mt-1 bg-gray-100 px-3 rounded-md text-sm border border-gray-300">Gen</button>
                                                    </div>
                                                    {validationErrors.password && <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium">Parent Name</label>
                                                    <input type="text" value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.parentName ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.parentName && <p className="text-red-500 text-xs mt-1">{validationErrors.parentName}</p>}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium">Parent Phone Number</label>
                                                    <input type="text" value={formData.parentPhone} onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} placeholder="10-digit mobile number" className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.parentPhone ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.parentPhone && <p className="text-red-500 text-xs mt-1">{validationErrors.parentPhone}</p>}
                                                </div>
                                                {(user?.role === 'SUPER_ADMIN' || editingUser) && (
                                                    <div>
                                                        <label className="block text-sm font-medium">School</label>
                                                        <select value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.school ? 'border-red-500' : 'border-gray-300'}`}>
                                                            <option value="">Select School</option>
                                                            {schoolsData.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                        </select>
                                                        {validationErrors.school && <p className="text-red-500 text-xs mt-1">{validationErrors.school}</p>}
                                                    </div>
                                                )}
                                            </div>
                                            {/* ── NEW FIELDS ── */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium">Login Count</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={formData.loginCount}
                                                        onChange={(e) => setFormData({ ...formData, loginCount: e.target.value })}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium">Time Spent (seconds)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={formData.timeSpent}
                                                        onChange={(e) => setFormData({ ...formData, timeSpent: e.target.value })}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Intervention</label>
                                                <input
                                                    type="text"
                                                    value={formData.intervention}
                                                    onChange={(e) => setFormData({ ...formData, intervention: e.target.value })}
                                                    placeholder="e.g. Counselling, CBT, Group session"
                                                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium">Email</label>
                                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium">Phone Number</label>
                                                    <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`} />
                                                    {validationErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{validationErrors.phoneNumber}</p>}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium">Password</label>
                                                <div className="flex gap-2">
                                                    <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.password ? 'border-red-500' : 'border-gray-300'}`} />
                                                    <button onClick={generatePassword} type="button" className="bg-gray-100 px-3 rounded-md text-sm border border-gray-300">Generate</button>
                                                </div>
                                                {validationErrors.password && <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
                                            </div>
                                            {activeTab === 'school_admin' && user?.role === 'SUPER_ADMIN' && (
                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium">School</label>
                                                    <select value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })} className={`mt-1 block w-full border rounded-md p-2 ${validationErrors.school ? 'border-red-500' : 'border-gray-300'}`}>
                                                        <option value="">Select School</option>
                                                        {schoolsData.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                    </select>
                                                    {validationErrors.school && <p className="text-red-500 text-xs mt-1">{validationErrors.school}</p>}
                                                </div>
                                                
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                                    <button onClick={handleSaveUser} disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-md disabled:opacity-50">
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsDeleteModalOpen(false)}></div>
                        <div className="bg-white p-6 rounded-lg z-10 max-w-sm w-full text-center">
                            <TrashIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
                            <h3 className="text-lg font-bold">Delete {activeTab === 'schools' ? 'School' : 'User'}?</h3>
                            <p className="text-sm text-gray-500 mt-2">Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.</p>
                            <div className="mt-6 flex gap-3">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}