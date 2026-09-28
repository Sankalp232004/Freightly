import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { PlaceFeature } from '../types';
import { Icon } from './Icon';

interface PlaceInputProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  required?: boolean;
}

export const PlaceInput: React.FC<PlaceInputProps> = ({
  id,
  name,
  label,
  placeholder = 'e.g. Pune, Maharashtra',
  value,
  onChange,
  error,
  required = false,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<any>(null);

  // Debounced places autocomplete
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const features = await api.searchPlaces(value);
        setSuggestions(features);
        setIsOpen(features.length > 0);
      } catch {
        // Fallback: server resolves typed city if autocomplete is unavailable
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceTimer.current);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (feature: PlaceFeature) => {
    // Crucial requirement: Selecting a suggestion REPLACES the field value, never appends to it.
    const cleanCity = feature.properties.name || feature.properties.label.split(',')[0].trim();
    onChange(cleanCity);
    setSuggestions([]);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative mb-3" ref={containerRef}>
      <div className="flex justify-between items-baseline mb-1">
        <label htmlFor={id} className="block text-xs font-mono uppercase tracking-wider text-ink font-semibold">
          {label} {required && <span className="text-stamp">*</span>}
        </label>
        {isLoading && (
          <span className="text-[10px] font-mono text-ink-muted flex items-center space-x-1">
            <span className="animate-pulse">Searching...</span>
          </span>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlightIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full px-3 py-2 text-sm bg-paper-input text-ink border ${
            error ? 'border-stamp' : 'border-rule focus:border-ink'
          } placeholder-ink-muted transition-colors`}
        />

        <div className="absolute right-2.5 top-2.5 text-ink-muted pointer-events-none">
          <Icon name="search" size={16} />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-xs text-stamp font-mono flex items-center space-x-1">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </p>
      )}

      {/* Autocomplete suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-paper-card border border-ink shadow-sm max-h-60 overflow-y-auto"
        >
          {suggestions.map((feature, idx) => {
            const isHighlighted = idx === highlightIndex;
            return (
              <li
                key={feature.properties.label + idx}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => handleSelect(feature)}
                className={`px-3 py-2 text-xs cursor-pointer border-b border-rule last:border-b-0 flex items-center justify-between ${
                  isHighlighted ? 'bg-ink text-paper' : 'text-ink hover:bg-paper'
                }`}
              >
                <div>
                  <div className="font-semibold">{feature.properties.name}</div>
                  <div className={`text-[11px] ${isHighlighted ? 'text-paper/80' : 'text-ink-muted'}`}>
                    {feature.properties.label}
                  </div>
                </div>
                <span className={`font-mono text-[10px] uppercase ${isHighlighted ? 'text-paper/70' : 'text-ink-muted'}`}>
                  Select
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
