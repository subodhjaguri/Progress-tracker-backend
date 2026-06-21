import { env } from "../../config/env.js";
import * as localDriver from "./localDriver.js";

// Pick the driver from env. The S3 driver is loaded lazily so dev (local) never needs
// the AWS SDK installed. Both drivers expose: save(), createReadStream(), remove().
let driver = localDriver;
if (env.storageDriver === "s3") {
  driver = await import("./s3Driver.js");
}

export const storage = driver;
