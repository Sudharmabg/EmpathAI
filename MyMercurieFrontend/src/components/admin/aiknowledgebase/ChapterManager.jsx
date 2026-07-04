import React from 'react'
import ToolContentManager from './ToolContentManager'

export default function ChapterManager({ chapter, onBack }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 p-6 pb-4 flex flex-col gap-1">
        {/* Back + Header */}
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2 mb-3 transition-colors w-fit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Published Chapters
        </button>

        {/* Chapter identity */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md uppercase tracking-wide">
                {chapter.board}
              </span>
              <span className="text-xs text-gray-500 font-semibold">{chapter.grade}</span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500 font-semibold">{chapter.subject}</span>
              {chapter.chapterNumber && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500 font-semibold">Chapter {chapter.chapterNumber}</span>
                </>
              )}
            </div>
            <h2 className="text-xl font-black text-gray-900">{chapter.title}</h2>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50/50 min-h-[500px]">
        <ToolContentManager chapter={chapter} />
      </div>
    </div>
  )
}

