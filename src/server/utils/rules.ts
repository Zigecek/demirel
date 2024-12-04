import { prisma } from "..";
import { POSLEDNIregex, TRVAregex, validateExpression, ZMENAregex } from "../../globals/rules";
import logger from "./loggers";
import { memory } from "./memory";

const getContext = (expression: string): RuleContext => {
  const context: RuleContext = {};
  extractTopics(expression).forEach((ruleTopic) => {
    if (memory[ruleTopic]) {
      context[ruleTopic] = memory[ruleTopic].value;
    }
  });

  return context;
};

const replaceTopics = (expression: string, context: RuleContext): string => {
  // Nahrazení topiců za typové informace
  let replacedExpression = expression;
  for (const [key, value] of Object.entries(context)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    replacedExpression = replacedExpression.replace(regex, JSON.stringify(value));
  }

  return replacedExpression;
};

export const replaceTopicsBasic = (expression: string): string => {
  return replaceTopics(expression, getContext(expression));
};

const evaluateExpression = (expression: string, context: RuleContext): boolean => {
  // Nahrazení topiců za hodnoty z contextu
  const replacedExpression = replaceTopics(expression, context);

  logger.rules.info(`Evaluating expression: ${replacedExpression}`);

  // Vyhodnocení výrazu
  try {
    return Function(`return (${replacedExpression});`)();
  } catch (error) {
    logger.rules.error(`Error while evaluating expression: ${expression}`);
    logger.rules.error(error);
    return false;
  }
};

export const completeEval = async (expression: string) => {
  // call all functions in expression
  logger.rules.info(`Replacing expression: ${expression}`);

  let newExpression = await replaceFunctions(expression);
  newExpression = replaceTopicsBasic(newExpression);

  logger.rules.info(`-- Evaluating: ${newExpression}`);

  const result = evaluateExpression(newExpression, {});

  logger.rules.info(`-- Resulted in: ${result}`);

  return result;
};

export const replaceFunctions = async (expression: string) => {
  let newExpression = expression;
  newExpression = await ZMENA(newExpression);
  newExpression = await TRVA(newExpression);
  newExpression = await POSLEDNI(newExpression);
  return newExpression;
};

export const replaceAll = async (expression: string) => {
  let newExpression = expression;
  newExpression = await replaceFunctions(newExpression);
  newExpression = replaceTopicsBasic(newExpression);
  return newExpression;
};

export const extractTopics = (expression: string): string[] => {
  // Regulární výraz pro vyhledání všech výrazů ve složených závorkách
  const topicRegex = /\{([^}]+)\}/g;
  const topics: string[] = [];
  let match;

  // Prohledávání výrazu a přidávání nalezených topiců do pole
  while ((match = topicRegex.exec(expression)) !== null) {
    expression = expression.replace(match[0], ""); // Nahradíme nalezený výraz za prázdný řetězec
    topics.push(match[1]); // Přidáme pouze obsah složených závorek
  }

  // extract from all functions
  const functions = [ZMENAregex, TRVAregex, POSLEDNIregex];
  functions.forEach((func) => {
    while ((match = func.exec(expression)) !== null) {
      expression = expression.replace(match[0], ""); // Nahradíme nalezený výraz za prázdný řetězec
      topics.push(match[1]);
    }
  });

  // return unique topics
  return [...new Set(topics)];
};

async function ZMENA(expression: string) {
  // funkce ve stringu může mít například následující tvar: "ZMENA(zige/pozar0/temp/val, 45, *)"
  // chci toto detekovat a nahradit za hodnotu, proto budu potřebovat dostat jednotlivé argumenty funkce do proměnných
  // první parametr je vždy topic, druhý parametr je čas z jakých hodnot do historie máme vypočítat výsledek, třetí parametr je určení směru: * = jakýkol - = sestupná hrana, + = vzestupná hrana¨
  // výsledek je buď rozdíl minima a maxima u float hodnot, nebo počet změn u boolean hodnot

  // počítej s tím, že funkce se může vyskytnout vícekrát v jednom výrazu

  // pokud funkce není vůbec ve výrazu, tak nemusím nic dělat
  if (!ZMENAregex.test(expression)) {
    return expression;
  }

  // pokud je funkce ve výrazu, tak ji musím nahradit za hodnotu
  let replacedExpression = expression;
  let match;
  while ((match = ZMENAregex.exec(replacedExpression)) !== null) {
    const [fullMatch, topic, seconds, direction] = match;

    // zde budeš muset zjistit, zda je topic ve správném formátu
    // pokud není, tak bys měl vyhodit chybu
    if (!memory[topic]) {
      return replacedExpression;
    }

    // zde budeš muset zjistit, zda je seconds ve správném formátu
    // pokud není, tak bys měl vyhodit chybu
    if (isNaN(Number(seconds))) {
      return replacedExpression;
    }

    // zde budeš muset zjistit, zda je direction ve správném formátu
    // pokud není, tak bys měl vyhodit chybu
    if (!["*", "+", "-"].includes(direction)) {
      return replacedExpression;
    }

    // zde budeš muset zjistit, zda je value ve správném rozsahu
    // pokud není, tak bys měl vyhodit chybu
    if (memory[topic].valueType === "FLOAT") {
      if (isNaN(Number(seconds))) {
        return replacedExpression;
      }
    }

    // zde budeme řešit získávání hodnot z databáze a logiku této funkce
    // výsledek funkce bude nahrazen za fullMatch ve výrazu

    const dbHistory = await prisma.mqtt.findMany({
      where: {
        topic,
        timestamp: {
          gte: new Date(Date.now() - Number(seconds) * 1000),
        },
      },
      omit: {
        id: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });
    dbHistory.push(memory[topic]);

    if (memory[topic].valueType === "FLOAT") {
      const vals = dbHistory.map((item) => Number(item.value));
      const min = Math.min(...vals);
      const max = Math.max(...vals);

      let result = max - min;
      if (direction === "-") {
        result = -result;
      } else if (direction === "*") {
        result = Math.abs(result);
      }

      replacedExpression = replacedExpression.replace(fullMatch, result.toString());
    } else if (memory[topic].valueType === "BOOLEAN") {
      let changes = 0;

      // smer == + => vzestupna hrana
      // smer == - => sestupna hrana
      // smer == * => jakakoliv zmena

      for (let i = 0; i < dbHistory.length - 1; i++) {
        if (dbHistory[i].value !== dbHistory[i + 1].value) {
          if (
            direction === "*" ||
            (direction === "+" && dbHistory[i].value === false && dbHistory[i + 1].value === true) ||
            (direction === "-" && dbHistory[i].value === true && dbHistory[i + 1].value === false)
          ) {
            changes++;
          }
        }
      }

      replacedExpression = replacedExpression.replace(fullMatch, changes.toString());
    }
  }

  return replacedExpression;
}

async function TRVA(expression: string) {
  // zde je implementovaná funkce TRVA, která bude mít podobný tvar jako toto: "TRVA(topic, podmínka, čas_v_sekundách)"
  // topic je jasny
  // podmínka je výraz, který se bude vyhodnocovat nad hodnotami z historie
  // čas_v_sekundách je čas, který se má brát v úvahu

  // pokud funkce není vůbec ve výrazu, tak nemusím nic dělat
  if (!TRVAregex.test(expression)) {
    return expression;
  }

  // pokud je funkce ve výrazu, tak ji musím nahradit za hodnotu
  let replacedExpression = expression;
  let match;
  while ((match = TRVAregex.exec(replacedExpression)) !== null) {
    const [fullMatch, topic, condition, seconds] = match;

    // zde budeš muset zjistit, zda je topic ve správném formátu
    // pokud není, tak bys měl vyhodit chybu
    if (!memory[topic]) {
      return replacedExpression;
    }

    // zde budeš muset zjistit, zda je seconds ve správném formátu
    // pokud není, tak bys měl vyhodit chybu
    if (isNaN(Number(seconds))) {
      return replacedExpression;
    }

    // zde budeš muset zjistit, zda je condition ve správném formátu
    // pokud není, tak bys měl vyhodit chybu
    if (
      !validateExpression(`{${topic}} ${condition}`, {
        [topic]: memory[topic].valueType === "FLOAT" ? "number" : "boolean",
      })
    ) {
      return replacedExpression;
    }

    // zde budeme řešit získávání hodnot z databáze a logiku této funkce
    // výsledek funkce bude nahrazen za fullMatch ve výrazu

    const dbHistory = await prisma.mqtt.findMany({
      where: {
        topic,
        timestamp: {
          gte: new Date(Date.now() - Number(seconds) * 1000),
        },
      },
      omit: {
        id: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });
    dbHistory.push(memory[topic]);

    const result = dbHistory.every((item) => {
      const context: RuleContext = { [topic]: item.value as number | boolean };
      const cond = `{${topic}} ${condition}`;

      return evaluateExpression(cond, context);
    });

    replacedExpression = replacedExpression.replace(fullMatch, result.toString());
  }

  return replacedExpression;
}
const POSLEDNI = async (expression: string) => {
  // zde je implementovaná funkce POSLEDNI, která bude mít podobný tvar jako toto: "POSLEDNI(topic)"
  // vrací akorát poslední hodnotu z historie pro daný topic

  // pokud funkce není vůbec ve výrazu, tak nemusím nic dělat
  if (!POSLEDNIregex.test(expression)) {
    return expression;
  }

  // pokud je funkce ve výrazu, tak ji musím nahradit za hodnotu

  let replacedExpression = expression;
  let match;
  while ((match = POSLEDNIregex.exec(replacedExpression)) !== null) {
    const [fullMatch, topic] = match;

    // zde budeš muset zjistit, zda je topic ve správném formátu
    // pokud není, tak bys měl vyhodit chybu
    if (!memory[topic]) {
      return replacedExpression;
    }

    // zde budeme řešit získávání hodnot z databáze a logiku této funkce
    // výsledek funkce bude nahrazen za fullMatch ve výrazu

    const dbHistory = await prisma.mqtt.findFirst({
      where: {
        topic,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    replacedExpression = replacedExpression.replace(fullMatch, String(dbHistory?.value ?? "null"));
  }

  return replacedExpression;
};
