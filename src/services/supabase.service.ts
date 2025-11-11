import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

export interface UploadedFile {
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: Date;
  extension: string;
  publicUrl: string;
  path: string;
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private bucketName: string = 'documents';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase credentials are not configured');
    }

    this.client = createClient(config.supabaseUrl, config.supabaseKey);
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      this.initialize();
    }
    return this.client!;
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    originalName: string,
    contentType: string
  ): Promise<UploadedFile> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client.storage
        .from(this.bucketName)
        .upload(filename, fileBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = client.storage
        .from(this.bucketName)
        .getPublicUrl(filename);

      return {
        filename,
        originalName,
        size: fileBuffer.length,
        uploadedAt: new Date(),
        extension: filename.split('.').pop() || '',
        publicUrl: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Error uploading file to Supabase:', error);
      throw error;
    }
  }

  /**
   * Download a file from Supabase Storage
   */
  async downloadFile(filename: string): Promise<Buffer> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client.storage
        .from(this.bucketName)
        .download(filename);

      if (error) {
        throw new Error(`Supabase download error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from Supabase');
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading file from Supabase:', error);
      throw error;
    }
  }

  /**
   * List all files in the bucket
   */
  async listFiles(): Promise<UploadedFile[]> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client.storage
        .from(this.bucketName)
        .list('', {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        throw new Error(`Supabase list error: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Map to our UploadedFile interface
      return data.map((file) => {
        const { data: urlData } = client.storage
          .from(this.bucketName)
          .getPublicUrl(file.name);

        return {
          filename: file.name,
          originalName: file.name,
          size: file.metadata?.size || 0,
          uploadedAt: new Date(file.created_at),
          extension: file.name.split('.').pop() || '',
          publicUrl: urlData.publicUrl,
          path: file.name,
        };
      });
    } catch (error) {
      console.error('Error listing files from Supabase:', error);
      return [];
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(filename: string): Promise<void> {
    const client = this.ensureClient();

    try {
      const { error } = await client.storage
        .from(this.bucketName)
        .remove([filename]);

      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting file from Supabase:', error);
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client.storage
        .from(this.bucketName)
        .list('', {
          limit: 1,
          offset: 0,
          search: filename,
        });

      if (error) {
        return false;
      }

      return data ? data.length > 0 : false;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(filename: string): string {
    const client = this.ensureClient();

    const { data } = client.storage
      .from(this.bucketName)
      .getPublicUrl(filename);

    return data.publicUrl;
  }

  /**
   * Create a signed URL for temporary access
   */
  async createSignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client.storage
        .from(this.bucketName)
        .createSignedUrl(filename, expiresIn);

      if (error) {
        throw new Error(`Supabase signed URL error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No signed URL data returned');
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  }

  /**
   * Ensure the bucket exists and is configured
   */
  async ensureBucket(): Promise<void> {
    const client = this.ensureClient();

    try {
      // Try to get bucket
      const { data: buckets, error: listError } = await client.storage.listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some((b) => b.name === this.bucketName);

      if (!bucketExists) {
        console.log(`Creating bucket: ${this.bucketName}`);
        const { error: createError } = await client.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['application/pdf', 'text/plain', 'text/markdown'],
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
        }
      }
    } catch (error) {
      console.error('Error ensuring bucket:', error);
    }
  }
}

// Singleton instance
export const supabaseService = new SupabaseService();
