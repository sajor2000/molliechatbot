# Changelog

All notable changes to the Shoreline Dental RAG Chatbot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-11

### Added
- Initial production-ready release
- RAG chatbot with Pinecone vector database
- OpenAI GPT-4o-mini for chat completions
- OpenAI text-embedding-3-large for embeddings (1024 dimensions)
- Cohere reranking for improved retrieval quality
- Docling-powered document preprocessing
- Intelligent chunking with 67.3% size reduction
- 376 optimized knowledge base vectors
- Metadata flattening for Pinecone compatibility
- Production environment validation
- Admin dashboard for conversation monitoring
- Test chat interface
- Daily email summaries to managers
- Supabase integration for conversation history
- Vercel serverless deployment support
- Comprehensive documentation (15+ guides)
- Security features:
  - Environment variable validation
  - Sensitive data protection
  - Cron endpoint security
- Upload scripts with timer tracking and progress bars
- Automated vector deletion utility

### Performance
- 72% improvement in similarity scores (0.36 → 0.62)
- Consistent retrieval above 0.60 threshold
- Cohere reranking engagement
- ~100-200ms faster response times

### Documentation
- README.md with full setup instructions
- PRODUCTION_READY.md deployment guide
- DOCLING_GUIDE.md for document processing
- EMBEDDING_GUIDE.md for RAG implementation
- Multiple deployment guides (Vercel, GitHub, local)
- Complete API documentation
- Test and troubleshooting guides

### Infrastructure
- TypeScript with strict typing
- Express.js API framework
- Vercel serverless functions
- Python Docling preprocessing
- Comprehensive .gitignore
- MIT License
- .env.example template

## [Unreleased]

### Planned
- Unit and integration tests
- CI/CD pipeline with GitHub Actions
- Additional language model support
- Enhanced admin analytics
- Mobile-responsive chat widget improvements
- Multi-tenant support
- Advanced conversation analytics

---

[1.0.0]: https://github.com/yourusername/mollieweb/releases/tag/v1.0.0
