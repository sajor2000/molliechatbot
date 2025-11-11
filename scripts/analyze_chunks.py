#!/usr/bin/env python3
"""
Chunk Analysis Script
Analyzes processed-chunks.json to provide insights and optimization recommendations.

Usage:
    python3 scripts/analyze_chunks.py
"""

import json
import sys
from pathlib import Path
from collections import Counter, defaultdict
from typing import List, Dict, Any

# Configuration
CHUNKS_FILE = Path("processed-chunks.json")


def load_chunks() -> List[Dict[str, Any]]:
    """Load chunks from JSON file."""
    if not CHUNKS_FILE.exists():
        print(f"❌ Error: File '{CHUNKS_FILE}' not found")
        print("\nPlease run preprocessing first:")
        print("  npm run preprocess:docling")
        sys.exit(1)

    with open(CHUNKS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def analyze_chunks(chunks: List[Dict[str, Any]]):
    """Perform comprehensive analysis of chunks."""
    print("=" * 70)
    print("  Chunk Analysis Report")
    print("=" * 70)
    print()

    # Basic statistics
    total_chunks = len(chunks)
    print(f"📊 Overall Statistics:")
    print(f"   Total chunks: {total_chunks}")
    print()

    # Text length analysis
    text_lengths = [len(chunk["text"]) for chunk in chunks]
    avg_length = sum(text_lengths) / len(text_lengths)
    min_length = min(text_lengths)
    max_length = max(text_lengths)

    print(f"📏 Chunk Size Analysis:")
    print(f"   Average length: {avg_length:.0f} characters (~{avg_length/4:.0f} tokens)")
    print(f"   Minimum length: {min_length} characters")
    print(f"   Maximum length: {max_length} characters")
    print(f"   Total characters: {sum(text_lengths):,}")
    print()

    # Content type distribution
    content_types = Counter(chunk["metadata"].get("contentType", "unknown") for chunk in chunks)
    print(f"📦 Content Type Distribution:")
    for content_type, count in content_types.most_common():
        percentage = (count / total_chunks) * 100
        print(f"   {content_type:20} {count:3} chunks ({percentage:5.1f}%)")
    print()

    # Category distribution
    categories = Counter(chunk["metadata"].get("category", "unknown") for chunk in chunks)
    print(f"🏷️  Category Distribution:")
    for category, count in categories.most_common():
        percentage = (count / total_chunks) * 100
        print(f"   {category:25} {count:3} chunks ({percentage:5.1f}%)")
    print()

    # Service type distribution
    service_types = Counter(chunk["metadata"].get("serviceType", "unknown") for chunk in chunks)
    print(f"🦷 Service Type Distribution:")
    for service_type, count in service_types.most_common():
        percentage = (count / total_chunks) * 100
        print(f"   {service_type:15} {count:3} chunks ({percentage:5.1f}%)")
    print()

    # Source file distribution
    sources = Counter(chunk["metadata"].get("source", "unknown") for chunk in chunks)
    print(f"📄 Chunks per Source File (Top 10):")
    for source, count in sources.most_common(10):
        # Shorten filename for display
        short_name = source.replace("www.shorelinedentalchicago.com_", "").replace(".md", "")
        print(f"   {short_name[:40]:40} {count:2} chunks")
    print()

    # Flags analysis
    has_price = sum(1 for chunk in chunks if chunk["metadata"].get("hasPrice", False))
    has_faq = sum(1 for chunk in chunks if chunk["metadata"].get("hasFAQ", False))
    is_procedure = sum(1 for chunk in chunks if chunk["metadata"].get("isProcedureDetail", False))

    print(f"🏷️  Content Flags:")
    print(f"   Has pricing info: {has_price} chunks ({has_price/total_chunks*100:.1f}%)")
    print(f"   Is FAQ: {has_faq} chunks ({has_faq/total_chunks*100:.1f}%)")
    print(f"   Is procedure detail: {is_procedure} chunks ({is_procedure/total_chunks*100:.1f}%)")
    print()

    # Duplicate detection
    print(f"🔍 Duplicate Analysis:")
    text_hashes = {}
    duplicates = 0
    for i, chunk in enumerate(chunks):
        text_hash = hash(chunk["text"][:200])  # Hash first 200 chars
        if text_hash in text_hashes:
            duplicates += 1
        else:
            text_hashes[text_hash] = i

    print(f"   Potential duplicates: {duplicates} chunks")
    if duplicates > 0:
        print(f"   ⚠️  Consider reviewing for duplicate content")
    else:
        print(f"   ✅ No significant duplicates detected")
    print()

    # Quality checks
    print(f"✅ Quality Checks:")

    # Check for very short chunks
    very_short = sum(1 for length in text_lengths if length < 100)
    if very_short > 0:
        print(f"   ⚠️  {very_short} chunks < 100 characters (may be low quality)")
    else:
        print(f"   ✅ No very short chunks")

    # Check for very long chunks
    very_long = sum(1 for length in text_lengths if length > 2000)
    if very_long > 0:
        print(f"   ⚠️  {very_long} chunks > 2000 characters (may need splitting)")
    else:
        print(f"   ✅ No excessively long chunks")

    # Check metadata completeness
    missing_metadata = 0
    required_fields = ["category", "service", "serviceType", "contentType"]
    for chunk in chunks:
        for field in required_fields:
            if field not in chunk["metadata"]:
                missing_metadata += 1
                break

    if missing_metadata > 0:
        print(f"   ⚠️  {missing_metadata} chunks missing required metadata")
    else:
        print(f"   ✅ All chunks have complete metadata")

    print()

    # Optimization recommendations
    print("=" * 70)
    print("💡 Optimization Recommendations:")
    print("=" * 70)
    print()

    if very_short > 5:
        print(f"⚠️  Many short chunks detected ({very_short})")
        print(f"   → Increase MIN_CHUNK_TOKENS in preprocessing script")
        print()

    if very_long > 5:
        print(f"⚠️  Many long chunks detected ({very_long})")
        print(f"   → Decrease MAX_TOKENS in preprocessing script")
        print()

    if duplicates > 10:
        print(f"⚠️  Significant duplicates detected ({duplicates})")
        print(f"   → Review content cleaning logic")
        print(f"   → Ensure navigation/boilerplate is fully removed")
        print()

    # Check content balance
    service_content = content_types.get("service-description", 0)
    faq_content = content_types.get("faq", 0)

    if service_content < total_chunks * 0.3:
        print(f"⚠️  Low service content ratio ({service_content/total_chunks*100:.1f}%)")
        print(f"   → Review if enough service information is captured")
        print()

    if faq_content < 20:
        print(f"ℹ️  Few FAQ chunks ({faq_content})")
        print(f"   → Consider adding more FAQ content to knowledge base")
        print()

    # Success indicators
    if very_short <= 5 and very_long <= 5 and duplicates <= 10:
        print("✅ Chunk quality looks excellent!")
        print("   → Content is well-balanced and optimized")
        print("   → Ready for upload to Pinecone")
        print()

    # Cost estimation
    print("💰 Cost Estimation:")
    estimated_tokens = sum(length / 4 for length in text_lengths)
    embedding_cost = (estimated_tokens / 1000) * 0.0001  # OpenAI embedding cost
    print(f"   Estimated tokens: {estimated_tokens:,.0f}")
    print(f"   Embedding cost: ${embedding_cost:.4f} (one-time)")
    print(f"   Storage: ~{total_chunks * 6 / 1024:.2f} MB in Pinecone")
    print()

    print("=" * 70)
    print("📈 Summary:")
    print("=" * 70)
    print(f"   {total_chunks} total chunks ready for embedding")
    print(f"   {len(service_types)} service types covered")
    print(f"   {len(content_types)} content types identified")
    print(f"   Average chunk size: {avg_length:.0f} characters")
    print()
    print("Next step: Run 'npm run upload:docling' to upload to Pinecone")
    print()


def show_sample_chunks(chunks: List[Dict[str, Any]], count: int = 3):
    """Show sample chunks from different categories."""
    print("=" * 70)
    print(f"  Sample Chunks (First {count})")
    print("=" * 70)
    print()

    for i, chunk in enumerate(chunks[:count]):
        print(f"Chunk #{i+1}")
        print(f"Category: {chunk['metadata'].get('category', 'N/A')}")
        print(f"Service: {chunk['metadata'].get('service', 'N/A')}")
        print(f"Content Type: {chunk['metadata'].get('contentType', 'N/A')}")
        print(f"Length: {len(chunk['text'])} characters")
        print(f"Preview: {chunk['text'][:200]}...")
        print("-" * 70)
        print()


def export_metadata_report(chunks: List[Dict[str, Any]]):
    """Export detailed metadata report to JSON."""
    report = {
        "total_chunks": len(chunks),
        "content_types": dict(Counter(chunk["metadata"].get("contentType", "unknown") for chunk in chunks)),
        "categories": dict(Counter(chunk["metadata"].get("category", "unknown") for chunk in chunks)),
        "service_types": dict(Counter(chunk["metadata"].get("serviceType", "unknown") for chunk in chunks)),
        "avg_length": sum(len(chunk["text"]) for chunk in chunks) / len(chunks),
        "files_processed": len(set(chunk["metadata"].get("source", "") for chunk in chunks)),
    }

    output_file = Path("chunk-analysis-report.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"📄 Detailed report exported to: {output_file}")
    print()


def main():
    """Main function."""
    try:
        # Load chunks
        print("Loading chunks from processed-chunks.json...")
        chunks = load_chunks()
        print(f"✓ Loaded {len(chunks)} chunks")
        print()

        # Analyze
        analyze_chunks(chunks)

        # Show samples
        show_sample_chunks(chunks, count=3)

        # Export report
        export_metadata_report(chunks)

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
