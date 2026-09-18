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
import mongoose from 'mongoose';

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

/**
 * Get issues filtered by assigned authority / local body name
 * Supports partial match for flexibility (jurisdiction.name or assignedAuthority)
 */
export async function getIssuesByAuthority(req, res) {
  try {
    const { authority, ward, status, category } = req.query;

    if (!authority && !ward) {
      return error(res, 'Either "authority" or "ward" query param is required', 400);
    }

    let issues = await IssueModel.findAll();
    setIssuesStore(issues);
    issues = getDecoratedIssues();

    // Filter by authority name (partial, case-insensitive)
    if (authority) {
      const q = authority.toLowerCase();
      issues = issues.filter((i) =>
        (i.assignedAuthority && i.assignedAuthority.toLowerCase().includes(q)) ||
        (i.jurisdiction?.name && i.jurisdiction.name.toLowerCase().includes(q))
      );
    }

    // Additional ward filter
    if (ward) {
      const w = ward.toLowerCase();
      issues = issues.filter((i) =>
        (i.jurisdiction?.ward && i.jurisdiction.ward.toLowerCase().includes(w)) ||
        (i.geoData?.ward && i.geoData.ward.toLowerCase().includes(w))
      );
    }

    // Optional status filter
    if (status && status !== 'All') {
      const s = status.toLowerCase();
      issues = issues.filter((i) => i.status && i.status.toLowerCase() === s);
    }

    // Optional category filter
    if (category && category !== 'All') {
      issues = issues.filter((i) => i.category === category);
    }

    // Sort: pending first (most urgent), then by escalation score
    issues.sort((a, b) => {
      const order = { pending: 0, in_progress: 1, work_assigned: 2, pending_inspection: 3, resolution_submitted: 4, resolved: 5, rejected: 6 };
      const aOrder = order[a.status] ?? 99;
      const bOrder = order[b.status] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.sla?.escalationScore || 0) - (a.sla?.escalationScore || 0);
    });

    return res.json({
      issues,
      count: issues.length,
      stats: {
        total: issues.length,
        pending: issues.filter((i) => i.status === 'pending').length,
        in_progress: issues.filter((i) => ['in_progress', 'work_assigned'].includes(i.status)).length,
        pending_inspection: issues.filter((i) => i.status === 'pending_inspection').length,
        resolution_submitted: issues.filter((i) => i.status === 'resolution_submitted').length,
        resolved: issues.filter((i) => i.status === 'resolved').length,
        escalated: issues.filter((i) => i.sla?.isEscalated && i.status !== 'resolved').length
      }
    });
  } catch (err) {
    console.error('Error fetching authority issues:', err);
    return error(res, 'Failed to fetch authority issues', 500);
  }
}

/**
 * Update issue status (Authority action)
 * Allowed transitions: pending → in_progress → work_assigned → pending_inspection
 */
export async function updateIssueStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, note, authorityName } = req.body;

    const ALLOWED_STATUSES = ['in_progress', 'work_assigned', 'pending_inspection'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return error(res, `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`, 400);
    }

    // Update in-memory store
    const issues = getIssuesStore();
    const issue = issues.find((i) => i.id === id || i.issueNumber === id || i.ticketId === id);

    if (!issue) {
      return error(res, 'Issue not found', 404);
    }

    const prevStatus = issue.status;
    issue.status = status;
    issue.updatedAt = new Date().toISOString();

    const statusLabels = {
      in_progress: 'In Progress',
      work_assigned: 'Work Assigned',
      pending_inspection: 'Pending Inspection'
    };

    issue.timeline = issue.timeline || [];
    issue.timeline.push({
      status: statusLabels[status] || status,
      date: 'Just now',
      detail: note || `Status updated to "${statusLabels[status]}" by ${authorityName || 'Authority Officer'}.`
    });

    setIssuesStore(issues);

    // Persist to MongoDB
    try {
      await mongoose.model('Issue').findOneAndUpdate(
        { $or: [{ id }, { issueNumber: id }, { ticketId: id }] },
        { $set: { status: issue.status, timeline: issue.timeline, updatedAt: new Date() } }
      );
    } catch (dbErr) {
      console.warn('MongoDB update skipped (in-memory updated):', dbErr.message);
    }

    return success(res, { issue, previousStatus: prevStatus }, `Status updated to ${statusLabels[status]}`);
  } catch (err) {
    console.error('Error updating issue status:', err);
    return error(res, 'Failed to update issue status', 500);
  }
}

/**
 * Submit resolution request (Authority action)
 * Stores completion description + photo, sets reviewStatus: PENDING
 * Admin must verify before issue becomes RESOLVED
 */
export async function submitResolution(req, res) {
  try {
    const { id } = req.params;
    const { description, submittedBy } = req.body;

    if (!description || !description.trim()) {
      return error(res, 'Completion description is required', 400);
    }

    // Handle completion photo upload
    let afterImageUrl = req.body.afterImageUrl || '';
    if (req.file && req.file.buffer) {
      try {
        afterImageUrl = await uploadImageToCloudinary(req.file.buffer, req.file.mimetype);
      } catch (uploadErr) {
        console.warn('Resolution image upload failed:', uploadErr.message);
      }
    }

    const issues = getIssuesStore();
    const issue = issues.find((i) => i.id === id || i.issueNumber === id || i.ticketId === id);

    if (!issue) {
      return error(res, 'Issue not found', 404);
    }

    const nowStr = new Date().toISOString();
    issue.resolution = {
      id: `res-${Date.now()}`,
      submittedBy: submittedBy || 'Authority Officer',
      description: description.trim(),
      afterImageUrl,
      submittedAt: nowStr,
      reviewStatus: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      adminNotes: null
    };
    issue.status = 'resolution_submitted';
    issue.updatedAt = nowStr;
    issue.timeline = issue.timeline || [];
    issue.timeline.push({
      status: 'Resolution Submitted',
      date: 'Just now',
      detail: `Work completion reported by ${submittedBy || 'Authority Officer'}. Pending admin verification.`
    });

    setIssuesStore(issues);

    // Persist to MongoDB
    try {
      await mongoose.model('Issue').findOneAndUpdate(
        { $or: [{ id }, { issueNumber: id }, { ticketId: id }] },
        { $set: { resolution: issue.resolution, status: issue.status, timeline: issue.timeline, updatedAt: new Date() } }
      );
    } catch (dbErr) {
      console.warn('MongoDB resolution update skipped:', dbErr.message);
    }

    return success(res, { issue }, 'Resolution submitted. Pending admin verification.', 201);
  } catch (err) {
    console.error('Error submitting resolution:', err);
    return error(res, 'Failed to submit resolution', 500);
  }
}

/**
 * Admin review of submitted resolution
 * decision: 'APPROVED' → issue becomes resolved | 'REJECTED' → sent back to authority
 */
export async function adminReviewResolution(req, res) {
  try {
    const { id } = req.params;
    const { decision, adminNotes, adminId, adminName } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return error(res, 'Decision must be APPROVED or REJECTED', 400);
    }

    // Basic admin auth via header or body token
    const adminPin = req.headers['x-admin-pin'] || req.body.adminPin;
    const expectedPin = process.env.ADMIN_PIN || 'ADMIN-2026';
    if (adminPin !== expectedPin) {
      return res.status(403).json({ success: false, error: 'Invalid admin PIN. Access denied.' });
    }

    const issues = getIssuesStore();
    const issue = issues.find((i) => i.id === id || i.issueNumber === id || i.ticketId === id);

    if (!issue) {
      return error(res, 'Issue not found', 404);
    }

    if (!issue.resolution || issue.resolution.reviewStatus !== 'PENDING') {
      return error(res, 'No pending resolution found for this issue', 400);
    }

    const nowStr = new Date().toISOString();
    issue.resolution.reviewStatus = decision;
    issue.resolution.reviewedBy = adminName || adminId || 'Admin';
    issue.resolution.reviewedAt = nowStr;
    issue.resolution.adminNotes = adminNotes || null;
    issue.updatedAt = nowStr;

    if (decision === 'APPROVED') {
      issue.status = 'resolved';
      issue.timeline = issue.timeline || [];
      issue.timeline.push({
        status: 'Resolved ✓',
        date: 'Just now',
        detail: `Admin verified work completion. Issue officially resolved.${adminNotes ? ' Note: ' + adminNotes : ''}`
      });
    } else {
      // Rejected: send back to authority for rework
      issue.status = 'pending_inspection';
      issue.timeline = issue.timeline || [];
      issue.timeline.push({
        status: 'Resolution Rejected',
        date: 'Just now',
        detail: `Admin requested rework. ${adminNotes ? 'Reason: ' + adminNotes : 'Please re-inspect and resubmit.'}`
      });
    }

    setIssuesStore(issues);

    // Persist to MongoDB
    try {
      await mongoose.model('Issue').findOneAndUpdate(
        { $or: [{ id }, { issueNumber: id }, { ticketId: id }] },
        { $set: { resolution: issue.resolution, status: issue.status, timeline: issue.timeline, updatedAt: new Date() } }
      );
    } catch (dbErr) {
      console.warn('MongoDB admin review update skipped:', dbErr.message);
    }

    return success(res, { issue, decision }, decision === 'APPROVED' ? 'Issue marked as Resolved.' : 'Resolution rejected. Authority notified.');
  } catch (err) {
    console.error('Error reviewing resolution:', err);
    return error(res, 'Failed to process admin review', 500);
  }
}

/**
 * Get all pending resolutions for admin review queue
 */
export async function getPendingResolutions(req, res) {
  try {
    const adminPin = req.headers['x-admin-pin'];
    const expectedPin = process.env.ADMIN_PIN || 'ADMIN-2026';
    if (adminPin !== expectedPin) {
      return res.status(403).json({ success: false, error: 'Invalid admin PIN. Access denied.' });
    }

    let issues = await IssueModel.findAll();
    setIssuesStore(issues);
    issues = getDecoratedIssues();

    const pendingResolutions = issues.filter((i) => i.resolution && i.resolution.reviewStatus === 'PENDING');
    const allResolutions = issues.filter((i) => i.resolution);
    const approvedCount = allResolutions.filter((i) => i.resolution.reviewStatus === 'APPROVED').length;
    const rejectedCount = allResolutions.filter((i) => i.resolution.reviewStatus === 'REJECTED').length;

    return res.json({
      issues: pendingResolutions,
      count: pendingResolutions.length,
      stats: {
        totalResolved: issues.filter((i) => i.status === 'resolved').length,
        pendingReview: pendingResolutions.length,
        approved: approvedCount,
        rejected: rejectedCount,
        totalIssues: issues.length
      }
    });
  } catch (err) {
    console.error('Error fetching pending resolutions:', err);
    return error(res, 'Failed to fetch pending resolutions', 500);
  }
}
