enum Afix {
  prefix = "prefix",
  suffix = "suffix",
}

export const number = (val: string) => parseFloat(val);

export const fix = (val: number, fix: number) => {
  if (isNaN(val)) {
    return "---";
  }
  return val.toFixed(fix);
};

export const unit = (val: number | string, unit: string, afix: Afix = Afix.suffix, delimiter: string = "") => {
  let string = val.toString();

  if (afix === Afix.prefix) {
    string = unit + delimiter + string;
  } else {
    string = string + delimiter + unit;
  }

  return string;
};
