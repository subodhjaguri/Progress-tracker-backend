import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env, isDev } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      isDev ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin === env.corsOrigin
    ) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
if (isDev) app.use(morgan("dev"));

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
