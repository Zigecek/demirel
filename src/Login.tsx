import React, { useState } from "react";
import TextInput from "./components/TextInput";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ username: false, password: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validace: jestli jsou políčka prázdná, nastavíme error na true
    const hasUsernameError = username.trim() === "";
    const hasPasswordError = password.trim() === "";

    setErrors({
      username: hasUsernameError,
      password: hasPasswordError,
    });

    // Pokud nejsou žádné chyby, můžeš pokračovat s logikou přihlášení
    if (!hasUsernameError && !hasPasswordError) {
      console.log("Přihlášení:", { username, password });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white shadow-lg rounded-lg md:max-w-lg">
        <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextInput id="username" label="Username" value={username} onChange={setUsername} hasError={errors.username} />
          <TextInput id="password" label="Password" type="password" value={password} onChange={setPassword} hasError={errors.password} />
          <div>
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
