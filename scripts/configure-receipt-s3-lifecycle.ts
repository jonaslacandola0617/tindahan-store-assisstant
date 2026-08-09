import { readFile } from "node:fs/promises";
import { GetBucketLifecycleConfigurationCommand, PutBucketLifecycleConfigurationCommand, S3Client, type LifecycleRule } from "@aws-sdk/client-s3";

const execute = process.argv.includes("--execute");
const bucket = process.argv.find(argument => argument.startsWith("--bucket="))?.slice("--bucket=".length).trim();
const region = process.argv.find(argument => argument.startsWith("--region="))?.slice("--region=".length).trim() || "ap-southeast-1";
if (!bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("Pass a valid target with --bucket=<existing-private-bucket>.");

const client = new S3Client({ region });
const desiredDocument = JSON.parse(await readFile(new URL("../infra/aws/s3-receipt-lifecycle.json", import.meta.url), "utf8")) as { Rules: LifecycleRule[] };
const ownedIds = new Set(desiredDocument.Rules.map(rule => rule.ID));
let existing: LifecycleRule[] = [];
try { existing = (await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }))).Rules ?? []; }
catch (error) { if ((error as { name?: string }).name !== "NoSuchLifecycleConfiguration") throw error; }
const merged = [...existing.filter(rule => !rule.ID || !ownedIds.has(rule.ID)), ...desiredDocument.Rules];
console.info(JSON.stringify({ mode: execute ? "execute" : "dry-run", bucket, region, existingRules: existing.length, resultingRules: merged.length, managedRuleIds: [...ownedIds] }));
if (execute) await client.send(new PutBucketLifecycleConfigurationCommand({ Bucket: bucket, LifecycleConfiguration: { Rules: merged } }));
