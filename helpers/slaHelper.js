/**
 * SLA Constants and Escalation Calculation Helper
 * Complies with SRS Section 6.8, 7.4, 13, and 21.
 */

export const SLA_HOURS_BY_PRIORITY = {
  Critical: 24, // 24 hours SLA
  High: 48,     // 48 hours SLA
  Medium: 72,   // 72 hours SLA
  Low: 120      // 5 days SLA
};

export const PRIORITY_WEIGHTS = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1
};

/**
 * Computes SLA deadline, overdue hours, escalation score, and escalation level.
 * @param {Object} issue 
 * @param {number} simulatedOffsetHours 
 */
export function calculateSlaAndEscalation(issue, simulatedOffsetHours = 0) {
  const createdAt = new Date(issue.createdAt).getTime();
  const simulatedNow = Date.now() + (simulatedOffsetHours * 60 * 60 * 1000);
  const priority = issue.priority || 'Medium';
  const slaHours = SLA_HOURS_BY_PRIORITY[priority] || 72;
  const slaDeadlineTime = createdAt + (slaHours * 60 * 60 * 1000);

  const isResolved = issue.status === 'resolved';
  const hoursElapsed = Math.max(0, (simulatedNow - createdAt) / (1000 * 60 * 60));
  const hoursRemaining = Math.max(0, (slaDeadlineTime - simulatedNow) / (1000 * 60 * 60));
  const isOverdue = !isResolved && simulatedNow > slaDeadlineTime;
  const overdueHours = isOverdue ? (simulatedNow - slaDeadlineTime) / (1000 * 60 * 60) : 0;

  // Multi-tier escalation level:
  // L0: Normal / within SLA
  // L1: Overdue up to 48 hours -> Escalated to Zonal Officer
  // L2: Overdue between 48h and 168h (7d) -> Escalated to Municipal Commissioner & Grievance Cell
  // L3: Overdue > 7 days -> Escalated to District Magistrate / Ministry
  let escalationLevel = 0;
  let escalationAuthority = issue.assignedAuthority;

  if (isOverdue) {
    if (overdueHours < 48) {
      escalationLevel = 1;
      escalationAuthority = `${issue.assignedAuthority} (Escalated: Zonal Executive Engineer)`;
    } else if (overdueHours < 168) {
      escalationLevel = 2;
      escalationAuthority = `Municipal Commissioner & Grievance Redressal Cell (Level 2 Escalation)`;
    } else {
      escalationLevel = 3;
      escalationAuthority = `District Magistrate & Urban Development Oversight Board (Level 3 Emergency)`;
    }
  }

  // Escalation score formula per SRS Section 7.4 & 21
  const priorityWeight = PRIORITY_WEIGHTS[priority] || 2;
  const supportsCount = issue.upvotes || 0;
  const reportsCount = issue.linkedReportsCount || 1;

  let escalationScore = Math.round(
    (priorityWeight * 20) +
    (overdueHours * 2.5) +
    (supportsCount * 1.5) +
    (reportsCount * 3)
  );

  if (isResolved) {
    escalationScore = 0;
  }

  return {
    slaHours,
    slaDeadline: new Date(slaDeadlineTime).toISOString(),
    hoursElapsed: Math.round(hoursElapsed * 10) / 10,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    isOverdue,
    overdueHours: Math.round(overdueHours * 10) / 10,
    isEscalated: escalationLevel > 0,
    escalationLevel,
    escalationAuthority,
    escalationScore
  };
}
