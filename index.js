import compression from "compression";
import express from "express";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";
import i18n from "./app/i18n/i18n.js";
import dotenv from 'dotenv';
dotenv.config({path:'.env'});

const directory = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
//------------------------------------------------------------------------------
//          CONFIGURATION DU SERVEUR
//------------------------------------------------------------------------------
const DEVELOPMENT_MODE = app.get("env") !== "production";
const PORT = process.env.PORT || 3000;
app.set("views", join(directory, "views"));
app.set("view engine", "html");
nunjucks.configure("views", { autoescape: true, express: app, watch: DEVELOPMENT_MODE, noCache: DEVELOPMENT_MODE });

//------------------------------------------------------------------------------
//          CHARGEMENT DES MIDDLEWARES
//------------------------------------------------------------------------------
app.use(i18n.init, (req, res, next) => { i18n.setLocale(process.env.LANGUAGE??"fr_FR");  next(); });
app.use(compression());
app.use("/", express.static(join(directory, "public")));

//------------------------------------------------------------------------------
//          CHARGEMENT DES ROUTES
//------------------------------------------------------------------------------
const routes = await import('./app/routes.js');
routes.default(app);

//------------------------------------------------------------------------------
//          MISE EN ECOUTE DU SERVEUR HTTP
//------------------------------------------------------------------------------
server.listen(PORT, () => { console.log("Express server listening on port http://localhost:%d", PORT); });

//------------------------------------------------------------------------------
//          CHARGEMENT DU WEBSOCKET
//------------------------------------------------------------------------------
const ws = await import('./app/appWebSocket.js');
ws.default(server, i18n);