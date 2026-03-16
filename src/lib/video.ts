/**
 * src/lib/video.ts
 *
 * Shared video URL parsing and embed-URL generation.
 * Used by both SSR page templates and client-side scripts.
 *
 * Currently supports Google Drive. Structured so that adding
 * YouTube, Vimeo, Cloudflare R2, or Bunny Stream only requires
 * adding a new branch in parseVideoUrl() — the database schema
 * and UI components don't need to change.
 *
 * ─── Future extensions ────────────────────────────────────────
 *  YouTube unlisted:  embed → https://www.youtube.com/embed/VIDEO_ID
 *  Vimeo private:     embed → https://player.vimeo.com/video/VIDEO_ID
 *  Cloudflare R2:     use a <video> tag pointing to the R2 public URL
 *  Bunny Stream:      embed → https://iframe.mediadelivery.net/embed/LIB_ID/VIDEO_ID
 */

export type VideoProvider = 'google_drive' | 'youtube' | 'vimeo' | 'direct' | 'unknown';

export interface VideoInfo {
  provider:     VideoProvider;
  /** The extracted platform-specific ID (Drive file ID, YouTube video ID, etc.) */
  fileId:       string | null;
  /** Ready-to-use iframe src URL, or null if we cannot derive one */
  embedUrl:     string | null;
  /** Thumbnail image URL if available (YouTube only for now) */
  thumbnailUrl: string | null;
}

// ── Google Drive ──────────────────────────────────────────────────────────────

/**
 * Extract the file ID from a Google Drive / Docs URL.
 * Handles the two common share-link formats:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/open?id=FILE_ID
 */
export function extractDriveFileId(url: string): string | null {
  // /d/FILE_ID/ pattern (most common share links and preview URLs)
  const filePathMatch = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (filePathMatch) return filePathMatch[1];

  // ?id=FILE_ID or &id=FILE_ID pattern (older "open?id=" links)
  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (idParamMatch) return idParamMatch[1];

  return null;
}

// ── YouTube ───────────────────────────────────────────────────────────────────

/** Extract YouTube video ID from any standard YouTube URL. */
export function extractYouTubeId(url: string): string | null {
  // Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

// ── Vimeo ─────────────────────────────────────────────────────────────────────

/** Extract Vimeo video ID from a standard Vimeo URL. */
export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

// ── Main parser ───────────────────────────────────────────────────────────────

/**
 * Parse any supported video URL into structured info including the embed URL.
 *
 * Usage (SSR template):
 *   import { parseVideoUrl } from '../../lib/video';
 *   const info = parseVideoUrl(recording.video_url);
 *   // info.embedUrl → use as <iframe src={info.embedUrl}>
 *
 * Usage (client script, after bundling):
 *   import { parseVideoUrl } from '../lib/video';
 */
export function parseVideoUrl(url: string): VideoInfo {
  if (!url?.trim()) {
    return { provider: 'unknown', fileId: null, embedUrl: null, thumbnailUrl: null };
  }

  // ── Google Drive ──────────────────────────────────────────────────────────
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    const fileId = extractDriveFileId(url);
    return {
      provider:     'google_drive',
      fileId,
      // /preview endpoint gives the embedded video player without Drive UI chrome
      embedUrl:     fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null,
      thumbnailUrl: null,
    };
  }

  // ── YouTube ───────────────────────────────────────────────────────────────
  // (Future support — uncomment when needed)
  // if (url.includes('youtube.com') || url.includes('youtu.be')) {
  //   const videoId = extractYouTubeId(url);
  //   return {
  //     provider:     'youtube',
  //     fileId:       videoId,
  //     embedUrl:     videoId ? `https://www.youtube.com/embed/${videoId}` : null,
  //     thumbnailUrl: videoId
  //       ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  //       : null,
  //   };
  // }

  // ── Vimeo ─────────────────────────────────────────────────────────────────
  // (Future support — uncomment when needed)
  // if (url.includes('vimeo.com')) {
  //   const videoId = extractVimeoId(url);
  //   return {
  //     provider:     'vimeo',
  //     fileId:       videoId,
  //     embedUrl:     videoId ? `https://player.vimeo.com/video/${videoId}` : null,
  //     thumbnailUrl: null,
  //   };
  // }

  // ── Unknown / direct URL (fallback) ──────────────────────────────────────
  return { provider: 'unknown', fileId: null, embedUrl: null, thumbnailUrl: null };
}

/**
 * Validate that a URL looks like a Google Drive sharing link.
 * Returns a warning string, or null if it looks fine.
 */
export function validateVideoUrl(url: string): string | null {
  if (!url?.trim()) return 'URL is required.';
  const isDrive  = url.includes('drive.google.com') || url.includes('docs.google.com');
  const isYT     = url.includes('youtube.com') || url.includes('youtu.be');
  const isVimeo  = url.includes('vimeo.com');
  if (!isDrive && !isYT && !isVimeo) {
    return 'This doesn\'t look like a Google Drive link. Make sure sharing is set to "Anyone with the link can view."';
  }
  if (isDrive && !extractDriveFileId(url)) {
    return 'Could not extract a file ID from this Google Drive link. Please copy the full sharing URL.';
  }
  return null;
}
