import React, { useState } from 'react'

export default function Flashcards({ flashcards }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
        No flashcards generated for this topic.
      </div>
    )
  }

  const card = flashcards[currentIdx]

  const handleNext = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % flashcards.length)
    }, 150)
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIdx((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    }, 150)
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 max-w-xl mx-auto py-6">
      {/* Perspective Container */}
      <div 
        className="w-full h-80 cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Card Body */}
        <div 
          className="relative w-full h-full duration-500 rounded-2xl shadow-lg border border-purple-100"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.6s ease-in-out'
          }}
        >
          {/* Front Side */}
          <div 
            className="absolute inset-0 bg-white rounded-2xl p-8 flex flex-col justify-between"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div className="flex justify-between items-start text-xs font-black text-gray-400 uppercase tracking-widest">
              <span>Card {currentIdx + 1} of {flashcards.length}</span>
              <span className="text-primary font-bold">Front</span>
            </div>
            
            <div className="text-center my-auto flex flex-col items-center gap-3">
              <h3 className="text-xl font-bold text-gray-800 leading-relaxed">
                {card.front}
              </h3>
              {card.imageUrl && (
                <img src={card.imageUrl} alt="Flashcard illustration" className="max-h-32 object-contain rounded-lg border border-gray-200" />
              )}
            </div>

            <div className="text-center text-xs text-gray-400 font-semibold italic">
              Click to Reveal Answer
            </div>
          </div>

          {/* Back Side */}
          <div 
            className="absolute inset-0 bg-purple-50 rounded-2xl p-8 flex flex-col justify-between"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="flex justify-between items-start text-xs font-black text-purple-400 uppercase tracking-widest">
              <span>Card {currentIdx + 1} of {flashcards.length}</span>
              <span className="font-bold">Back</span>
            </div>

            <div className="my-auto space-y-4 overflow-y-auto max-h-52">
              <p className="text-base text-gray-800 font-medium text-center">
                {card.back}
              </p>
              {card.example && (
                <div className="bg-white/80 p-2.5 rounded-lg border border-purple-100 text-xs">
                  <span className="font-bold text-primary block mb-0.5">Example:</span>
                  <span className="text-gray-600">{card.example}</span>
                </div>
              )}
              {card.memoryTip && (
                <div className="bg-yellow-50 p-2.5 rounded-lg border border-yellow-100 text-xs">
                  <span className="font-bold text-yellow-700 block mb-0.5">Memory Tip:</span>
                  <span className="text-gray-700">{card.memoryTip}</span>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-purple-400 font-semibold italic">
              Click to Flip Back
            </div>
          </div>
        </div>
      </div>

      {/* Hint (Always visible below the card if present) */}
      {card.hint && (
        <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl px-4 py-2.5 text-xs font-semibold w-full text-center shadow-sm">
          💡 Hint: {card.hint}
        </div>
      )}

      {/* Nav Controls */}
      <div className="flex items-center justify-between w-full px-2">
        <button
          onClick={handlePrev}
          className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
        >
          ← Previous
        </button>
        <span className="text-xs text-gray-400 font-bold">
          {currentIdx + 1} / {flashcards.length}
        </span>
        <button
          onClick={handleNext}
          className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/95 active:scale-95 transition-all shadow-md shadow-primary/10"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
