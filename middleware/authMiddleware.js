/**
 * Role-Based Access Control Middleware per SRS Section 5
 * Roles: CITIZEN, AUTHORITY_SECRETARY, ADMIN
 */

export function extractUserRole(req, res, next) {
  // Support custom header for MVP role switching or default to CITIZEN
  const roleHeader = req.headers['x-user-role'] || 'CITIZEN';
  const role = roleHeader.toUpperCase();

  req.user = {
    id: req.headers['x-user-id'] || 'usr-default',
    name: req.headers['x-user-name'] || 'Citizen User',
    role: ['CITIZEN', 'AUTHORITY_SECRETARY', 'ADMIN'].includes(role) ? role : 'CITIZEN'
  };

  next();
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied. Action requires one of: [${allowedRoles.join(', ')}]. Current role: ${req.user?.role || 'None'}`
      });
    }
    next();
  };
}
