// Purpose: Service to monitor the Postgres database.
// Functionality: Every X seconds, get psql stats and calculate per-second stats.

import { EventEmitter } from "eventemitter3";
import { io, prisma, Status, status } from "..";
import logger from "../utils/loggers";

const emitter = new EventEmitter();
let _lastStats: PgMonStats | undefined = undefined;

export const getStats = async () => {
  const result = (await prisma.$queryRaw`
    SELECT
        datname AS database_name,
        (xact_commit + xact_rollback) AS total_transactions,
        blks_read AS disk_reads,
        blks_hit AS cache_hits,
        CASE 
            WHEN (blks_read + blks_hit) > 0 THEN 
                (blks_hit::float / (blks_read + blks_hit)) * 100
            ELSE 0
        END AS cache_hit_ratio,
        tup_inserted AS rows_inserted,
        tup_updated AS rows_updated,
        tup_deleted AS rows_deleted,
        now() AS current_time
    FROM
        pg_stat_database
    WHERE
        datname = current_database();
  `) as PgMonStats[];

  // convert bigint to number
  const stats = {
    ...result[0],
    total_transactions: Number(result[0].total_transactions),
    disk_reads: Number(result[0].disk_reads),
    cache_hits: Number(result[0].cache_hits),
    rows_inserted: Number(result[0].rows_inserted),
    rows_updated: Number(result[0].rows_updated),
    rows_deleted: Number(result[0].rows_deleted),
  };

  return stats;
};

export const calculatePerSecond = (stats: PgMonStats, last: PgMonStats) => {
  const timeDiff = (stats.current_time.getTime() - last.current_time.getTime()) / 1000;

  return {
    ...stats,
    total_transactions: (stats.total_transactions - last.total_transactions) / timeDiff,
    disk_reads: (stats.disk_reads - last.disk_reads) / timeDiff,
    cache_hits: (stats.cache_hits - last.cache_hits) / timeDiff,
    rows_inserted: (stats.rows_inserted - last.rows_inserted) / timeDiff,
    rows_updated: (stats.rows_updated - last.rows_updated) / timeDiff,
    rows_deleted: (stats.rows_deleted - last.rows_deleted) / timeDiff,
  };
};

const intervalFn = async () => {
  const stats = await getStats();
  if (!_lastStats) {
    _lastStats = stats;
    return;
  }
  const perSecond = calculatePerSecond(stats, _lastStats);
  logger.pgMon.info("New stats calculated");
  _lastStats = stats;
  emitter.emit("stats", perSecond);
};

export const start = async () => {
  intervalFn();
  setInterval(intervalFn, 15000);
  logger.pgMon.info("Postgres monitoring started.");
  status.pgMon = Status.RUNNING;
};

emitter.on("stats", (stats) => {
  io.to("auth").emit("pgMon", stats);
});
