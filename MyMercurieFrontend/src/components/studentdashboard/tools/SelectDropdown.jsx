import React, { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, CheckIcon } from './icons'

/**
 * A styled, accessible-ish dropdown to replace bare <select> elements.
 *
 * Props:
 *  - label:        field label shown above the control
 *  - icon:         icon component rendered inside the trigger button
 *  - placeholder:  text shown when nothing is selected
 *  - value:        currently selected value
 *  - onChange:     (value) => void
 *  - options:      [{ value, label }]
 *  - disabled:     boolean
 *  - helperText:   optional small text shown under the field when disabled
 */
export default function SelectDropdown({
  label,
  icon: Icon,
  placeholder = 'Select…',
  value,
  onChange,
  options = [],
  disabled = false,
  helperText,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const selected = options.find(o => String(o.value) === String(value))

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-sm font-bold text-left transition-all
          ${disabled
            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
            : open
              ? 'bg-white border-[#2D1B69] ring-4 ring-[#2D1B69]/10 text-[#1E1B4B]'
              : 'bg-white border-gray-200 text-[#1E1B4B] hover:border-[#8B5CF6]/50'
          }`}
      >
        {Icon && (
          <span className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${disabled ? 'bg-gray-100 text-gray-300' : 'bg-[#EDEBFB] text-[#2D1B69]'}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}
        <span className={`flex-1 truncate ${!selected ? 'text-gray-400 font-semibold' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {disabled && helperText && (
        <p className="mt-1.5 text-[11px] text-gray-400 font-medium">{helperText}</p>
      )}

      {open && !disabled && (
        <div className="absolute z-30 mt-2 w-full bg-white border-2 border-gray-100 rounded-2xl shadow-xl shadow-purple-900/5 max-h-64 overflow-y-auto py-2 animate-[fadeIn_0.12s_ease-out]">
          {options.length === 0 ? (
            <p className="px-4 py-3 text-xs font-semibold text-gray-400">No options available</p>
          ) : (
            options.map(opt => {
              const isSelected = String(opt.value) === String(value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold text-left transition-colors
                    ${isSelected ? 'text-[#2D1B69] bg-[#F3EBFB]' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <CheckIcon className="w-4 h-4 text-[#2D1B69] flex-shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}