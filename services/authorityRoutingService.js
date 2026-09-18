import { haversineDistanceMeters } from '../helpers/geoHelper.js';

/**
 * 1. Reverse Geocoding: Get Locality, District, Ward, State, Address
 */
export async function reverseGeocodeLocation(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  // Compute a deterministic ward number based on coordinates if OSM doesn't return one
  const computedWardNum = Math.abs(Math.floor((lat * 100 + lng * 100) % 24)) + 1;
  const defaultWard = `Central Ward #${computedWardNum}`;

  const defaultGeo = {
    address: `Location near (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    locality: 'Central Sector',
    ward: defaultWard,
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
        headers: { 'User-Agent': 'CommunityKiHelp-CivicSense/1.0' },
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
      const wardName = a.city_district || a.suburb ? `${a.city_district || a.suburb} Ward #${computedWardNum}` : defaultWard;

      const fullAddr = [road, locality, district, state].filter(Boolean).join(', ');

      return {
        address: fullAddr || defaultGeo.address,
        locality,
        ward: wardName,
        district,
        state,
        postcode: a.postcode || '',
        rawAddress: a,
        lat,
        lng
      };
    }
  } catch (err) {
    console.warn('Reverse geocode notice: using spatial coordinate fallback');
  }

  return defaultGeo;
}

/**
 * 2. GIS Jurisdiction Classification
 */
export function determineJurisdiction(geoData) {
  const { rawAddress, district, locality, ward } = geoData;
  const rawStr = JSON.stringify(rawAddress || {}).toLowerCase();
  const wardTag = ward || 'Ward #14';

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
      ward: wardTag,
      name: `${district || locality} Municipal Corporation (${wardTag})`
    };
  }

  if (
    rawStr.includes('village') ||
    rawStr.includes('panchayat') ||
    rawStr.includes('gram') ||
    rawStr.includes('rural')
  ) {
    return {
      type: 'Gram Panchayat (Rural)',
      code: 'GRAM_PANCHAYAT',
      ward: wardTag,
      name: `${locality || district} Gram Panchayat Board`
    };
  }

  return {
    type: 'Municipality / Local Body',
    code: 'MUNICIPAL_BODY',
    ward: wardTag,
    name: `${district || locality} Municipal Body (${wardTag})`
  };
}

/**
 * 3. Authority Routing Rules Matrix
 * Maps Jurisdiction + Issue Category to exact responsible authority & Department Type (SRS Section 6.9, 12)
 */
export function routeToResponsibleAuthority(jurisdiction, category) {
  const isRural = jurisdiction.code === 'GRAM_PANCHAYAT';
  const prefix = jurisdiction.name;

  switch (category) {
    case 'Roads & Traffic':
      return {
        authority: isRural
          ? `${prefix} - Rural Engineering Services (RES)`
          : `${prefix} - Public Works Department (PWD)`,
        departmentType: 'ENGINEERING'
      };

    case 'Sanitation & Waste':
      return {
        authority: isRural
          ? `${prefix} - Swachh Gram Sanitation Committee`
          : `${prefix} - Solid Waste Management & Sanitation Board`,
        departmentType: 'SANITATION'
      };

    case 'Water Supply':
      return {
        authority: isRural
          ? `${prefix} - Jal Jeevan Village Water Committee`
          : `${prefix} - City Water Supply & Sewerage Board (Jal Board)`,
        departmentType: 'WATER_SEWERAGE'
      };

    case 'Electricity & Lighting':
      return {
        authority: `${prefix} - State Electricity Distribution Company (Discom)`,
        departmentType: 'ELECTRICAL'
      };

    case 'Public Safety':
      return {
        authority: `${prefix} - Local Police & Ward Enforcement Cell`,
        departmentType: 'ENFORCEMENT'
      };

    case 'Drainage & Sewage':
      return {
        authority: `${prefix} - Stormwater Drainage & Flood Mitigation Wing`,
        departmentType: 'ENGINEERING'
      };

    default:
      return {
        authority: `${prefix} - Civic Administration Department`,
        departmentType: 'CIVIC_ADMIN'
      };
  }
}

/**
 * 4. Spatial Deduplication & Ticket Creation Engine
 * Checks proximity within 75m threshold (SRS Section 6.5)
 */
export function processSpatialTicket(issueInput, geoData, jurisdiction, authorityInfo, existingTickets = []) {
  const { lat, lng } = geoData;
  const category = issueInput.category || 'Roads & Traffic';
  const DEDUPLICATION_RADIUS_METERS = 75;


  let matchedTicket = null;
  for (const ticket of existingTickets) {
    if (ticket.status !== 'RESOLVED' && ticket.category === category && ticket.latitude && ticket.longitude) {
      const distance = haversineDistanceMeters(lat, lng, ticket.latitude, ticket.longitude);
      if (distance <= DEDUPLICATION_RADIUS_METERS) {
        matchedTicket = ticket;
        break;
      }
    }
  }

  const nowStr = new Date().toISOString();
  const wardCode = (jurisdiction.ward || 'WRD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();

  if (matchedTicket) {
    // Spatial duplicate found: Append report to existing Issue (SRS Section 4 & 6.5)
    matchedTicket.linkedReportsCount = (matchedTicket.linkedReportsCount || 1) + 1;
    matchedTicket.upvotes = (matchedTicket.upvotes || 0) + 1;
    matchedTicket.timeline.push({
      status: 'Duplicate Linked',
      date: 'Just now',
      detail: `New citizen evidence linked at same location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°). Total reports: ${matchedTicket.linkedReportsCount}`
    });
    matchedTicket.reportsList.push({
      id: `rep-${Date.now()}`,
      reporterName: issueInput.reporterName || 'Citizen Contributor',
      description: issueInput.description,
      imageUrl: issueInput.imageUrl,
      createdAt: nowStr
    });

    return {
      ticket: matchedTicket,
      isDuplicate: true,
      message: `Linked to existing Issue #${matchedTicket.issueNumber || matchedTicket.ticketId} (${matchedTicket.linkedReportsCount} Citizen Reports linked)`
    };
  }

  // Create New Issue & Operational Ticket
  const issueNum = Math.floor(100 + Math.random() * 900);
  const issueNumber = `CKH-${issueNum}`;
  const ticketId = `TKT-${wardCode}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newTicket = {
    id: `issue-${Date.now()}`,
    issueNumber,
    ticketId,
    title: issueInput.title,
    category,
    priority: issueInput.priority || 'Medium',
    status: 'pending', // REPORTED
    location: issueInput.location || geoData.address,
    geoData,
    jurisdiction,
    departmentType: authorityInfo.departmentType,
    assignedAuthority: authorityInfo.authority,
    description: issueInput.description,
    imageUrl: issueInput.imageUrl,
    media: {
      url: issueInput.imageUrl,
      uploader: issueInput.reporterName || 'Prakash Kumar'
    },
    latitude: lat,
    longitude: lng,
    upvotes: 1,
    supportCount: 1,
    reportCount: 1,
    followerCount: 1,
    upvotedByUser: true,
    createdAt: nowStr,
    reporter: {
      name: issueInput.reporterName || 'Prakash Kumar',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      badge: 'Active Citizen'
    },
    reportsList: [
      {
        id: `rep-${Date.now()}`,
        reporterName: issueInput.reporterName || 'Prakash Kumar',
        description: issueInput.description,
        imageUrl: issueInput.imageUrl,
        createdAt: nowStr
      }
    ],
    timeline: [
      {
        status: 'Reported',
        date: 'Just now',
        detail: `Issue #${issueNumber} raised. Routed to ${jurisdiction.name} Secretary Panel (${authorityInfo.authority}).`
      }
    ],
    comments: []
  };

  return {
    ticket: newTicket,
    isDuplicate: false,
    message: `Issue #${issueNumber} generated and routed to ${authorityInfo.authority}`
  };
}
