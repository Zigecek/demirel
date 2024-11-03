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