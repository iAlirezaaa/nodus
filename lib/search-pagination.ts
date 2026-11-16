/** Parse a requested search-results page without changing the document.
 * Read Persian and Arabic-Indic digits in text inputs (type=number rejects them).
 * Return null to restore the current page for incomplete/invalid input.
 */
export function searchPageOffsetFromInput(
  input: string,
  total: number,
  pageSize: number,
): number | null {
  if (!Number.isSafeInteger(total) || total < 1 ||
      !Number.isSafeInteger(pageSize) || pageSize < 1) return null;
  const value = input.trim()
    .replace(/[\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x0660));
  if (!/^[0-9]+$/.test(value)) return null;
  const last = Math.ceil(total / pageSize);
  const requested = Number(value);
  const page = Number.isFinite(requested)
    ? Math.max(1, Math.min(last, requested))
    : last;
  return (page - 1) * pageSize;
}
