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

export const bool = (val: string | boolean, on: string, off: string, invert: boolean = false) => {
  return parseBoolean(val) !== invert ? on : off;
};



function parseBoolean(value: number | string | boolean): boolean {
  if (typeof value === 'string') {
      // Trim the string to avoid extra spaces affecting the check
      value = value.trim().toLowerCase();

      // Handle strings "true" and "1" as true
      if (value === 'true' || value === '1') return true;

      // Handle strings "false" and "0" as false
      if (value === 'false' || value === '0') return false;
  }
  
  // Handle actual boolean or numeric types
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  // If none of the above, return false by default (can customize as needed)
  return false;
}