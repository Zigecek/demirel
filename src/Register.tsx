import React, { useState } from "react";
import TextInput from "./components/TextInput";
import { postRegister } from "./proxy/endpoints";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errors, setErrors] = useState({ username: false, password: false, password2: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validace: jestli jsou políčka prázdná, nastavíme error na true
    const hasUsernameError = username.trim() === "";
    const hasPasswordError = password.trim() === "";
    const hasPassword2Error = password2.trim() === "" || password !== password2;

    setErrors({
      username: hasUsernameError,
      password: hasPasswordError,
      password2: hasPassword2Error,
    });

    // Pokud nejsou žádné chyby, můžeš pokračovat s logikou přihlášení
    if (!hasUsernameError && !hasPasswordError && !hasPassword2Error) {
      // axios to /auth/Register
      postRegister({ username, password })
        .then((response) => {
          if (response.success) {
            // Registrace proběhla úspěšně
            console.log("Register successful");

            // Přesměrování na login page
            window.location.pathname = "/login";
          } else {
            // Registrace se nezdařila
            console.log("Register failed");
          }
        })
        .catch((error) => {
          // show snackbar
          console.error("Register failed", error);
        });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white shadow-lg rounded-lg md:max-w-lg">
        <h2 className="text-2xl font-semibold text-center mb-6">Register</h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <TextInput id="username" label="Username" value={username} onChange={setUsername} hasError={errors.username} />
          <TextInput id="password" label="Password" type="password" value={password} onChange={setPassword} hasError={errors.password} />
          <TextInput id="password2" label="Password again" type="password" value={password2} onChange={setPassword2} hasError={errors.password2} />
          <div>
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
