const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function availableInsightYears(projects, sessions, currentYear = new Date().getFullYear()) {
  const years = new Set([currentYear]);
  for (const date of [...projects.map((project) => project.date_start), ...sessions.map((session) => session.appointment_date)]) {
    const year = Number(date?.slice(0, 4));
    if (Number.isInteger(year) && year > 1900) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

export function summarizeInsights(projects, sessions, year) {
  const yearText = String(year);
  const yearlyProjects = projects.filter((project) => project.date_start?.startsWith(yearText));
  const yearlySessions = sessions.filter((session) => session.appointment_date?.startsWith(yearText));
  const monthlyCents = Array(12).fill(0);
  const weekdays = WEEKDAYS.map((name) => ({ name, count: 0 }));
  let paidSessions = 0;
  let completedSessions = 0;

  for (const session of yearlySessions) {
    const month = Number(session.appointment_date?.slice(5, 7)) - 1;
    const amount = Number(session.amount_paid);
    if (month >= 0 && month < 12 && Number.isFinite(amount)) {
      monthlyCents[month] += Math.round(amount * 100);
      if (amount > 0) paidSessions += 1;
    }
    if (['Completed', 'Recorded'].includes(session.Status?.status)) {
      completedSessions += 1;
      const weekday = new Date(`${session.appointment_date}T12:00:00Z`).getUTCDay();
      weekdays[(weekday + 6) % 7].count += 1;
    }
  }

  const stylesByKey = new Map();
  let unspecifiedStyles = 0;
  for (const project of yearlyProjects) {
    const label = project.style?.trim().replace(/\s+/g, ' ');
    if (!label) { unspecifiedStyles += 1; continue; }
    const key = label.toLocaleLowerCase('en-GB');
    const previous = stylesByKey.get(key);
    stylesByKey.set(key, { name: previous?.name ?? label, count: (previous?.count ?? 0) + 1 });
  }

  const months = MONTHS.map((name, index) => ({ name, amount: monthlyCents[index] / 100 }));
  const totalCollected = monthlyCents.reduce((sum, amount) => sum + amount, 0) / 100;
  const bestMonth = months.reduce((best, month) => month.amount > (best?.amount ?? 0) ? month : best, null);
  const styles = [...stylesByKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    months,
    weekdays,
    styles,
    totalCollected,
    bestMonth,
    paidSessions,
    completedSessions,
    projectCount: yearlyProjects.length,
    unspecifiedStyles,
  };
}
