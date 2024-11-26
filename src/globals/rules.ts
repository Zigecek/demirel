export const validateCondition = (expression: string, topics: RuleTopics): boolean => {
  // Nahrazení topiců za typové informace
  let replacedExpression = expression;
  for (const [key, type] of Object.entries(topics)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    replacedExpression = replacedExpression.replace(regex, type === "number" ? "0" : "true");
  }

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

function evaluateExpression(expression: string, context: RuleContext): boolean {
  // Nahrazení topiců za hodnoty z contextu
  let replacedExpression = expression;
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    replacedExpression = replacedExpression.replace(regex, JSON.stringify(value));
  }

  // Vyhodnocení výrazu
  try {
    return Function(`return (${replacedExpression});`)();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid expression: ${error.message}`);
    } else {
      throw new Error("Invalid expression: unknown error");
    }
  }
}

const extractTopics = (expression: string): string[] => {
  // Regulární výraz pro vyhledání všech výrazů ve složených závorkách
  const topicRegex = /\{([^}]+)\}/g;
  const topics: string[] = [];
  let match;

  // Prohledávání výrazu a přidávání nalezených topiců do pole
  while ((match = topicRegex.exec(expression)) !== null) {
    topics.push(match[1]); // Přidáme pouze obsah složených závorek
  }

  return topics;
};
