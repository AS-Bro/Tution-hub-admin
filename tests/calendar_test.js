function buildGrid(year, month) {
  const monthStart = new Date(year, month, 1);
  const firstDay = monthStart.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let dayCounter = 1;
  while (dayCounter <= daysInMonth) {
    const week = new Array(7).fill(null);
    for (let weekday = 0; weekday < 7; weekday++) {
      if (weeks.length === 0 && weekday < firstDay) continue;
      if (dayCounter > daysInMonth) break;
      week[weekday] = dayCounter++;
    }
    weeks.push(week);
  }
  return weeks;
}

function verifyMonth(year, month) {
  const weeks = buildGrid(year, month);
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  console.log(`\n=== ${year}-${String(month+1).padStart(2,'0')} ===`);
  console.log(dayNames.join(' '));
  weeks.forEach(w => {
    console.log(w.map(d => d===null? '  ' : String(d).padStart(2,' ')).join('  '));
  });

  let ok = true;
  weeks.forEach((w, wi) => {
    w.forEach((d, idx) => {
      if (d === null) return;
      const dow = new Date(year, month, d).getDay();
      if (dow !== idx) {
        console.error(`Mismatch: ${year}-${month+1}-${d} expected dow ${dow} but placed at col ${idx}`);
        ok = false;
      }
    });
  });
  console.log(ok ? 'PASS' : 'FAIL');
}

// Tests: Sept 2026, Oct 2026, Feb 2028, Aug 2026 (starts Sat), Nov 2026 (starts Sun)
verifyMonth(2026, 8); // Sept (month index 8)
verifyMonth(2026, 9); // Oct
verifyMonth(2028, 1); // Feb 2028 (leap)
verifyMonth(2026, 7); // Aug 2026 (starts Saturday)
verifyMonth(2026,10); // Nov 2026 (starts Sunday)

