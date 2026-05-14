// src/components/admin/UserManagement/TeacherTab.jsx
// Drop-in sub-tab for UserManagement.jsx
// Props: { user }  — the currently logged-in admin (same `user` prop UserManagement receives)

import React, { useState, useEffect, useCallback } from 'react'
import {
    PencilIcon, TrashIcon, UserPlusIcon, MagnifyingGlassIcon,
    KeyIcon, PhoneIcon, AcademicCapIcon, BookOpenIcon,
} from '@heroicons/react/24/outline'
import {
    getTeachers, createTeacher, updateTeacher,
    deleteTeacher, resetTeacherPassword,
} from '../../../api/teacherapi.js'

// ── constants ────────────────────────────────────────────────────────────────

const SUBJECT_OPTIONS = [
    'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
    'English', 'Hindi', 'Bengali', 'History', 'Geography',
    'Civics', 'Computer Science', 'Physical Education', 'Art', 'Music',
]

const CLASS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100
    const ordinal = n + (s[(v - 20) % 10] || s[v] || s[0])
    return { label: `Class ${ordinal}`, value: n }
})

const EMPTY_FORM = {
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    subjects: [],
    classesCovered: [],
    school: '',
}

// ── helpers ──────────────────────────────────────────────────────────────────

const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let p = ''
    for (let i = 0; i < 12; i++) p += chars.charAt(Math.floor(Math.random() * chars.length))
    return p
}

const toggleItem = (arr, item) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]

// ── component ────────────────────────────────────────────────────────────────

export default function TeacherTab({ user, schoolsData = [] }) {
    const [teachers, setTeachers] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [apiError, setApiError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)

    // modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTeacher, setEditingTeacher] = useState(null)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [validationErrors, setValidationErrors] = useState({})

    // delete modal
    const [teacherToDelete, setTeacherToDelete] = useState(null)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

    // reset password modal
    const [resetTarget, setResetTarget] = useState(null)
    const [resetResult, setResetResult] = useState(null)

    // ── data loading ─────────────────────────────────────────────────────────

    const loadTeachers = useCallback(async () => {
        setLoading(true)
        setApiError(null)
        try {
            const schoolParam =
                user?.role === 'SCHOOL_ADMIN' ? user.school : undefined
            const res = await getTeachers({
                school: schoolParam,
                search: searchTerm || undefined,
                page: 0,
                size: 200,
            })
            setTeachers(res.content || [])
        } catch (err) {
            setApiError(err.message || 'Failed to load teachers')
        } finally {
            setLoading(false)
        }
    }, [searchTerm, user])

    useEffect(() => { loadTeachers() }, [loadTeachers])

    // ── modal helpers ─────────────────────────────────────────────────────────

    const openCreateModal = () => {
        setValidationErrors({})
        setEditingTeacher(null)
        setFormData({
            ...EMPTY_FORM,
            school: user?.role === 'SCHOOL_ADMIN' ? (user.school || '') : '',
        })
        setIsModalOpen(true)
    }

    const openEditModal = async (t) => {
        setValidationErrors({})
        setEditingTeacher(t)
        setFormData({
            name: t.name || '',
            email: t.email || '',
            password: '',
            phoneNumber: t.phoneNumber || '',
            subjects: Array.isArray(t.subjects) ? t.subjects : [],
            classesCovered: Array.isArray(t.classesCovered) ? t.classesCovered : [],
            school: t.school || '',
        })
        setIsModalOpen(true)
    }

    // ── validation ────────────────────────────────────────────────────────────

    const validate = () => {
        const errors = {}
        if (!formData.name.trim()) errors.name = 'Name is required'
        if (!formData.email.trim()) errors.email = 'Email is required'
        else if (!formData.email.includes('@')) errors.email = 'Invalid email'
        // Password is optional on create: blank = send email invite
        if (formData.subjects.length === 0)
            errors.subjects = 'Select at least one subject'
        if (formData.classesCovered.length === 0)
            errors.classesCovered = 'Select at least one class'
        if (!formData.school && user?.role !== 'SCHOOL_ADMIN')
            errors.school = 'School is required'
        if (formData.phoneNumber) {
            const cleaned = formData.phoneNumber.replace(/\D/g, '')
            if (cleaned.length !== 10)
                errors.phoneNumber = 'Phone must be 10 digits'
        }
        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    // ── save ──────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        setApiError(null)
        if (!validate()) return
        setSaving(true)
        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password || undefined,
                phoneNumber: formData.phoneNumber || undefined,
                subjects: formData.subjects,
                classesCovered: formData.classesCovered,
                school: user?.role === 'SCHOOL_ADMIN'
                    ? user.school
                    : (formData.school || undefined),
            }
            if (editingTeacher) {
                await updateTeacher(editingTeacher.id, payload)
            } else {
                await createTeacher(payload)
            }
            setIsModalOpen(false)
            const msg = editingTeacher
                ? 'Teacher saved successfully!'
                : formData.password?.trim()
                    ? 'Teacher created successfully!'
                    : 'Teacher created! Password setup email sent to ' + formData.email
            showSuccess(msg)
            await loadTeachers()
        } catch (err) {
            setApiError(err.message || 'Save failed')
        } finally {
            setSaving(false)
        }
    }

    // ── delete ────────────────────────────────────────────────────────────────

    const confirmDelete = async () => {
        if (!teacherToDelete) return
        setSaving(true)
        try {
            await deleteTeacher(teacherToDelete.id)
            setIsDeleteModalOpen(false)
            setTeacherToDelete(null)
            showSuccess('Teacher deleted successfully!')
            await loadTeachers()
        } catch (err) {
            setApiError(err.message || 'Delete failed')
        } finally {
            setSaving(false)
        }
    }

    // ── reset password ────────────────────────────────────────────────────────

    const handleResetPassword = async () => {
        if (!resetTarget) return
        setSaving(true)
        try {
            const result = await resetTeacherPassword(resetTarget.id)
            setResetResult(result.newPassword)
        } catch (err) {
            setApiError(err.message || 'Reset failed')
        } finally {
            setSaving(false)
        }
    }

    // ── utils ─────────────────────────────────────────────────────────────────

    const showSuccess = (msg) => {
        setSuccessMessage(msg)
        setTimeout(() => setSuccessMessage(null), 3500)
    }

    const filteredTeachers = teachers.filter(t => {
        if (!searchTerm) return true
        const s = searchTerm.toLowerCase()
        return (
            t.name?.toLowerCase().includes(s) ||
            t.email?.toLowerCase().includes(s) ||
            t.school?.toLowerCase().includes(s)
        )
    })

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <div className="relative">

            {/* ── success toast ── */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-[60] animate-fade-in-down">
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 shadow-lg rounded-md flex items-start gap-3">
                        <svg className="h-5 w-5 text-green-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm font-medium text-green-800">{successMessage}</p>
                        <button onClick={() => setSuccessMessage(null)} className="ml-2 text-green-400 hover:text-green-600">✕</button>
                    </div>
                </div>
            )}

            {/* ── error banner ── */}
            {apiError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-center gap-3">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-red-800">{apiError}</p>
                    <button onClick={() => setApiError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
            )}

            {/* ── action bar ── */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Teachers</h3>
                <button
                    onClick={openCreateModal}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 transition-colors"
                >
                    <UserPlusIcon className="w-5 h-5 mr-2" />
                    Add Teacher
                </button>
            </div>

            {/* ── search ── */}
            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search teachers by name, email or school..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
            </div>

            {/* ── table ── */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading teachers…</div>
            ) : (
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classes</th>
                                {user?.role === 'SUPER_ADMIN' && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                                )}
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTeachers.length === 0 ? (
                                <tr>
                                    <td colSpan={user?.role === 'SUPER_ADMIN' ? 7 : 6}
                                        className="px-6 py-10 text-center text-sm text-gray-400">
                                        No teachers found
                                    </td>
                                </tr>
                            ) : filteredTeachers.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{t.email}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {t.phoneNumber
                                            ? <span className="inline-flex items-center gap-1">
                                                <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                                                {t.phoneNumber}
                                            </span>
                                            : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                                        <div className="flex flex-wrap gap-1">
                                            {(t.subjects || []).map(s => (
                                                <span key={s} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {s}
                                                </span>
                                            ))}
                                            {(!t.subjects || t.subjects.length === 0) &&
                                                <span className="text-gray-300">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                                        <div className="flex flex-wrap gap-1">
                                            {(t.classesCovered || []).map(c => {
                                                const found = CLASS_OPTIONS.find(o => o.value === c)
                                                return (
                                                    <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                        {found ? found.label : `Class ${c}`}
                                                    </span>
                                                )
                                            })}
                                            {(!t.classesCovered || t.classesCovered.length === 0) &&
                                                <span className="text-gray-300">—</span>}
                                        </div>
                                    </td>
                                    {user?.role === 'SUPER_ADMIN' && (
                                        <td className="px-6 py-4 text-sm text-gray-500">{t.school || '—'}</td>
                                    )}
                                    <td className="px-6 py-4 text-sm text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                title="Edit"
                                                onClick={() => openEditModal(t)}
                                                className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                title="Reset Password"
                                                onClick={() => { setResetTarget(t); setResetResult(null) }}
                                                className="text-yellow-500 hover:text-yellow-700 transition-colors"
                                            >
                                                <KeyIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                title="Delete"
                                                onClick={() => { setTeacherToDelete(t); setIsDeleteModalOpen(true) }}
                                                className="text-red-500 hover:text-red-700 transition-colors"
                                            >
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

            {/* ══════════════════════════════════════════════════════════════
                CREATE / EDIT MODAL
            ══════════════════════════════════════════════════════════════ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 py-8">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)} />
                        <div className="bg-white rounded-xl shadow-2xl p-6 z-10 w-full max-w-2xl relative">
                            <h3 className="text-lg font-bold text-gray-900 mb-5">
                                {editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
                            </h3>

                            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

                                {/* Name + Email */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                            className={`mt-1 block w-full border rounded-md p-2 text-sm ${validationErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                            className={`mt-1 block w-full border rounded-md p-2 text-sm ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                                    </div>
                                </div>

                                {/* Phone + School (SUPER_ADMIN only) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                        <input
                                            type="text"
                                            value={formData.phoneNumber}
                                            onChange={e => setFormData(p => ({ ...p, phoneNumber: e.target.value }))}
                                            placeholder="10-digit mobile"
                                            className={`mt-1 block w-full border rounded-md p-2 text-sm ${validationErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {validationErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{validationErrors.phoneNumber}</p>}
                                    </div>
                                    {user?.role === 'SUPER_ADMIN' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">School <span className="text-red-500">*</span></label>
                                            <select
                                                value={formData.school}
                                                onChange={e => setFormData(p => ({ ...p, school: e.target.value }))}
                                                className={`mt-1 block w-full border rounded-md p-2 text-sm ${validationErrors.school ? 'border-red-500' : 'border-gray-300'}`}
                                            >
                                                <option value="">Select School</option>
                                                {schoolsData.map(s => (
                                                    <option key={s.id} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                            {validationErrors.school && <p className="text-red-500 text-xs mt-1">{validationErrors.school}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Email invite banner (create mode only) */}
                                {!editingTeacher && (
                                    <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-md p-3">
                                        <svg className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                        </svg>
                                        <p className="text-sm text-purple-700">
                                            Enter a password to set it directly, or <strong>leave it blank</strong> to send an email invite to the teacher.
                                        </p>
                                    </div>
                                )}

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Password{' '}
                                        {editingTeacher
                                            ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                                            : <span className="text-gray-400 font-normal">(leave blank to send email invite)</span>
                                        }
                                    </label>
                                    <div className="mt-1 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder={!editingTeacher ? 'Enter password or leave blank for email' : ''}
                                            value={formData.password}
                                            onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                                            className={`block w-full border rounded-md p-2 text-sm ${validationErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, password: generatePassword() }))}
                                            className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200 whitespace-nowrap"
                                        >
                                            Gen
                                        </button>
                                        {!editingTeacher && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, password: '' }))}
                                                className="px-3 py-2 border border-purple-300 text-purple-600 rounded-md text-sm hover:bg-purple-50 whitespace-nowrap"
                                            >
                                                Email
                                            </button>
                                        )}
                                    </div>
                                    {validationErrors.password && <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
                                </div>

                                {/* Subjects multi-select */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Subjects <span className="text-red-500">*</span>
                                        <span className="ml-2 text-xs text-gray-400 font-normal">
                                            ({formData.subjects.length} selected)
                                        </span>
                                    </label>
                                    <div className={`border rounded-md p-3 ${validationErrors.subjects ? 'border-red-500' : 'border-gray-300'}`}>
                                        <div className="flex flex-wrap gap-2">
                                            {SUBJECT_OPTIONS.map(subject => {
                                                const selected = formData.subjects.includes(subject)
                                                return (
                                                    <button
                                                        key={subject}
                                                        type="button"
                                                        onClick={() => setFormData(p => ({
                                                            ...p,
                                                            subjects: toggleItem(p.subjects, subject)
                                                        }))}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                                            }`}
                                                    >
                                                        {selected && <span className="mr-1">✓</span>}
                                                        {subject}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    {validationErrors.subjects && <p className="text-red-500 text-xs mt-1">{validationErrors.subjects}</p>}
                                </div>

                                {/* Classes covered multi-select */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Classes Covered <span className="text-red-500">*</span>
                                        <span className="ml-2 text-xs text-gray-400 font-normal">
                                            ({formData.classesCovered.length} selected)
                                        </span>
                                    </label>
                                    <div className={`border rounded-md p-3 ${validationErrors.classesCovered ? 'border-red-500' : 'border-gray-300'}`}>
                                        <div className="flex flex-wrap gap-2">
                                            {CLASS_OPTIONS.map(({ label, value }) => {
                                                const selected = formData.classesCovered.includes(value)
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setFormData(p => ({
                                                            ...p,
                                                            classesCovered: toggleItem(p.classesCovered, value)
                                                        }))}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected
                                                                ? 'bg-purple-600 text-white border-purple-600'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                                                            }`}
                                                    >
                                                        {selected && <span className="mr-1">✓</span>}
                                                        {label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    {validationErrors.classesCovered && <p className="text-red-500 text-xs mt-1">{validationErrors.classesCovered}</p>}
                                </div>

                            </div>{/* end scrollable area */}

                            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {saving ? 'Saving…' : editingTeacher ? 'Save Teacher' : formData.password?.trim() ? 'Create Teacher' : 'Create & Send Email'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                DELETE MODAL
            ══════════════════════════════════════════════════════════════ */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="bg-white p-6 rounded-lg z-10 max-w-sm w-full text-center shadow-xl">
                        <TrashIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold">Delete Teacher?</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Are you sure you want to delete <strong>{teacherToDelete?.name}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={saving}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-50"
                            >
                                {saving ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                RESET PASSWORD MODAL
            ══════════════════════════════════════════════════════════════ */}
            {resetTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => { setResetTarget(null); setResetResult(null) }} />
                    <div className="bg-white p-6 rounded-lg z-10 max-w-sm w-full text-center shadow-xl">
                        <KeyIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold">Reset Password</h3>
                        {resetResult ? (
                            <>
                                <p className="text-sm text-gray-600 mt-2">New temporary password for <strong>{resetTarget.name}</strong>:</p>
                                <div className="mt-3 bg-gray-100 rounded-md p-3 font-mono text-sm text-gray-900 tracking-wider select-all">
                                    {resetResult}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Click the password to copy. Share it securely.</p>
                                <button
                                    onClick={() => { setResetTarget(null); setResetResult(null) }}
                                    className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-md"
                                >
                                    Done
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-gray-500 mt-2">
                                    A new random password will be generated for <strong>{resetTarget.name}</strong>.
                                </p>
                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => setResetTarget(null)}
                                        className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleResetPassword}
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md disabled:opacity-50"
                                    >
                                        {saving ? 'Resetting…' : 'Reset'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    )
}