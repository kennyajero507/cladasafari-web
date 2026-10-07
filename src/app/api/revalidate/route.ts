import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Webhook called by the Django API after any admin write, so published
 * changes appear on the public site without waiting for the time-based
 * revalidation window.
 *
 * Next 15: revalidateTag() takes a SINGLE argument. The two-argument form,
 * updateTag() and cacheLife() are Next 16 APIs and will throw here.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json(
      { success: false, error: { message: 'Revalidation is not configured.' } },
      { status: 501 }
    );
  }

  if (request.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid revalidation secret.' } },
      { status: 401 }
    );
  }

  let tags: unknown;
  try {
    ({ tags } = await request.json());
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Expected a JSON body.' } },
      { status: 400 }
    );
  }

  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
    return NextResponse.json(
      { success: false, error: { message: '`tags` must be an array of strings.' } },
      { status: 400 }
    );
  }

  for (const tag of tags as string[]) {
    revalidateTag(tag);
  }

  return NextResponse.json({ success: true, data: { revalidated: tags, at: Date.now() } });
}
