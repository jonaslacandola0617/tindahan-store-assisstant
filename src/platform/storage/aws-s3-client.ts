import { S3Client } from "@aws-sdk/client-s3";
import { serverEnvironment } from "@/platform/environment/server";

let client: S3Client | undefined;

export function awsS3Client() {
  if (client) return client;
  const endpoint = serverEnvironment.RECEIPT_S3_ENDPOINT?.trim();
  const explicitCredentials = serverEnvironment.RECEIPT_S3_ACCESS_KEY_ID && serverEnvironment.RECEIPT_S3_SECRET_ACCESS_KEY ? {
    credentials: {
      accessKeyId: serverEnvironment.RECEIPT_S3_ACCESS_KEY_ID,
      secretAccessKey: serverEnvironment.RECEIPT_S3_SECRET_ACCESS_KEY,
    },
  } : {};
  client = new S3Client({
    region: serverEnvironment.RECEIPT_S3_REGION!,
    ...explicitCredentials,
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: serverEnvironment.RECEIPT_S3_FORCE_PATH_STYLE === "true",
  });
  return client;
}

export function resetAwsS3ClientForTests() {
  client?.destroy();
  client = undefined;
}
