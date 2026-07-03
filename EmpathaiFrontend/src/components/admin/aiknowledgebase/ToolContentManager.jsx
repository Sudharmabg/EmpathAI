import React, { useState, useEffect, useRef } from 'react'
import {
  getChapterAiContent, generateToolContent, deleteAiContent,
  approveAiContent, regenerateContent, editAiContent, getChapterTopics, uploadChapterImage
} from '../../../api/curriculumAiApi'
import Summary from '../../studentdashboard/tools/Summary'
import Flashcards from '../../studentdashboard/tools/Flashcards'
import Mnemonic from '../../studentdashboard/tools/Mnemonic'
import MockTest from '../../studentdashboard/tools/MockTest'

const AI_TASKS = [
  { key: 'SUMMARY',    label: 'Ready Reckoner', icon: '📋', desc: 'Crisp chapter revision sheet' },
  { key: 'FLASHCARDS', label: 'Flashcards',      icon: '🃏', desc: 'Concept flashcard deck' },
  { key: 'MNEMONIC',   label: 'Mnemonic',        icon: '🧠', desc: 'Memory aid techniques' },
  { key: 'MOCK_TEST',  label: 'Mock Test',        icon: '📝', desc: 'MCQ + HOTS assessment' },
  { key: 'ANALOGY',    label: 'Analogy Storyteller', icon: '📖', desc: 'Creative analogies & stories' },
]

const STATUS_STYLE = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING:  'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg font-bold text-sm flex items-center gap-2 animate-slide-up ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? '✓' : '✗'} {message}
    </div>
  )
}

// ── Inline Image Uploader ──────────────────────────────────────────────────────
function InlineImageUploader({ imageUrl, onUpload }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const res = await uploadChapterImage("Manual Inline Upload", file)
      onUpload(res.imageUrl)
    } catch (err) {
      alert("Failed to upload image: " + err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {imageUrl && (
        <div className="relative group">
          <img src={imageUrl} alt="Attached" className="h-10 w-10 object-cover rounded border border-gray-200" />
          <button onClick={() => onUpload(null)} title="Remove Image"
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
            ×
          </button>
        </div>
      )}
      <div>
        <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="text-[10px] font-bold px-3 py-1 bg-[#9333EA] hover:bg-[#7e22ce] text-white rounded transition-colors disabled:opacity-50">
          {uploading ? 'Uploading...' : (imageUrl ? 'Change Image' : '+ Add Image')}
        </button>
      </div>
    </div>
  )
}

// ── Analogy Preview ────────────────────────────────────────────────────────────
function AnalogyPreview({ stories }) {
  const [selectedTabs, setSelectedTabs] = useState({})

  if (!stories || stories.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
        No analogies generated for this topic yet.
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {stories.map((item, idx) => {
        const activeTab = selectedTabs[idx] || 'analogy'
        const setTab = (tab) => setSelectedTabs(prev => ({ ...prev, [idx]: tab }))

        return (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs font-black text-purple-600 uppercase tracking-widest">{item.concept}</span>
              <div className="flex bg-gray-200/60 p-0.5 rounded-lg text-[10px] font-bold">
                <button type="button" onClick={() => setTab('analogy')} className={`px-2.5 py-1 rounded-md transition-all ${activeTab === 'analogy' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>💡 Analogy</button>
                <button type="button" onClick={() => setTab('story')} className={`px-2.5 py-1 rounded-md transition-all ${activeTab === 'story' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>📖 Story</button>
              </div>
            </div>

            <div className="p-5">
              {activeTab === 'analogy' ? (
                <div className="space-y-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Analogy Comparison</p>
                    <h4 className="text-sm font-black text-gray-800">{item.analogy?.title} ({item.analogy?.base})</h4>
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed bg-purple-50/30 border border-purple-100/30 rounded-xl p-3.5">{item.analogy?.description}</p>
                  {item.analogy?.imageUrl && (
                    <div className="flex justify-center mt-2">
                      <img src={item.analogy.imageUrl} alt="Analogy illustration" className="max-h-40 object-contain rounded border border-gray-200" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-gray-800">{item.story?.title}</h4>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed italic border-l-4 border-purple-300 pl-3 py-1 bg-gray-50/50 rounded-r-lg pr-2">{item.story?.narrative}</p>
                  <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-3 text-[11px] font-medium text-gray-700">
                    <span className="font-bold text-yellow-800 block uppercase tracking-wider text-[9px] mb-0.5">Moral of the Story:</span>
                    {item.story?.moral}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Student Preview Drawer ─────────────────────────────────────────────────────
function PreviewDrawer({ item, onClose }) {
  let parsed = {}
  try { parsed = JSON.parse(item.content) } catch {}
  const task = item.taskType

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-gray-50 h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Student Preview</p>
            <h3 className="font-black text-gray-900">{AI_TASKS.find(t => t.key === task)?.label || task}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 flex-1">
          {task === 'SUMMARY'    && <Summary    {...parsed} />}
          {task === 'FLASHCARDS' && <Flashcards flashcards={parsed.flashcards || []} />}
          {task === 'MNEMONIC'   && <Mnemonic   mnemonics={parsed.mnemonics || []} />}
          {task === 'MOCK_TEST'  && <MockTest   chapterLevel={parsed.chapterLevel} topicLevel={parsed.topicLevel} />}
          {task === 'ANALOGY'    && <AnalogyPreview stories={parsed.stories || []} />}
        </div>
      </div>
    </div>
  )
}

// ── Structured Editors ─────────────────────────────────────────────────────────
function SummaryEditor({ parsed, onChange }) {
  const d = parsed
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1">Short Summary</label>
        <textarea rows={2} value={d.shortSummary || ''} onChange={e => onChange({...d, shortSummary: e.target.value})}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1">Key Points</label>
        {(d.keyPoints || []).map((pt, i) => {
          const text = typeof pt === 'object' ? pt.point : pt;
          const imgUrl = typeof pt === 'object' ? pt.imageUrl : null;
          return (
            <div key={i} className="mb-3 p-3 bg-purple-50/20 border border-purple-100/50 rounded-xl space-y-2">
              <div className="flex gap-2">
                <span className="text-purple-400 mt-2 text-xs font-bold">{i+1}.</span>
                <input type="text" value={text || ''} 
                  onChange={e => {
                    const arr = [...d.keyPoints]
                    arr[i] = typeof pt === 'object' ? { ...pt, point: e.target.value } : { point: e.target.value, imageUrl: null }
                    onChange({ ...d, keyPoints: arr })
                  }}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none bg-white" />
                <button onClick={() => onChange({...d, keyPoints: d.keyPoints.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600 text-sm">×</button>
              </div>
              <div className="pl-6">
                <InlineImageUploader imageUrl={imgUrl} onUpload={url => {
                  const arr = [...d.keyPoints]
                  arr[i] = typeof pt === 'object' ? { ...pt, imageUrl: url } : { point: pt, imageUrl: url }
                  onChange({ ...d, keyPoints: arr })
                }} />
              </div>
            </div>
          )
        })}
        <button onClick={() => onChange({...d, keyPoints: [...(d.keyPoints||[]), { point: '', imageUrl: null }]})}
          className="text-xs text-purple-600 font-bold mt-1">+ Add Point</button>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1">Formulas</label>
        {(d.formulas || []).map((f, i) => (
          <div key={i} className="p-3 bg-purple-50/20 border border-purple-100/50 rounded-xl space-y-2 mb-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <input placeholder="Name" value={f.name||''} onChange={e => { const arr=[...d.formulas]; arr[i]={...arr[i],name:e.target.value}; onChange({...d,formulas:arr}) }} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-[#9333EA] outline-none bg-white" />
              <input placeholder="LaTeX" value={f.formula||''} onChange={e => { const arr=[...d.formulas]; arr[i]={...arr[i],formula:e.target.value}; onChange({...d,formulas:arr}) }} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-mono focus:border-[#9333EA] outline-none bg-white" />
              <div className="flex gap-1">
                <input placeholder="Where..." value={f.where||''} onChange={e => { const arr=[...d.formulas]; arr[i]={...arr[i],where:e.target.value}; onChange({...d,formulas:arr}) }} className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-[#9333EA] outline-none bg-white" />
                <button onClick={() => onChange({...d,formulas:d.formulas.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600 text-xs">×</button>
              </div>
            </div>
            <InlineImageUploader imageUrl={f.imageUrl} onUpload={url => {
              const arr = [...d.formulas]
              arr[i] = { ...f, imageUrl: url }
              onChange({ ...d, formulas: arr })
            }} />
          </div>
        ))}
        <button onClick={() => onChange({...d, formulas: [...(d.formulas||[]), {name:'',formula:'',where:'',imageUrl:null}]})}
          className="text-xs text-purple-600 font-bold mt-1">+ Add Formula</button>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1">Definitions</label>
        {(d.definitions || []).map((df, i) => (
          <div key={i} className="p-3 bg-purple-50/20 border border-purple-100/50 rounded-xl space-y-2 mb-3">
            <div className="flex gap-2">
              <input placeholder="Term" value={df.term||''} onChange={e => { const arr=[...d.definitions]; arr[i]={...arr[i],term:e.target.value}; onChange({...d,definitions:arr}) }} className="w-1/3 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-[#9333EA] outline-none bg-white" />
              <input placeholder="Meaning" value={df.meaning||''} onChange={e => { const arr=[...d.definitions]; arr[i]={...arr[i],meaning:e.target.value}; onChange({...d,definitions:arr}) }} className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-[#9333EA] outline-none bg-white" />
              <button onClick={() => onChange({...d,definitions:d.definitions.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600 text-xs">×</button>
            </div>
            <InlineImageUploader imageUrl={df.imageUrl} onUpload={url => {
              const arr = [...d.definitions]
              arr[i] = { ...df, imageUrl: url }
              onChange({ ...d, definitions: arr })
            }} />
          </div>
        ))}
        <button onClick={() => onChange({...d, definitions: [...(d.definitions||[]), {term:'',meaning:'',imageUrl:null}]})}
          className="text-xs text-purple-600 font-bold mt-1">+ Add Definition</button>
      </div>
    </div>
  )
}

function FlashcardsEditor({ parsed, onChange }) {
  const cards = parsed.flashcards || []
  return (
    <div className="space-y-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-gray-500">Card {i+1}</span>
            <button onClick={() => onChange({...parsed, flashcards: cards.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600 text-xs font-bold">Remove</button>
          </div>
          {['front','back','hint','example','memoryTip'].map(field => (
            <div key={field}>
              <label className="block text-xs font-semibold text-gray-500 mb-0.5 capitalize">{field}</label>
              <input type="text" value={card[field]||''} onChange={e => { const arr=[...cards]; arr[i]={...arr[i],[field]:e.target.value}; onChange({...parsed,flashcards:arr}) }}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#9333EA] outline-none" />
            </div>
          ))}
          <InlineImageUploader imageUrl={card.imageUrl} onUpload={url => {
            const arr = [...cards]
            arr[i] = { ...card, imageUrl: url }
            onChange({ ...parsed, flashcards: arr })
          }} />
        </div>
      ))}
      <button onClick={() => onChange({...parsed, flashcards: [...cards, {front:'',back:'',hint:'',example:'',memoryTip:''}]})}
        className="text-sm text-purple-600 font-bold">+ Add Card</button>
    </div>
  )
}

function MnemonicEditor({ parsed, onChange }) {
  const items = parsed.mnemonics || []
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-black text-gray-500">Mnemonic {i+1}</span>
            <button onClick={() => onChange({...parsed, mnemonics: items.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600 text-xs font-bold">Remove</button>
          </div>
          {['concept','mnemonic','expansion','explanation'].map(field => (
            <div key={field}>
              <label className="block text-xs font-semibold text-gray-500 mb-0.5 capitalize">{field}</label>
              <input type="text" value={item[field]||''} onChange={e => { const arr=[...items]; arr[i]={...arr[i],[field]:e.target.value}; onChange({...parsed,mnemonics:arr}) }}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#9333EA] outline-none" />
            </div>
          ))}
          <InlineImageUploader imageUrl={item.imageUrl} onUpload={url => {
            const arr = [...items]
            arr[i] = { ...item, imageUrl: url }
            onChange({ ...parsed, mnemonics: arr })
          }} />
        </div>
      ))}
      <button onClick={() => onChange({...parsed, mnemonics: [...items, {concept:'',mnemonic:'',expansion:'',explanation:''}]})}
        className="text-sm text-purple-600 font-bold">+ Add Mnemonic</button>
    </div>
  )
}

function MockTestEditor({ parsed, onChange }) {
  const updateMCQ = (level, i, field, value) => {
    const updated = {...parsed}
    updated[level] = {...updated[level]}
    updated[level].mcqs = [...(updated[level].mcqs||[])]
    updated[level].mcqs[i] = {...updated[level].mcqs[i], [field]: value}
    onChange(updated)
  }
  const updateHOTS = (level, i, field, value) => {
    const updated = {...parsed}
    updated[level] = {...updated[level]}
    updated[level].hots = [...(updated[level].hots||[])]
    updated[level].hots[i] = {...updated[level].hots[i], [field]: value}
    onChange(updated)
  }

  return (
    <div className="space-y-6">
      {['chapterLevel','topicLevel'].map(level => (
        <div key={level}>
          <h4 className="text-sm font-black text-gray-700 mb-3 capitalize">{level === 'chapterLevel' ? 'Chapter Level' : 'Topic Level'}</h4>
          <div className="space-y-3">
            {(parsed[level]?.mcqs||[]).map((q, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                <span className="text-xs font-black text-gray-400">MCQ {i+1}</span>
                <input type="text" placeholder="Question" value={q.question||''} onChange={e => updateMCQ(level, i, 'question', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#9333EA] outline-none" />
                {(q.options||['','','','']).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${level}-${i}`} checked={q.correctIndex===oi} onChange={() => updateMCQ(level, i, 'correctIndex', oi)} className="accent-purple-600" />
                    <input type="text" placeholder={`Option ${String.fromCharCode(65+oi)}`} value={opt} onChange={e => { const opts=[...(q.options||['','','',''])]; opts[oi]=e.target.value; updateMCQ(level,i,'options',opts) }}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1 text-sm focus:border-[#9333EA] outline-none" />
                  </div>
                ))}
                <input type="text" placeholder="Explanation" value={q.explanation||''} onChange={e => updateMCQ(level, i, 'explanation', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#9333EA] outline-none" />
                <InlineImageUploader imageUrl={q.imageUrl} onUpload={url => updateMCQ(level, i, 'imageUrl', url)} />
              </div>
            ))}
            {(parsed[level]?.hots||[]).map((q, i) => (
              <div key={i} className="bg-purple-50 rounded-xl p-4 border border-purple-100 space-y-2">
                <span className="text-xs font-black text-purple-400">HOTS {i+1}</span>
                <input type="text" placeholder="Question" value={q.question||''} onChange={e => updateHOTS(level, i, 'question', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#9333EA] outline-none" />
                <textarea rows={2} placeholder="Expected Answer" value={q.expectedAnswer||''} onChange={e => updateHOTS(level, i, 'expectedAnswer', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#9333EA] outline-none" />
                <InlineImageUploader imageUrl={q.imageUrl} onUpload={url => updateHOTS(level, i, 'imageUrl', url)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalogyEditor({ parsed, onChange }) {
  const stories = parsed.stories || []

  const updateItem = (i, field, value) => {
    const arr = [...stories]
    arr[i] = { ...arr[i], [field]: value }
    onChange({ ...parsed, stories: arr })
  }

  const updateNested = (i, section, field, value) => {
    const arr = [...stories]
    arr[i] = {
      ...arr[i],
      [section]: {
        ...(arr[i][section] || {}),
        [field]: value
      }
    }
    onChange({ ...parsed, stories: arr })
  }

  return (
    <div className="space-y-4">
      {stories.map((item, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-black text-[#9333EA] uppercase tracking-wider">Concept {i+1}</span>
            <button type="button" onClick={() => onChange({ ...parsed, stories: stories.filter((_,j)=>j!==i) })}
              className="text-red-400 hover:text-red-600 text-xs font-bold">Remove</button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-0.5 font-bold">Concept Name</label>
            <input type="text" value={item.concept || ''} onChange={e => updateItem(i, 'concept', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#9333EA] outline-none bg-white" />
          </div>

          {/* Analogy Details */}
          <div className="border-t border-gray-200 pt-2 space-y-2">
            <span className="text-xs font-bold text-gray-700 block">💡 Analogy Details</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Analogy Title</label>
                <input type="text" value={item.analogy?.title || ''} onChange={e => updateNested(i, 'analogy', 'title', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#9333EA] outline-none bg-white" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Base Comparison</label>
                <input type="text" value={item.analogy?.base || ''} onChange={e => updateNested(i, 'analogy', 'base', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#9333EA] outline-none bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Description Mapping</label>
              <textarea rows={2} value={item.analogy?.description || ''} onChange={e => updateNested(i, 'analogy', 'description', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1 text-xs focus:border-[#9333EA] outline-none bg-white" />
            </div>
            <InlineImageUploader imageUrl={item.analogy?.imageUrl} onUpload={url => updateNested(i, 'analogy', 'imageUrl', url)} />
          </div>

          {/* Story Details */}
          <div className="border-t border-gray-200 pt-2 space-y-2">
            <span className="text-xs font-bold text-gray-700 block">📖 Narrative Fable</span>
            <div>
              <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Story Title</label>
              <input type="text" value={item.story?.title || ''} onChange={e => updateNested(i, 'story', 'title', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#9333EA] outline-none bg-white" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Narrative Storybook Text</label>
              <textarea rows={3} value={item.story?.narrative || ''} onChange={e => updateNested(i, 'story', 'narrative', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1 text-xs focus:border-[#9333EA] outline-none bg-white" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Academic Takeaway (Moral)</label>
              <input type="text" value={item.story?.moral || ''} onChange={e => updateNested(i, 'story', 'moral', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-[#9333EA] outline-none bg-white" />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...parsed, stories: [...stories, { concept:'', analogy:{title:'',base:'',description:'',imageUrl:null}, story:{title:'',narrative:'',moral:''} }] })}
        className="text-sm text-[#9333EA] font-bold mt-2">+ Add Analogy Set</button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ToolContentManager({ chapter }) {
  const [content, setContent] = useState([])
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [previewItem, setPreviewItem] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [editParsed, setEditParsed] = useState(null)
  const [topicMode, setTopicMode] = useState('chapter') // 'chapter' | topicId
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadContent()
    loadTopics()
  }, [chapter.id])

  const loadContent = async () => {
    try {
      const data = await getChapterAiContent(chapter.id)
      setContent(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadTopics = async () => {
    // Merge AI-generated topics and manual subtopics from the chapter object
    const rawTopics = Array.from(new Set([
      ...(chapter.topics || []),
      ...(chapter.subtopics || [])
    ]))
    setTopics(rawTopics)
  }

  const showToast = (message, type = 'success') => setToast({ message, type })

  const handleGenerate = async (taskType) => {
    setGenerating(taskType)
    try {
      const selectedTopic = topicMode === 'chapter' ? null : topicMode
      await generateToolContent({ chapterId: chapter.id, taskType, topic: selectedTopic })
      await loadContent()
      showToast(`${AI_TASKS.find(t=>t.key===taskType)?.label} generated! Pending approval.`)
    } catch (e) { showToast('Generation failed', 'error') }
    finally { setGenerating(null) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAiContent(id)
      setDeleteConfirm(null)
      await loadContent()
      showToast('Content deleted')
    } catch (e) { showToast('Failed to delete', 'error') }
  }

  const handleApprove = async (id, status) => {
    try {
      await approveAiContent(id, { approvalStatus: status })
      await loadContent()
      showToast(status === 'APPROVED' ? 'Content approved ✓' : 'Content rejected')
    } catch (e) { showToast('Action failed', 'error') }
  }

  const handleRegenerate = async (id) => {
    try {
      await regenerateContent(id)
      await loadContent()
      showToast('Regenerating... content sent back to Pending')
    } catch (e) { showToast('Regeneration failed', 'error') }
  }

  const startEdit = (item) => {
    try { setEditParsed(JSON.parse(item.content)) } catch { setEditParsed({}) }
    setEditingItem(item)
  }

  const handleSaveEdit = async () => {
    try {
      await editAiContent(editingItem.id, { content: JSON.stringify(editParsed) })
      setEditingItem(null)
      await loadContent()
      showToast('Content saved — status reset to Pending')
    } catch (e) { showToast('Save failed', 'error') }
  }

  if (loading) return <div className="text-center py-8 text-gray-500 animate-pulse">Loading content...</div>

  // ── Edit Modal ─────────────────────────────────────────────────────────────
  if (editingItem) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">Edit: {AI_TASKS.find(t=>t.key===editingItem.taskType)?.label}</h3>
          <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-700 text-sm font-medium">Cancel</button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto pr-2">
          {editingItem.taskType === 'SUMMARY'    && <SummaryEditor    parsed={editParsed} onChange={setEditParsed} />}
          {editingItem.taskType === 'FLASHCARDS' && <FlashcardsEditor parsed={editParsed} onChange={setEditParsed} />}
          {editingItem.taskType === 'MNEMONIC'   && <MnemonicEditor   parsed={editParsed} onChange={setEditParsed} />}
          {editingItem.taskType === 'MOCK_TEST'  && <MockTestEditor   parsed={editParsed} onChange={setEditParsed} />}
          {editingItem.taskType === 'ANALOGY'    && <AnalogyEditor    parsed={editParsed} onChange={setEditParsed} />}
        </div>
        <button onClick={handleSaveEdit} className="w-full py-3 bg-[#9333EA] hover:bg-[#7e22ce] text-white font-black rounded-xl">
          Save Changes (Resets to Pending)
        </button>
      </div>
    )
  }

  const selectedTopicName = topicMode === 'chapter' ? null : topicMode
  const filteredContent = content.filter(item => {
    if (topicMode === 'chapter') {
      return !item.topic;
    } else {
      return item.topic === topicMode;
    }
  })
  const activeScopeName = topicMode === 'chapter' ? 'Chapter Level' : `Topic: ${topicMode}`

  const getScopeStatus = (topicName) => {
    const items = content.filter(item => {
      if (topicName === null) {
        return !item.topic;
      } else {
        return item.topic === topicName;
      }
    });
    const expectedTools = topicName === null 
      ? ['SUMMARY', 'FLASHCARDS', 'MNEMONIC', 'MOCK_TEST', 'ANALOGY']
      : ['FLASHCARDS', 'MNEMONIC', 'MOCK_TEST', 'ANALOGY'];
    const approvedCount = items.filter(item => 
      expectedTools.includes(item.taskType) && item.approvalStatus === 'APPROVED'
    ).length;
    return { isAllApproved: approvedCount === expectedTools.length };
  }

  const chapterStatus = getScopeStatus(null);
  const chapterBtnClass = chapterStatus.isAllApproved
    ? (topicMode === 'chapter' ? 'bg-green-600 border-green-600 text-white' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100')
    : (topicMode === 'chapter' ? 'bg-[#9333EA] text-white border-[#9333EA]' : 'border-gray-300 text-gray-600 hover:border-purple-400');

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {previewItem && <PreviewDrawer item={previewItem} onClose={() => setPreviewItem(null)} />}

      {/* Topic Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">Select Active Scope:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTopicMode('chapter')}
            className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${chapterBtnClass}`}>
            📖 Chapter Level {!chapterStatus.isAllApproved && '⏳'}
          </button>
          {topics.map(t => {
            const tStatus = getScopeStatus(t);
            const btnClass = tStatus.isAllApproved
              ? (topicMode === t ? 'bg-green-600 border-green-600 text-white' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100')
              : (topicMode === t ? 'bg-[#9333EA] text-white border-[#9333EA]' : 'border-gray-300 text-gray-600 hover:border-purple-400');
            return (
              <button key={t}
                onClick={() => setTopicMode(t)}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${btnClass}`}>
                {t} {!tStatus.isAllApproved && '⏳'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Generate Buttons Grid */}
      <div>
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Generate AI Tools ({activeScopeName})</h4>
        <div className="grid grid-cols-2 gap-4">
          {AI_TASKS.filter(task => {
            if (task.key === 'SUMMARY') {
              return topicMode === 'chapter';
            }
            return true;
          }).map(task => (
            <button
              key={task.key}
              disabled={generating !== null}
              onClick={() => handleGenerate(task.key)}
              className={`p-5 rounded-xl border-2 font-bold transition-all text-left ${
                generating === task.key
                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-wait'
                  : 'border-[#9333EA]/20 bg-[#9333EA]/5 text-[#9333EA] hover:bg-[#9333EA]/10 hover:border-[#9333EA]'
              }`}
            >
              <div className="text-2xl mb-2">{task.icon}</div>
              <div className="font-black text-sm">{generating === task.key ? 'Generating...' : `Generate ${task.label}`}</div>
              <div className="text-xs opacity-60 font-medium mt-0.5">{task.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Existing Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-black text-gray-900 text-sm">Existing AI Content ({activeScopeName})</h3>
          <span className="text-xs text-gray-400 font-semibold">{filteredContent.length} item{filteredContent.length !== 1 ? 's' : ''}</span>
        </div>
        {filteredContent.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No content generated for this scope yet. Use the buttons above.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filteredContent.map(item => (
              <li key={item.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{AI_TASKS.find(t=>t.key===item.taskType)?.icon || '📄'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm">{AI_TASKS.find(t=>t.key===item.taskType)?.label || item.taskType}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[item.approvalStatus]}`}>
                          {item.approvalStatus}
                        </span>
                      </div>
                      {item.topic && <p className="text-xs text-gray-400 mt-0.5">Topic: {item.topic}</p>}
                      {item.approvalStatus === 'APPROVED' && item.approvedBy && (
                        <p className="text-xs text-green-600 mt-0.5">✓ Approved by {item.approvedBy}</p>
                      )}
                      {item.editedBy && <p className="text-xs text-blue-500 mt-0.5">Edited by {item.editedBy}</p>}
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button onClick={() => setPreviewItem(item)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-100 transition-colors">
                      👁 Preview
                    </button>
                    <button onClick={() => startEdit(item)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">
                      ✏️ Edit
                    </button>
                    {item.approvalStatus !== 'APPROVED' && (
                      <button onClick={() => handleApprove(item.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 transition-colors">
                        ✅ Approve
                      </button>
                    )}
                    {item.approvalStatus !== 'REJECTED' && (
                      <button onClick={() => handleApprove(item.id, 'REJECTED')}
                        className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors">
                        ❌ Reject
                      </button>
                    )}
                    {item.approvalStatus === 'REJECTED' && (
                      <button onClick={() => handleRegenerate(item.id)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors">
                        🔁 Regen
                      </button>
                    )}
                    {/* Delete with inline confirm */}
                    {deleteConfirm === item.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(item.id)} className="px-2 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg">Sure?</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
