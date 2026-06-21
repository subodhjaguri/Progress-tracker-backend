// AWS S3 storage driver. Only loaded when STORAGE_DRIVER=s3.
// Requires: npm i @aws-sdk/client-s3
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

const client = new S3Client({
  region: env.awsRegion,
  credentials: env.awsAccessKeyId
    ? {
        accessKeyId: env.awsAccessKeyId,
        secretAccessKey: env.awsSecretAccessKey,
      }
    : undefined,
});

export async function save({ buffer, key, contentType }) {
  await client.send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return { key };
}

/** Resolves to a Readable stream of the S3 object. */
export async function createReadStream(key) {
  const res = await client.send(
    new GetObjectCommand({ Bucket: env.s3Bucket, Key: key }),
  );
  return res.Body; // Node.js Readable
}

export async function remove(key) {
  await client.send(
    new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: key }),
  );
}
