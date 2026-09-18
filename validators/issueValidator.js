import { sanitizeCoordinates } from '../helpers/geoHelper.js';

export const VALID_CATEGORIES = [
  'Roads & Traffic',
  'Sanitation & Waste',
  'Electricity & Lighting',
  'Water Supply',
  'Public Safety',
  'Drainage & Sewage',
  'Other'
];

export const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export function validateIssueInput(data) {
  const errors = [];
  const { title, description, category, priority, latitude, longitude } = data;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters.');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 5) {
    errors.push('Description is required and must be at least 5 characters.');
  }

  if (category && !VALID_CATEGORIES.includes(category)) {
    errors.push(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    errors.push(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  if (latitude !== undefined && longitude !== undefined) {
    const coords = sanitizeCoordinates(latitude, longitude);
    if (!coords.valid) {
      errors.push('Coordinates are out of geographic bounds (-90 to 90 lat, -180 to 180 lng).');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
