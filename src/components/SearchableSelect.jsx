import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ value, onChange, options, placeholder = 'Выберите...', style }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(opt =>
    String(opt.label).toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && filteredOptions[highlightedIndex] && inputRef.current) {
      const listItems = containerRef.current?.querySelectorAll('[data-option-index]');
      listItems?.[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen, filteredOptions]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        onChange(filteredOptions[highlightedIndex].value);
        setIsOpen(false);
        setSearch('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : (value || '');

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setTimeout(() => inputRef.current?.focus(), 0); }}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--border-light, #333)',
          borderRadius: '8px',
          color: 'var(--text-primary, #fff)',
          cursor: 'pointer',
          fontSize: '0.95rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '42px',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s'
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isOpen ? (
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Поиск..."
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'inherit',
                fontSize: 'inherit',
                fontFamily: 'inherit'
              }}
            />
          ) : (
            <span style={{ color: displayValue ? 'inherit' : 'rgba(255,255,255,0.4)' }}>
              {displayValue || placeholder}
            </span>
          )}
        </span>
        <span style={{ marginLeft: 8, fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#2a2a3e',
            border: '1px solid var(--border-light, #444)',
            borderRadius: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 100001,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
              Ничего не найдено
            </div>
          ) : (
            filteredOptions.map((opt, idx) => (
              <div
                key={String(opt.value)}
                data-option-index={idx}
                onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  background: idx === highlightedIndex ? 'rgba(99, 132, 255, 0.3)' : 'transparent',
                  color: '#fff',
                  transition: 'background 0.15s'
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
