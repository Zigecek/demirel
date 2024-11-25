export function getDayDates(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function calculateStats(messages: MQTTMessage[], start: Date, end: Date) {
  // get type of values
  const valueType = messages[0].valueType;
  const topic = messages[0].topic;

  // BOOLEAN
  let uptime: number | null = null;
  let downtime: number | null = null;

  if (valueType === "BOOLEAN") {
    messages.unshift({
      ...messages[0],
      timestamp: start,
    });
    messages.push({
      ...messages[messages.length - 1],
      timestamp: end,
    });

    // get duration the value was true
    uptime = 0;
    downtime = 0;
    let lastUpTimestamp = null;
    let lastDownTimestamp = null;
    for (let i = 0; i < messages.length; i++) {
      // uptime
      if (messages[i].value === true && !lastUpTimestamp) {
        lastUpTimestamp = messages[i].timestamp.getTime();
        continue;
      }
      if ((messages[Math.min(i + 1, messages.length - 1)].value === false || (i === messages.length - 1 && messages[i].value === true)) && lastUpTimestamp) {
        uptime += messages[i].timestamp.getTime() - lastUpTimestamp;
        lastUpTimestamp = null;
        continue;
      }

      // downtime
      if (messages[i].value === false && !lastDownTimestamp) {
        lastDownTimestamp = messages[i].timestamp.getTime();
        continue;
      }
      if ((messages[Math.min(i + 1, messages.length - 1)].value === true || (i === messages.length - 1 && messages[i].value === false)) && lastDownTimestamp) {
        downtime += messages[i].timestamp.getTime() - lastDownTimestamp;
        lastDownTimestamp = null;
        continue;
      }
    }
  }

  // FLOAT
  let min: number | null = null;
  let max: number | null = null;
  let avg: number | null = null;
  let count: number | null = null;

  if (valueType === "FLOAT") {
    const vals = messages.map((m) => m.value as number);
    min = Math.min(...vals);
    max = Math.max(...vals);
    count = vals.length;
    avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  return {
    topic,
    valueType,
    date: start,

    uptime,
    downtime,
    min,
    max,
    avg,
    count,
  } as dailyStats;
}
