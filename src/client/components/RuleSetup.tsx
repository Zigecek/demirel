import { CircularProgress } from "@mui/material";
import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaUndo } from "react-icons/fa";
import { validateExpression } from "../../globals/rules";
import { useSnackbarContext } from "../contexts/SnackbarContext";
import { getMqttFirstValues, getNotificationRules, postNotificationRules } from "../proxy/endpoints";

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

export const RuleSetup: React.FC<PopupContentProps> = ({ closePopup }) => {
  const { showSnackbar } = useSnackbarContext();
  const [topics, setTopics] = useState<RuleTopics>({});

  const [initRules, setInitRules] = useState<RuleEditable[]>([]);
  const [rules, setRules] = useState<RuleEditable[]>([]);

  const [selectedRule, setSelectedRule] = useState<RuleEditable | null>(rules[0]);
  const [changes, setChanges] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      const fv = await getMqttFirstValues();

      if (!fv.success) {
        showSnackbar({
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
        showSnackbar({
          text: nr.message,
          severity: "error",
        });
        return;
      }

      const fetchedRules = nr.responseObject;

      if (!fetchedRules) return;
      if (fetchedRules.length === 0) return;

      setInitRules(parseFetchedRules(fetchedRules));
      setRules(parseFetchedRules(fetchedRules));
    };
    init().finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!initRules) return;

    setSelectedRule(rules.length > 0 ? rules[0] : null);
  }, [initRules]);

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

  const validateExpressions = (rs: RuleEditable[]): boolean => {
    console.log("rules", rs);
    if (!rs) return false;

    // validate all conditions
    return rs.every((rule) => {
      return rule.conditions.every((condition) => {
        console.log("condition", condition);
        console.log("result", validateExpression(condition.condition, topics));
        return validateExpression(condition.condition, topics);
      });
    });
  };

  const sendRules = async () => {
    const syntaxError = !validateExpressions(rules);

    if (syntaxError) {
      showSnackbar({
        text: "Chyba syntaxe v podmínkách.",
        severity: "error",
      });
      return;
    }

    const rulesToSend = parseEditableRules(rules);

    // send the rules
    const res = await postNotificationRules(rulesToSend);

    if (res.success) {
      showSnackbar({
        text: res.message,
        severity: "success",
      });
    } else {
      showSnackbar({
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
      name: "Kuchyň zatopeno (vzor, přepiš)",
      notificationTitle: "Nehoří, jen babička zatopila! (vzor, přepiš)",
      notificationBody: "Babička zatopila v kuchyni na {zige/pozar0/temp/val}°C (vzor, přepiš)",
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
            condition: "",
            deleted: false,
            edited: false,
            isNew: true,
          },
        ],
      };
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex gap-3 p-2 flex-wrap md:flex-nowrap grow">
        {/* Left Panel */}
        <div className="w-full md:w-1/3 bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Seznam pravidel</h3>
          {loading && (
            <div className="flex justify-center gap-3 m-2">
              <CircularProgress />
            </div>
          )}
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
                })()} p-2 mb-2 rounded-lg flex justify-between items-center border ${selectedRule?.id === rule.id ? "border-gray-700" : "border-white"}`}
                key={rule.id}>
                <div className="flex justify-between w-full">
                  <div
                    className="cursor-pointer flex-grow break-all"
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
                </div>
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
        <div className="w-full md:w-2/3 bg-white p-4 rounded-lg shadow-lg">
          {selectedRule && (
            <>
              {/* Název pravidla */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2`}>Název pravidla</label>
                <input
                  type="text"
                  placeholder="Název pravidla"
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

              {/* Nadpis v oznámení */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2`}>Nadpis v oznámení</label>
                <input
                  type="text"
                  placeholder="Nadpis v oznámení"
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
                  value={selectedRule.notificationTitle}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setSelectedRule((prev) => {
                      if (!prev) return null;
                      return { ...prev, notificationTitle: newTitle };
                    });
                  }}
                />
              </div>

              {/* Popisek v oznámení */}
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2`}>Popisek v oznámení</label>
                <input
                  type="text"
                  placeholder="Popisek v oznámení"
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
                  value={selectedRule.notificationBody}
                  onChange={(e) => {
                    const newBody = e.target.value;
                    setSelectedRule((prev) => {
                      if (!prev) return null;
                      return { ...prev, notificationBody: newBody };
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
                        placeholder="Podmínka"
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
                        })()} w-full p-2 border rounded mr-2`}
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

      {/* Buttons */}
      <div className="flex gap-3 w-full justify-center my-3">
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
    </div>
  );
};
