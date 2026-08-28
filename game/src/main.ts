import "./design/tokens.css";
import { mountApp } from "./ui/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root === null) throw new Error("missing #app root");
mountApp(root);
