// Taxonomy lookup helper using prebuilt JSON data
// eslint-disable-next-line @typescript-eslint/no-var-requires
const genusTaxonomy: Record<string, { order: string; family: string }> = require('@/src/data/genus_taxonomy.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const familiesData: string[] = require('@/src/data/families.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generaData: string[] = require('@/src/data/genera.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ordersData: string[] = require('@/src/data/orders.json');

export function getTaxonomyForGenus(genus: string | undefined): { order?: string; family?: string } {
  if (!genus) return {};
  const normalized = genus.split(' ')[0]; // Take first part if binomial
  const entry = genusTaxonomy[normalized];
  if (!entry) return {};
  return { order: entry.order, family: entry.family };
}

export function getFamilyOptions(query: string = ''): string[] {
  const q = query.toLowerCase();
  return familiesData.filter((f) => f.toLowerCase().includes(q)).slice(0, 10);
}

export function getGeneraOptions(query: string = ''): string[] {
  const q = query.toLowerCase();
  return generaData.filter((g) => g.toLowerCase().includes(q)).slice(0, 10);
}

export function getOrderOptions(query: string = ''): string[] {
  const q = query.toLowerCase();
  return ordersData.filter((o) => o.toLowerCase().includes(q)).slice(0, 10);
}

export function getSpeciesOptions(query: string = ''): string[] {
  // Species is free-form (binomial names), so just return empty for now
  // User can type anything
  return [];
}

export function matchesOption(userInput: string, option: string): boolean {
  return userInput.toLowerCase() === option.toLowerCase();
}

export type RankKey = 'order' | 'family' | 'genus' | 'species';

export const optionFetchers: Record<RankKey, (query: string) => string[]> = {
  order: getOrderOptions,
  family: getFamilyOptions,
  genus: getGeneraOptions,
  species: getSpeciesOptions,
};
