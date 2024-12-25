import { StatusCodes } from "http-status-codes";
import React, { useState } from "react";
import TextInput from "../components/TextInput";
import { useSnackbarContext } from "../contexts/SnackbarContext";
import { postRegister } from "../proxy/endpoints";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errors, setErrors] = useState({ username: false, password: false, password2: false });
  const { showSnackbar } = useSnackbarContext();

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
            showSnackbar({
              text: "User already logged in.",
              severity: "warning",
            });
          } else if (response.status === StatusCodes.OK) {
            showSnackbar({
              text: "Successfully registered.",
              severity: "success",
            });
          }
          window.location.href = "/";
        })
        .catch((error) => {
          // show snackbar
          if (error.response?.status === 409) {
            showSnackbar({
              text: "User already exists.",
              severity: "error",
            });
          } else if (error.response?.status === StatusCodes.BAD_REQUEST) {
            showSnackbar({
              text: "Please fill in all fields.",
              severity: "error",
            });
          } else {
            showSnackbar({
              text: "An error occurred: " + error.message,
              severity: "error",
            });
          }
        });
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
        <div className="w-full max-w-md p-6 bg-white dark:bg-neutral-800 shadow-lg rounded-lg md:max-w-lg">
          <h2 className="text-2xl font-semibold text-center mb-6">Registrace</h2>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <TextInput id="username" label="Přihlašovací jméno" value={username} onChange={setUsername} hasError={errors.username} />
            <TextInput id="password" label="Heslo" type="password" value={password} onChange={setPassword} hasError={errors.password} />
            <TextInput id="password2" label="Heslo znovu" type="password" value={password2} onChange={setPassword2} hasError={errors.password2} />
            <div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 dark:bg-blue-400 text-white font-semibold rounded-md hover:bg-blue-700 dark:hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                Registrace
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
