/**
 * Cloudflare R2 S3 Client
 *
 * Initializes AWS SDK configured for R2 API endpoint
 */

const { S3Client } = require('@aws-sdk/client-s3');

function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const region = process.env.R2_REGION || 'auto';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 credentials in environment variables');
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`
  });

  return client;
}

module.exports = { createR2Client };
