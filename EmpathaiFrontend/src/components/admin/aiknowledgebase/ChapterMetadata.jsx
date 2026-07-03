import React, { useState, useEffect } from 'react'
import { updateChapterMetadata } from '../../../api/curriculumAiApi'

const BLOOMS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

export default function ChapterMetadata({ chapter }) {
  const [meta, setMeta] = useState({
    difficultyLevel: chapter.difficultyLevel || 'Medium',
    estimatedReadingTime: chapter.estimatedReadingTime || 0,
    topics: chapter.topics || [],
    learningObjectives: chapter.learningObjectives || [],
    bloomsLevels: chapter.bloomsLevels || [],
    prerequisites: chapter.prerequisites || [],
    keywords: chapter.keywords || [],
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateChapterMetadata(chapter.id, meta)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('Failed to save metadata')
    } finally {
      setSaving(false)
    }
  }

  const addTag = (field, value) => {
    const trimmed = value?.trim()
    if (!trimmed || meta[field].includes(trimmed)) return
    setMeta({ ...meta, [field]: [...meta[field], trimmed] })
  }

  const removeTag = (field, value) => {
    setMeta({ ...meta, [field]: meta[field].filter(t => t !== value) })
  }

  const toggleBloom = (level) => {
    const updated = meta.bloomsLevels.includes(level)
      ? meta.bloomsLevels.filter(b => b !== level)
      : [...meta.bloomsLevels, level]
    setMeta({ ...meta, bloomsLevels: updated })
  }

  const TagInput = ({ field, color = 'purple' }) => {
    const colors = {
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      blue:   'bg-blue-50 border-blue-200 text-blue-700',
      gray:   'bg-gray-100 border-gray-200 text-gray-700',
    }
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {(meta[field] || []).map(t => (
            <span key={t} className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-xs font-bold rounded-full ${colors[color]}`}>
              {t}
              <button type="button" onClick={() => removeTag(field, t)} className="opacity-60 hover:opacity-100">×</button>
            </span>
          ))}
        </div>
        <input type="text" placeholder="Add and press Enter"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(field, e.target.value); e.target.value = '' }}}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Core */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h4 className="text-sm font-black text-gray-700 uppercase tracking-wide">Core Settings</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Difficulty</label>
            <select value={meta.difficultyLevel} onChange={e => setMeta({...meta, difficultyLevel: e.target.value})}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#9333EA] outline-none">
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Reading Time (mins)</label>
            <input type="number" value={meta.estimatedReadingTime}
              onChange={e => setMeta({...meta, estimatedReadingTime: parseInt(e.target.value)||0})}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Topics</label>
          <TagInput field="topics" color="purple" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Learning Objectives</label>
          <div className="space-y-1.5">
            {meta.learningObjectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-purple-400 mt-1 text-xs">•</span>
                <input type="text" value={obj}
                  onChange={e => { const arr = [...meta.learningObjectives]; arr[i] = e.target.value; setMeta({...meta, learningObjectives: arr}) }}
                  className="flex-1 text-sm text-gray-700 bg-transparent border-b border-gray-200 focus:border-[#9333EA] outline-none py-0.5" />
                <button onClick={() => removeTag('learningObjectives', obj)} className="text-red-400 hover:text-red-600 text-xs mt-0.5">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h4 className="text-sm font-black text-gray-700 uppercase tracking-wide">Advanced Metadata</h4>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">Bloom's Taxonomy Levels</label>
          <div className="flex flex-wrap gap-2">
            {BLOOMS.map(level => (
              <button key={level} type="button" onClick={() => toggleBloom(level)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  meta.bloomsLevels.includes(level) ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-600 hover:border-purple-400'
                }`}>{level}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Prerequisites</label>
          <TagInput field="prerequisites" color="blue" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Keywords</label>
          <TagInput field="keywords" color="gray" />
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className={`w-full py-3 font-black rounded-xl transition-colors ${
          saved ? 'bg-green-500 text-white' : 'bg-[#9333EA] hover:bg-[#7e22ce] text-white'
        }`}>
        {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
