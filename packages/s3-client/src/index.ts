import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = 'clawcontractbook';

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:8333',
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'clawcontractbook',
        secretAccessKey: process.env.S3_SECRET_KEY || 'clawcontractbook',
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export async function ensureBucket(): Promise<void> {
  const client = getClient();
  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
  }
}

export async function uploadAbi(
  chainKey: string,
  address: string,
  abi: unknown[]
): Promise<string> {
  const client = getClient();
  const key = `abis/${chainKey}/${address.toLowerCase()}.json`;

  await client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify({ abi }, null, 2),
    ContentType: 'application/json',
    Metadata: {
      'chain-key': chainKey,
      'contract-address': address.toLowerCase(),
    },
  }));

  const publicUrl = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET_NAME}`;
  return `${publicUrl}/${key}`;
}

export async function uploadSource(
  chainKey: string,
  address: string,
  sourceCode: string
): Promise<string> {
  const client = getClient();
  const key = `sources/${chainKey}/${address.toLowerCase()}.sol`;

  await client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: sourceCode,
    ContentType: 'text/plain',
    Metadata: {
      'chain-key': chainKey,
      'contract-address': address.toLowerCase(),
    },
  }));

  const publicUrl = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET_NAME}`;
  return `${publicUrl}/${key}`;
}

export async function getAbi(
  chainKey: string,
  address: string
): Promise<unknown[] | null> {
  const client = getClient();
  const key = `abis/${chainKey}/${address.toLowerCase()}.json`;

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));

    const body = await response.Body?.transformToString();
    if (!body) return null;

    const parsed = JSON.parse(body);
    return parsed.abi || null;
  } catch {
    return null;
  }
}

export async function getSource(
  chainKey: string,
  address: string
): Promise<string | null> {
  const client = getClient();
  const key = `sources/${chainKey}/${address.toLowerCase()}.sol`;

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));

    return await response.Body?.transformToString() || null;
  } catch {
    return null;
  }
}

export function getAbiUrl(chainKey: string, address: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET_NAME}`;
  return `${publicUrl}/abis/${chainKey}/${address.toLowerCase()}.json`;
}

export function getSourceUrl(chainKey: string, address: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET_NAME}`;
  return `${publicUrl}/sources/${chainKey}/${address.toLowerCase()}.sol`;
}
