/**
 * Issue model
 *
 * Represents the public-facing Issue object returned by the API.
 *
 * PostgreSQL remains the source of truth.
 * This model describes the shape expected by the React frontend.
 */

export const ISSUE_STATUS = {
  REPORTED: "REPORTED",
  ACCEPTED: "ACCEPTED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLUTION_SUBMITTED: "RESOLUTION_SUBMITTED",
  ADMIN_REVIEW: "ADMIN_REVIEW",
  RESOLVED: "RESOLVED",
};

export const ISSUE_CATEGORIES = [
  "Roads",
  "Garbage",
  "Drainage",
  "Sewage",
  "Water",
  "Streetlights",
  "Other",
];

/**
 * Example Issue shape.
 *
 * This is not database data.
 * It documents the object our API should eventually return.
 */
export const issueShape = {
  id: null,
  issue_number: null,

  category: {
    id: null,
    name: null,
  },

  title: "",
  description: "",

  location: {
    address: "",
    latitude: null,
    longitude: null,
  },

  authority: {
    id: null,
    name: null,
  },

  status: ISSUE_STATUS.REPORTED,

  creator: {
    id: null,
    name: "",
    username: "",
    profile_image: null,
  },

  media: {
    id: null,
    type: null,
    url: null,
    thumbnail_url: null,
    created_by: null,
  },

  counts: {
    reports: 0,
    supports: 0,
    followers: 0,
  },

  created_at: null,
  updated_at: null,
};