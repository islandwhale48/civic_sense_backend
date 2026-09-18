import AuthorityModel from '../models/Authority.js';

/**
 * Generate a clean, readable Ward ID from ward name
 * e.g. "Central Ward #14" -> "WARD-CENTRAL-14"
 * e.g. "Green Park Ward #22" -> "WARD-GREENPARK-22"
 * e.g. "Ward #9" -> "WARD-9"
 */
export function generateWardId(wardName) {
  if (!wardName) return `WARD-${Math.floor(100 + Math.random() * 900)}`;

  const clean = wardName
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const words = clean.split(' ').filter(w => w !== 'WARD');
  let slug = words.join('');
  if (!slug) slug = `${Math.floor(100 + Math.random() * 900)}`;

  return `WARD-${slug}`;
}

/**
 * Generate a user-friendly authority password
 * e.g. "WardPass_8471"
 */
export function generateWardPassword(wardName) {
  const numPart = Math.floor(1000 + Math.random() * 9000);
  return `WardPass_${numPart}`;
}

/**
 * Check if a Ward Authority account exists for a given ward.
 * If YES: returns existing ward account credentials.
 * If NO: automatically generates ward_id + password and stores credentials in DB/store.
 */
export async function ensureWardAuthorityAccount(wardName, localBodyName) {
  const cleanWardName = wardName || 'Central Ward #1';
  const cleanLocalBody = localBodyName || `${cleanWardName} Local Body`;

  // 1. Check if authority exists
  const existing = await AuthorityModel.findByWardName(cleanWardName);
  if (existing) {
    return {
      isNew: false,
      authority: existing
    };
  }

  // 2. Generate new Ward ID & Password if not found
  let wardId = generateWardId(cleanWardName);

  // Ensure ward_id is unique
  const existingById = await AuthorityModel.findByWardId(wardId);
  if (existingById) {
    wardId = `${wardId}-${Math.floor(10 + Math.random() * 90)}`;
  }

  const password = generateWardPassword(cleanWardName);

  const newAuthorityData = {
    ward_id: wardId,
    ward_name: cleanWardName,
    local_body: cleanLocalBody,
    password: password,
    department: 'Civic Administration & Maintenance Department',
    createdAt: new Date().toISOString()
  };

  const createdDoc = await AuthorityModel.create(newAuthorityData);
  console.log(`✨ Created new Ward Authority account: [${createdDoc.ward_id}] for "${cleanWardName}" with Password: ${password}`);

  return {
    isNew: true,
    authority: createdDoc
  };
}
