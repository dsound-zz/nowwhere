/**
 * Emoji utility functions for OpenMoji integration
 * Converts native emoji characters to OpenMoji CDN URLs
 */

/**
 * Convert a native emoji string to its hex codepoint(s)
 * @param emoji - Native emoji character (e.g. "🎷")
 * @returns Hex codepoint string (e.g. "1F3B7")
 */
export function emojiToCodepoint(emoji: string): string {
  return Array.from(emoji)
    .map((char) => {
      const codepoint = char.codePointAt(0)
      if (!codepoint) return ''
      return codepoint.toString(16).toUpperCase()
    })
    .filter(Boolean)
    .join('-')
}

/**
 * Build OpenMoji CDN URL for a given emoji
 * @param emoji - Native emoji character (e.g. "🎷")
 * @returns OpenMoji CDN URL
 */
export function getOpenMojiUrl(emoji: string): string {
  const codepoint = emojiToCodepoint(emoji)
  return `https://openmoji.org/data/color/svg/${codepoint}.svg`
}
