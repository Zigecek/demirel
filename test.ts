import { evaluateExpression, validateExpression } from "./src/globals/rules";

// Příklad použití
const variables = {
  "zige/pozar0/fire/val": "boolean",
  "zige/pozar0/temp/val": "number",
};

const context = {
  "zige/pozar0/fire/val": false,
  "zige/pozar0/temp/val": 32.3,
};

const expression = "{zige/pozar0/temp/val} > 60 || {zige/pozar0/fire/val}";

if (validateExpression(expression, variables)) {
  console.log("Expression is valid.");

  const result = evaluateExpression(expression, context);
  console.log("Expression result:", result);
} else {
  console.log("Invalid expression syntax.");
}
