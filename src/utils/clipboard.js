/**
 * Copies text to the system clipboard.
 * @param {string} text
 */
export async function copyTextToClipboard(text) {
  await navigator.clipboard.writeText(text);
}
