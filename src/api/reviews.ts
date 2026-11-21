import type { APIRoute } from '@wix/custom-extensions/types';
import { getPublicApprovedReviews } from '../server/reviews-service';

export const GET: APIRoute = async () => {
  try {
    const result = await getPublicApprovedReviews();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load customer reviews.';
    return new Response(
      JSON.stringify({ success: false, error: message, reviews: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
