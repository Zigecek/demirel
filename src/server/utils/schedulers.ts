export function onEachDay(fn: () => void) {
  const now = new Date();

  const nextDay = new Date();
  nextDay.setHours(0, 0, 0, 0);
  nextDay.setDate(nextDay.getDate() + 1);

  const timeUntilNextDay = nextDay.getTime() - now.getTime();

  setTimeout(() => {
    fn();

    setInterval(fn, 24 * 60 * 60 * 1000);
  }, timeUntilNextDay);

  fn();
}
