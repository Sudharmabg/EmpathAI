import React, { useState, useEffect, useRef } from 'react'
import { uploadChapter, getChapterStatus, updateChapterMetadata, publishChapter, uploadChapterImage } from '../../../api/curriculumAiApi'

// ── PDF.js helpers ─────────────────────────────────────────────────────────────

// Dynamically load PDF.js from CDN (only once)
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window['pdfjs-dist/build/pdf']) {
      resolve(window['pdfjs-dist/build/pdf'])
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'
    script.onload = () => {
      const pdfjsLib = window['pdfjs-dist/build/pdf']
      if (!pdfjsLib) {
        reject(new Error('PDF.js loaded but library not found on window.'))
        return
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
      resolve(pdfjsLib)
    }
    script.onerror = () => reject(new Error('Failed to load PDF parsing library from CDN.'))
    document.body.appendChild(script)
  })
}

// Extract all text from a PDF File object, returns { text, numPages }
const extractTextFromPdf = async (file) => {
  const pdfjsLib = await loadPdfJs()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result)
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map(item => item.str).join(' ')
          fullText += pageText + '\n'
        }
        resolve({ text: fullText.trim(), numPages: pdf.numPages })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsArrayBuffer(file)
  })
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CLASSES = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
  'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'
]
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Art & Craft']
const BLOOMS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']

// ── Component ──────────────────────────────────────────────────────────────────

export default function ChapterUpload() {
  const [stage, setStage] = useState('FORM')
  const [chapterId, setChapterId] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [editedMetadata, setEditedMetadata] = useState(null)
  const [formData, setFormData] = useState({ board: 'CBSE', grade: '', subject: '', title: '', chapterNumber: '', rawContent: '' })
  const [subtopicInput, setSubtopicInput] = useState('')
  const [subtopics, setSubtopics] = useState([])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [imageBank, setImageBank] = useState([])
  const [imgInput, setImgInput] = useState({ conceptName: '', file: null })
  const [uploadingImg, setUploadingImg] = useState(false)

  // ── PDF-specific state ─────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState('raw')       // 'raw' | 'pdf'
  const [pdfFile, setPdfFile] = useState(null)             // selected File object
  const [pdfInfo, setPdfInfo] = useState(null)             // { name, size, numPages, charCount }
  const [pdfError, setPdfError] = useState(null)           // extraction error string
  const [extractingPdf, setExtractingPdf] = useState(false)
  const [showPreview, setShowPreview] = useState(false)    // collapsible extracted text preview
  const [isDragOver, setIsDragOver] = useState(false)
  const pdfInputRef = useRef(null)

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'PROCESSING' || !chapterId) return
    const interval = setInterval(async () => {
      try {
        const status = await getChapterStatus(chapterId)
        if (status.processingStatus === 'PROCESSED') {
          setMetadata(status)
          setEditedMetadata({
            ...status,
            topics: status.topics || [],
            learningObjectives: status.learningObjectives || [],
            bloomsLevels: status.bloomsLevels || [],
            prerequisites: status.prerequisites || [],
            keywords: status.keywords || [],
          })
          setStage('REVIEW')
          clearInterval(interval)
        } else if (status.processingStatus === 'FAILED') {
          setStage('FORM')
          clearInterval(interval)
          alert('Processing failed. Please try again.')
        }
      } catch (err) { console.error(err) }
    }, 3000)
    return () => clearInterval(interval)
  }, [stage, chapterId])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const addSubtopic = () => {
    const trimmed = subtopicInput.trim()
    if (trimmed && !subtopics.includes(trimmed)) {
      setSubtopics([...subtopics, trimmed])
      setSubtopicInput('')
    }
  }

  const removeSubtopic = (name) => setSubtopics(subtopics.filter(s => s !== name))

  const resetPdfState = () => {
    setPdfFile(null)
    setPdfInfo(null)
    setPdfError(null)
    setExtractingPdf(false)
    setShowPreview(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  const handleModeSwitch = (mode) => {
    setInputMode(mode)
    // Clear content from other mode so they don't conflict
    if (mode === 'raw') {
      resetPdfState()
    } else {
      setFormData(prev => ({ ...prev, rawContent: '' }))
    }
  }

  // Process a PDF file (from input or drag-drop)
  const processPdfFile = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setPdfError('Please upload a valid PDF file (.pdf).')
      return
    }
    setPdfFile(file)
    setPdfError(null)
    setPdfInfo(null)
    setExtractingPdf(true)
    setShowPreview(false)
    try {
      const { text, numPages } = await extractTextFromPdf(file)
      if (!text || text.length < 50) {
        setPdfError('The PDF appears to be a scanned image or contains no readable text. Please use Raw Content mode for scanned PDFs, or try a text-based PDF.')
        setExtractingPdf(false)
        return
      }
      setFormData(prev => ({ ...prev, rawContent: text }))
      setPdfInfo({
        name: file.name,
        size: (file.size / 1024).toFixed(1),
        numPages,
        charCount: text.length,
      })
    } catch (err) {
      setPdfError('Failed to extract text from PDF: ' + err.message)
    } finally {
      setExtractingPdf(false)
    }
  }

  const handlePdfInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processPdfFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processPdfFile(file)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (inputMode === 'pdf' && (!formData.rawContent || formData.rawContent.length < 100)) {
      alert('Please upload a PDF with readable text content (minimum 100 characters) before generating intelligence.')
      return
    }
    try {
      const payload = { ...formData }
      if (!payload.chapterNumber) payload.chapterNumber = null
      else payload.chapterNumber = parseInt(payload.chapterNumber)
      payload.subtopics = subtopics
      payload.imageBank = imageBank.filter(img => img.conceptName.trim() && img.imageUrl.trim())
      const res = await uploadChapter(payload)
      setChapterId(res.chapterId)
      setStage('PROCESSING')
    } catch (err) { alert(err.message) }
  }

  const handlePublish = async () => {
    try {
      await updateChapterMetadata(chapterId, editedMetadata)
      await publishChapter(chapterId)
      setStage('PUBLISHED')
    } catch (err) { alert(err.message) }
  }

  const resetForm = () => {
    setStage('FORM')
    setFormData({ board: 'CBSE', grade: '', subject: '', title: '', chapterNumber: '', rawContent: '' })
    setSubtopics([])
    setImageBank([])
    setImgInput({ conceptName: '', file: null })
    setInputMode('raw')
    resetPdfState()
  }

  const toggleBloom = (level) => {
    const current = editedMetadata.bloomsLevels || []
    const updated = current.includes(level)
      ? current.filter(b => b !== level)
      : [...current, level]
    setEditedMetadata({ ...editedMetadata, bloomsLevels: updated })
  }

  const addTag = (field, value) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const current = editedMetadata[field] || []
    if (!current.includes(trimmed)) {
      setEditedMetadata({ ...editedMetadata, [field]: [...current, trimmed] })
    }
  }

  const removeTag = (field, value) => {
    setEditedMetadata({ ...editedMetadata, [field]: (editedMetadata[field] || []).filter(t => t !== value) })
  }

  // ── FORM Stage ───────────────────────────────────────────────────────────────
  if (stage === 'FORM') {
    const contentReady = inputMode === 'raw'
      ? formData.rawContent.trim().length >= 100
      : (pdfInfo && formData.rawContent.length >= 100)

    return (
      <form onSubmit={handleUpload} className="space-y-5 max-w-2xl">
        <h3 className="text-lg font-black text-gray-900 mb-2">Upload New Chapter</h3>

        {/* ── Board / Class / Subject / Title / Chapter Number grid ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Board */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Board</label>
            <input type="text" value={formData.board}
              onChange={e => setFormData({...formData, board: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm" required />
          </div>
          {/* Class */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
            <select value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm bg-white" required>
              <option value="">Select Class</option>
              {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          {/* Subject */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
            <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm bg-white" required>
              <option value="">Select Subject</option>
              {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Chapter Title</label>
            <input type="text" value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm" required />
          </div>
          {/* Chapter Number */}
          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">Chapter Number <span className="text-gray-400 font-normal">(Optional)</span></label>
            <input type="number" value={formData.chapterNumber}
              onChange={e => setFormData({...formData, chapterNumber: e.target.value})}
              placeholder="e.g. 3"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm" />
          </div>
        </div>

        {/* ── Subtopics Chip Input ── */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Subtopics <span className="text-gray-400 font-normal">(Optional — guides AI metadata extraction)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={subtopicInput}
              onChange={e => setSubtopicInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtopic() }}}
              placeholder="e.g. Quantum Mechanics"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm"
            />
            <button type="button" onClick={addSubtopic}
              className="px-4 py-2.5 bg-[#9333EA] text-white font-bold rounded-xl hover:bg-[#7e22ce] transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
          {subtopics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {subtopics.map(st => (
                <span key={st} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-sm font-semibold rounded-full">
                  {st}
                  <button type="button" onClick={() => removeSubtopic(st)} className="text-purple-400 hover:text-purple-700 transition-colors leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Content Input — Mode Toggle ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-bold text-gray-700">Chapter Content</label>
            {/* Toggle pill */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => handleModeSwitch('raw')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  inputMode === 'raw'
                    ? 'bg-white text-[#9333EA] shadow-sm border border-purple-100'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {/* text icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Raw Content
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('pdf')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                  inputMode === 'pdf'
                    ? 'bg-white text-[#9333EA] shadow-sm border border-purple-100'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {/* pdf icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Upload PDF
              </button>
            </div>
          </div>

          {/* ── Raw Content textarea ── */}
          {inputMode === 'raw' && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Paste Markdown or plain text content below.</p>
              <textarea
                rows="10"
                value={formData.rawContent}
                onChange={e => setFormData({...formData, rawContent: e.target.value})}
                placeholder="# Chapter Title&#10;&#10;Paste or type your chapter content here in Markdown or plain text..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold focus:border-[#9333EA] focus:ring-4 focus:ring-purple-100 outline-none shadow-sm resize-y"
                required={inputMode === 'raw'}
              />
              {formData.rawContent.length > 0 && (
                <p className="text-xs text-gray-400 mt-1 text-right">{formData.rawContent.length.toLocaleString()} characters</p>
              )}
            </div>
          )}

          {/* ── PDF Upload zone ── */}
          {inputMode === 'pdf' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Upload a text-based PDF. The text will be extracted automatically and sent to the AI pipeline.</p>

              {/* Drag-and-drop dropzone */}
              {!pdfInfo && !extractingPdf && (
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => pdfInputRef.current?.click()}
                  className={`relative cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-200 ${
                    isDragOver
                      ? 'border-[#9333EA] bg-purple-50 scale-[1.01]'
                      : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/40'
                  }`}
                  style={{ padding: '2.5rem 1.5rem' }}
                >
                  <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
                    {/* PDF icon */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      isDragOver ? 'bg-purple-100' : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">
                        {isDragOver ? 'Drop your PDF here!' : 'Drag & drop your PDF here'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">or click to browse files</p>
                    </div>
                    <span className="text-xs bg-red-50 text-red-600 border border-red-200 font-bold px-3 py-1 rounded-full">PDF only</span>
                  </div>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}

              {/* Extracting state */}
              {extractingPdf && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-purple-300 rounded-2xl bg-purple-50/50">
                  <div className="w-10 h-10 border-3 border-[#9333EA] border-t-transparent rounded-full animate-spin" style={{ borderWidth: '3px' }} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-purple-800">Extracting text from PDF...</p>
                    <p className="text-xs text-purple-500 mt-0.5">{pdfFile?.name}</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {pdfError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-700">Extraction Failed</p>
                    <p className="text-xs text-red-600 mt-0.5">{pdfError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPdfError(null); setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = '' }}
                    className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
                  >×</button>
                </div>
              )}

              {/* Success state — PDF info card */}
              {pdfInfo && !extractingPdf && (
                <div className="border border-green-200 bg-green-50 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-green-100">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{pdfInfo.name}</p>
                      <p className="text-xs text-gray-500">{pdfInfo.size} KB · {pdfInfo.numPages} page{pdfInfo.numPages !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2.5 py-1 rounded-full flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Text Extracted
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 divide-x divide-green-100 bg-white/60">
                    <div className="px-4 py-2.5 text-center">
                      <p className="text-base font-black text-gray-800">{pdfInfo.numPages}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pages</p>
                    </div>
                    <div className="px-4 py-2.5 text-center">
                      <p className="text-base font-black text-gray-800">{pdfInfo.charCount.toLocaleString()}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Characters</p>
                    </div>
                    <div className="px-4 py-2.5 text-center">
                      <p className="text-base font-black text-gray-800">~{Math.round(pdfInfo.charCount / 1500)}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Est. Pages</p>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-t border-green-100 bg-white/40">
                    <button
                      type="button"
                      onClick={() => setShowPreview(p => !p)}
                      className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${showPreview ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {showPreview ? 'Hide' : 'Show'} extracted text
                    </button>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => { resetPdfState(); setFormData(prev => ({ ...prev, rawContent: '' })) }}
                      className="text-xs font-bold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove &amp; re-upload
                    </button>
                  </div>

                  {/* Collapsible preview */}
                  {showPreview && (
                    <div className="border-t border-green-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1">Extracted Text Preview</p>
                      <pre className="px-4 pb-4 text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed max-h-56 overflow-y-auto">
                        {formData.rawContent.slice(0, 2000)}{formData.rawContent.length > 2000 ? '\n\n… (truncated for preview)' : ''}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Validation warning if content too short */}
              {pdfInfo && formData.rawContent.length < 100 && (
                <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Extracted text is too short (min. 100 characters required).
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Chapter Image Bank ── */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-gray-800">🖼️ Chapter Image Bank <span className="text-gray-400 font-normal text-xs">(Optional)</span></h4>
              <p className="text-xs text-gray-500 mt-0.5">Tag images by concept name — they will be embedded into the vector DB so AI tools can reference them.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Concept name (e.g. Mitochondria)"
              value={imgInput.conceptName}
              onChange={e => setImgInput({...imgInput, conceptName: e.target.value})}
              className="flex-1 rounded-lg border border-purple-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none bg-white"
            />
            <input
              type="file"
              accept="image/*"
              onChange={e => setImgInput({...imgInput, file: e.target.files[0]})}
              className="flex-1 text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-[#9333EA] file:text-white hover:file:bg-[#7e22ce] file:cursor-pointer file:transition-colors bg-white rounded-lg border border-purple-200 outline-none focus:border-[#9333EA] py-1 pl-1"
            />
            <button
              type="button"
              disabled={uploadingImg || !imgInput.conceptName.trim() || !imgInput.file}
              onClick={async () => {
                if (!imgInput.conceptName.trim() || !imgInput.file) return
                try {
                  setUploadingImg(true)
                  const res = await uploadChapterImage(imgInput.conceptName.trim(), imgInput.file)
                  setImageBank([...imageBank, { conceptName: res.conceptName, imageUrl: res.imageUrl }])
                  setImgInput({ conceptName: '', file: null })
                  const fileInput = document.querySelector('input[accept="image/*"]')
                  if (fileInput) fileInput.value = ''
                } catch (e) {
                  alert('Image upload failed: ' + e.message)
                } finally {
                  setUploadingImg(false)
                }
              }}
              className="px-4 py-2 bg-[#9333EA] text-white font-bold rounded-lg hover:bg-[#7e22ce] transition-colors text-sm flex-shrink-0 disabled:opacity-50"
            >
              {uploadingImg ? 'Uploading...' : '+ Add'}
            </button>
          </div>
          {imageBank.length > 0 && (
            <div className="space-y-2">
              {imageBank.map((img, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-purple-100 rounded-lg px-3 py-2">
                  <img src={img.imageUrl} alt={img.conceptName} onError={e => { e.target.style.display='none' }}
                    className="w-10 h-10 object-cover rounded-md flex-shrink-0 border border-gray-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-800 truncate">{img.conceptName}</p>
                    <p className="text-xs text-gray-400 truncate">{img.imageUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageBank(imageBank.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-sm font-bold flex-shrink-0 ml-1"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={inputMode === 'pdf' && (extractingPdf || (!pdfInfo && !formData.rawContent))}
          className="w-full py-3 bg-[#9333EA] hover:bg-[#7e22ce] text-white font-black rounded-xl transition-colors shadow-md shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {extractingPdf ? '⏳ Extracting PDF...' : '🤖 Generate Intelligence'}
        </button>
      </form>
    )
  }

  // ── PROCESSING Stage ──────────────────────────────────────────────────────────
  if (stage === 'PROCESSING') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-14 h-14 border-4 border-[#9333EA] border-t-transparent rounded-full animate-spin mb-6" />
        <h3 className="text-xl font-black text-gray-900">Processing Chapter...</h3>
        <p className="text-gray-500 mt-1 text-sm">Generating chunks, metadata, embeddings. This may take a minute.</p>
      </div>
    )
  }

  // ── REVIEW Stage ──────────────────────────────────────────────────────────────
  if (stage === 'REVIEW') {
    const em = editedMetadata || {}
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">Review AI-Extracted Metadata</h3>
          <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full">✓ AI Processing Complete</span>
        </div>

        {/* Core Fields */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h4 className="text-sm font-black text-gray-700 uppercase tracking-wide">Core Settings</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Difficulty Level</label>
              <select value={em.difficultyLevel || 'Medium'}
                onChange={e => setEditedMetadata({...em, difficultyLevel: e.target.value})}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#9333EA] outline-none">
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Estimated Reading Time (mins)</label>
              <input type="number" value={em.estimatedReadingTime || 0}
                onChange={e => setEditedMetadata({...em, estimatedReadingTime: parseInt(e.target.value)})}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
            </div>
          </div>

          {/* Topics chips */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Topics</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(em.topics || []).map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-full">
                  {t}<button type="button" onClick={() => removeTag('topics', t)} className="text-purple-400 hover:text-purple-700">×</button>
                </span>
              ))}
            </div>
            <input type="text" placeholder="Add topic and press Enter"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('topics', e.target.value); e.target.value = '' }}}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
          </div>

          {/* Learning Objectives */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Learning Objectives</label>
            <div className="space-y-1.5">
              {(em.learningObjectives || []).map((obj, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 text-xs">•</span>
                  <input type="text" value={obj}
                    onChange={e => { const arr = [...(em.learningObjectives || [])]; arr[i] = e.target.value; setEditedMetadata({...em, learningObjectives: arr}) }}
                    className="flex-1 text-sm text-gray-700 bg-transparent border-b border-gray-200 focus:border-[#9333EA] outline-none py-0.5" />
                  <button type="button" onClick={() => removeTag('learningObjectives', obj)} className="text-red-400 hover:text-red-600 text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Metadata Accordion */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
            <span className="text-sm font-black text-gray-700">Advanced AI Metadata</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {advancedOpen && (
            <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
              {/* Bloom's Taxonomy */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Bloom's Taxonomy Levels</label>
                <div className="flex flex-wrap gap-2">
                  {BLOOMS.map(level => (
                    <button key={level} type="button"
                      onClick={() => toggleBloom(level)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        (em.bloomsLevels || []).includes(level)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'border-gray-300 text-gray-600 hover:border-purple-400'
                      }`}>{level}</button>
                  ))}
                </div>
              </div>

              {/* Prerequisites chips */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Prerequisites</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(em.prerequisites || []).map(t => (
                    <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full">
                      {t}<button type="button" onClick={() => removeTag('prerequisites', t)} className="text-blue-400 hover:text-blue-700">×</button>
                    </span>
                  ))}
                </div>
                <input type="text" placeholder="Add prerequisite and press Enter"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('prerequisites', e.target.value); e.target.value = '' }}}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
              </div>

              {/* Keywords chips */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Keywords</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(em.keywords || []).map(t => (
                    <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-full">
                      {t}<button type="button" onClick={() => removeTag('keywords', t)} className="text-gray-400 hover:text-gray-700">×</button>
                    </span>
                  ))}
                </div>
                <input type="text" placeholder="Add keyword and press Enter"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag('keywords', e.target.value); e.target.value = '' }}}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#9333EA] outline-none" />
              </div>

              {/* Common Misconceptions (read-only) */}
              {(em.commonMisconceptions || []).length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">Common Misconceptions <span className="text-gray-400 font-normal">(AI-generated, read-only)</span></label>
                  <ul className="space-y-1.5">
                    {(em.commonMisconceptions || []).map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-red-400 mt-0.5">⚠</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handlePublish}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl transition-colors shadow-md">
          🚀 Publish Chapter
        </button>
      </div>
    )
  }

  // ── PUBLISHED Stage ───────────────────────────────────────────────────────────
  if (stage === 'PUBLISHED') {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <span className="text-green-600 text-3xl">✓</span>
        </div>
        <h3 className="text-xl font-black text-gray-900">Chapter Published!</h3>
        <p className="mt-2 text-sm text-gray-500">The chapter and its AI tools are now available to students.</p>
        <button
          onClick={resetForm}
          className="mt-6 px-6 py-2.5 bg-purple-50 text-[#9333EA] font-bold rounded-xl hover:bg-purple-100 transition-colors">
          Upload Another Chapter
        </button>
      </div>
    )
  }

  return null
}
