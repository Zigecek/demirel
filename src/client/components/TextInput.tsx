import React from "react";

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
  type?: string;
}

const TextInput: React.FC<TextInputProps> = ({ id, label, value, onChange, hasError, type = "text" }) => {
  return (
    <div>
      <label htmlFor={id} className="ml-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-neutral-200 dark:bg-neutral-700 mx-2 mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
          hasError ? "border-red-500" : "border-neutral-300"
        }`}
      />
    </div>
  );
};

export default TextInput;
