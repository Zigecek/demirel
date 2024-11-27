import React, { useState } from "react";
import { FaPlus, FaTrash, FaUndo } from "react-icons/fa";

type Condition = {
  id: number;
  name: string;
  severity: "INFO" | "WARNING" | "ERROR";
  conditions: { text: string; isDeleted?: boolean }[];
  isDeleted?: boolean;
};

type ConditionsFormProps = {
  existingConditions: Condition[];
  onSave: (updatedConditions: Condition[]) => void;
  onClose: () => void;
};

export const ConditionsForm: React.FC<ConditionsFormProps> = ({ existingConditions, onSave, onClose }) => {
  const [conditions, setConditions] = useState<Condition[]>(existingConditions);
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(null);

  // Helper: Compare specific field against original value
  const isFieldEdited = (id: number, key: keyof Condition, value: any) => {
    const originalCondition = existingConditions.find((cond) => cond.id === id);
    return originalCondition ? originalCondition[key] !== value : false;
  };

  // Add a new condition
  const addNewCondition = () => {
    const newCondition: Condition = {
      id: Date.now(),
      name: "Nové oznámení",
      severity: "INFO",
      conditions: [],
    };
    setConditions((prev) => [...prev, newCondition]);
    setSelectedCondition(newCondition);
  };

  // Update specific condition field
  const updateCondition = (id: number, key: keyof Condition, value: any) => {
    setConditions((prev) => prev.map((cond) => (cond.id === id ? { ...cond, [key]: value } : cond)));
    setSelectedCondition((prev) => (prev?.id === id ? { ...prev, [key]: value } : prev));
  };

  // Toggle deletion of a condition
  const toggleConditionDeletion = (id: number) => {
    setConditions((prev) => prev.map((cond) => (cond.id === id ? { ...cond, isDeleted: !cond.isDeleted } : cond)));
    if (selectedCondition?.id === id) {
      setSelectedCondition((prev) => (prev ? { ...prev, isDeleted: !prev.isDeleted } : prev));
    }
  };

  // Toggle deletion of a rule
  const toggleRuleDeletion = (conditionId: number, ruleIdx: number) => {
    setConditions((prev) =>
      prev.map((cond) =>
        cond.id === conditionId
          ? {
              ...cond,
              conditions: cond.conditions.map((rule, idx) => (idx === ruleIdx ? (!rule.isDeleted ? { ...rule, isDeleted: true } : { ...rule }) : rule)),
            }
          : cond
      )
    );
  };

  return (
    <div className="flex gap-6 p-4">
      {/* Left Panel */}
      <div className="w-1/3 bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Seznam podmínek</h3>
        <ul>
          {conditions.map((cond) => (
            <li
              key={cond.id}
              className={`p-2 mb-2 rounded-lg flex justify-between items-center bg-white 
              ${cond.isDeleted && "bg-red-StatusCodes.OK line-through"} 
              ${!existingConditions.find((x) => x.id == cond.id) && "bg-green-StatusCodes.OK"} 
              ${!(existingConditions.find((x) => x.id == cond.id) == cond) && "bg-yellow-StatusCodes.OK"} 
            `}>
              <span onClick={() => setSelectedCondition(cond)} className="cursor-pointer">
                {cond.name}
              </span>
              <button
                type="button"
                onClick={() => toggleConditionDeletion(cond.id)}
                className={`py-1 px-3 font-semibold rounded-md ${cond.isDeleted ? "bg-green-500 text-white hover:bg-green-600" : "bg-red-500 text-white hover:bg-red-600"}`}>
                {cond.isDeleted ? <FaUndo /> : <FaTrash />}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addNewCondition}
          className="w-full py-2 px-4 bg-gray-300 text-white font-semibold rounded-md hover:bg-gray-StatusCodes.BAD_REQUEST focus:outline-none focus:ring-2 focus:ring-gray-StatusCodes.OK">
          <div className="flex justify-center">
            <FaPlus />
          </div>
        </button>
      </div>

      {/* Right Panel */}
      <div className="w-2/3 bg-white p-6 rounded-lg shadow-lg">
        {selectedCondition ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Název</label>
              <input
                type="text"
                value={selectedCondition.name}
                onChange={(e) => updateCondition(selectedCondition.id, "name", e.target.value)}
                className={`w-full p-2 border rounded ${isFieldEdited(selectedCondition.id, "name", selectedCondition.name) ? "border-yellow-500 bg-yellow-50" : ""}`}
                disabled={selectedCondition.isDeleted}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Závažnost</label>
              <select
                value={selectedCondition.severity}
                onChange={(e) => updateCondition(selectedCondition.id, "severity", e.target.value)}
                className={`w-full p-2 border rounded ${isFieldEdited(selectedCondition.id, "severity", selectedCondition.severity) ? "border-yellow-500 bg-yellow-50" : ""}`}
                disabled={selectedCondition.isDeleted}>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Podmínky</label>
              <ul>
                {selectedCondition.conditions.map((rule, idx) => (
                  <li key={idx} className="flex items-center mb-2">
                    <input
                      type="text"
                      value={rule.text}
                      onChange={(e) => {
                        const updatedRules = [...selectedCondition.conditions];
                        updatedRules[idx] = { ...rule, text: e.target.value };
                        updateCondition(selectedCondition.id, "conditions", updatedRules);
                      }}
                      className="flex-1 p-2 border rounded mr-2"
                      disabled={rule.isDeleted || selectedCondition.isDeleted}
                    />
                    <button
                      type="button"
                      onClick={() => toggleRuleDeletion(selectedCondition.id, idx)}
                      className={`py-2 px-4 font-semibold rounded-md ${rule.isDeleted ? "bg-green-500 text-white hover:bg-green-600" : "bg-red-500 text-white hover:bg-red-600"}`}>
                      {rule.isDeleted ? <FaUndo /> : <FaTrash />}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => updateCondition(selectedCondition.id, "conditions", [...selectedCondition.conditions, { text: "", isDeleted: false }])}
                className="w-full py-2 px-4 bg-gray-300 text-white font-semibold rounded-md hover:bg-gray-StatusCodes.BAD_REQUEST focus:outline-none focus:ring-2 focus:ring-gray-StatusCodes.OK">
                <div className="flex justify-center">
                  <FaPlus />
                </div>
              </button>
            </div>
          </>
        ) : (
          <p>Vyberte podmínku z levého seznamu nebo přidejte novou.</p>
        )}
      </div>
    </div>
  );
};
