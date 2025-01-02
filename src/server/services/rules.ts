import { prisma, Status, status } from "..";
import logger from "../utils/loggers";
import { memory, onMemoryChange } from "../utils/memory";
import { completeEval, replaceAll, replaceTopicsBasic } from "../utils/rules";
import { sendNotification } from "../utils/webpush";

let rules: RuleWithId[] = [];
const topicTypes: RuleTopics = {};

const activeRules: RuleWithId[] = [];

export const updateRules = async (username: string) => {
  rules
    .filter((rule) => rule.userId === username)
    .forEach((rule) => {
      deactivateRuleNotify(rule);
    });
  rules = rules.filter((rule) => rule.userId !== username);
  const newRules = await prisma.rule.findMany({
    where: {
      userId: username,
    },
  });

  rules.push(...newRules);
};

export const loadRules = async () => {
  logger.rules.info("Updating rules.");
  rules = await prisma.rule.findMany();
};

export const setTypes = async () => {
  // set topicTypes
  rules.forEach((rule) => {
    rule.topics.forEach((topic) => {
      if (!topicTypes[topic]) {
        if (memory[topic].length > 0) {
          if (memory[topic][0].valueType == "BOOLEAN") {
            topicTypes[topic] = "boolean";
          } else if (memory[topic][0].valueType == "FLOAT") {
            topicTypes[topic] = "number";
          }
        }
      }
    });
  });
};

export const checkRule = async (topic: string) => {
  // 1. get all rules for the topic
  const topicRules = rules.filter((rule) => rule.topics.includes(topic));

  topicRules.forEach(async (rule) => {
    // 2. get vals from memory for all the rule topics

    rule.notificationBody = await replaceAll(rule.notificationBody);
    rule.notificationTitle = await replaceAll(rule.notificationTitle);

    // 3. check the rule
    // call completeEval on each condition from conditions
    // completeEval is async so we need to wait for all of them to finish
    async function areAllConditionsTrue(conditions: string[]) {
      for (const condition of conditions) {
        try {
          if (!(await completeEval(condition, rule.userId))) {
            return false; // Okamžitý návrat, pokud je podmínka nepravdivá
          }
        } catch (error) {
          logger.rules.error(`Rules: Rule '${rule.name}' condition: '${replaceTopicsBasic(condition)}' failed with error: ${error}`);
          return false;
        }
      }
      return true; // Všechny podmínky jsou pravdivé
    }

    const result = await areAllConditionsTrue(rule.conditions);

    if (result) {
      logger.rules.info(`Rules: Rule '${rule.name}' condition: '${replaceTopicsBasic(rule.conditions.join(" && "))}' passed.`);

      activateRuleNotify(rule);
    } else {
      deactivateRuleNotify(rule);
    }
  });
};

const activateRuleNotify = async (rule: RuleWithId) => {
  if (rule.severity == "INFO" && !activeRules.includes(rule)) {
    // send 1 notification on change
    activeRules.push(rule);

    // send notification
    sendNotification(rule.userId, {
      title: rule.notificationTitle,
      body: rule.notificationBody,
      icon: "https://img.icons8.com/?size=1024&id=Plgmgi7oHlL6&format=png&color=000000",
    } as NotificationOptions);
  }

  if (rule.severity == "WARNING") {
    // send 1 notification on change
    if (!activeRules.includes(rule)) activeRules.push(rule);

    // send notification
    sendNotification(rule.userId, {
      title: rule.notificationTitle,
      body: rule.notificationBody,
      icon: "https://img.icons8.com/?size=1024&id=rliRb6nC38ip&format=png&color=000000",
    } as NotificationOptions);
  }

  if (rule.severity == "SERIOUS") {
    // send 1 notification on change
    if (!activeRules.includes(rule)) activeRules.push(rule);

    // send notification
    const serious = () => {
      sendNotification(rule.userId, {
        title: rule.notificationTitle,
        body: rule.notificationBody,
        icon: "https://img.icons8.com/?size=1024&id=zHqriwlFOo3J&format=png&color=000000",
      } as NotificationOptions);
    };

    serious();
    setInterval(() => {
      if (activeRules.includes(rule)) serious();
    }, 1000 * 3);
  }
};

const deactivateRuleNotify = async (rule: RuleWithId) => {
  if (!activeRules.includes(rule)) return;

  // deactivate rule
  const index = activeRules.indexOf(rule);
  activeRules.splice(index, 1);
};

export const start = async () => {
  logger.rules.info("Starting rules service.");
  await loadRules();
  await setTypes();
  onMemoryChange((msg) => {
    checkRule(msg.topic);
  });
  status.rules = Status.RUNNING;
};
