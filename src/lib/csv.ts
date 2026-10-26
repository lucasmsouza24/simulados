/** RFC 4180 parser: quoted fields, escaped quotes, commas and line breaks inside quotes, optional BOM. */
export function parseCsv(text: string): Record<string, string>[] {
  const source = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header = [], ...body] = rows;
  return body
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((col, j) => [col.trim(), r[j] ?? ''])));
}

// Spreadsheets execute cells starting with these characters as formulas (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number): string {
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>, header?: readonly string[]): string {
  const all = header ? [header, ...rows] : rows;
  return all.map((r) => r.map(escapeCsvCell).join(',')).join('\n') + '\n';
}
