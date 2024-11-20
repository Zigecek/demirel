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
  value: string | number | boolean;
  timestamp: Date;
  valueType: "STRING" | "FLOAT" | "BOOLEAN";
};

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

type MQTTMessageTransfer = MQTTMessage & { timestamp: number };

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

type postMqttTodayResponse = {
  topic: string;
  valueType: MQTTMessage["valueType"];
  // BOOLEAN
  uptime: number | null; // in milliseconds
  downtime: number | null; // in milliseconds

  // FLOAT
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number | null;

  // STRING
  first: string | null;
  last: string | null;
};
