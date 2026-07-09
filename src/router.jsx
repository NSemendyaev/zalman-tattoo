import App from "./App";
import { createBrowserRouter } from "react-router";
import LoginPage from "./features/auth/LoginPage.jsx";

// createBrowserRouter maps each browser URL to the React component that should
// render for that route. For example, visiting /login shows <LoginPage />.
export const router = createBrowserRouter([
    { path: "/", element: <App /> },
    { path: "/login", element: <LoginPage /> },
]);
