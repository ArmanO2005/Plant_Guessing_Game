'use client';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { optionFetchers, RankKey } from '@/src/taxonomy_helpers';
import React, { useMemo, useState } from 'react';

type Props = {
  rank: RankKey;
  placeholder?: string;
  value: string;
  onChange: (text: string) => void;
  onSelectOption?: (option: string) => void;
  editable?: boolean;
  showDropdown?: boolean;
};

export function TaxonomyInput({ rank, placeholder, value, onChange, onSelectOption, editable = true, showDropdown = true }: Props) {
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [showOptions, setShowOptions] = useState(false);

  const options = useMemo(() => showDropdown ? optionFetchers[rank](value) : [], [rank, value, showDropdown]);

  const handleSelectOption = (option: string) => {
    onChange(option);
    onSelectOption?.(option);
    setShowOptions(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder ?? `Enter ${rank}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowOptions(true)}
        onBlur={() => setShowOptions(false)}
        disabled={!editable}
        style={{
          border: `1px solid ${themeColors.icon}`,
          color: themeColors.text,
          backgroundColor: themeColors.background,
          borderRadius: '8px',
          padding: '8px 10px',
          fontSize: '15px',
          width: '100%',
          outline: 'none'
        }}
      />
      {showOptions && options.length > 0 && (
        <div style={{
          border: `1px solid ${themeColors.icon}`,
          borderTop: 'none',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: themeColors.background,
          position: 'absolute',
          width: '100%',
          zIndex: 10
        }}>
          {options.map((item) => (
            <button
              key={item}
              onMouseDown={() => handleSelectOption(item)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.tabIconDefault}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ color: themeColors.text, fontSize: '14px' }}>{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
