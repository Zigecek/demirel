import { prisma, Status, status } from "../../..";
import { evaluateExpression, replaceTopics } from "../../../../globals/rules";
import { logger } from "../../../server";
import { memory, onMemoryChange } from "../memory";
import { sendNotification } from "../webpush";

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
  logger.info("Rules: Updating rules.");
  rules = await prisma.rule.findMany();
};

export const setTypes = async () => {
  // set topicTypes
  rules.forEach((rule) => {
    rule.topics.forEach((topic) => {
      if (!topicTypes[topic]) {
        if (memory[topic]) {
          if (memory[topic].valueType == "BOOLEAN") {
            topicTypes[topic] = "boolean";
          } else if (memory[topic].valueType == "FLOAT") {
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

  topicRules.forEach((rule) => {
    // 2. get vals from memory for all the rule topics
    const context: Record<string, MQTTMessage["value"]> = {};
    rule.topics.forEach((ruleTopic) => {
      context[ruleTopic] = memory[ruleTopic].value;
    });

    rule.notificationBody = replaceTopics(rule.notificationBody, context);
    rule.notificationTitle = replaceTopics(rule.notificationTitle, context);

    // 3. check the Rule
    const result = rule.conditions.every((condition) => {
      return evaluateExpression(condition, context);
    });

    if (result) {
      logger.info(`Rules: Rule '${rule.name}' for topic '${topic}' passed.`);

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
  logger.info("Rules: Starting rules service.");
  await loadRules();
  await setTypes();
  onMemoryChange((msg) => {
    checkRule(msg.topic);
  });
  status.rules = Status.RUNNING;
};
