import React from 'react'

export default function ContentPipeline() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-black text-gray-900">Content Pipeline</h3>
        <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2.5 py-1 rounded-full">Coming Soon</span>
      </div>

      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#9333EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <h3 className="font-black text-gray-900 text-lg">No Pipeline Content Yet</h3>
        <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
          The content pipeline is being prepared. Soon you will be able to manage and track the ingestion, translation, review, and publication steps here.
        </p>
      </div>
    </div>
  )
}
