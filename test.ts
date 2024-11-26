type VariableType = "number" | "boolean";
type VariableMap = { [key: string]: VariableType };
type Context = { [key: string]: any };

function validateExpression(expression: string, variables: VariableMap): boolean {
  // Nahrazení placeholderů za typové informace
  let replacedExpression = expression;
  for (const [key, type] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    replacedExpression = replacedExpression.replace(regex, type === "number" ? "0" : "true");
  }

  // Kontrola, zda výraz obsahuje platné operátory a neobsahuje neznámé placeholdery
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
}

// Funkce pro vyhodnocení výrazu
function evaluateExpression(expression: string, context: Context): boolean {
  // Nahrazení placeholderů za hodnoty z contextu
  let replacedExpression = expression;
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    replacedExpression = replacedExpression.replace(regex, JSON.stringify(value));
  }
  console.log("Replaced expression:", replacedExpression);

  // Vyhodnocení výrazu
  try {
    return Function(`return (${replacedExpression});`)();
  } catch (error) {
    throw new Error(`Invalid expression: ${error.message}`);
  }
}

// Příklad použití
const variables: VariableMap = {
  "zige/pozar0/temp/val": "number",
};

const context: Context = {
  "zige/pozar0/temp/val": 31,
};

const expression = "{zige/pozar0/temp/val} > 30";

if (validateExpression(expression, variables)) {
  console.log("Expression is valid.");

  const result = evaluateExpression(expression, context);
  console.log("Expression result:", result);
} else {
  console.log("Invalid expression syntax.");
}
