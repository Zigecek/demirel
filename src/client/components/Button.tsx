type ButtonProps = {
  text: string;
  onClick: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  color?: string;
};

export const Button: React.FC<ButtonProps> = ({ text, onClick, type = "button", disabled = false, color = "blue" }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-2 px-4 bg-${color}-600 text-white font-semibold rounded-md hover:bg-${color}-700 focus:outline-none focus:ring-2 focus:ring-${color}-500 ${
        disabled ? "bg-gray-300" : `bg-${color}-500 text-white`
      }`}>
      {text}
    </button>
  );
};
