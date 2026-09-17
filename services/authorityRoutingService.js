import pool, { checkDbConnected } from '../config/db.js';

// Haversine formula for spatial distance (in meters)
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 1. Reverse Geocoding: Get State, District, Locality, Address
 */
export async function reverseGeocodeLocation(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const defaultGeo = {
    address: `Location near (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    locality: 'Central Sector',
    district: 'Central District',
    state: 'National Capital Territory',
    postcode: '',
    lat,
    lng
  };

  if (isNaN(lat) || isNaN(lng)) return defaultGeo;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        headers: { 'User-Agent': 'CivicSense-App/1.0' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};

      const state = a.state || a.region || 'State Jurisdiction';
      const district = a.state_district || a.district || a.county || a.city || 'District Zone';
      const locality = a.suburb || a.neighbourhood || a.residential || a.village || a.town || a.city_district || 'Locality';
      const road = a.road || a.pedestrian || a.subdistrict || '';

      const fullAddr = [road, locality, district, state].filter(Boolean).join(', ');

      return {
        address: fullAddr || defaultGeo.address,
        locality,
        district,
        state,
        postcode: a.postcode || '',
        rawAddress: a,
        lat,
        lng
      };
    }
  } catch (err) {
    console.warn('OSM reverse geocode notice: Using spatial location fallback');
  }

  return defaultGeo;
}

/**
 * 2. GIS Jurisdiction Classification
 * Determines whether location falls under Municipality / Corporation, Gram Panchayat (Rural), or Block
 */
export function determineJurisdiction(geoData) {
  const { rawAddress, district, locality } = geoData;
  const rawStr = JSON.stringify(rawAddress || {}).toLowerCase();

  // Check if Urban Corporation / Municipality
  if (
    rawStr.includes('city') ||
    rawStr.includes('municipality') ||
    rawStr.includes('corporation') ||
    rawStr.includes('metro') ||
    rawStr.includes('urban')
  ) {
    return {
      type: 'Municipality / Corporation',
      code: 'URBAN_CORP',
      name: `${district || locality} Municipal Corporation`
    };
  }

  // Check if Rural Gram Panchayat
  if (
    rawStr.includes('village') ||
    rawStr.includes('panchayat') ||
    rawStr.includes('gram') ||
    rawStr.includes('rural')
  ) {
    return {
      type: 'Gram Panchayat (Rural)',
      code: 'GRAM_PANCHAYAT',
      name: `${locality || district} Gram Panchayat Board`
    };
  }

  // Default to Municipal / Local Civic Body
  return {
    type: 'Municipality / Local Body',
    code: 'MUNICIPAL_BODY',
    name: `${district || locality} Municipal Body`
  };
}

/**
 * 3. Authority Routing Rules Matrix
 * Maps Jurisdiction + Issue Category to the exact responsible authority
 */
export function routeToResponsibleAuthority(jurisdiction, category) {
  const isRural = jurisdiction.code === 'GRAM_PANCHAYAT';
  const prefix = jurisdiction.name;

  switch (category) {
    case 'Roads & Traffic':
      return isRural
        ? `${prefix} - Rural Engineering Services (RES)`
        : `${prefix} - Public Works Department (PWD)`;

    case 'Sanitation & Waste':
      return isRural
        ? `${prefix} - Swachh Gram Sanitation Committee`
        : `${prefix} - Solid Waste Management & Sanitation Board`;

    case 'Water Supply':
      return isRural
        ? `${prefix} - Jal Jeevan Village Water Committee`
        : `${prefix} - City Water Supply & Sewerage Board (Jal Board)`;

    case 'Electricity & Lighting':
      return `${prefix} - State Electricity Distribution Company (Discom)`;

    case 'Public Safety':
      return `${prefix} - Local Police & Traffic Enforcement Cell`;

    default:
      return `${prefix} - Civic Administration Department`;
  }
}

/**
 * 4. Spatial Deduplication & Ticket Creation Engine
 * Checks if an open ticket exists within a 50m radius in the same category.
 * If found, appends report to ticket; otherwise creates a new Ticket ID.
 */
export function processSpatialTicket(issueInput, geoData, jurisdiction, authority, existingTickets = []) {
  const { lat, lng } = geoData;
  const category = issueInput.category || 'Roads & Traffic';
  const DEDUPLICATION_RADIUS_METERS = 75; // 75 meter spatial proximity threshold

  // Search for an existing open ticket within spatial threshold
  let matchedTicket = null;
  for (const ticket of existingTickets) {
    if (ticket.status !== 'resolved' && ticket.category === category && ticket.latitude && ticket.longitude) {
      const distance = haversineDistanceMeters(lat, lng, ticket.latitude, ticket.longitude);
      if (distance <= DEDUPLICATION_RADIUS_METERS) {
        matchedTicket = ticket;
        break;
      }
    }
  }

  const nowStr = new Date().toISOString();
  const districtPrefix = (geoData.district || 'GEN').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');

  if (matchedTicket) {
    // Spatial duplicate found: Append citizen report to existing Ticket
    matchedTicket.linkedReportsCount = (matchedTicket.linkedReportsCount || 1) + 1;
    matchedTicket.upvotes += 1;
    matchedTicket.timeline.push({
      status: 'Duplicate Linked',
      date: new Date().toLocaleString(),
      detail: `New citizen report linked at same location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°). Total reports: ${matchedTicket.linkedReportsCount}`
    });
    matchedTicket.reportsList.push({
      reporterName: issueInput.reporterName || 'Prakash Kumar',
      description: issueInput.description,
      imageUrl: issueInput.imageUrl,
      createdAt: nowStr
    });

    return {
      ticket: matchedTicket,
      isDuplicate: true,
      message: `Linked to existing Ticket #${matchedTicket.ticketId} (${matchedTicket.linkedReportsCount} Citizen Reports linked)`
    };
  }

  // No duplicate nearby: Generate new Ticket
  const ticketIdNumber = Math.floor(1000 + Math.random() * 9000);
  const newTicketId = `TKT-${districtPrefix}-${new Date().getFullYear()}-${ticketIdNumber}`;

  const newTicket = {
    id: `issue-${Date.now()}`,
    ticketId: newTicketId,
    title: issueInput.title,
    category,
    priority: issueInput.priority || 'Medium',
    status: 'pending',
    location: issueInput.location || geoData.address,
    geoData,
    jurisdiction,
    assignedAuthority: authority,
    description: issueInput.description,
    imageUrl: issueInput.imageUrl,
    latitude: lat,
    longitude: lng,
    upvotes: 1,
    upvotedByUser: true,
    linkedReportsCount: 1,
    createdAt: nowStr,
    reporter: {
      name: issueInput.reporterName || 'Prakash Kumar',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      badge: 'Civic Champion'
    },
    reportsList: [
      {
        reporterName: issueInput.reporterName || 'Prakash Kumar',
        description: issueInput.description,
        imageUrl: issueInput.imageUrl,
        createdAt: nowStr
      }
    ],
    timeline: [
      {
        status: 'Ticket Created',
        date: new Date().toLocaleString(),
        detail: `Ticket #${newTicketId} generated under ${jurisdiction.type}. Routed to ${authority}.`
      }
    ],
    comments: []
  };

  return {
    ticket: newTicket,
    isDuplicate: false,
    message: `New Ticket #${newTicketId} generated and assigned to ${authority}`
  };
}
