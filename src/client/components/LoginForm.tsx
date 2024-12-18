import { StatusCodes } from "http-status-codes";
import React, { useState } from "react";
import { useSnackbarContext } from "../contexts/SnackbarContext";
import { useUser } from "../contexts/UserContext";
import { postLogin } from "../proxy/endpoints";
import TextInput from "./TextInput";

interface LoginFormProps {
  className: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ className, ...rest }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ username: false, password: false });
  const { setUser } = useUser();
  const { showSnackbar } = useSnackbarContext();

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
            showSnackbar({
              text: "Successfully logged in.",
              severity: "success",
            });
            setUser(response.responseObject);
          }
        })
        .catch((error) => {
          // show snackbar
          if (error.response?.status === StatusCodes.UNAUTHORIZED) {
            showSnackbar({
              text: "Invalid password",
              severity: "error",
            });
          } else if (error.response?.status === 404) {
            showSnackbar({
              text: "User not found",
              severity: "error",
            });
          } else {
            showSnackbar({
              text: "An error occurred: " + error.message,
              severity: "error",
            });
          }
        });
    } else {
      // show snackbar
      showSnackbar({
        text: "Please fill in all fields",
        severity: "error",
      });
    }
  };

  return (
    <>
      <div className={`w-full max-w-md p-6 bg-white shadow-lg rounded-lg md:max-w-lg ${className}`} {...rest}>
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
    </>
  );
};
