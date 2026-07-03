import React, { useState, useEffect } from 'react'
import { getArchivedChapters, restoreChapter } from '../../../api/curriculumAiApi'

export default function ArchivedChapters() {
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [restoreConfirm, setRestoreConfirm] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { loadArchived() }, [])

  const loadArchived = async () => {
    try {
      const data = await getArchivedChapters()
      setChapters(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleRestore = async (id) => {
    try {
      await restoreChapter(id)
      setRestoreConfirm(null)
      setToast({ message: 'Chapter restored to Published', type: 'success' })
      setTimeout(() => setToast(null), 3000)
      loadArchived()
    } catch (e) {
      setToast({ message: 'Failed to restore chapter', type: 'error' })
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500 animate-pulse">Loading archived chapters...</div>

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg font-bold text-sm ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <h3 className="text-lg font-black text-gray-900">Archived Chapters</h3>
        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">{chapters.length}</span>
      </div>

      {chapters.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl block mb-3">🗄️</span>
          <h3 className="font-black text-gray-900">No Archived Chapters</h3>
          <p className="text-gray-500 mt-1 text-sm">Archived chapters will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {chapters.map(chapter => (
            <div key={chapter.id} className="bg-white rounded-2xl border border-gray-200 p-5 opacity-80 hover:opacity-100 transition-opacity relative overflow-hidden">
              {/* Restore inline confirm overlay */}
              {restoreConfirm === chapter.id && (
                <div className="absolute inset-0 bg-white/95 rounded-2xl z-10 flex flex-col items-center justify-center text-center px-5 border-2 border-purple-200">
                  <p className="text-sm font-bold text-gray-800 mb-4">Restore this chapter for students?</p>
                  <div className="flex gap-3">
                    <button onClick={() => handleRestore(chapter.id)}
                      className="px-4 py-2 bg-[#9333EA] text-white font-bold rounded-lg text-sm hover:bg-[#7e22ce]">
                      Restore
                    </button>
                    <button onClick={() => setRestoreConfirm(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Archived badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-md uppercase tracking-wide">
                  Archived
                </span>
                <span className="text-xs text-gray-400">
                  {chapter.board}
                </span>
              </div>

              {/* Chapter identity */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 font-semibold">{chapter.grade}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500 font-semibold">{chapter.subject}</span>
                  {chapter.chapterNumber && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500 font-semibold">Ch. {chapter.chapterNumber}</span>
                    </>
                  )}
                </div>
                <h3 className="text-base font-black text-gray-700 leading-tight">{chapter.title}</h3>
              </div>

              {/* Archive info */}
              {chapter.archivedBy && (
                <p className="text-xs text-gray-400 mb-4">
                  Archived by <span className="font-semibold">{chapter.archivedBy}</span>
                  {chapter.archivedAt && (
                    <> on {new Date(chapter.archivedAt).toLocaleDateString('en-IN')}</>
                  )}
                </p>
              )}

              {/* Restore Button */}
              <button
                onClick={() => setRestoreConfirm(chapter.id)}
                className="w-full py-2.5 border-2 border-dashed border-[#9333EA]/30 text-[#9333EA] font-bold rounded-xl hover:bg-[#9333EA]/5 transition-colors text-sm"
              >
                ↑ Restore Chapter
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
