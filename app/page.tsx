'use client';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React from 'react';

type GameType = 'plants' | 'fungi' | 'both';

const basePath = process.env.NODE_ENV === 'production' ? '/Plant_Guessing_Game' : '';

const options: Array<{ label: string; value: GameType; description: string; icon: string }> = [
  { label: 'Plants', value: 'plants', description: 'Predominantly photosynthetic organisms that comprise the kingdom Plantae.', icon: `${basePath}/plant_icon.png` },
  { label: 'Fungi', value: 'fungi', description: 'The kingdom of eukaryotic organisms that includes mushrooms, lichens, molds, rusts, and yeasts.', icon: `${basePath}/fungi_icon.png` },
  { label: 'Both', value: 'both', description: 'Guess on both plants and fungi.', icon: `${basePath}/both.png` },
];

export default function GameTypeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const onSelect = (value: GameType) => {
    router.push(`/location?gameType=${value}`);
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
      <div style={{ maxWidth: '900px', width: '100%' }}>
        <h1 style={{ 
          color: themeColors.tint,
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '8px',
          fontFamily: Fonts?.rounded ?? undefined,
          textAlign: 'center'
        }}>
          Plant Guesser
        </h1>
        <p style={{ 
          color: themeColors.text,
          fontSize: '16px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Select the type of organism you want to guess.
        </p>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap' }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            style={{
              border: `1px solid ${themeColors.icon}`,
              backgroundColor: themeColors.card,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.2s',
              flex: '1 1 0',
              minWidth: '200px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colorScheme === 'dark' ? '#252525' : '#f5f5f5';
            }}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColors.card}
          >
            <div style={{ 
              color: themeColors.text,
              fontSize: '18px',
              fontWeight: '700',
              marginBottom: '6px',
              textAlign: 'center'
            }}>
              {opt.label}
            </div>
            <div style={{ 
              color: themeColors.icon,
              fontSize: '14px',
              lineHeight: '18px',
              marginBottom: '12px',
              textAlign: 'center',
              minHeight: '54px'
            }}>
              {opt.description}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', height: '220px', alignItems: opt.value === 'both' ? 'center' : 'flex-start' }}>
              <Image 
                src={opt.icon} 
                alt={opt.label} 
                width={200} 
                height={200}
                style={{ objectFit: 'contain' }}
              />
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
