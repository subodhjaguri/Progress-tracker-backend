import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  storageDriver: process.env.STORAGE_DRIVER || "local",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 10,
  awsRegion: process.env.AWS_REGION || "",
  s3Bucket: process.env.S3_BUCKET || "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
};

export const isProd = env.nodeEnv === "production";
export const isDev = !isProd;
