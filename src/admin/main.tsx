import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/base.css";
import "../styles/admin.css";
import Admin from "./Admin";

createRoot(document.getElementById("root")!).render(<StrictMode><Admin /></StrictMode>);
