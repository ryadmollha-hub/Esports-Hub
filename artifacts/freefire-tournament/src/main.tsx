import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { apiBase } from "./lib/apiBase";
import App from "./App";
import "./index.css";

setBaseUrl(apiBase || null);

createRoot(document.getElementById("root")!).render(<App />);
