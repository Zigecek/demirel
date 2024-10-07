import express from "express";
import ViteExpress from "vite-express";

const app = express();

ViteExpress.listen(app, 3000);
