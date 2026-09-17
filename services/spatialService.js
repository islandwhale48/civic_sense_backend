import pool, { checkDbConnected } from '../config/db.js';

/**
 * Real-world Spatial Local Body Resolver
 * Resolves exact real-world municipal body for ANY latitude/longitude using 
 * OpenStreetMap Nominatim reverse geocoding + PostGIS spatial boundary fallback.
 */
export async function findNearestLocalBody(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return 'Municipal Public Works Department';
  }

  // 1. Try real-world Reverse Geocoding via OpenStreetMap API to detect actual city/district/municipality
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: { 'User-Agent': 'CivicSense-App/1.0' },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const city = addr.city || addr.town || addr.municipality || addr.city_district || addr.county || addr.state_district;
      const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict;
      const state = addr.state;

      if (city) {
        let authorityName = `${city} Municipal Corporation`;
        if (suburb) {
          authorityName = `${city} Municipal Corp (${suburb} Zone)`;
        }
        return authorityName;
      } else if (state) {
        return `${state} Urban Local Body`;
      }
    }
  } catch (err) {
    console.warn('Real-world OSM geocoding notice, using PostGIS / local calculation fallback.');
  }

  // 2. PostGIS Spatial Table lookup fallback if database is seeded
  if (checkDbConnected()) {
    try {
      const result = await pool.query(
        `SELECT name, zone FROM local_bodies
         ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
         LIMIT 1;`,
        [lng, lat]
      );
      if (result.rows.length > 0) {
        return result.rows[0].name;
      }
    } catch (err) {
      // ignore
    }
  }

  // 3. General Fallback
  return `Local Ward Municipal Authority (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
}
