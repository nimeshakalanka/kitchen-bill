'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  required = false,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setSearch('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearch('');
  };

  const handleInputChange = (val: string) => {
    setSearch(val);
    if (!isOpen) setIsOpen(true);
    // If user clears the input, clear the selection too
    if (val === '') {
      onChange('');
    }
  };

  return (
    <div ref={containerRef} className="relative" id={id}>
      <div
        className={`flex items-center w-full rounded-xl bg-white border text-sm text-[#3E2723] transition-colors ${
          isOpen ? 'border-[#1B5E20] ring-2 ring-[#1B5E20]/10' : 'border-[#1B5E20]/15'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={value || placeholder}
          required={required && !value}
          className="w-full px-3 py-2.5 rounded-xl bg-transparent outline-none placeholder:text-[#8D6E63]/50"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setSearch('');
              inputRef.current?.focus();
            }
          }}
          className="pr-3 text-[#8D6E63] hover:text-[#3E2723] transition-colors shrink-0"
          tabIndex={-1}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-[#1B5E20]/15 rounded-xl shadow-xl animate-scale-in">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-[#8D6E63] text-center">No results found</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[#1B5E20]/5 ${
                  opt === value
                    ? 'bg-[#1B5E20]/8 text-[#1B5E20] font-medium'
                    : 'text-[#3E2723]'
                } first:rounded-t-xl last:rounded-b-xl`}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
