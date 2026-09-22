import calendar

# Re-implement the JS buildCalendarGridCompact algorithm in Python and verify placements

def build_grid(year, month):
    # month: 1-12
    month_start_weekday = calendar.weekday(year, month, 1)  # 0=Mon .. 6=Sun
    # convert to JS getDay: 0=Sun..6=Sat
    first_day = (month_start_weekday + 1) % 7
    days_in_month = calendar.monthrange(year, month)[1]
    weeks = []
    day_counter = 1
    while day_counter <= days_in_month:
        week = [None] * 7
        for weekday in range(7):
            if len(weeks) == 0 and weekday < first_day:
                continue
            if day_counter > days_in_month:
                break
            week[weekday] = day_counter
            day_counter += 1
        weeks.append(week)
    return weeks


def verify_month(year, month):
    weeks = build_grid(year, month)
    print(f"\n=== {year}-{month:02d} ===")
    print('Sun Mon Tue Wed Thu Fri Sat')
    for w in weeks:
        print(' '.join('  ' if d is None else f"{d:2d}" for d in w))

    ok = True
    for wi, w in enumerate(weeks):
        for idx, d in enumerate(w):
            if d is None:
                continue
            # compute actual weekday via calendar.weekday -> 0=Mon..6=Sun -> convert
            actual_weekday = (calendar.weekday(year, month, d) + 1) % 7
            if actual_weekday != idx:
                print(f"Mismatch: {year}-{month:02d}-{d:02d} actual dow {actual_weekday} but placed at col {idx}")
                ok = False
    print('PASS' if ok else 'FAIL')
    return ok


tests = [ (2026,9), (2026,10), (2028,2), (2026,8), (2026,11) ]
# Note: Python months are 1-based; specifying months per request
all_ok = True
for y,m in tests:
    if not verify_month(y,m):
        all_ok = False

if not all_ok:
    raise SystemExit(1)
else:
    print('\nAll tested months placed correctly.')

