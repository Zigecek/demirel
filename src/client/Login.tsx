import React, { useEffect, useState } from "react";
import TextInput from "./components/TextInput";
import { postLogin } from "./proxy/endpoints";
import CustomSnackbar, { createDefaultConfig } from "./components/CustomSnackbar";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ username: false, password: false });
  const [snackbarConfig, setSnackbarConfig] = useState<SnackBarConfig>();

  useEffect(() => {
    setSnackbarConfig(createDefaultConfig(setSnackbarConfig));
  }, []);

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
      postLogin({ username, password })
        .then((response) => {
          if (response.success) {
            // Přihlášení proběhlo úspěšně
            snackbarConfig?.showSnackbar({
              text: "Successfully logged in.",
              severity: "success",
            });

            // Přesměrování na homepage
            window.location.href = "/";
          }
        })
        .catch((error) => {
          // show snackbar
          if (error.response?.status === StatusCodes.UNAUTHORIZED) {
            snackbarConfig?.showSnackbar({
              text: "Invalid password",
              severity: "error",
            });
          } else if (error.response?.status === 404) {
            snackbarConfig?.showSnackbar({
              text: "User not found",
              severity: "error",
            });
          } else {
            snackbarConfig?.showSnackbar({
              text: "An error occurred: " + error.message,
              severity: "error",
            });
          }
        });
    } else {
      // show snackbar
      snackbarConfig?.showSnackbar({
        text: "Please fill in all fields",
        severity: "error",
      });
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-6 bg-white shadow-lg rounded-lg md:max-w-lg">
          <h2 className="text-2xl font-semibold text-center mb-6">Přihlášení</h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <TextInput id="username" label="Přihlašovací jméno" value={username} onChange={setUsername} hasError={errors.username} />
            <TextInput id="password" label="Heslo" type="password" value={password} onChange={setPassword} hasError={errors.password} />
            <div>
              <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Přihlášení
              </button>
            </div>
          </form>
        </div>
      </div>
      {snackbarConfig && <CustomSnackbar config={snackbarConfig} />}
    </>
  );
}
