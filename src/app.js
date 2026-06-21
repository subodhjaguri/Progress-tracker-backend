import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env, isDev } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (isDev) app.use(morgan("dev"));

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
