/**
 * Production Environment Validation
 * Validates that all required environment variables are present
 */
function validateProductionEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return; // Skip validation in development
  }

  const required = [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_INDEX_NAME',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'CRON_SECRET',
    'ADMIN_PASSWORD_HASH',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Production environment validation failed!');
    console.error('Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    throw new Error('Missing required environment variables for production');
  }

  console.log('✅ Production environment validation passed');
}

// Validate on import in production
validateProductionEnv();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',

  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    indexName: process.env.PINECONE_INDEX_NAME || 'mollieweb-chatbot',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
    host: process.env.PINECONE_HOST || '',
    namespace: process.env.PINECONE_NAMESPACE || '',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1024', 10),
  },

  cohere: {
    apiKey: process.env.COHERE_API_KEY || '',
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    managerEmail: process.env.MANAGER_EMAIL || '',
    fromEmail: process.env.FROM_EMAIL || 'chatbot@yourdomain.com',
  },

  scheduler: {
    timezone: process.env.TIMEZONE || 'America/Chicago',
    summaryTime: process.env.SUMMARY_TIME || '05:30',
  },

  documentProcessing: {
    mode: (process.env.DOCUMENT_PROCESSOR || 'lite').toLowerCase() === 'docling'
      ? 'docling'
      : 'lite',
  },

  cronSecret: process.env.CRON_SECRET || '',

  // Monitoring and Analytics
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  },
};

export default config;
