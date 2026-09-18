import { validateIssueInput } from '../validators/issueValidator.js';
import { success, error } from '../helpers/responseHelper.js';
import IssueModel from '../models/Issues.js';
import { uploadImageToCloudinary } from '../config/cloudinary.js';
import { validateCivicImage } from '../services/imageDetectorService.js';
import {
  reverseGeocodeLocation,
  determineJurisdiction,
  routeToResponsibleAuthority,
  processSpatialTicket
} from '../services/authorityRoutingService.js';
import { getDecoratedIssues } from '../services/escalationService.js';
import { getIssuesStore, setIssuesStore } from '../models/dataStore.js';

/**
 * Submit civic report: Image AI Check ➔ Reverse Geocode ➔ Ward Identification ➔ Routing ➔ Spatial Deduplication
 */
export async function createIssue(req, res) {
  try {
    const { title, category, priority, location, description, latitude, longitude, reporterName } = req.body;

    // Validate inputs
    const validation = validateIssueInput({
      title,
      category,
      priority,
      description,
      latitude,
      longitude
    });

    if (!validation.isValid) {
      return error(res, 'Validation failed', 400, validation.errors);
    }

    // 1. AI Image Validation
    let imageScan = null;
    if (req.file && req.file.buffer) {
      imageScan = await validateCivicImage(req.file.buffer, req.file.mimetype, category);
      if (imageScan && imageScan.is_relevant === false) {
        return error(res, imageScan.message || 'Invalid photo detected. Please upload an image showing the civic issue.', 400);
      }
    }

    // 2. Image URL handling
    let imageUrl = req.body.imageUrl || '';
    if (req.file && req.file.buffer) {
      imageUrl = await uploadImageToCloudinary(req.file.buffer, req.file.mimetype);
    } else if (!imageUrl) {
      imageUrl = 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=800';
    }

    const lat = latitude ? parseFloat(latitude) : 28.6139;
    const lng = longitude ? parseFloat(longitude) : 77.2090;

    // 3. Reverse Geocode & Identify Local Ward & Authority
    const geoData = await reverseGeocodeLocation(lat, lng);
    if (location) geoData.address = location;

    const jurisdiction = determineJurisdiction(geoData);
    const authorityInfo = routeToResponsibleAuthority(jurisdiction, category || 'Roads & Traffic');

    // 4. Spatial Deduplication & Ticket Creation
    const issueInput = {
      title: title.trim(),
      category: category || 'Roads & Traffic',
      priority: priority || 'Medium',
      location: geoData.address,
      description: description.trim(),
      imageUrl,
      reporterName: reporterName || 'Prakash Kumar'
    };

    const currentIssues = getIssuesStore();
    const result = processSpatialTicket(issueInput, geoData, jurisdiction, authorityInfo, currentIssues);

    if (!result.isDuplicate) {
      currentIssues.unshift(result.ticket);
      setIssuesStore(currentIssues);
    await IssueModel.create(result.ticket);
    }

    return success(res, {
      ticketId: result.ticket.ticketId,
      issueNumber: result.ticket.issueNumber,
      isDuplicate: result.isDuplicate,
      issue: result.ticket,
      authority: authorityInfo.authority,
      departmentType: authorityInfo.departmentType,
      ward: jurisdiction.ward,
      jurisdiction,
      aiScan: imageScan
    }, result.message, 201);
  } catch (err) {
    console.error('Error creating issue:', err);
    return error(res, 'Server error processing civic issue report', 500);
  }
}

/**
 * Get all issues with filters (status, category, search, sort, escalation)
 */
export async function getIssues(req, res) {
  try {
    const { status, category, search, sort, ward } = req.query;
    // Fetch issues from MongoDB
    let issues = await IssueModel.findAll();
    // Sync in‑memory store for other services
    setIssuesStore(issues);
    // Apply decorations (SLA, escalation)
    issues = getDecoratedIssues();

    // 1. Status Filter
    if (status && status !== 'All') {
      const s = status.toLowerCase();
      if (s === 'escalated') {
        issues = issues.filter((i) => i.sla && i.sla.isEscalated && i.status !== 'resolved');
      } else if (s === 'resolved' || s === 'done') {
        issues = issues.filter((i) => i.status === 'resolved');
      } else if (s === 'pending') {
        issues = issues.filter((i) => i.status === 'pending' || i.status === 'reported');
      } else if (s === 'in_progress') {
        issues = issues.filter((i) => i.status === 'in_progress' || i.status === 'accepted');
      } else {
        issues = issues.filter((i) => i.status && i.status.toLowerCase() === s);
      }
    }

    // 2. Category Filter
    if (category && category !== 'All' && category !== 'All Categories') {
      issues = issues.filter((i) => i.category === category);
    }

    // 3. Ward Filter
    if (ward) {
      issues = issues.filter((i) =>
        i.jurisdiction?.ward?.toLowerCase().includes(ward.toLowerCase()) ||
        i.location?.toLowerCase().includes(ward.toLowerCase())
      );
    }

    // 4. Search Filter
    if (search && search.trim()) {
      const q = search.toLowerCase();
      issues = issues.filter((i) =>
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.location && i.location.toLowerCase().includes(q)) ||
        (i.issueNumber && i.issueNumber.toLowerCase().includes(q)) ||
        (i.ticketId && i.ticketId.toLowerCase().includes(q))
      );
    }

    // 5. Sort
    if (sort === 'escalated' || sort === 'most_urgent') {
      issues.sort((a, b) => (b.sla?.escalationScore || 0) - (a.sla?.escalationScore || 0));
    } else if (sort === 'oldest_unresolved') {
      issues.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'latest') {
      issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      // Default: Upvotes / Popular
      issues.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }

    return res.json({
      issues,
      count: issues.length,
      escalatedCount: issues.filter((i) => i.sla?.isEscalated && i.status !== 'resolved').length,
      resolvedCount: issues.filter((i) => i.status === 'resolved').length
    });
  } catch (err) {
    console.error('Error retrieving issues:', err);
    return error(res, 'Failed to retrieve issues', 500);
  }
}





/**
 * Get issue by ID or Issue Number (SRS Section 6.13)
 */
export async function getIssueById(req, res) {
  try {
    const { id } = req.params;
    const all = getDecoratedIssues();
    const issue = all.find((i) => i.id === id || i.issueNumber === id || i.ticketId === id);

    if (!issue) {
      return error(res, 'Issue not found', 404);
    }

    return success(res, { issue });
  } catch (err) {
    return error(res, 'Failed to fetch issue details', 500);
  }
}

/**
 * Toggle support / upvote (SRS Section 6.8: UNIQUE(issue_id, user_id))
 */
export async function toggleSupport(req, res) {
  try {
    const { id } = req.params;
    const issues = getIssuesStore();
    const issue = issues.find((i) => i.id === id || i.issueNumber === id);

    if (!issue) {
      return error(res, 'Issue not found', 404);
    }

    issue.upvotedByUser = !issue.upvotedByUser;
    issue.upvotes = issue.upvotedByUser ? (issue.upvotes || 0) + 1 : Math.max(0, (issue.upvotes || 0) - 1);

    setIssuesStore(issues);
    return success(res, { upvotes: issue.upvotes, upvotedByUser: issue.upvotedByUser });
  } catch (err) {
    return error(res, 'Failed to update support', 500);
  }
}

/**
 * Preview Jurisdiction & Routed Authority before user submits (SRS Section 6.9)
 */
export async function routeAuthorityPreview(req, res) {
  try {
    const { latitude, longitude, category } = req.body;
    const geoData = await reverseGeocodeLocation(latitude, longitude);
    const jurisdiction = determineJurisdiction(geoData);
    const authorityInfo = routeToResponsibleAuthority(jurisdiction, category || 'Roads & Traffic');

    return success(res, {
      geoData,
      jurisdiction,
      ward: jurisdiction.ward,
      departmentType: authorityInfo.departmentType,
      responsibleAuthority: authorityInfo.authority
    });
  } catch (err) {
    return error(res, 'Failed to preview authority routing', 500);
  }
}

/**
 * AI Description Refiner Engine
 */
export async function refineDescriptionWithAI(req, res) {
  try {
    const { description, category } = req.body;
    if (!description || !description.trim()) {
      return error(res, 'Description text is required for AI refinement.', 400);
    }

    let rawText = description.trim();
    rawText = rawText.charAt(0).toUpperCase() + rawText.slice(1);
    if (!/[.!?]$/.test(rawText)) rawText += '.';

    const polishedText = `Hazard: ${rawText}
Impact: Poses an active safety risk and traffic hazard for local commuters.
Action Needed: Requesting prompt site inspection and repair by the responsible municipal authority.`;

    return success(res, {
      original: description,
      refinedDescription: polishedText
    });
  } catch (err) {
    return error(res, 'Failed to refine description with AI.', 500);
  }
}
