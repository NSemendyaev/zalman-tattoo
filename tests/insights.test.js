import test from 'node:test';
import assert from 'node:assert/strict';
import { availableInsightYears, summarizeInsights } from '../src/lib/insights.js';

test('insights group recorded payments by appointment month without double-counting project prices', () => {
  const projects = [
    { date_start: '2026-01-10', style: 'Blackwork', agreed_price: 900 },
    { date_start: '2026-02-11', style: ' blackwork ', agreed_price: 700 },
    { date_start: '2026-02-12', style: '' },
    { date_start: '2025-12-01', style: 'Traditional' },
  ];
  const sessions = [
    { appointment_date: '2026-01-15', amount_paid: 120.10, Status: { status: 'Completed' } },
    { appointment_date: '2026-01-22', amount_paid: 79.90, Status: { status: 'Recorded' } },
    { appointment_date: '2026-02-20', amount_paid: 0, Status: { status: 'Cancelled' } },
    { appointment_date: '2025-12-20', amount_paid: 500, Status: { status: 'Completed' } },
  ];
  const summary = summarizeInsights(projects, sessions, 2026);
  assert.equal(summary.totalCollected, 200);
  assert.deepEqual(summary.bestMonth, { name: 'Jan', amount: 200 });
  assert.equal(summary.paidSessions, 2);
  assert.equal(summary.completedSessions, 2);
  assert.equal(summary.projectCount, 3);
  assert.deepEqual(summary.styles, [{ name: 'Blackwork', count: 2 }]);
  assert.equal(summary.unspecifiedStyles, 1);
  assert.equal(summary.weekdays.reduce((total, day) => total + day.count, 0), 2);
  assert.deepEqual(availableInsightYears(projects, sessions, 2026), [2026, 2025]);
});

test('an empty year has honest zero and empty states', () => {
  const summary = summarizeInsights([], [], 2026);
  assert.equal(summary.totalCollected, 0);
  assert.equal(summary.bestMonth, null);
  assert.deepEqual(summary.styles, []);
  assert.equal(summary.months.length, 12);
});
