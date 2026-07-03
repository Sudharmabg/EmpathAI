import React from 'react'

export default function Mnemonic({ mnemonics }) {
  if (!mnemonics || mnemonics.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
        No mnemonics generated for this topic yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {mnemonics.map((item, index) => (
        <div 
          key={index}
          className="bg-white rounded-2xl border-2 border-purple-50/50 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all space-y-4"
        >
          {/* Concept Header */}
          <div className="space-y-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Memory Aid</span>
            <h3 className="text-base font-bold text-gray-800 leading-tight">
              {item.concept}
            </h3>
          </div>

          {/* Mnemonic Display */}
          <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-4 text-center">
            <p className="text-lg font-black text-primary tracking-wide">
              {item.mnemonic}
            </p>
          </div>

          {/* Acronym Expansion */}
          {item.expansion && (
            <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-3 text-xs space-y-1">
              <span className="font-bold text-yellow-800 block uppercase tracking-wider text-[10px]">Expansion:</span>
              <p className="text-gray-700 font-semibold leading-relaxed whitespace-pre-line">
                {item.expansion}
              </p>
            </div>
          )}

          {/* Image */}
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.concept} className="max-h-36 object-contain rounded border border-gray-100 mx-auto" />
          )}

          {/* Explanation */}
          <div className="pt-2 border-t border-gray-100 text-xs font-medium text-gray-500 leading-relaxed">
            {item.explanation}
          </div>
        </div>
      ))}
    </div>
  )
}
