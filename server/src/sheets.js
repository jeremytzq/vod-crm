// Scoped per-API packages instead of the monolithic `googleapis` package —
// that one bundles a client for every Google API in existence and is huge
// enough to cause real problems in a serverless deployment (slow cold
// starts, bundle-size limits). These two are the same generated clients,
// just packaged individually.
import { sheets } from '@googleapis/sheets';
import { drive } from '@googleapis/drive';

// Schema for the one spreadsheet each Google account gets — this is the
// entire "database" for that account. Column order here is the column
// order in the sheet.
export const TAB_SCHEMA = {
  contacts: [
    'id',
    'name',
    'email',
    'phone',
    'whatsapp_number',
    'title',
    'company_id',
    'client_type',
    'lead_stage',
    'opportunity_size',
    'project_interested',
    'birthday',
    'property_address',
    'correspondence_address',
    'cust_grade',
    'groups',
    'notes',
    'created_at',
    'updated_at',
  ],
  companies: ['id', 'name', 'domain', 'industry', 'notes', 'created_at', 'updated_at'],
  deals: [
    'id',
    'title',
    'contact_id',
    'company_id',
    'value',
    'stage',
    'close_date',
    'notes',
    'created_at',
    'updated_at',
  ],
  tasks: ['id', 'title', 'due_date', 'done', 'contact_id', 'deal_id', 'created_at', 'updated_at'],
  // "notes" doubles as the activity timeline: `type` distinguishes a plain
  // note from a logged call/WhatsApp/message/system event so the UI can
  // render each with its own icon, most-recent first.
  notes: ['id', 'entity_type', 'entity_id', 'type', 'body', 'created_at'],
};

const TAB_TITLE = {
  contacts: 'Contacts',
  companies: 'Companies',
  deals: 'Deals',
  tasks: 'Tasks',
  notes: 'Notes',
};

const SPREADSHEET_TITLE = 'VOD CRM Data';

function columnLetter(n) {
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetsApiFor(oauth2Client) {
  return sheets({ version: 'v4', auth: oauth2Client });
}

function driveApiFor(oauth2Client) {
  return drive({ version: 'v3', auth: oauth2Client });
}

async function findSpreadsheetId(drive) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and properties has { key='app' and value='vod-crm' }`,
    fields: 'files(id,name)',
    spaces: 'drive',
    pageSize: 1,
  });
  return res.data.files?.[0]?.id ?? null;
}

async function createSpreadsheet(sheetsApi, drive, googleSub) {
  const createRes = await sheetsApi.spreadsheets.create({
    requestBody: {
      properties: { title: SPREADSHEET_TITLE },
      sheets: Object.values(TAB_TITLE).map((title) => ({ properties: { title } })),
    },
  });
  const spreadsheetId = createRes.data.spreadsheetId;

  // Tag the file so findSpreadsheetId can reliably find it again later,
  // from any device/session, without us keeping our own database.
  await drive.files.update({
    fileId: spreadsheetId,
    requestBody: { properties: { app: 'vod-crm', google_sub: googleSub } },
  });

  await sheetsApi.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: Object.entries(TAB_SCHEMA).map(([tab, columns]) => ({
        range: `${TAB_TITLE[tab]}!A1`,
        values: [columns],
      })),
    },
  });

  return spreadsheetId;
}

/** Finds this Google account's CRM spreadsheet, creating it on first use. */
export async function findOrCreateSpreadsheet(oauth2Client, googleSub) {
  const drive = driveApiFor(oauth2Client);
  const existing = await findSpreadsheetId(drive);
  if (existing) return existing;
  return createSpreadsheet(sheetsApiFor(oauth2Client), drive, googleSub);
}

function rowsToObjects(values, columns) {
  const [header, ...rows] = values;
  if (!header) return [];
  return rows
    .map((row, i) => {
      const obj = { _row: i + 2 }; // +1 for header row, +1 for 1-indexing
      columns.forEach((col, idx) => {
        obj[col] = row[idx] ?? '';
      });
      return obj;
    })
    .filter((obj) => obj.id);
}

export async function listRows(oauth2Client, spreadsheetId, tab) {
  const columns = TAB_SCHEMA[tab];
  const res = await sheetsApiFor(oauth2Client).spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_TITLE[tab]}!A:${columnLetter(columns.length)}`,
  });
  return rowsToObjects(res.data.values || [], columns);
}

export async function findRowById(oauth2Client, spreadsheetId, tab, id) {
  const rows = await listRows(oauth2Client, spreadsheetId, tab);
  return rows.find((r) => r.id === id) ?? null;
}

export async function appendRow(oauth2Client, spreadsheetId, tab, record) {
  const columns = TAB_SCHEMA[tab];
  const row = columns.map((col) => record[col] ?? '');
  await sheetsApiFor(oauth2Client).spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB_TITLE[tab]}!A:${columnLetter(columns.length)}`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

export async function updateRow(oauth2Client, spreadsheetId, tab, rowNumber, record) {
  const columns = TAB_SCHEMA[tab];
  const row = columns.map((col) => record[col] ?? '');
  await sheetsApiFor(oauth2Client).spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB_TITLE[tab]}!A${rowNumber}:${columnLetter(columns.length)}${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

async function getSheetGid(sheetsApi, spreadsheetId, tabTitle) {
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
  return meta.data.sheets.find((s) => s.properties.title === tabTitle)?.properties.sheetId;
}

export async function deleteRow(oauth2Client, spreadsheetId, tab, rowNumber) {
  const sheetsApi = sheetsApiFor(oauth2Client);
  const sheetId = await getSheetGid(sheetsApi, spreadsheetId, TAB_TITLE[tab]);
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        },
      ],
    },
  });
}
