export const POSLEDNIregex = /POSLEDNI\(([^)]+)\)/;
export const ZMENAregex = /ZMENA\(([^,]+),\s*([^,]+),\s*([*+-])\)/;
export const TRVAregex = /TRVA\(([^,]+),\s*([^,]+),\s*([^)]+)\)/;

export const validateExpression = (expression: string, topics: RuleTopics): boolean => {
  // Nahrazení topiců za typové informace
  let replacedExpression = expression;
  for (const [key, type] of Object.entries(topics)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    replacedExpression = replacedExpression.replace(regex, type === "number" ? "1" : "1");
  }

  // validate all function regexes
  const regexes = [ZMENAregex, TRVAregex, POSLEDNIregex];
  // replaces all functions with a placeholder
  regexes.forEach((regex) => {
    replacedExpression = replacedExpression.replace(regex, "1");
  });

  // Kontrola, zda výraz obsahuje platné operátory a neobsahuje neznámé topicy
  const syntaxCheck = /^[0-9+\-*/<>=&|!() truefal]+$/i.test(replacedExpression);
  if (!syntaxCheck) return false;

  // Ověření, zda se dá výraz vyhodnotit
  try {
    // Bezpečné vyhodnocení pro testování
    Function(`return (${replacedExpression});`)();
    return true;
  } catch {
    return false;
  }
};
