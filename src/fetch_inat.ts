


export type INatObservation = {
  id: number;
  uri: string;
  species: string;
  species_guess?: string | null;
  photos: Array<{
    id: number;
    url: string;
    original_url?: string;
    license_code?: string | null;
  }>;
  taxon?: {
    id: number;
    name: string;
    preferred_common_name?: string;
    rank: string;
    ancestors?: Array<{
      id: number;
      name: string;
      preferred_common_name?: string;
      rank: string;
    }>;
  };
};


export type FetchINatOpts = {
  taxon: "plants" | "fungi";
  location?: string; // US state, country name, or place_id
};


const TAXON_ID: Record<FetchINatOpts["taxon"], number> = {
  plants: 47126, // Plantae
  fungi: 47170,  // Fungi
};

type INatApiPhoto = {
  id: number;
  url: string;
  original_url?: string;
  license_code?: string | null;
};

type INatApiObservation = {
  id: number;
  uri: string;
  species_guess: string | null;
  photos: INatApiPhoto[];
  taxon?: {
    id: number;
    name: string;
    preferred_common_name?: string;
    rank: string;
    ancestors?: Array<{
      id: number;
      name: string;
      preferred_common_name?: string;
      rank: string;
    }>;
  };
};

export async function fetchRandomVerifiableObservations(
  opts: FetchINatOpts,
  {
    n = 24,
    location,
  }: { n?: number; researchGradeOnly?: boolean; location?: string } = {}
): Promise<INatObservation[]> {
  const url = new URL("https://api.inaturalist.org/v1/observations");

  url.searchParams.set("iconic_taxa", String(TAXON_ID[opts.taxon]));

  url.searchParams.set("verifiable", "true");

  url.searchParams.set("hrank", "species");

  url.searchParams.set("quality_grade", "research");

  if (location) {
    url.searchParams.set("place", location);
  }

  url.searchParams.set("photos", "true");
  url.searchParams.set("order_by", "random");

  // Request lean fields but include ancestors for scoring
  url.searchParams.set(
    "fields",
    "id,uri,species_guess,photos{id,url,original_url,license_code},taxon{id,name,preferred_common_name,rank,ancestors{id,name,preferred_common_name,rank}}"
  );

  const perPage = Math.min(Math.max(n, 1), 200);
  url.searchParams.set("per_page", String(perPage));

  const randomPage = Math.floor(Math.random() * 100) + 1;
  url.searchParams.set("page", String(randomPage));

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`iNaturalist API error ${res.status}: ${text}`);
  }

  const data: { results: INatApiObservation[] } = await res.json();

  return (data.results ?? [])
    .filter((o) => Array.isArray(o.photos) && o.photos.length > 0)
    .map((o): INatObservation => {
      const species =
        o.taxon?.preferred_common_name ||
        o.taxon?.name ||
        o.species_guess ||
        "Unknown";

      return {
        id: o.id,
        uri: o.uri,
        species_guess: o.species_guess,
        species,
        photos: (o.photos ?? []).map((p) => ({
          id: p.id,
          url: p.url,
          original_url: p.original_url,
          license_code: p.license_code ?? null,
        })),
        taxon: o.taxon
          ? {
              id: o.taxon.id,
              name: o.taxon.name,
              preferred_common_name: o.taxon.preferred_common_name,
              rank: o.taxon.rank,
              ancestors: o.taxon.ancestors,
            }
          : undefined,
      };
    });
}

export type TaxonDetails = {
  family?: string;
  order?: string;
};

export async function fetchTaxonDetails(taxonId: number): Promise<TaxonDetails> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa/${taxonId}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`Failed to fetch taxon ${taxonId}: ${res.status}`);
      return {};
    }
    
    const data: { results?: Array<{ ancestors?: Array<{ name: string; rank: string }> }> } = await res.json();
    const ancestors = data.results?.[0]?.ancestors ?? [];
    
    const family = ancestors.find((a) => a.rank === 'family')?.name;
    const order = ancestors.find((a) => a.rank === 'order')?.name;
    
    return { family, order };
  } catch (error) {
    console.warn(`Error fetching taxon details for ${taxonId}:`, error);
    return {};
  }
}