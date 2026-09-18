import AuthorityModel from '../models/Authority.js';
import { success, error } from '../helpers/responseHelper.js';

/**
 * POST /api/authority/login
 * Log in as a Ward Authority using ward_id and password
 */
export async function authorityLogin(req, res) {
  try {
    const { ward_id, wardId, username, password } = req.body;
    const inputId = (ward_id || wardId || username || '').trim();
    const inputPass = (password || '').trim();

    if (!inputId || !inputPass) {
      return error(res, 'Ward ID (or Username) and Password are required', 400);
    }

    // Try finding by ward_id first, then by ward_name
    let authority = await AuthorityModel.findByWardId(inputId);
    if (!authority) {
      authority = await AuthorityModel.findByWardName(inputId);
    }

    if (!authority) {
      return error(res, `No Ward Authority account found matching ID "${inputId}"`, 401);
    }

    if (authority.password !== inputPass) {
      return error(res, 'Invalid password for this Ward Authority account', 401);
    }

    // Generate a simple auth token
    const token = `ward_auth_token_${authority.ward_id}_${Date.now()}`;

    return success(res, {
      token,
      authority: {
        ward_id: authority.ward_id,
        ward_name: authority.ward_name,
        local_body: authority.local_body,
        department: authority.department || 'Civic Administration Department',
        createdAt: authority.createdAt
      }
    }, `Successfully authenticated as ${authority.ward_name} Authority.`);
  } catch (err) {
    console.error('Error during authority login:', err);
    return error(res, 'Server error during authority authentication', 500);
  }
}

/**
 * GET /api/authority/accounts
 * Retrieve list of all registered Ward Authority accounts (with credentials for demo testing)
 */
export async function getRegisteredAuthorities(req, res) {
  try {
    const authorities = await AuthorityModel.findAll();
    return success(res, {
      authorities: authorities.map(a => ({
        ward_id: a.ward_id,
        ward_name: a.ward_name,
        local_body: a.local_body,
        password: a.password,
        department: a.department || 'Civic Administration'
      }))
    }, 'Fetched registered Ward Authority accounts.');
  } catch (err) {
    console.error('Error fetching authority accounts:', err);
    return error(res, 'Failed to fetch registered authority accounts', 500);
  }
}

/**
 * GET /api/authority/me
 * Validate session or return authority profile info
 */
export async function getAuthorityProfile(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    const wardIdHeader = req.headers['x-ward-id'] || req.query.ward_id || '';

    if (!wardIdHeader && !authHeader) {
      return error(res, 'Not authenticated', 401);
    }

    const wardId = wardIdHeader || authHeader.replace('Bearer ', '');
    const authority = await AuthorityModel.findByWardId(wardId);

    if (!authority) {
      return error(res, 'Authority session invalid or expired', 404);
    }

    return success(res, { authority }, 'Authority profile fetched.');
  } catch (err) {
    return error(res, 'Failed to retrieve authority profile', 500);
  }
}
