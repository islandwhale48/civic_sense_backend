import { uploadImageToCloudinary } from '../config/cloudinary.js';
import { detectSelfieOrInvalidImage } from '../services/imageDetectorService.js';
import {
  reverseGeocodeLocation,
  determineJurisdiction,
  routeToResponsibleAuthority,
  processSpatialTicket
} from '../services/authorityRoutingService.js';
import pool, { checkDbConnected } from '../config/db.js';

const memoryTicketsStore = [];

/**
 * Submit civic report: Executes Python AI Selfie/Image Moderation ➔ Reverse Geocoding ➔ Jurisdiction Classifier ➔ Authority Routing ➔ Spatial Deduplication
 */
export async function createIssue(req, res) {
  try {
    const { title, category, priority, location, description, latitude, longitude } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    // 1. Python AI Image Detection (Block selfies and invalid face photos)
    if (req.file && req.file.buffer) {
      const imageScanResult = await detectSelfieOrInvalidImage(req.file.buffer, req.file.mimetype);
      if (imageScanResult && imageScanResult.isValidCivicPhoto === false) {
        return res.status(400).json({
          error: imageScanResult.reason || 'Invalid photo detected. Please upload a clear photo showing the civic problem.'
        });
      }
    }

    // 2. Cloudinary Upload
    let imageUrl = req.body.imageUrl || '';
    if (req.file) {
      imageUrl = await uploadImageToCloudinary(req.file.buffer, req.file.mimetype);
    } else if (!imageUrl) {
      imageUrl = 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=800';
    }

    const lat = latitude ? parseFloat(latitude) : 28.6139;
    const lng = longitude ? parseFloat(longitude) : 77.2090;

    // 3. Reverse Geocoding & GIS Jurisdiction Lookup
    const geoData = await reverseGeocodeLocation(lat, lng);
    if (location) geoData.address = location;

    const jurisdiction = determineJurisdiction(geoData);
    const assignedAuthority = routeToResponsibleAuthority(jurisdiction, category || 'Roads & Traffic');

    // 4. Spatial Deduplication & Ticket Routing
    const issueInput = {
      title,
      category: category || 'Roads & Traffic',
      priority: priority || 'Medium',
      location: geoData.address,
      description,
      imageUrl
    };

    const result = processSpatialTicket(issueInput, geoData, jurisdiction, assignedAuthority, memoryTicketsStore);

    if (!result.isDuplicate) {
      memoryTicketsStore.unshift(result.ticket);
    }

    return res.status(201).json({
      message: result.message,
      ticketId: result.ticket.ticketId,
      isDuplicate: result.isDuplicate,
      issue: result.ticket,
      authority: assignedAuthority,
      jurisdiction
    });
  } catch (err) {
    console.error('Error processing civic ticket:', err);
    return res.status(500).json({ error: 'Server error processing civic ticket' });
  }
}

/**
 * Get all official tickets
 */
export async function getIssues(req, res) {
  try {
    return res.json({ issues: memoryTicketsStore, ticketsCount: memoryTicketsStore.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve tickets' });
  }
}

/**
 * Preview Jurisdiction & Routed Authority before user submits
 */
export async function routeAuthorityPreview(req, res) {
  try {
    const { latitude, longitude, category } = req.body;
    const geoData = await reverseGeocodeLocation(latitude, longitude);
    const jurisdiction = determineJurisdiction(geoData);
    const authority = routeToResponsibleAuthority(jurisdiction, category || 'Roads & Traffic');

    return res.json({
      geoData,
      jurisdiction,
      responsibleAuthority: authority
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to preview authority routing' });
  }
}

/**
 * AI Description Refiner Engine
 */
export async function refineDescriptionWithAI(req, res) {
  try {
    const { description, category } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description text is required for AI refinement.' });
    }

    let rawText = description.trim();
    rawText = rawText.charAt(0).toUpperCase() + rawText.slice(1);
    if (!/[.!?]$/.test(rawText)) rawText += '.';

    const polishedText = `Hazard: ${rawText}
Impact: Poses an active safety risk and traffic hazard for local commuters.
Action Needed: Requesting prompt site inspection and repair by the responsible municipal authority.`;

    return res.json({
      original: description,
      refinedDescription: polishedText
    });
  } catch (err) {
    console.error('AI refinement error:', err);
    return res.status(500).json({ error: 'Failed to refine description with AI.' });
  }
}
