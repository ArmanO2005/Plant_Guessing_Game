'use client';

import LocationSearch, { LocationEntry } from '@/components/LocationSearch';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useMemo, useState } from 'react';

type GameType = 'plants' | 'fungi' | 'both';

function normalizeGameType(value: string | null): GameType {
  if (value === 'plants' || value === 'fungi' || value === 'both') return value;
  return 'both';
}

function LocationScreen() {
  const searchParams = useSearchParams();
  const gameType = useMemo(() => normalizeGameType(searchParams.get('gameType')), [searchParams]);
  const router = useRouter();

  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [selected, setSelected] = useState<LocationEntry | null>(null);

  const labelByType: Record<GameType, string> = {
    plants: 'plants',
    fungi: 'fungi',
    both: 'plants and fungi',
  };

  return (
    <div style={{ 
      backgroundColor: themeColors.background,
      minHeight: '100vh',
      paddingTop: '80px',
      paddingLeft: '20px',
      paddingRight: '20px',
      display: 'flex',
      justifyContent: 'center'
    }}> 
      <div style={{ maxWidth: '600px', width: '100%' }}>
      <h1 style={{ 
        color: themeColors.tint,
        fontSize: '28px',
        fontWeight: '700',
        marginBottom: '8px',
        fontFamily: Fonts?.rounded ?? undefined
      }}>
        Choose a location
      </h1>
      <p style={{ 
        color: themeColors.text,
        fontSize: '16px',
        marginBottom: '16px'
      }}>
        We'll show you {labelByType[gameType]} from {selected ? selected.name : 'your selected area'}.
      </p>

      <div style={{ marginTop: '12px' }}>
        <LocationSearch
          placeholder="Search by continent, country, state…"
          onSelect={(loc) => setSelected(loc)}
        />
      </div>

      <button
        onClick={() => {
          if (!selected) return;
          router.push(`/game?gameType=${gameType}&location=${encodeURIComponent(selected.name)}`);
        }}
        disabled={!selected}
        style={{
          marginTop: '24px',
          paddingTop: '14px',
          paddingBottom: '14px',
          borderRadius: '12px',
          backgroundColor: selected ? themeColors.tint : themeColors.card,
          border: 'none',
          cursor: selected ? 'pointer' : 'not-allowed',
          width: '100%',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          if (selected) {
            e.currentTarget.style.backgroundColor = themeColors.tabIconDefault;
          }
        }}
        onMouseLeave={(e) => {
          if (selected) {
            e.currentTarget.style.backgroundColor = themeColors.tint;
          }
        }}
      >
        <span style={{ 
          color: '#fff',
          fontSize: '16px',
          fontWeight: '700'
        }}>
          Start game
        </span>
      </button>      </div>    </div>
  );
}

export default function LocationPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>}>
      <LocationScreen />
    </Suspense>
  );
}
