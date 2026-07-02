import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

function LaTeXFormula({ formula, displayMode = true }) {
  try {
    const html = katex.renderToString(formula, { displayMode, throwOnError: false, strict: false })
    return (
      <span
        className={displayMode ? 'flex justify-center overflow-x-auto' : 'inline'}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  } catch {
    return (
      <code className="font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-sm">
        {formula}
      </code>
    )
  }
}

export default function Summary({ shortSummary, keyPoints, formulas, definitions }) {
  // Support old schema (bulletPoints) alongside new (keyPoints) for backwards compat
  const points = keyPoints || []
  const fmls = formulas || []
  const defs = definitions || []

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Chapter Overview Card */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-100 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-purple-200/30 rounded-full translate-x-12 -translate-y-12" />
        <div className="absolute left-0 bottom-0 w-20 h-20 bg-purple-200/20 rounded-full -translate-x-8 translate-y-8" />
        <div className="relative z-10">
          <p className="text-[10px] font-black text-[#9333EA] uppercase tracking-widest mb-2">Chapter Overview</p>
          <p className="text-base text-gray-800 font-bold leading-relaxed">{shortSummary}</p>
        </div>
      </div>

      {/* Key Points */}
      {points.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Key Points for Revision</h3>
          <ol className="space-y-2.5">
            {points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#9333EA]/10 text-[#9333EA] text-[10px] font-black flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 font-medium leading-relaxed">{point}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Formulas — only shown when non-empty */}
      {fmls.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Formulas & Equations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fmls.map((f, i) => (
              <div key={i} className="bg-gradient-to-b from-purple-50 to-white border border-purple-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-[#9333EA] uppercase tracking-wide">{f.name}</p>
                <div className="py-2 min-h-[3rem] flex items-center justify-center overflow-x-auto">
                  <LaTeXFormula formula={f.formula} displayMode={true} />
                </div>
                {f.where && (
                  <p className="text-[11px] text-gray-500 font-medium border-t border-purple-100 pt-2">
                    Where: {f.where}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Definitions — only shown when non-empty */}
      {defs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Key Definitions
          </h3>
          <dl className="space-y-0 divide-y divide-gray-50">
            {defs.map((d, i) => (
              <div key={i} className={`py-3 grid grid-cols-5 gap-4 items-start -mx-6 px-6 ${i % 2 === 0 ? '' : 'bg-gray-50/60'}`}>
                <dt className="col-span-2 text-sm font-black text-[#9333EA]">{d.term}</dt>
                <dd className="col-span-3 text-sm text-gray-600 font-medium leading-relaxed">{d.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
