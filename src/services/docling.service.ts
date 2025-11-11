import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    pageNumber?: number;
    documentType: string;
    filename: string;
  };
}

export interface ChunkingOptions {
  chunkSize?: number;        // Characters per chunk
  chunkOverlap?: number;      // Overlap between chunks
  preserveParagraphs?: boolean; // Try to keep paragraphs intact
}

export class DoclingService {
  private defaultOptions: ChunkingOptions = {
    chunkSize: 1000,
    chunkOverlap: 200,
    preserveParagraphs: true,
  };

  /**
   * Process a document file and return intelligent chunks
   */
  async processDocument(
    filePath: string,
    options?: ChunkingOptions
  ): Promise<DocumentChunk[]> {
    const opts = { ...this.defaultOptions, ...options };
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    let text: string;
    let pageMap: Map<number, string> | null = null;

    // Extract text based on file type
    switch (ext) {
      case '.pdf':
        const pdfResult = await this.extractFromPDF(filePath);
        text = pdfResult.text;
        pageMap = pdfResult.pageMap;
        break;
      case '.txt':
      case '.md':
        text = await this.extractFromText(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }

    // Clean and normalize text
    text = this.cleanText(text);

    // Create intelligent chunks
    const chunks = this.createChunks(text, opts, pageMap);

    // Add metadata to chunks
    return chunks.map((chunk, index) => ({
      id: `${filename}-chunk-${index}`,
      text: chunk.text,
      metadata: {
        source: filePath,
        chunkIndex: index,
        totalChunks: chunks.length,
        pageNumber: chunk.pageNumber,
        documentType: ext.substring(1),
        filename,
      },
    }));
  }

  /**
   * Extract text from PDF with page mapping
   */
  private async extractFromPDF(filePath: string): Promise<{
    text: string;
    pageMap: Map<number, string>;
  }> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    const pageMap = new Map<number, string>();
    let fullText = '';

    // Process each page
    if (data.text) {
      fullText = data.text;
      
      // Try to map pages (pdf-parse doesn't always provide per-page text)
      // For production, consider using pdf.js or pdfjs-dist for better page extraction
      const pages = fullText.split(/\n\n\n+/); // Heuristic page detection
      pages.forEach((pageText, idx) => {
        pageMap.set(idx + 1, pageText);
      });
    }

    return { text: fullText, pageMap };
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromText(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove form feeds and other control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive line breaks (keep paragraph structure)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Create intelligent chunks with overlap and context preservation
   */
  private createChunks(
    text: string,
    options: ChunkingOptions,
    pageMap: Map<number, string> | null
  ): Array<{ text: string; pageNumber?: number }> {
    const { chunkSize, chunkOverlap, preserveParagraphs } = options;
    const chunks: Array<{ text: string; pageNumber?: number }> = [];

    if (!chunkSize) return [{ text }];

    if (preserveParagraphs) {
      // Split by paragraphs first
      const paragraphs = text.split(/\n\n+/);
      let currentChunk = '';
      let currentPage: number | undefined;

      for (const paragraph of paragraphs) {
        const trimmedPara = paragraph.trim();
        if (!trimmedPara) continue;

        // Find page number for this chunk if we have a page map
        if (pageMap && !currentPage) {
          currentPage = this.findPageNumber(trimmedPara, pageMap);
        }

        // If adding this paragraph exceeds chunk size, save current chunk
        if (currentChunk.length + trimmedPara.length > chunkSize && currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            pageNumber: currentPage,
          });

          // Start new chunk with overlap
          const overlapText = this.getOverlapText(currentChunk, chunkOverlap || 0);
          currentChunk = overlapText + trimmedPara;
          currentPage = undefined;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
        }
      }

      // Add final chunk
      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          pageNumber: currentPage,
        });
      }
    } else {
      // Simple character-based chunking
      for (let i = 0; i < text.length; i += (chunkSize || 1000) - (chunkOverlap || 0)) {
        const end = Math.min(i + (chunkSize || 1000), text.length);
        const chunkText = text.substring(i, end).trim();
        
        if (chunkText) {
          const pageNumber = pageMap ? this.findPageNumber(chunkText, pageMap) : undefined;
          chunks.push({ text: chunkText, pageNumber });
        }
      }
    }

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (overlapSize === 0 || text.length <= overlapSize) return '';
    
    const overlapText = text.substring(text.length - overlapSize);
    
    // Try to start at a sentence boundary
    const sentenceEnd = overlapText.search(/[.!?]\s+/);
    if (sentenceEnd > 0) {
      return overlapText.substring(sentenceEnd + 1).trim() + ' ';
    }
    
    return overlapText.trim() + ' ';
  }

  /**
   * Find which page a text chunk belongs to
   */
  private findPageNumber(text: string, pageMap: Map<number, string>): number | undefined {
    const searchText = text.substring(0, 100); // Use first 100 chars for matching
    
    for (const [pageNum, pageText] of pageMap.entries()) {
      if (pageText.includes(searchText)) {
        return pageNum;
      }
    }
    
    return undefined;
  }

  /**
   * Process multiple documents in a directory
   */
  async processDirectory(
    dirPath: string,
    options?: ChunkingOptions
  ): Promise<DocumentChunk[]> {
    const files = await fs.readdir(dirPath);
    const supportedExtensions = ['.pdf', '.txt', '.md'];
    
    const allChunks: DocumentChunk[] = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!supportedExtensions.includes(ext)) continue;

      const filePath = path.join(dirPath, file);
      try {
        console.log(`Processing: ${file}`);
        const chunks = await this.processDocument(filePath, options);
        allChunks.push(...chunks);
        console.log(`  ✓ Created ${chunks.length} chunks`);
      } catch (error) {
        console.error(`  ✗ Error processing ${file}:`, error);
      }
    }

    return allChunks;
  }

  /**
   * Get statistics about chunks
   */
  getChunkStats(chunks: DocumentChunk[]): {
    totalChunks: number;
    avgChunkSize: number;
    minChunkSize: number;
    maxChunkSize: number;
    totalCharacters: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        avgChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        totalCharacters: 0,
      };
    }

    const sizes = chunks.map(c => c.text.length);
    const totalChars = sizes.reduce((sum, size) => sum + size, 0);

    return {
      totalChunks: chunks.length,
      avgChunkSize: Math.round(totalChars / chunks.length),
      minChunkSize: Math.min(...sizes),
      maxChunkSize: Math.max(...sizes),
      totalCharacters: totalChars,
    };
  }
}

export const doclingService = new DoclingService();
