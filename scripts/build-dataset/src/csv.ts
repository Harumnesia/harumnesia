export type CsvRecord = Record<string, string>;

export function parseDelimitedRecords(
  text: string,
  delimiter: string,
): CsvRecord[] {
  if (delimiter.length !== 1) {
    throw new Error('CSV delimiter must be exactly one character.');
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error('CSV input contains an unterminated quoted field.');
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((candidate) =>
    candidate.some((value) => value !== ''),
  );
  const headers = nonEmptyRows.shift();
  if (!headers || headers.length === 0) {
    throw new Error('CSV input does not contain a header row.');
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error('CSV input contains duplicate headers.');
  }

  return nonEmptyRows.map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}.`,
      );
    }

    return Object.fromEntries(
      headers.map((header, columnIndex) => [header, values[columnIndex] ?? '']),
    );
  });
}

export function assertRequiredHeaders(
  records: CsvRecord[],
  requiredHeaders: readonly string[],
  datasetName: string,
): void {
  const firstRecord = records[0];
  if (!firstRecord) {
    throw new Error(`${datasetName} contains no data records.`);
  }

  const missingHeaders = requiredHeaders.filter(
    (header) => !(header in firstRecord),
  );
  if (missingHeaders.length > 0) {
    throw new Error(
      `${datasetName} is missing headers: ${missingHeaders.join(', ')}`,
    );
  }
}
