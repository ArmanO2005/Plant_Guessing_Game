'use client';

import { TaxonomyInput } from '@/components/TaxonomyInput';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchRandomVerifiableObservations, fetchTaxonDetails, INatObservation } from '@/src/fetch_inat';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import React, { Suspense, useEffect, useMemo, useState } from 'react';

type GameType = 'plants' | 'fungi' | 'both';
type RankKey = 'order' | 'family' | 'genus' | 'species';
const gamePrompt: Record<GameType, string> = {
  plants: 'plant',
  fungi: 'fungi',
  both: 'organism',
};

const RANK_POINTS: Record<RankKey, number> = {
  order: 1,
  family: 2,
  genus: 3,
  species: 4,
};

const BATCH_SIZE = 30;

type Truth = Partial<Record<RankKey, string>>;

function isBinomial(value?: string | null): boolean {
  if (!value) return false;
  const parts = value.trim().split(/\s+/);
  return parts.length >= 2 && /[a-zA-Z]/.test(parts[0]) && /[a-zA-Z]/.test(parts[1]);
}

function normalizeInput(value: string): string {
  return value.trim().toLowerCase();
}

function pickTaxon(gameType: GameType): 'plants' | 'fungi' {
  if (gameType === 'both') {
    return Math.random() < 0.5 ? 'plants' : 'fungi';
  }
  return gameType;
}

function extractTruth(obs: INatObservation): Truth {
  const ancestors = obs.taxon?.ancestors ?? [];
  const byRank = (rank: string) => ancestors.find((a) => a.rank === rank)?.name;

  const scientificName = obs.taxon?.name;
  let species: string | undefined;
  if (obs.taxon?.rank === 'species' && scientificName) {
    species = scientificName;
  } else if (isBinomial(obs.species_guess)) {
    species = obs.species_guess ?? undefined;
  }

  let genus = byRank('genus');
  if (!genus) {
    const source = scientificName ?? species;
    if (isBinomial(source)) {
      genus = source!.split(' ')[0];
    }
  }

  return { species, genus, family: undefined, order: undefined };
}

function computeScore(truth: Truth, guess: Partial<Record<RankKey, string>>) {
  let earned = 0;
  let possible = 0;
  const details: Array<{ rank: RankKey; correct?: string; guessed?: string; hit: boolean; points: number }> = [];

  (['species', 'genus', 'family', 'order'] as RankKey[]).forEach((rank) => {
    const correct = truth[rank];
    if (!correct) return;
    const pts = RANK_POINTS[rank];
    possible += pts;
    const guessed = guess[rank] ?? '';
    const hit = normalizeInput(guessed) === normalizeInput(correct);
    if (hit) earned += pts;
    details.push({ rank, correct, guessed, hit, points: pts });
  });

  return { earned, possible, details };
}

function bestPhotoUrl(item: INatObservation['photos'][number]): string {
  if (item.original_url) return item.original_url;
  if (item.url) {
    const swapped = item.url
      .replace('square', 'original')
      .replace('small', 'original')
      .replace('medium', 'original')
      .replace('large', 'original');
    return swapped;
  }
  return '';
}

function GameScreen() {
  const searchParams = useSearchParams();
  const gameType = useMemo(() => {
    const val = searchParams.get('gameType');
    return (['plants', 'fungi', 'both'] as GameType[]).includes(val as GameType)
      ? (val as GameType)
      : 'both';
  }, [searchParams]);
  const location = searchParams.get('location') ?? undefined;

  const [truth, setTruth] = useState<Truth | null>(null);
  const [buffer, setBuffer] = useState<INatObservation[]>([]);

  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [observation, setObservation] = useState<INatObservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [guess, setGuess] = useState<Partial<Record<RankKey, string>>>({});
  const [roundDetails, setRoundDetails] = useState<ReturnType<typeof computeScore> | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPossible, setTotalPossible] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const loadBatch = async (taxon: 'plants' | 'fungi') => {
    try {
      const results = await fetchRandomVerifiableObservations(
        { taxon },
        { n: BATCH_SIZE, researchGradeOnly: false, location }
      );
      return results;
    } catch (e: unknown) {
      throw e;
    }
  };

  const drawFromBuffer = (nextTaxon: 'plants' | 'fungi') => {
    if (buffer.length === 0) return null;
    const idx = Math.floor(Math.random() * buffer.length);
    const [picked] = buffer.splice(idx, 1);
    setBuffer([...buffer]);
    return picked;
  };

  const loadNext = async () => {
    setLoading(true);
    setError(null);
    setRevealed(false);
    setRoundDetails(null);
    setGuess({});
    setTruth(null);
    setCurrentPhotoIndex(0);

    const taxon = pickTaxon(gameType);

    try {
      let obs = drawFromBuffer(taxon);
      if (!obs) {
        const batch = await loadBatch(taxon);
        if (!batch.length) {
          setError('No observations found. Try another location.');
          setObservation(null);
          setBuffer([]);
          return;
        }
        obs = batch[0];
        setBuffer(batch.slice(1));
      }

      setObservation(obs);
      const baseTruth = extractTruth(obs);
      setTruth(baseTruth);
      
      if (obs.taxon?.id) {
        fetchTaxonDetails(obs.taxon.id).then((details) => {
          setTruth((prev) => prev ? { ...prev, ...details } : { ...baseTruth, ...details });
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load observation');
      setObservation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setBuffer([]);
    loadNext();
  }, [gameType, location]);

  const handleSubmit = () => {
    if (!observation) return;
    const truthValue = truth ?? extractTruth(observation);
    const result = computeScore(truthValue, guess);
    setRoundDetails(result);
    setRevealed(true);
    setTotalEarned((prev) => prev + result.earned);
    setTotalPossible((prev) => prev + result.possible);
  };

  const scorePercent = totalPossible === 0 ? 0 : Math.round((totalEarned / totalPossible) * 100);

  return (
    <div style={{ 
      backgroundColor: themeColors.background,
      minHeight: '100vh',
      paddingTop: '40px',
      paddingLeft: '16px',
      paddingRight: '16px',
      paddingBottom: '24px',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{ width: '70%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h1 style={{ 
          color: themeColors.tint,
          fontSize: '24px',
          fontWeight: '700',
          margin: '0',
          fontFamily: Fonts?.rounded ?? undefined
        }}>
          Identify the {gamePrompt[gameType]}
        </h1>
        <div style={{
          color: themeColors.icon,
          fontSize: '12px',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          marginLeft: '16px'
        }}>
          <div>iNaturalist. Available from</div>
          <a href="https://www.inaturalist.org" target="_blank" rel="noopener noreferrer" style={{
            color: themeColors.tint,
            textDecoration: 'underline',
            cursor: 'pointer'
          }}>
            https://www.inaturalist.org
          </a>
        </div>
      </div>
      <p style={{ 
        color: themeColors.text,
        fontSize: '14px',
        marginBottom: '12px'
      }}>
        Game: {gameType} • Location: {location ?? 'Anywhere'}
      </p>

      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <span style={{ 
          color: themeColors.text,
          fontSize: '14px',
          fontWeight: '600'
        }}>
          Score
        </span>
        <span style={{ 
          color: themeColors.tint,
          fontSize: '16px',
          fontWeight: '700'
        }}>
          {totalEarned}/{totalPossible} ({scorePercent}%)
        </span>
      </div>

      {loading && (
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px'
        }}> 
          <div style={{ 
            border: `3px solid ${themeColors.icon}`,
            borderTop: `3px solid ${themeColors.tint}`,
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}

      {!loading && error && (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px'
        }}> 
          <p style={{ color: themeColors.text, marginBottom: '12px' }}>{error}</p>
          <button 
            onClick={loadNext}
            style={{
              backgroundColor: themeColors.tint,
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && observation && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Photo carousel */}
            <div style={{ flex: '1 1 600px', minWidth: '300px' }}>
              <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '600px'
            }}>
              {observation.photos.length > 1 && (
                <button
                  onClick={() => setCurrentPhotoIndex((currentPhotoIndex - 1 + observation.photos.length) % observation.photos.length)}
                  style={{
                    backgroundColor: themeColors.tint,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: 'pointer',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.tabIconDefault}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColors.tint}
                >
                  ←
                </button>
              )}
              
              <div style={{ 
                width: '100%',
                height: '600px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px'
              }}>
              {observation.photos.map((photo, index) => (
                <div
                  key={photo.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: index === currentPhotoIndex ? 1 : 0,
                    transition: 'opacity 0.3s'
                  }}
                >
                  <Image
                    src={bestPhotoUrl(photo)}
                    alt={`Observation photo ${index + 1}`}
                    fill
                    style={{ objectFit: 'contain' }}
                    unoptimized
                  />
                </div>
              ))}
              </div>
              
              {observation.photos.length > 1 && (
                <button
                  onClick={() => setCurrentPhotoIndex((currentPhotoIndex + 1) % observation.photos.length)}
                  style={{
                    backgroundColor: themeColors.tint,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: 'pointer',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.tabIconDefault}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColors.tint}
                >
                  →
                </button>
              )}
            </div>
            
            {observation.photos.length > 1 && (
              <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '12px'
              }}>
                {observation.photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: index === currentPhotoIndex ? themeColors.tint : themeColors.icon,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          </div>

          {/* Guess box */}
          <div style={{ flex: '0 0 400px', minWidth: '300px' }}>
            <div style={{
            border: `1px solid ${themeColors.icon}`,
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: themeColors.card
          }}>
            <h2 style={{ 
              color: themeColors.text,
              fontSize: '16px',
              fontWeight: '700',
              marginBottom: '8px'
            }}>
              Your guess
            </h2>
            <div style={{color: themeColors.card, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(['order', 'family', 'genus', 'species'] as RankKey[]).map((rank) => (
                <div key={rank}>
                  <label style={{ 
                    color: themeColors.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'block',
                    marginBottom: '4px',
                    textTransform: 'capitalize'
                  }}>
                    {rank}
                  </label>
                  <TaxonomyInput
                    rank={rank}
                    value={guess[rank] ?? ''}
                    onChange={(text) => setGuess((g) => ({ ...g, [rank]: text }))}
                    editable={!revealed}
                    showDropdown={false}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={revealed || loading}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: revealed ? themeColors.icon : themeColors.tint,
                border: 'none',
                cursor: revealed ? 'not-allowed' : 'pointer',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!revealed) {
                  e.currentTarget.style.backgroundColor = themeColors.tabIconDefault;
                }
              }}
              onMouseLeave={(e) => {
                if (!revealed) {
                  e.currentTarget.style.backgroundColor = themeColors.tint;
                }
              }}
            >
              {revealed ? 'Submitted' : 'Submit guess'}
            </button>
          </div>
          </div>

          {/* Reveal box */}
          {revealed && roundDetails && (
            <div style={{
              border: `1px solid ${themeColors.icon}`,
              borderRadius: '12px',
              padding: '12px',
              backgroundColor: themeColors.card
            }}>
              <h2 style={{ 
                color: themeColors.text,
                fontSize: '16px',
                fontWeight: '700',
                marginBottom: '8px'
              }}>
                Answer
              </h2>
              {roundDetails.details.map((d) => (
                <div key={d.rank} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '6px'
                }}>
                  <span style={{ 
                    color: themeColors.text,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    minWidth: '60px'
                  }}>
                    {d.rank}
                  </span>
                  <span style={{ 
                    color: themeColors.text,
                    flex: 1
                  }}>
                    {d.correct}
                  </span>
                  <span style={{ 
                    color: d.hit ? 'green' : themeColors.icon,
                    fontWeight: '700',
                    minWidth: '50px',
                    textAlign: 'right'
                  }}>
                    {d.hit ? `+${d.points}` : '0'}
                  </span>
                </div>
              ))}

              <button
                onClick={loadNext}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: themeColors.tint,
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '700',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColors.tabIconDefault}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColors.tint}
              >
                Next organism
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>}>
      <GameScreen />
    </Suspense>
  );
}
