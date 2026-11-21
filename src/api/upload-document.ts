import type { APIRoute } from '@wix/custom-extensions/types';
import { auth } from '@wix/essentials';
import { files } from '@wix/media';

interface UploadBody {
  name?: string;
  type?: string;
  base64?: string;
}

function parseBase64ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const commaIdx = input.indexOf(',');
  const clean = (commaIdx >= 0 ? input.slice(commaIdx + 1) : input).trim();
  const binary = atob(clean);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as UploadBody;
    const fileName = String(body.name ?? `document-${Date.now()}`).trim();
    const mimeType = String(body.type ?? 'application/octet-stream').trim();
    const rawBase64 = String(body.base64 ?? '').trim();

    if (!rawBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty file payload.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const bytes = parseBase64ToBytes(rawBase64);
    const elevatedGenerateUrl = auth.elevate(files.generateFileUploadUrl);
    const { uploadUrl } = await elevatedGenerateUrl(mimeType, {
      fileName,
      sizeInBytes: String(bytes.byteLength),
      filePath: '/bookings',
    });

    if (!uploadUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Upload URL was not returned by Media Manager.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const uploadTarget = `${uploadUrl}${uploadUrl.includes('?') ? '&' : '?'}filename=${encodeURIComponent(fileName)}`;
    const uploadRes = await fetch(uploadTarget, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: new Blob([bytes], { type: mimeType }),
    });

    const uploadedJson = (await uploadRes.json().catch(() => ({}))) as {
      file?: { id?: string; url?: string; displayName?: string };
      message?: string;
    };

    if (!uploadRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: uploadedJson.message || 'Media Manager upload failed.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const fileUrl = uploadedJson.file?.url || '';
    return new Response(
      JSON.stringify({
        success: true,
        fileUrl,
        publicUrl: fileUrl,
        name: uploadedJson.file?.displayName || fileName,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error ?? 'Document upload failed.');
    const message = /403|forbidden/i.test(rawMsg)
      ? 'Media upload requires Wix Media Manager permission (403). Enable "Manage Media Manager" / "Generate File Upload URL" in Wix Dev Center -> Permissions and update the app.'
      : rawMsg;
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: /403|forbidden/i.test(rawMsg) ? 403 : 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
