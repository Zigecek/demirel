import chalk from "chalk";
import pino from "pino";
import pretty from "pino-pretty";

chalk.level = 3; // true-color

// Original color array (converted to hex strings)
const hexColors = [
  "#FF5733", // Jasně oranžová
  "#33FF57", // Jasně zelená
  "#3357FF", // Jasně modrá
  "#FF33A8", // Fuchsiová
  "#33FFF0", // Tyrkysová
  "#FFC300", // Žlutá
  "#C70039", // Tmavě červená
  "#900C3F", // Vínová
  "#581845", // Fialová
  "#DAF7A6", // Světle zelená
  "#FF6F61", // Lososová
  "#6A5ACD", // Střední modrofialová
  "#20B2AA", // Světle mořská zelená
  "#FFD700", // Zlatá
  "#FF4500", // Oranžově červená
];

// Function to dim a color by reducing its brightness
const dimHexColor = (hex: string, factor: number = 0.7): string => {
  hex = hex.replace(/^#/, "");

  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.floor(r * factor);
  g = Math.floor(g * factor);
  b = Math.floor(b * factor);

  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
};

const moduleColors: Record<string, typeof chalk> = {};
const messageColors: Record<string, typeof chalk> = {};

// Vlastní formátovací funkce
const customPrettifier = pretty({
  colorize: true,
  ignore: "pid,hostname",
  customPrettifiers: {
    time: (t) => {
      return chalk.rgb(0, 255, 0)("[") + chalk.rgb(255, 255, 255)(t) + chalk.rgb(0, 255, 0)("]");
    },
  },
  hideObject: true,
  messageFormat: (log, messageKey) => {
    const module = log.module ? moduleColors[log.module as string].bold(`[${log.module}]`) : "";
    const message = log[messageKey];
    return `${module}\t${messageColors[log.module as string](message)}`;
  },
});

// Root logger
const root = pino(customPrettifier);

const getLogger = (module: string, color: string) => {
  moduleColors[module] = chalk.hex(color);
  messageColors[module] = chalk.hex(dimHexColor(color, 0.75));
  return root.child({ module });
};

// Moduly
const logger = {
  root: getLogger("ROOT", hexColors[0]),
  ws: getLogger("SOCKET", hexColors[1]),
  db: getLogger("PRISMA", hexColors[2]),
  mqtt: getLogger("MQTT", hexColors[3]),
  rules: getLogger("RULES", hexColors[4]),
  daily: getLogger("DAILY", hexColors[5]),
  transceiver: getLogger("TRANS", hexColors[6]),
  memory: getLogger("MEMORY", hexColors[7]),
  vite: getLogger("VITE", hexColors[8]),
  webpush: getLogger("WEBPUSH", hexColors[9]),
};

export default logger;
