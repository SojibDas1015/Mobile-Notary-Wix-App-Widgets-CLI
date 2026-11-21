import { collections, items } from '@wix/data';
import { auth } from '@wix/essentials';
import { mapOwnerSettings, mapReview } from '../extensions/dashboard/cms/mappers';
import {
  COLLECTION_IDS,
  type OwnerSettingsRecord,
  type ReviewRecord,
} from '../extensions/dashboard/cms/types';
import { resolveGoogleApiKeys } from './notary-service';

type RawItem = Record<string, unknown>;

let reviewsCollectionEnsured = false;

async function elevatedQueryAllReviews(): Promise<RawItem[]> {
  const all: RawItem[] = [];
  let skip = 0;
  const limit = 100;
  const elevatedQuery = auth.elevate(items.query);

  while (true) {
    const res = await elevatedQuery(COLLECTION_IDS.REVIEWS).limit(limit).skip(skip).find();
    const batch = (res.items ?? []) as RawItem[];
    all.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
  }

  return all;
}

async function readOwnerSettingsRow(): Promise<{ raw: RawItem; mapped: OwnerSettingsRecord } | null> {
  const elevatedQuery = auth.elevate(items.query);
  const res = await elevatedQuery(COLLECTION_IDS.SETTINGS).limit(20).find();
  const rows = (res.items ?? []) as RawItem[];
  const preferred =
    rows.find((r) => r.ID === 'dmn-settings-01' || r.settingsId === 'dmn-settings-01') ?? rows[0];
  if (!preferred) return null;
  return { raw: preferred, mapped: mapOwnerSettings(preferred) };
}

export async function ensureCustomerReviewsCollection(): Promise<void> {
  if (reviewsCollectionEnsured) return;

  try {
    const elevatedQuery = auth.elevate(items.query);
    await elevatedQuery(COLLECTION_IDS.REVIEWS).limit(1).find();
    reviewsCollectionEnsured = true;
    return;
  } catch (queryErr: unknown) {
    const rawMsg =
      queryErr instanceof Error
        ? queryErr.message
        : JSON.stringify(queryErr ?? '');
    const isNotFound = /WDE0025|not\s*found|does\s*not\s*exist|404/i.test(rawMsg);
    if (!isNotFound) {
      // Try create only if it might be missing; otherwise surface a helpful hint
    }
  }

  try {
    const elevatedCreateCol = auth.elevate(collections.createDataCollection);
    await elevatedCreateCol({
      _id: COLLECTION_IDS.REVIEWS,
      displayName: 'CustomerReviews',
      displayField: 'reviewerName',
      fields: [
        { key: 'title', displayName: 'Title', type: 'TEXT' },
        { key: 'reviewKey', displayName: 'Review Key', type: 'TEXT' },
        { key: 'reviewerName', displayName: 'Reviewer Name', type: 'TEXT' },
        { key: 'rating', displayName: 'Rating', type: 'NUMBER' },
        { key: 'reviewText', displayName: 'Review Text', type: 'TEXT' },
        { key: 'relativeTime', displayName: 'Relative Time', type: 'TEXT' },
        { key: 'reviewDate', displayName: 'Review Date', type: 'DATETIME' },
        { key: 'source', displayName: 'Source', type: 'TEXT' },
        { key: 'profilePhotoUrl', displayName: 'Profile Photo URL', type: 'TEXT' },
        { key: 'approved', displayName: 'Approved', type: 'BOOLEAN' },
        { key: 'sortOrder', displayName: 'Sort Order', type: 'NUMBER' },
      ],
      permissions: {
        read: 'ANYONE',
        insert: 'ADMIN',
        update: 'ADMIN',
        remove: 'ADMIN',
      },
    });
    reviewsCollectionEnsured = true;
  } catch {
    throw new Error(
      'CustomerReviews collection was not found in Wix CMS. Please create a CMS collection with ID "CustomerReviews" in Wix Dashboard -> CMS -> Create Collection, then click Sync again.',
    );
  }
}

export async function getReviewsConfig(): Promise<{
  googlePlaceId: string;
  googleReviewLink: string;
  hasApiKey: boolean;
}> {
  const row = await readOwnerSettingsRow().catch(() => null);
  const keys = await resolveGoogleApiKeys(row?.mapped);
  return {
    googlePlaceId: row?.mapped.googlePlaceId || '',
    googleReviewLink: row?.mapped.googleReviewLink || '',
    hasApiKey: Boolean(keys.placesApiKey || keys.routesApiKey),
  };
}

export async function saveReviewsConfig(input: {
  googlePlaceId?: string;
  googleReviewLink?: string;
}): Promise<{ googlePlaceId: string; googleReviewLink: string }> {
  const googlePlaceId = String(input.googlePlaceId ?? '').trim();
  const googleReviewLink = String(input.googleReviewLink ?? '').trim();
  const row = await readOwnerSettingsRow();

  if (row?.raw && typeof row.raw._id === 'string' && row.raw._id.trim()) {
    const elevatedUpdate = auth.elevate(items.update);
    await elevatedUpdate(COLLECTION_IDS.SETTINGS, {
      ...row.raw,
      _id: row.raw._id,
      googlePlaceId,
      googleReviewLink,
    });
  } else {
    const elevatedInsert = auth.elevate(items.insert);
    await elevatedInsert(COLLECTION_IDS.SETTINGS, {
      title: 'Direct Mobile Notary Dispatch Settings',
      ID: 'dmn-settings-01',
      googlePlaceId,
      googleReviewLink,
    });
  }

  return { googlePlaceId, googleReviewLink };
}

export interface PlaceSearchCandidate {
  placeId: string;
  name: string;
  address: string;
  googleMapsUri: string;
  rating?: number;
  userRatingCount?: number;
}

export async function lookupGooglePlaceId(query: string): Promise<{
  candidates: PlaceSearchCandidate[];
}> {
  const cleanQuery = String(query ?? '').trim();
  if (!cleanQuery) {
    throw new Error('Please enter a business name or city to search.');
  }

  const row = await readOwnerSettingsRow().catch(() => null);
  const keys = await resolveGoogleApiKeys(row?.mapped);
  const apiKey = keys.placesApiKey || keys.routesApiKey;
  if (!apiKey) {
    throw new Error('Google Places API Key is not configured in Wix Secrets or OwnerSettings.');
  }

  // Try Google Places API (New) Text Search first
  const newRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: cleanQuery, maxResultCount: 5 }),
  });

  if (newRes.ok) {
    const data = (await newRes.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        googleMapsUri?: string;
        rating?: number;
        userRatingCount?: number;
      }>;
    };
    const candidates: PlaceSearchCandidate[] = (data.places ?? [])
      .filter((p) => Boolean(p.id))
      .map((p) => ({
        placeId: String(p.id),
        name: String(p.displayName?.text ?? ''),
        address: String(p.formattedAddress ?? ''),
        googleMapsUri: String(p.googleMapsUri ?? ''),
        rating: typeof p.rating === 'number' ? p.rating : undefined,
        userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
      }));
    return { candidates };
  }

  // Fallback to Legacy Places Text Search
  const legacyUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(cleanQuery)}&key=${encodeURIComponent(apiKey)}`;
  const legacyRes = await fetch(legacyUrl);
  const legacyJson = (await legacyRes.json()) as {
    status?: string;
    error_message?: string;
    results?: Array<{
      place_id?: string;
      name?: string;
      formatted_address?: string;
      rating?: number;
      user_ratings_total?: number;
    }>;
  };

  if (!legacyRes.ok || (legacyJson.status && legacyJson.status !== 'OK' && legacyJson.status !== 'ZERO_RESULTS')) {
    throw new Error(
      legacyJson.error_message || `Google Places search failed (${legacyJson.status || legacyRes.status}).`,
    );
  }

  const candidates: PlaceSearchCandidate[] = (legacyJson.results ?? [])
    .slice(0, 5)
    .filter((p) => Boolean(p.place_id))
    .map((p) => ({
      placeId: String(p.place_id),
      name: String(p.name ?? ''),
      address: String(p.formatted_address ?? ''),
      googleMapsUri: `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(String(p.place_id))}`,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      userRatingCount: typeof p.user_ratings_total === 'number' ? p.user_ratings_total : undefined,
    }));

  return { candidates };
}

interface NormalizedGoogleReview {
  reviewKey: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  relativeTime: string;
  reviewDate: Date;
  profilePhotoUrl: string;
}

function makeReviewKey(author: string, timeVal: string | number): string {
  const safeAuthor = author.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'client';
  const safeTime = String(timeVal).replace(/[^a-zA-Z0-9_-]+/g, '');
  return `google_${safeAuthor}_${safeTime}`;
}

async function fetchReviewsFromGooglePlaces(
  placeId: string,
  apiKey: string,
): Promise<{
  placeName: string;
  googleMapsUri: string;
  reviews: NormalizedGoogleReview[];
}> {
  // 1. Try Places API (New)
  const newUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const newRes = await fetch(newUrl, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,googleMapsUri,reviews',
    },
  });

  if (newRes.ok) {
    const data = (await newRes.json()) as {
      displayName?: { text?: string };
      googleMapsUri?: string;
      reviews?: Array<{
        name?: string;
        relativePublishTimeDescription?: string;
        rating?: number;
        text?: { text?: string };
        originalText?: { text?: string };
        authorAttribution?: { displayName?: string; photoUri?: string };
        publishTime?: string;
      }>;
    };

    const reviews: NormalizedGoogleReview[] = (data.reviews ?? []).map((r) => {
      const author = String(r.authorAttribution?.displayName ?? 'Google Reviewer').trim();
      const pubTime = r.publishTime ? new Date(r.publishTime) : new Date();
      const validDate = !Number.isNaN(pubTime.getTime()) ? pubTime : new Date();
      const rawKey = r.name || makeReviewKey(author, r.publishTime || validDate.getTime());
      return {
        reviewKey: rawKey,
        reviewerName: author,
        rating: Math.max(1, Math.min(5, Math.round(Number(r.rating ?? 5)))),
        reviewText: String(r.originalText?.text ?? r.text?.text ?? '').trim(),
        relativeTime: String(r.relativePublishTimeDescription ?? '').trim(),
        reviewDate: validDate,
        profilePhotoUrl: String(r.authorAttribution?.photoUri ?? '').trim(),
      };
    });

    return {
      placeName: String(data.displayName?.text ?? ''),
      googleMapsUri: String(data.googleMapsUri ?? ''),
      reviews,
    };
  }

  // 2. Fallback to Places API (Legacy)
  const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,url,reviews&key=${encodeURIComponent(apiKey)}`;
  const legacyRes = await fetch(legacyUrl);
  const legacyJson = (await legacyRes.json()) as {
    status?: string;
    error_message?: string;
    result?: {
      name?: string;
      url?: string;
      reviews?: Array<{
        author_name?: string;
        profile_photo_url?: string;
        rating?: number;
        relative_time_description?: string;
        text?: string;
        time?: number;
      }>;
    };
  };

  if (!legacyRes.ok || (legacyJson.status && legacyJson.status !== 'OK')) {
    const newErr = await newRes.text().catch(() => '');
    throw new Error(
      legacyJson.error_message ||
        `Google Places API error (${legacyJson.status || newRes.status}): ${newErr.slice(0, 140)}`,
    );
  }

  const reviews: NormalizedGoogleReview[] = (legacyJson.result?.reviews ?? []).map((r) => {
    const author = String(r.author_name ?? 'Google Reviewer').trim();
    const epochMs = typeof r.time === 'number' ? r.time * 1000 : Date.now();
    const validDate = new Date(epochMs);
    return {
      reviewKey: makeReviewKey(author, r.time ?? epochMs),
      reviewerName: author,
      rating: Math.max(1, Math.min(5, Math.round(Number(r.rating ?? 5)))),
      reviewText: String(r.text ?? '').trim(),
      relativeTime: String(r.relative_time_description ?? '').trim(),
      reviewDate: validDate,
      profilePhotoUrl: String(r.profile_photo_url ?? '').trim(),
    };
  });

  return {
    placeName: String(legacyJson.result?.name ?? ''),
    googleMapsUri: String(legacyJson.result?.url ?? ''),
    reviews,
  };
}

export async function syncGoogleReviews(placeIdOverride?: string): Promise<{
  success: true;
  placeName: string;
  googleMapsUri: string;
  fetchedCount: number;
  addedCount: number;
  updatedCount: number;
}> {
  await ensureCustomerReviewsCollection();

  const row = await readOwnerSettingsRow().catch(() => null);
  const keys = await resolveGoogleApiKeys(row?.mapped);
  const apiKey = keys.placesApiKey || keys.routesApiKey;
  if (!apiKey) {
    throw new Error('Google Places API Key is not configured in Wix Secrets or OwnerSettings.');
  }

  const placeId = String(placeIdOverride || row?.mapped.googlePlaceId || '').trim();
  if (!placeId) {
    throw new Error('Please enter your Google Place ID before syncing reviews.');
  }

  const fetched = await fetchReviewsFromGooglePlaces(placeId, apiKey);

  // Persist Place ID & Google Maps link if helpful
  const nextReviewLink = row?.mapped.googleReviewLink || fetched.googleMapsUri;
  if (
    placeId !== (row?.mapped.googlePlaceId || '') ||
    (nextReviewLink && nextReviewLink !== (row?.mapped.googleReviewLink || ''))
  ) {
    await saveReviewsConfig({
      googlePlaceId: placeId,
      googleReviewLink: nextReviewLink,
    });
  }

  const existingRaw = await elevatedQueryAllReviews();
  const byKey = new Map<string, RawItem>();
  for (const item of existingRaw) {
    const k = typeof item.reviewKey === 'string' ? item.reviewKey.trim() : '';
    if (k) byKey.set(k, item);
  }

  const elevatedInsert = auth.elevate(items.insert);
  const elevatedUpdate = auth.elevate(items.update);

  let addedCount = 0;
  let updatedCount = 0;
  let nextSort = existingRaw.length + 1;

  for (const rev of fetched.reviews) {
    const existing = byKey.get(rev.reviewKey);
    if (existing && typeof existing._id === 'string' && existing._id.trim()) {
      // Update text/rating/relativeTime while preserving the owner's approved toggle and sortOrder
      await elevatedUpdate(COLLECTION_IDS.REVIEWS, {
        ...existing,
        _id: existing._id,
        title: rev.reviewerName,
        reviewerName: rev.reviewerName,
        rating: rev.rating,
        reviewText: rev.reviewText,
        relativeTime: rev.relativeTime,
        reviewDate: rev.reviewDate,
        profilePhotoUrl: rev.profilePhotoUrl,
        source: 'Google',
      });
      updatedCount += 1;
    } else {
      await elevatedInsert(COLLECTION_IDS.REVIEWS, {
        title: rev.reviewerName,
        reviewKey: rev.reviewKey,
        reviewerName: rev.reviewerName,
        rating: rev.rating,
        reviewText: rev.reviewText,
        relativeTime: rev.relativeTime,
        reviewDate: rev.reviewDate,
        source: 'Google',
        profilePhotoUrl: rev.profilePhotoUrl,
        approved: false,
        sortOrder: nextSort++,
      });
      addedCount += 1;
    }
  }

  return {
    success: true,
    placeName: fetched.placeName,
    googleMapsUri: fetched.googleMapsUri || nextReviewLink,
    fetchedCount: fetched.reviews.length,
    addedCount,
    updatedCount,
  };
}

export async function getPublicApprovedReviews(): Promise<{
  success: true;
  reviews: ReviewRecord[];
  averageRating: number;
  totalApproved: number;
  googleReviewLink: string;
}> {
  const row = await readOwnerSettingsRow().catch(() => null);
  const googleReviewLink = row?.mapped.googleReviewLink || '';

  let rawItems: RawItem[] = [];
  try {
    rawItems = await elevatedQueryAllReviews();
  } catch {
    return {
      success: true,
      reviews: [],
      averageRating: 0,
      totalApproved: 0,
      googleReviewLink,
    };
  }

  const approvedReviews = rawItems
    .map(mapReview)
    .filter((r) => r.approved)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      const ta = a.reviewDate ? new Date(a.reviewDate).getTime() : 0;
      const tb = b.reviewDate ? new Date(b.reviewDate).getTime() : 0;
      return tb - ta;
    });

  const totalApproved = approvedReviews.length;
  const averageRating =
    totalApproved > 0
      ? Math.round(
          (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / totalApproved) * 10,
        ) / 10
      : 0;

  return {
    success: true,
    reviews: approvedReviews,
    averageRating,
    totalApproved,
    googleReviewLink,
  };
}
