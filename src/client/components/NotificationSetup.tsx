import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaUndo } from "react-icons/fa";
import { getMqttFirstValues, getNotificationRules, postNotificationRules } from "../proxy/endpoints";
import { validateCondition } from "../../globals/rules";
import { useSnackbar } from "../hooks/useSnackbar";

const parseFetchedRules = (rules: Rule[]): RuleEditable[] => {
  return rules.map((rule) => {
    return {
      ...rule,
      conditions: rule.conditions.map((condition) => ({
        condition,
        deleted: false,
        edited: false,
        isNew: false,
      })),
      deleted: false,
      edited: false,
      isNew: false,
    };
  });
};

const parseEditableRules = (rules: RuleEditable[]): SetRules => {
  return {
    added: rules
      .filter((rule) => rule.isNew)
      .map((rule) => ({
        ...rule,
        conditions: rule.conditions.map((condition) => condition.condition),
      })),
    edited: rules
      .filter((rule) => rule.edited && !rule.isNew && !rule.deleted)
      .map((rule) => ({
        ...rule,
        conditions: rule.conditions.map((condition) => condition.condition),
      })),
    deleted: rules
      .filter((rule) => rule.deleted)
      .map((rule) => ({
        ...rule,
        conditions: rule.conditions.map((condition) => condition.condition),
      })),
  };
};

export const NotificationSetup: React.FC<PopupContentProps> = ({ closePopup }) => {
  const [snackbarConfig, SnackbarComponent] = useSnackbar();
  const [topics, setTopics] = useState<RuleTopics>({});

  const [initRules, setInitRules] = useState<RuleEditable[]>([]);
  const [rules, setRules] = useState<RuleEditable[]>([]);

  const [selectedRule, setSelectedRule] = useState<RuleEditable | null>(rules[0]);
  const [changes, setChanges] = useState<boolean>(false);

  useEffect(() => {
    console.log(topics);
  }, [topics]);

  useEffect(() => {
    const init = async () => {
      const fv = await getMqttFirstValues();

      if (!fv.success) {
        snackbarConfig?.showSnackbar({
          text: fv.message,
          severity: "error",
        });
        return;
      }

      const allVals = fv.responseObject;

      if (!allVals) return;
      if (allVals.length === 0) return;
      setTopics(
        allVals.reduce((acc, v) => {
          acc[v.topic] = v.valueType == "FLOAT" ? "number" : "boolean";
          return acc;
        }, {} as RuleTopics)
      );

      const nr = await getNotificationRules();

      if (!nr.success) {
        snackbarConfig?.showSnackbar({
          text: nr.message,
          severity: "error",
        });
        return;
      }

      const fetchedRules = nr.responseObject;

      if (!fetchedRules) return;
      if (fetchedRules.length === 0) return;

      setInitRules(parseFetchedRules(fetchedRules));
    };
    init();
  }, []);

  // propagate selectedCondition changes to the conditions
  useEffect(() => {
    if (!selectedRule) return;

    setRules((prev) =>
      prev.map((rule) => {
        if (rule.id !== selectedRule.id) {
          return rule;
        } else {
          const init = initRules.find((x) => x.id == rule.id);
          if (init) {
            init.edited = selectedRule.edited;
          }
          const edited = JSON.stringify(initRules.find((x) => x.id == rule.id)) != JSON.stringify(selectedRule);

          return { ...selectedRule, edited };
        }
      })
    );
  }, [selectedRule]);

  // propagate changes to the changes state
  useEffect(() => {
    setChanges(JSON.stringify(initRules) != JSON.stringify(rules));
  }, [rules]);

  const validateAllConditions = (rs: RuleEditable[]): boolean => {
    if (!rs) return false;

    // validate using validateCondition

    return rs.every((rule) => {
      return rule.conditions.every((condition) => {
        return validateCondition(condition.condition, topics);
      });
    });
  };

  const sendRules = async () => {
    const syntaxError = !validateAllConditions(rules);

    if (syntaxError) {
      snackbarConfig?.showSnackbar({
        text: "Chyba syntaxe v podmínkách.",
        severity: "error",
      });
      return;
    }

    const rulesToSend = parseEditableRules(rules);

    // send the rules
    const res = await postNotificationRules(rulesToSend);

    if (res.success) {
      snackbarConfig?.showSnackbar({
        text: res.message,
        severity: "success",
      });
    } else {
      snackbarConfig?.showSnackbar({
        text: res.message,
        severity: "error",
      });
    }

    closePopup();
  };

  const toggleConditionDeletion = (index: number) => {
    if (!selectedRule) return;

    setSelectedRule((prev) => {
      if (!prev) return null;

      const updatedConditions = prev.conditions
        .map((condition, i) => {
          if (i !== index) return condition;
          if (condition.isNew && !condition.deleted) {
            // remove the condition if it's new and not deleted
            return null;
          }
          return { ...condition, deleted: !condition.deleted };
        })
        .filter((condition): condition is NonNullable<typeof condition> => condition !== null); // filter out null values

      return {
        ...prev,
        conditions: updatedConditions,
      };
    });
  };

  const toggleRuleDeletion = (id: number) => {
    if (selectedRule?.id === id) {
      if (selectedRule.isNew && !selectedRule.deleted) {
        setSelectedRule(rules[0]);
      }
      setSelectedRule((prev) => (prev ? { ...prev, deleted: !prev.deleted } : prev));
    }
    setRules((prev) =>
      prev
        .map((rule) => {
          if (rule.id !== id) return rule;
          if (rule.isNew && !rule.deleted) {
            setSelectedRule(rules[0]);
            return null;
          }
          return { ...rule, deleted: !rule.deleted };
        })
        .filter((rule): rule is NonNullable<typeof rule> => rule !== null)
    );
  };

  const addNewRule = () => {
    const newRule: RuleEditable = {
      id: Date.now(),
      name: "Velké teplo ale nehoří",
      severity: "INFO",
      conditions: [
        {
          condition: "{zige/pozar0/temp/val} > 30",
          deleted: false,
          edited: false,
          isNew: true,
        },
        {
          condition: "{zige/pozar0/temp/val} < 70",
          deleted: false,
          edited: false,
          isNew: true,
        },
      ],
      topics: [],
      deleted: false,
      edited: false,
      isNew: true,
    };
    setRules((prev) => [...prev, newRule]);
    setSelectedRule(newRule);
  };

  const addNewCondition = () => {
    if (!selectedRule) return;

    setSelectedRule((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        conditions: [
          ...prev.conditions,
          {
            condition: "Nová podmínka",
            deleted: false,
            edited: false,
            isNew: true,
          },
        ],
      };
    });
  };

  return (
    <>
      <div className="flex gap-6 p-4">
        {/* Left Panel */}
        <div className="w-1/3 bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Seznam podmínek</h3>
          <ul>
            {rules.map((rule) => (
              <li
                className={`${(() => {
                  if (rule.deleted) {
                    return "bg-red-100 line-through";
                  }
                  if (rule.isNew) {
                    return "bg-green-100";
                  }
                  if (rule.edited) {
                    return "bg-yellow-100";
                  }

                  return "bg-white";
                })()} p-2 mb-2 rounded-lg flex justify-between items-center`}
                key={rule.id}>
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedRule(rule);
                  }}>
                  {rule.name}
                </div>
                <button
                  type="button"
                  onClick={() => toggleRuleDeletion(rule.id)}
                  className={`py-1 px-3 font-semibold rounded-md ${rule.deleted ? "bg-green-500" : "bg-red-500"} text-white ${rule.deleted ? "hover:bg-green-600" : "hover:bg-red-600"}`}>
                  {rule.deleted ? <FaUndo /> : <FaTrash />}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => addNewRule()}
            type="button"
            className="w-full py-2 px-4 bg-gray-300 text-white font-semibold rounded-md hover:bg-gray-StatusCodes.BAD_REQUEST focus:outline-none focus:ring-2 focus:ring-gray-StatusCodes.OK">
            <div className="flex justify-center">
              <FaPlus />
            </div>
          </button>
        </div>

        {/* Right Panel */}
        <div className="w-2/3 bg-white p-6 rounded-lg shadow-lg">
          {selectedRule && (
            <>
              {/* Název */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2`}>Název</label>
                <input
                  type="text"
                  className={`${(() => {
                    if (selectedRule.deleted) {
                      return "border-red-500 bg-red-100 line-through";
                    }
                    if (selectedRule.isNew) {
                      return "border-green-500 bg-green-100";
                    }
                    if (selectedRule.name !== initRules.find((x) => x.id == selectedRule.id)?.name) {
                      return "border-yellow-500 bg-yellow-100";
                    }
                    return "";
                  })()} w-full p-2 border rounded`}
                  value={selectedRule.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSelectedRule((prev) => {
                      if (!prev) return null;
                      return { ...prev, name: newName };
                    });
                  }}
                />
              </div>

              {/* Závažnost */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Závažnost</label>
                <select
                  className={`${(() => {
                    if (selectedRule.deleted) {
                      return "border-red-500 bg-red-100 line-through";
                    }
                    if (selectedRule.isNew) {
                      return "border-green-500 bg-green-100";
                    }
                    if (selectedRule.severity !== initRules.find((x) => x.id == selectedRule.id)?.severity) {
                      return "border-yellow-500 bg-yellow-100";
                    }
                    return "";
                  })()} w-full p-2 border rounded`}
                  value={selectedRule.severity}
                  onChange={(e) => {
                    const newSeverity = e.target.value as Rule["severity"];
                    setSelectedRule((prev) => {
                      if (!prev) return null;
                      return { ...prev, severity: newSeverity };
                    });
                  }}>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="SERIOUS">SERIOUS</option>
                </select>
              </div>

              {/* Podmínky */}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Podmínky</label>
                <ul>
                  {selectedRule.conditions.map((cond, index) => (
                    <li className="flex items-center mb-2">
                      <input
                        type="text"
                        className={`${(() => {
                          if (cond.deleted || selectedRule.deleted) {
                            return "border-red-500 bg-red-100 line-through";
                          }
                          if (cond.isNew || selectedRule.isNew) {
                            return "border-green-500 bg-green-100";
                          }
                          if (selectedRule.conditions[index].condition !== initRules.find((x) => x.id == selectedRule.id)?.conditions[index].condition) {
                            return "border-yellow-500 bg-yellow-100";
                          }
                          return "";
                        })()} flex-1 p-2 border rounded mr-2`}
                        value={cond.condition}
                        onChange={(e) => {
                          const newCondition = e.target.value;
                          setSelectedRule((prev) => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              conditions: prev.conditions.map((c) => (c === cond ? { ...c, condition: newCondition } : c)),
                            };
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => toggleConditionDeletion(selectedRule.conditions.indexOf(cond))}
                        className={`py-2 px-4 font-semibold rounded-md ${cond.deleted ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}>
                        {cond.deleted ? <FaUndo /> : <FaTrash />}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => addNewCondition()}
                  type="button"
                  className="w-full py-2 px-4 bg-gray-300 text-white font-semibold rounded-md hover:bg-gray-StatusCodes.BAD_REQUEST focus:outline-none focus:ring-2 focus:ring-gray-StatusCodes.OK">
                  <div className="flex justify-center">
                    <FaPlus />
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-4 w-full justify-center">
        <button
          onClick={() => {
            sendRules();
          }}
          disabled={!changes}
          className={`${
            changes ? "bg-blue-500 hover:bg-blue-600" : "bg-blue-300"
          } focus:ring-blue-StatusCodes.BAD_REQUEST py-2 px-4 text-white font-semibold rounded-md focus:outline-none focus:ring-2`}>
          Uložit
        </button>
        <button
          onClick={() => {
            closePopup();
          }}
          className="py-2 px-4 bg-gray-500 text-white font-semibold rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-StatusCodes.BAD_REQUEST">
          Zrušit
        </button>
      </div>
      {SnackbarComponent}
    </>
  );
};
