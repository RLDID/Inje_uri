import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;

const encryptedFieldsByModel = {
  User: ["real_name", "birth"],
  Message: ["content"],
  FeedComment: ["content"],
  UserContact: ["contact_name", "phone_number_e164"],
} satisfies Record<string, readonly string[]>;

type EncryptedModel = keyof typeof encryptedFieldsByModel;
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEncryptedModel(model: string | undefined): model is EncryptedModel {
  return model !== undefined && model in encryptedFieldsByModel;
}

function isEncryptedString(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}

function getEncryptionKey(): Buffer {
  const rawKey = process.env.DB_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("DB_ENCRYPTION_KEY is required for DB field encryption.");
  }

  const key = Buffer.from(rawKey, "base64");

  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error("DB_ENCRYPTION_KEY must be a 32-byte base64 value. Generate it with: openssl rand -base64 32");
  }

  return key;
}

export function encryptString(value: string): string {
  if (value.length === 0 || isEncryptedString(value)) {
    return value;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX.slice(0, -1),
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptString(value: string): string {
  if (!isEncryptedString(value)) {
    return value;
  }

  const [, version, ivBase64, authTagBase64, ciphertextBase64] = value.split(":");

  if (version !== "v1" || !ivBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error("Invalid encrypted field format.");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function encryptFieldValue(value: unknown): unknown {
  if (typeof value === "string") {
    return encryptString(value);
  }

  if (isRecord(value) && typeof value.set === "string") {
    return {
      ...value,
      set: encryptString(value.set),
    };
  }

  return value;
}

function encryptRecordFields(record: UnknownRecord, fields: readonly string[]): UnknownRecord {
  const nextRecord: UnknownRecord = { ...record };

  for (const field of fields) {
    if (field in nextRecord) {
      nextRecord[field] = encryptFieldValue(nextRecord[field]);
    }
  }

  return nextRecord;
}

function encryptData(data: unknown, fields: readonly string[]): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => encryptData(item, fields));
  }

  if (isRecord(data)) {
    return encryptRecordFields(data, fields);
  }

  return data;
}

export function encryptWriteData(model: string | undefined, operation: string, args: unknown): void {
  if (!isEncryptedModel(model) || !isRecord(args)) {
    return;
  }

  const fields = encryptedFieldsByModel[model];

  if ((operation === "create" || operation === "update" || operation === "createMany" || operation === "updateMany") && "data" in args) {
    args.data = encryptData(args.data, fields);
    return;
  }

  if (operation === "upsert") {
    if ("create" in args) {
      args.create = encryptData(args.create, fields);
    }
    if ("update" in args) {
      args.update = encryptData(args.update, fields);
    }
  }
}

export function decryptEncryptedFields(value: unknown): unknown {
  if (typeof value === "string") {
    return decryptString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => decryptEncryptedFields(item));
  }

  if (value instanceof Date || value instanceof Uint8Array) {
    return value;
  }

  if (isRecord(value)) {
    const nextRecord: UnknownRecord = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      nextRecord[key] = decryptEncryptedFields(nestedValue);
    }

    return nextRecord;
  }

  return value;
}
