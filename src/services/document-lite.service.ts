import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import type { DocumentChunk, ChunkingOptions } from './docling.service';

/**
 * Lightweight document processor optimized for Vercel serverless.
 * Supports PDF, DOC/DOCX, Markdown, and plain text without Docling.
 */
export class LiteDocumentService {
  private defaultOptions: ChunkingOptions = {
    chunkSize: 900,
    chunkOverlap: 150,
    preserveParagraphs: true,
  };

  async processDocument(
    filePath: string,
    options?: ChunkingOptions
  ): Promise<DocumentChunk[]> {
    const opts = { ...this.defaultOptions, ...options };
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    let text = '';

    switch (ext) {
      case '.pdf': {
        const buffer = await fs.readFile(filePath);
        const result = await pdf(buffer);
        text = result.text || '';
        break;
      }
      case '.doc':
      case '.docx': {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || '';
        break;
      }
      case '.md':
      case '.txt':
        text = await fs.readFile(filePath, 'utf8');
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }

    text = this.cleanText(text);
    if (!text || text.length < 50) {
      throw new Error('Document did not contain enough readable text.');
    }

    const chunks = this.createChunks(text, opts);

    return chunks.map((chunk, index) => ({
      id: `${filename}-chunk-${index}`,
      text: chunk,
      metadata: {
        source: filePath,
        chunkIndex: index,
        totalChunks: chunks.length,
        documentType: ext.substring(1),
        filename,
      },
    }));
  }

  private cleanText(text: string): string {
    return text
      .replace(/\u0000/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private createChunks(
    text: string,
    options: ChunkingOptions
  ): string[] {
    const chunkSize = options.chunkSize || 900;
    const overlap = options.chunkOverlap || 150;
    const preserveParagraphs = options.preserveParagraphs !== false;

    if (!preserveParagraphs) {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize - overlap) {
        const end = Math.min(i + chunkSize, text.length);
        const chunk = text.substring(i, end).trim();
        if (chunk) chunks.push(chunk);
      }
      return chunks;
    }

    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (current.length + trimmed.length > chunkSize && current) {
        chunks.push(current.trim());
        const overlapText = this.getOverlapText(current, overlap);
        current = `${overlapText}${trimmed}`;
      } else {
        current += (current ? '\n\n' : '') + trimmed;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks;
  }

  private getOverlapText(text: string, overlap: number): string {
    if (!overlap || text.length <= overlap) {
      return '';
    }

    const overlapText = text.slice(-overlap);
    const sentenceBoundary = overlapText.indexOf('. ');
    if (sentenceBoundary !== -1) {
      return overlapText.slice(sentenceBoundary + 1).trim() + ' ';
    }

    return overlapText.trim() + ' ';
  }
}

export const liteDocumentService = new LiteDocumentService();
