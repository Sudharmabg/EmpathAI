import React, { useState, useEffect } from 'react'
import { getPublishedChapters, archiveChapter, getChapterCoverage } from '../../../api/curriculumAiApi'
import ChapterManager from './ChapterManager'

const GRADES = ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12']
const SUBJECTS = ['Mathematics','Science','English','Hindi','Social Studies','Art & Craft']
const ALL_TASKS = ['SUMMARY','FLASHCARDS','MNEMONIC','MOCK_TEST']

function CoverageBadge({ chapterId }) {
  const [coverage, setCoverage] = useState(null)

  useEffect(() => {
    getChapterCoverage(chapterId)
      .then(data => setCoverage(data))
      .catch(() => setCoverage([]))
  }, [chapterId])

  if (coverage === null) return <span className="text-xs text-gray-400">Loading...</span>

  const approved = coverage.filter(c => c.approvalStatus === 'APPROVED').length
  const total = ALL_TASKS.length

  let cls = 'bg-red-100 text-red-700'
  if (approved === total) cls = 'bg-green-100 text-green-700'
  else if (approved > 0) cls = 'bg-amber-100 text-amber-700'

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>
      {approved === total ? '✓' : approved > 0 ? '⏳' : '✗'} {approved}/{total} tools
    </span>
  )
}

export default function PublishedChapters() {
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [managingChapter, setManagingChapter] = useState(null)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [archiveConfirm, setArchiveConfirm] = useState(null) // chapterId

  useEffect(() => { loadChapters() }, [])

  const loadChapters = async () => {
    try {
      const data = await getPublishedChapters()
      setChapters(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleArchive = async (id) => {
    try {
      await archiveChapter(id)
      setArchiveConfirm(null)
      loadChapters()
    } catch (e) { alert('Failed to archive chapter') }
  }

  const filtered = chapters.filter(ch => {
    const matchSearch = !search || ch.title.toLowerCase().includes(search.toLowerCase())
    const matchGrade = !gradeFilter || ch.grade === gradeFilter
    const matchSubject = !subjectFilter || ch.subject === subjectFilter
    return matchSearch && matchGrade && matchSubject
  })

  if (managingChapter) {
    return <ChapterManager chapter={managingChapter} onBack={() => { setManagingChapter(null); loadChapters() }} />
  }

  if (loading) return <div className="text-center py-12 text-gray-500 font-medium animate-pulse">Loading chapters...</div>

  return (
    <div className="space-y-5">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="Search chapters..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:border-[#9333EA] focus:ring-2 focus:ring-purple-100 outline-none"
          />
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:border-[#9333EA] outline-none bg-white">
          <option value="">All Grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:border-[#9333EA] outline-none bg-white">
          <option value="">All Subjects</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <span className="text-4xl mb-4 block">📚</span>
          <h3 className="text-lg font-bold text-gray-900">{chapters.length === 0 ? 'No published chapters' : 'No results'}</h3>
          <p className="text-gray-500 mt-1">{chapters.length === 0 ? 'Upload a new chapter to get started.' : 'Try adjusting your search or filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((chapter) => (
            <div key={chapter.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col h-full relative">
              {/* Archive inline confirm */}
              {archiveConfirm === chapter.id && (
                <div className="absolute inset-0 bg-white rounded-2xl z-10 p-6 flex flex-col justify-center items-center text-center border-2 border-red-200">
                  <p className="text-sm font-bold text-gray-800 mb-4">Archive this chapter? Students will lose access.</p>
                  <div className="flex gap-3">
                    <button onClick={() => handleArchive(chapter.id)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700">Confirm</button>
                    <button onClick={() => setArchiveConfirm(null)} className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2.5 py-1 bg-purple-50 text-[#9333EA] text-xs font-bold rounded-md mb-2 uppercase tracking-wide">
                    {chapter.board} • {chapter.grade} • {chapter.subject}
                  </span>
                  {chapter.chapterNumber && (
                    <p className="text-xs text-gray-400 font-bold mb-0.5">Chapter {chapter.chapterNumber}</p>
                  )}
                  <h3 className="text-base font-black text-gray-900 leading-tight truncate">{chapter.title}</h3>
                </div>
                <button
                  onClick={() => setArchiveConfirm(chapter.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 ml-2 flex-shrink-0"
                  title="Archive Chapter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <CoverageBadge chapterId={chapter.id} />
                <span className="text-xs text-gray-400">
                  {chapter.publishedAt ? new Date(chapter.publishedAt).toLocaleDateString('en-IN') : ''}
                </span>
              </div>

              {chapter.createdBy && (
                <p className="text-xs text-gray-400 mb-4">By {chapter.publishedBy || chapter.createdBy}</p>
              )}

              <button
                onClick={() => setManagingChapter(chapter)}
                className="mt-auto w-full py-2.5 bg-[#9333EA] hover:bg-[#7e22ce] text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Manage Knowledge Base
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
