'use client';

import { Chip } from './Chip';
import type { KeywordOption } from '@/lib/types';

interface ChipGroupProps {
  options: KeywordOption[];
  selected: string | string[];
  onChange: (selected: string | string[]) => void;
  type: 'single' | 'multi';
  maxSelections?: number;
  disabled?: boolean;
}

export function ChipGroup({
  options,
  selected,
  onChange,
  type,
  maxSelections,
  disabled = false,
}: ChipGroupProps) {
  const selectedArray = Array.isArray(selected) ? selected : (selected ? [selected] : []);
  
  const handleSelect = (id: string) => {
    if (disabled) return;
    
    if (type === 'single') {
      onChange(selectedArray.includes(id) ? '' : id);
    } else {
      if (selectedArray.includes(id)) {
        onChange(selectedArray.filter(s => s !== id));
      } else {
        if (maxSelections && selectedArray.length >= maxSelections) {
          return; // Max reached
        }
        onChange([...selectedArray, id]);
      }
    }
  };
  
  const isAtMax = type === 'multi' && maxSelections && selectedArray.length >= maxSelections;
  
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selectedArray.includes(option.id);
        const isOptionDisabled = disabled || (isAtMax && !isSelected);
        
        return (
          <Chip
            key={option.id}
            selected={isSelected}
            emoji={option.emoji}
            onClick={() => handleSelect(option.id)}
            disabled={isOptionDisabled ? true : undefined}
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}
