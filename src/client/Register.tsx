import React, { useState, useEffect } from "react";
import TextInput from "./components/TextInput";
import { postRegister } from "./proxy/endpoints";
import CustomSnackbar, { createDefaultConfig } from "./components/CustomSnackbar";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errors, setErrors] = useState({ username: false, password: false, password2: false });
  const [snackbarConfig, setSnackbarConfig] = useState<SnackBarConfig>();

  useEffect(() => {
    setSnackbarConfig(createDefaultConfig(setSnackbarConfig));
  }, []);

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
          if (response.status === 202) {
            snackbarConfig?.showSnackbar({
              text: "User already logged in.",
              severity: "warning",
            });
          } else if (response.status === 200) {
            snackbarConfig?.showSnackbar({
              text: "Successfully registered.",
              severity: "success",
            });
          }
          window.location.href = "/";
        })
        .catch((error) => {
          // show snackbar
          if (error.response?.status === 409) {
            snackbarConfig?.showSnackbar({
              text: "User already exists.",
              severity: "error",
            });
          } else if (error.response?.status === 400) {
            snackbarConfig?.showSnackbar({
              text: "Please fill in all fields.",
              severity: "error",
            });
          } else {
            snackbarConfig?.showSnackbar({
              text: "An error occurred: " + error.message,
              severity: "error",
            });
          }
        });
    }
  };

  return (
    <>
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
      {snackbarConfig && <CustomSnackbar config={snackbarConfig} />}
    </>
  );
}
