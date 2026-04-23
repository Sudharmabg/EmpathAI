import { useState, useEffect } from 'react'
import {
  ClockIcon,
  PlusIcon,
  TrashIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline'
import {
  getSchoolTimings,
  saveSchoolTimings,
  getExamDates,
  addExamDate,
  deleteExamDate,
} from '../../api/scheduleApi'
import { apiGet } from '../../api/apiClient'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SUBJECTS = ['Mathematics', 'Science', 'SST', 'English', 'Hindi', 'Art & Craft', 'Physical Education', 'Computer Science', 'Other']
const CLASS_OPTIONS = [
  '1st Standard', '2nd Standard', '3rd Standard', '4th Standard', '5th Standard', '6th Standard',
  '7th Standard', '8th Standard', '9th Standard', '10th Standard', '11th Standard', '12th Standard',
]

// ── Inline message banner ─────────────────────────────────────────────────────
const InlineMsg = ({ msg }) => {
  if (!msg || !msg.text) return null
  const isSuccess = msg.type === 'success'
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
      isSuccess ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
    }`}>
      <span className="text-base">{isSuccess ? '✓' : '⚠'}</span>
      {msg.text}
    </div>
  )
}

// ── School Sub-Tab Bar ────────────────────────────────────────────────────────
const SchoolTabs = ({ schools, activeId, onSelect }) => {
  if (!schools.length) return null
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4">
      {schools.map(s => {
        const isActive = String(s.id) === String(activeId)
        return (
          <button
            key={s.id}
            onClick={() => onSelect(String(s.id))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              isActive
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
            }`}
          >
            <BuildingLibraryIcon className="w-4 h-4" />
            {s.name}
          </button>
        )
      })}
    </div>
  )
}

// ── Class Sub-Tab Bar ─────────────────────────────────────────────────────────
const ClassTabs = ({ activeClass, onSelect }) => (
  <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-4">
    {CLASS_OPTIONS.map(cls => {
      const isActive = cls === activeClass
      return (
        <button
          key={cls}
          onClick={() => onSelect(cls)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            isActive
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-600'
          }`}
        >
          {cls}
        </button>
      )
    })}
  </div>
)

// ══════════════════════════════════════════════════════════════════════════════
// School Timings Panel — per school, with class sub-tabs, save on Add Row
// ══════════════════════════════════════════════════════════════════════════════
function SchoolTimingsPanel({ schoolId, schoolName }) {
  const [allTimings, setAllTimings] = useState([])
  const [activeClass, setActiveClass] = useState(CLASS_OPTIONS[0])
  const [timingForm, setTimingForm] = useState({ dayOfWeek: 'Monday', startTime: '08:00', endTime: '14:00' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formMsg, setFormMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    getSchoolTimings(schoolId)
      .then(data => setAllTimings(data || []))
      .catch(() => setAllTimings([]))
      .finally(() => setLoading(false))
  }, [schoolId])

  const classTimings = allTimings.filter(t => t.className === activeClass)

  const addRow = async () => {
    if (!timingForm.startTime || !timingForm.endTime) {
      setFormMsg({ type: 'error', text: 'Please fill in Start Time and End Time.' })
      return
    }
    if (timingForm.startTime >= timingForm.endTime) {
      setFormMsg({ type: 'error', text: 'End time must be after start time.' })
      return
    }

    const newEntry = {
      id: Date.now(),
      schoolId,
      className: activeClass,
      dayOfWeek: timingForm.dayOfWeek,
      startTime: timingForm.startTime,
      endTime: timingForm.endTime,
    }

    const updated = [...allTimings, newEntry]
    setSaving(true)
    setFormMsg({ type: '', text: '' })

    try {
      await saveSchoolTimings(schoolId, updated.map(t => ({
        schoolId: Number(schoolId),
        className: t.className,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime,
      })))
      setAllTimings(updated)
      setTimingForm({ dayOfWeek: 'Monday', startTime: '08:00', endTime: '14:00' })
      setFormMsg({ type: 'success', text: 'Time block saved.' })
      setTimeout(() => setFormMsg({ type: '', text: '' }), 2500)
    } catch {
      setFormMsg({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const removeRow = async (id) => {
    const updated = allTimings.filter(t => t.id !== id)
    try {
      await saveSchoolTimings(schoolId, updated.map(t => ({
        schoolId: Number(schoolId),
        className: t.className,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime,
      })))
      setAllTimings(updated)
    } catch {
      setFormMsg({ type: 'error', text: 'Failed to delete. Please try again.' })
    }
  }

  const dropdownClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none bg-white"

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Class sub-tabs */}
      <ClassTabs activeClass={activeClass} onSelect={cls => { setActiveClass(cls); setFormMsg({ type: '', text: '' }) }} />

      {/* Add Row Form */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p className="text-sm font-bold text-gray-700 mb-1">
          Add Time Block —{' '}
          <span className="text-purple-600">{activeClass}</span>
        </p>
        <p className="text-xs text-gray-400 mb-3">Saved immediately when you click Add Row</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Day</label>
            <select
              value={timingForm.dayOfWeek}
              onChange={e => { setTimingForm(p => ({ ...p, dayOfWeek: e.target.value })); setFormMsg({ type: '', text: '' }) }}
              className={dropdownClass}
            >
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label>
            <input
              type="time"
              value={timingForm.startTime}
              onChange={e => { setTimingForm(p => ({ ...p, startTime: e.target.value })); setFormMsg({ type: '', text: '' }) }}
              className={dropdownClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">End Time</label>
            <input
              type="time"
              value={timingForm.endTime}
              onChange={e => { setTimingForm(p => ({ ...p, endTime: e.target.value })); setFormMsg({ type: '', text: '' }) }}
              className={dropdownClass}
            />
          </div>
        </div>
        {formMsg.text && <div className="mt-3"><InlineMsg msg={formMsg} /></div>}
        <button
          onClick={addRow}
          disabled={saving}
          className="mt-3 flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          {saving ? 'Saving...' : 'Add Row'}
        </button>
      </div>

      {/* Table for active class */}
      {classTimings.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No timings for <strong>{activeClass}</strong> yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-gray-600">School</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Class</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Day</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Start Time</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">End Time</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Duration</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classTimings.map((t, i) => {
                const [sh, sm] = t.startTime.split(':').map(Number)
                const [eh, em] = t.endTime.split(':').map(Number)
                const mins = (eh * 60 + em) - (sh * 60 + sm)
                const duration = mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '—'
                return (
                  <tr key={t.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">{schoolName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-100">
                        {t.className}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.dayOfWeek}</td>
                    <td className="px-4 py-3 text-gray-600">{t.startTime}</td>
                    <td className="px-4 py-3 text-gray-600">{t.endTime}</td>
                    <td className="px-4 py-3 text-gray-500">{duration}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeRow(t.id || i)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                        <TrashIcon className="w-4 h-4" />
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

// ══════════════════════════════════════════════════════════════════════════════
// Exam Dates Panel — per school, with class sub-tabs
// ══════════════════════════════════════════════════════════════════════════════
function ExamDatesPanel({ schoolId, schoolName }) {
  const [allExams, setAllExams] = useState([])
  const [activeClass, setActiveClass] = useState(CLASS_OPTIONS[0])
  const [examForm, setExamForm] = useState({ subjectName: 'Mathematics', examDate: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formMsg, setFormMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    getExamDates(schoolId)
      .then(data => setAllExams(data || []))
      .catch(() => setAllExams([]))
      .finally(() => setLoading(false))
  }, [schoolId])

  const classExams = allExams.filter(e => e.className === activeClass)

  const addExam = async () => {
    const missing = []
    if (!examForm.subjectName) missing.push('Subject')
    if (!examForm.examDate) missing.push('Exam Date')
    if (missing.length > 0) {
      setFormMsg({ type: 'error', text: `Please fill in: ${missing.join(', ')}.` })
      return
    }
    setSaving(true)
    setFormMsg({ type: '', text: '' })
    try {
      const saved = await addExamDate(Number(schoolId), activeClass, examForm.subjectName, examForm.examDate)
      setAllExams(prev => [...prev, { ...saved, schoolId }])
      setExamForm({ subjectName: 'Mathematics', examDate: '' })
      setFormMsg({ type: 'success', text: 'Exam date added successfully.' })
      setTimeout(() => setFormMsg({ type: '', text: '' }), 2500)
    } catch {
      setFormMsg({ type: 'error', text: 'Failed to add exam. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const deleteExam = async (examId) => {
    try {
      await deleteExamDate(examId)
      setAllExams(prev => prev.filter(e => e.id !== examId))
    } catch {
      setFormMsg({ type: 'error', text: 'Failed to delete exam.' })
    }
  }

  const urgencyColor = (urgency) => {
    if (urgency === 'URGENT') return 'bg-red-100 text-red-700 border-red-200'
    if (urgency === 'UPCOMING') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  const dropdownClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none bg-white"

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Class sub-tabs */}
      <ClassTabs activeClass={activeClass} onSelect={cls => { setActiveClass(cls); setFormMsg({ type: '', text: '' }) }} />

      {/* Add Exam Form */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p className="text-sm font-bold text-gray-700 mb-1">
          Add Exam —{' '}
          <span className="text-purple-600">{activeClass}</span>
        </p>
        <p className="text-xs text-gray-400 mb-3">Exam will be added to the selected class</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Subject</label>
            <select
              value={examForm.subjectName}
              onChange={e => { setExamForm(p => ({ ...p, subjectName: e.target.value })); setFormMsg({ type: '', text: '' }) }}
              className={dropdownClass}
            >
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Exam Date</label>
            <input
              type="date"
              value={examForm.examDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setExamForm(p => ({ ...p, examDate: e.target.value })); setFormMsg({ type: '', text: '' }) }}
              className={dropdownClass}
            />
          </div>
        </div>
        {formMsg.text && <div className="mt-3"><InlineMsg msg={formMsg} /></div>}
        <button
          onClick={addExam}
          disabled={saving}
          className="mt-3 flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          {saving ? 'Adding...' : 'Add Exam'}
        </button>
      </div>

      {/* Table for active class */}
      {classExams.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <AcademicCapIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No exams for <strong>{activeClass}</strong> yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Subject</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">School</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Class</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Exam Date</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Days Left</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classExams.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{e.subjectName}</td>
                  <td className="px-4 py-3 text-gray-700">{schoolName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-100">
                      {e.className}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(e.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">{e.daysRemaining} days</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${urgencyColor(e.urgency)}`}>
                      {e.urgency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteExam(e.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════
export default function SchedulePlanner({ user }) {
  const [activeSection, setActiveSection] = useState('school-timings')
  const [schools, setSchools] = useState([])
  const [activeTimingSchoolId, setActiveTimingSchoolId] = useState('')
  const [activeExamSchoolId, setActiveExamSchoolId] = useState('')

  const role = user?.role
  const isSchoolAdmin = role === 'SCHOOL_ADMIN'
  const fixedSchoolId = user?.schoolId || user?.school_id
  const fixedSchoolName = user?.schoolName || 'Your School'

  useEffect(() => {
    if (isSchoolAdmin) {
      if (fixedSchoolId) {
        const fakeSchool = [{ id: fixedSchoolId, name: fixedSchoolName }]
        setSchools(fakeSchool)
        setActiveTimingSchoolId(String(fixedSchoolId))
        setActiveExamSchoolId(String(fixedSchoolId))
      }
      return
    }
    apiGet('/api/schools')
      .then(res => {
        const list = res.data || res || []
        setSchools(list)
        if (list.length > 0) {
          setActiveTimingSchoolId(String(list[0].id))
          setActiveExamSchoolId(String(list[0].id))
        }
      })
      .catch(() => setSchools([]))
  }, [isSchoolAdmin, fixedSchoolId, fixedSchoolName])

  const activeTimingSchool = schools.find(s => String(s.id) === activeTimingSchoolId)
  const activeExamSchool = schools.find(s => String(s.id) === activeExamSchoolId)

  return (
    <div className="space-y-6">

      {/* Section Toggle */}
      <div className="flex gap-3 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveSection('school-timings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeSection === 'school-timings' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClockIcon className="w-4 h-4" /> School Timings
        </button>
        <button
          onClick={() => setActiveSection('exam-dates')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeSection === 'exam-dates' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <AcademicCapIcon className="w-4 h-4" /> Exam Dates
        </button>
      </div>

      {/* ── SCHOOL TIMINGS ────────────────────────────────────────────────── */}
      {activeSection === 'school-timings' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">School Timings</h3>
                <p className="text-sm text-gray-500">Set blocked hours per class — students cannot schedule tasks during these times</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {schools.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BuildingLibraryIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No schools found.</p>
              </div>
            ) : (
              <>
                <SchoolTabs schools={schools} activeId={activeTimingSchoolId} onSelect={setActiveTimingSchoolId} />
                {activeTimingSchool && (
                  <SchoolTimingsPanel
                    key={activeTimingSchoolId}
                    schoolId={activeTimingSchoolId}
                    schoolName={activeTimingSchool.name}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EXAM DATES ────────────────────────────────────────────────────── */}
      {activeSection === 'exam-dates' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                <AcademicCapIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Exam Dates</h3>
                <p className="text-sm text-gray-500">Add upcoming exams per class — the schedule will suggest related tasks to students</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {schools.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BuildingLibraryIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No schools found.</p>
              </div>
            ) : (
              <>
                <SchoolTabs schools={schools} activeId={activeExamSchoolId} onSelect={setActiveExamSchoolId} />
                {activeExamSchool && (
                  <ExamDatesPanel
                    key={activeExamSchoolId}
                    schoolId={activeExamSchoolId}
                    schoolName={activeExamSchool.name}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}