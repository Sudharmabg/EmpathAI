import React, { useState } from 'react'

export default function MockTest({ chapterLevel, topicLevel }) {
  const [level, setLevel] = useState('chapterLevel') // 'chapterLevel' | 'topicLevel'
  const [section, setSection] = useState('MCQ')       // 'MCQ' | 'HOTS'
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])           // [{ question, selectedOption, correctIndex, isCorrect }]
  const [showResults, setShowResults] = useState(false)
  const [revealedHots, setRevealedHots] = useState({})  // index -> boolean

  const currentLevelData = level === 'chapterLevel' ? chapterLevel : topicLevel
  const mcqs = currentLevelData?.mcqs || []
  const hots = currentLevelData?.hots || []

  const handleOptionClick = (optionIdx) => {
    if (answered) return
    setSelectedOption(optionIdx)
    setAnswered(true)

    const currentQuestion = mcqs[currentQ]
    const isCorrect = optionIdx === currentQuestion.correctIndex
    if (isCorrect) {
      setScore((prev) => prev + 1)
    }

    setAnswers((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        selectedOption: optionIdx,
        correctIndex: currentQuestion.correctIndex,
        isCorrect,
      },
    ])
  }

  const handleNext = () => {
    if (currentQ < mcqs.length - 1) {
      setCurrentQ((prev) => prev + 1)
      setSelectedOption(null)
      setAnswered(false)
    } else {
      setShowResults(true)
    }
  }

  const handleRetry = () => {
    setCurrentQ(0)
    setSelectedOption(null)
    setAnswered(false)
    setScore(0)
    setAnswers([])
    setShowResults(false)
  }

  const toggleHotsReveal = (index) => {
    setRevealedHots((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const handleLevelChange = (newLevel) => {
    setLevel(newLevel)
    handleRetry()
    setRevealedHots({})
  }

  const handleSectionChange = (newSection) => {
    setSection(newSection)
    handleRetry()
    setRevealedHots({})
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-50/50 shadow-sm overflow-hidden max-w-3xl mx-auto flex flex-col">
      {/* Header Tabs */}
      <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Level Toggle */}
        <div className="flex bg-gray-200/60 p-1 rounded-xl">
          <button
            onClick={() => handleLevelChange('chapterLevel')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${
              level === 'chapterLevel' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
          >
            Chapter Level
          </button>
          <button
            onClick={() => handleLevelChange('topicLevel')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${
              level === 'topicLevel' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
          >
            Topic Level
          </button>
        </div>

        {/* Section Toggle */}
        <div className="flex bg-gray-200/60 p-1 rounded-xl">
          <button
            onClick={() => handleSectionChange('MCQ')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${
              section === 'MCQ' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
          >
            MCQ Section
          </button>
          <button
            onClick={() => handleSectionChange('HOTS')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${
              section === 'HOTS' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
          >
            HOTS Section
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 flex-1">
        {/* MCQ Section */}
        {section === 'MCQ' && (
          <>
            {mcqs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No MCQ questions generated for this level.</div>
            ) : showResults ? (
              /* Results Screen */
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-4xl">🏆</div>
                  <h3 className="text-xl font-black text-black">Test Completed!</h3>
                  <p className="text-2xl font-black text-primary">
                    Score: {score} / {mcqs.length}
                  </p>
                  <p className="text-xs font-semibold text-gray-400">
                    {Math.round((score / mcqs.length) * 100)}% Accuracy rate
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 max-h-80 overflow-y-auto pr-2">
                  <h4 className="text-sm font-black text-black uppercase tracking-wider">Review Answers</h4>
                  {answers.map((ans, idx) => (
                    <div key={idx} className="p-4 border rounded-xl space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className={ans.isCorrect ? 'text-green-500' : 'text-red-500'}>
                          {ans.isCorrect ? '✓' : '✗'}
                        </span>
                        <div className="space-y-2 flex-1">
                          <p className="font-bold text-gray-800">{ans.question}</p>
                          {mcqs[idx]?.imageUrl && (
                            <img src={mcqs[idx].imageUrl} alt="Question visual" className="max-h-24 object-contain rounded-lg border border-gray-100" />
                          )}
                        </div>
                      </div>
                      <div className="pl-6 space-y-1 text-xs text-gray-500 font-semibold">
                        <p>Your choice: <span className={ans.isCorrect ? 'text-green-600' : 'text-red-600'}>{mcqs[idx].options[ans.selectedOption]}</span></p>
                        {!ans.isCorrect && (
                          <p>Correct choice: <span className="text-green-600">{mcqs[idx].options[ans.correctIndex]}</span></p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleRetry}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm hover:bg-primary/95 active:scale-95 transition-all shadow-md"
                >
                  Try Again
                </button>
              </div>
            ) : (
              /* Active Test Screen */
              <div className="space-y-6">
                <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  <span>Question {currentQ + 1} of {mcqs.length}</span>
                  <span className="text-primary font-bold">XP Earned: {score * 10}</span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-bold text-gray-800 leading-relaxed">
                    {mcqs[currentQ]?.question}
                  </h3>
                  {mcqs[currentQ]?.imageUrl && (
                    <img src={mcqs[currentQ].imageUrl} alt="Question visual" className="max-h-48 object-contain rounded-lg border border-gray-200" />
                  )}
                </div>

                <div className="space-y-3">
                  {mcqs[currentQ]?.options.map((option, idx) => {
                    const isSelected = selectedOption === idx
                    const isCorrect = mcqs[currentQ].correctIndex === idx
                    let btnClass = 'border-gray-200 text-gray-700 hover:bg-gray-50'

                    if (answered) {
                      if (isCorrect) {
                        btnClass = 'bg-green-50 border-green-500 text-green-700 font-bold'
                      } else if (isSelected) {
                        btnClass = 'bg-red-50 border-red-500 text-red-700 font-bold'
                      } else {
                        btnClass = 'border-gray-100 text-gray-300 pointer-events-none'
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(idx)}
                        disabled={answered}
                        className={`w-full text-left p-4 border-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${btnClass}`}
                      >
                        <span>{option}</span>
                        {answered && isCorrect && <span className="text-green-600">✓</span>}
                        {answered && isSelected && !isCorrect && <span className="text-red-600">✗</span>}
                      </button>
                    )
                  })}
                </div>

                {answered && (
                  <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-2 animate-fade-in">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">Explanation</span>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">
                      {mcqs[currentQ]?.explanation}
                    </p>
                  </div>
                )}

                {answered && (
                  <button
                    onClick={handleNext}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm hover:bg-primary/95 active:scale-95 transition-all shadow-md shadow-primary/10"
                  >
                    {currentQ === mcqs.length - 1 ? 'Show Results' : 'Next Question →'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* HOTS Section */}
        {section === 'HOTS' && (
          <>
            {hots.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No HOTS questions generated for this level.</div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-black text-black uppercase tracking-wider">Higher Order Thinking Skills (HOTS)</h4>
                  <p className="text-xs text-gray-400 font-semibold">Analyze, apply, and evaluate critical concepts.</p>
                </div>

                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                  {hots.map((item, index) => {
                    const isRevealed = !!revealedHots[index]
                    return (
                      <div key={index} className="border border-purple-50 rounded-xl p-5 bg-purple-50/10 space-y-4">
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-start gap-2.5">
                            <span className="text-primary font-bold text-xs select-none">Q{index + 1}.</span>
                            <p className="text-sm font-bold text-gray-800 leading-relaxed">{item.question}</p>
                          </div>
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt="HOTS question visual" className="ml-6 max-h-48 object-contain rounded-lg border border-gray-200" />
                          )}
                        </div>

                        {isRevealed && (
                          <div className="pl-6 border-t border-purple-50 pt-3 space-y-1.5 animate-fade-in">
                            <span className="text-[10px] font-black text-green-600 uppercase tracking-wider">Expected Answer</span>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">
                              {item.expectedAnswer}
                            </p>
                          </div>
                        )}

                        <div className="pl-6">
                          <button
                            onClick={() => toggleHotsReveal(index)}
                            className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                          >
                            {isRevealed ? 'Hide Answer' : 'Show Expected Answer'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
