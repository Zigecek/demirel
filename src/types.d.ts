type ApiBase<T> = {
  success: boolean;
  message: string;
  status: number;
  responseObject: T;
};

type SocketAuth = {
  socketId: string | undefined;
};

type MQTTMessage = {
  topic: string;
  value: number | boolean;
  timestamp: Date;
  valueType: "FLOAT" | "BOOLEAN";
  prev?: MQTTMessage;
};

type MQTTMessageID = MQTTMessage & { id: number };

type Login = {
  username: string;
  password: string;
};

type Register = {
  username: string;
  password: string;
};

type UserSafe = {
  username: string;
  darkMode: boolean;
};

type SnackBarConfig = {
  open: boolean;
  text: string;
  severity: OverridableStringUnion<AlertColor, AlertPropsColorOverrides> | undefined;
  autoHideDuration: number;
  showSnackbar: (newConfig: Partial<SnackBarConfig>) => void;
  handleClose: () => void;
};

type SocketAuth = {
  socketId: string | undefined;
};

type UserLogin = {
  username: string;
  password: string;
};

type MQTTMessageTransfer = MQTTMessage & { timestamp: number; prev?: { value: number; timestamp: number } };

interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

type postMqttDataRequest = {
  start: number;
  end: number;
  topic: string;
  boolean?: boolean;
};

type postMqttTodayRequest = {
  topic: string;
};

type postMqttTodayResponse = dailyStats;

type dailyStats = {
  topic: string;
  valueType: MQTTMessage["valueType"];
  date: Date;

  // BOOLEAN
  uptime: number | null; // in milliseconds
  downtime: number | null; // in milliseconds
  risingCount: number | null;
  fallingCount: number | null;

  // FLOAT
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number | null;
};

type DataPoint = {
  value: number;
  timestamp: Date;
};

type postMqttStatsRequest = {
  topic: string;
};

type postMqttStatsResponse = dailyStats[];

type postMqttNicknameRequest = {
  topics: string[];
};

type postMqttNicknameResponse = Record<string, string>;

type PopupContentProps = {
  showPopup: () => void;
  closePopup: () => void;
};

type Rule = {
  id: number;

  name: string;
  notificationTitle: string;
  notificationBody: string;
  severity: import("@prisma/client").ruleSeverity;

  conditions: string[];
  topics: string[];
};

type RuleEditable = {
  id: number;

  name: string;
  notificationTitle: string;
  notificationBody: string;
  severity: import("@prisma/client").ruleSeverity;

  conditions: {
    condition: string;

    deleted: boolean;
    edited: boolean;
    isNew: boolean;
  }[];
  topics: string[];

  deleted: boolean;
  edited: boolean;
  isNew: boolean;
};

type SetRules = {
  added: Rule[];
  edited: Rule[];
  deleted: Rule[];
};

type RuleTopics = Record<string, "number" | "boolean">;
type RuleContext = Record<string, number | boolean>;

type RuleNotifyState = {
  [topic: string]: {
    [severity: Rule["severity"]]: boolean;
  };
};

type RuleWithId = Rule & { userId: string };

type NotificationProps = {
  actions?: NotificationAction[];
  badge?: string;
  body: string;
  data?: Record<string, unknown>;
  dir?: string;
  icon?: string;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean | null;
  tag?: string;
  timestamp?: number;
  title: string;
  vibrate?: number[];
};

type NotificationAction = {
  action: string;
  title: string;
  icon: string;
};

interface PgMonStats {
  database_name: string;
  total_transactions: number;
  disk_reads: number;
  cache_hits: number;
  cache_hit_ratio: number;
  rows_inserted: number;
  rows_updated: number;
  rows_deleted: number;
  current_time: Date;
}

interface postDarkRequest {
  dark: boolean;
}
