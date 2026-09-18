import { calculateSlaAndEscalation } from '../helpers/slaHelper.js';
import { getIssuesStore, getSimulatedOffset, addSimulatedOffset, setSimulatedOffset } from '../models/dataStore.js';

/**
 * Service that calculates escalation status and updates timeline for overdue tickets
 */
export function getDecoratedIssues() {
  const issues = getIssuesStore();
  const offsetHours = getSimulatedOffset();

  return issues.map((issue) => {
    const sla = calculateSlaAndEscalation(issue, offsetHours);

    // Auto-update timeline with escalation entry if overdue and not already in timeline
    if (sla.isEscalated && issue.status !== 'resolved') {
      const escalationStatusStr = `Escalated Level ${sla.escalationLevel}`;
      const hasEscalationEntry = issue.timeline.some((t) => t.status.includes('Escalated'));

      if (!hasEscalationEntry) {
        issue.timeline.push({
          status: escalationStatusStr,
          date: 'Automated Escalation',
          detail: `SLA of ${sla.slaHours}h exceeded by ${sla.overdueHours}h. Ticket escalated to ${sla.escalationAuthority}.`
        });
      }
    }

    return {
      ...issue,
      sla
    };
  });
}

/**
 * Advance simulated time by X hours to demonstrate escalation of unresolved tasks
 */
export function advanceSimulationTime(hours = 24) {
  const newOffset = addSimulatedOffset(hours);
  const decorated = getDecoratedIssues();
  const escalatedCount = decorated.filter((i) => i.sla.isEscalated).length;

  return {
    simulatedOffsetHours: newOffset,
    escalatedCount,
    issues: decorated
  };
}

/**
 * Reset simulated clock back to current real time
 */
export function resetSimulationTime() {
  setSimulatedOffset(0);
  const decorated = getDecoratedIssues();

  return {
    simulatedOffsetHours: 0,
    escalatedCount: decorated.filter((i) => i.sla.isEscalated).length,
    issues: decorated
  };
}
