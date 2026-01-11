'use client';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useMemo, useState } from 'react';

// Load locations from JSON
const rawLocations: Record<string, string | null> = require('@/src/data/locations.json');

export type LocationEntry = {
  name: string;
  type: string | null;
};

type Props = {
  placeholder?: string;
  onSelect?: (loc: LocationEntry) => void;
};

const TYPE_PRIORITY: Record<string, number> = {
  Continent: 0,
  Country: 1,
  State: 2,
  Province: 2,
  Territory: 2,
  Republic: 2,
  County: 3,
  District: 3,
  Municipality: 3,
  'Local Administrative Area': 3,
  City: 3,
  Town: 3,
  Region: 4,
  Zone: 4,
  Drainage: 4,
  'Land Feature': 4,
  Island: 4,
  Nationality: 4,
  OpenSpace: 4,
  Aggregate: 4,
  Colloquial: 4,
  Supername: 4,
  Undefined: 4,
};

function getTypePriority(type: string | null | undefined): number {
  if (!type) return 5;
  return TYPE_PRIORITY[type] ?? 5;
}

function normalize(str: string): string {
  return str.toLowerCase();
}

function scoreMatch(query: string, name: string): number {
  const q = normalize(query);
  const n = normalize(name);
  if (n.startsWith(q)) return 0;
  if (n.includes(q)) return 1;
  return 2;
}

export function LocationSearch({ placeholder = 'Search location…', onSelect }: Props) {
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [query, setQuery] = useState('');

  const locations: LocationEntry[] = useMemo(() => {
    return Object.entries(rawLocations).map(([name, type]) => ({ name, type }));
  }, []);

  const suggestions = useMemo(() => {
    const trimmed = query.trim();
    const filtered = trimmed.length === 0
      ? locations
      : locations.filter((l) => normalize(l.name).includes(normalize(trimmed)));

    const scored = filtered
      .map((l) => ({
        entry: l,
        typePriority: getTypePriority(l.type ?? undefined),
        matchScore: scoreMatch(trimmed, l.name),
      }))
      .sort((a, b) => {
        if (a.typePriority !== b.typePriority) return a.typePriority - b.typePriority;
        if (a.matchScore !== b.matchScore) return a.matchScore - b.matchScore;
        return a.entry.name.localeCompare(b.entry.name);
      })
      .map((s) => s.entry);

    return scored.slice(0, 25);
  }, [query, locations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          border: `1px solid ${themeColors.icon}`,
          color: themeColors.text,
          backgroundColor: themeColors.background,
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '16px',
          outline: 'none'
        }}
      />
      <div style={{
        maxHeight: '40vh',
        overflowY: 'auto',
        border: `1px solid ${themeColors.icon}`,
        borderRadius: '8px'
      }}>
        {suggestions.map((item) => (
          <button
            key={item.name}
            onClick={() => onSelect?.(item)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              backgroundColor: themeColors.background,
              border: 'none',
              borderBottom: `1px solid ${themeColors.icon}`,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.tabIconDefault}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColors.background}
          >
            <span style={{ 
              color: themeColors.text,
              fontSize: '16px',
              fontWeight: '500'
            }}>
              {item.name}
            </span>
            <span style={{ 
              color: themeColors.icon,
              fontSize: '13px'
            }}>
              {item.type ?? 'Unknown'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LocationSearch;
