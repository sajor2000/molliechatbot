#!/usr/bin/env python3
"""
Enhanced Docling Preprocessing Script for RAG Chatbot
Processes markdown files from knowledge-base/ into optimized chunks for Pinecone.

Features:
- Pre-cleaning to remove navigation boilerplate
- Structured content extraction (FAQs, business hours, pricing)
- Enhanced metadata generation
- Optimized chunking parameters

Requirements:
- Python 3.9+
- docling >= 2.0.0
- langchain-docling >= 0.1.0

Usage:
    python3 scripts/preprocess_with_docling.py
"""

import json
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

try:
    from langchain_docling import DoclingLoader
    from docling.chunking import HybridChunker
except ImportError:
    print("❌ Error: Required packages not installed")
    print("\nPlease run:")
    print("  python3 -m venv venv")
    print("  source venv/bin/activate  # On Windows: venv\\Scripts\\activate")
    print("  pip install -r requirements.txt")
    sys.exit(1)


# ============================================================================
# CONFIGURATION
# ============================================================================

# Paths
KNOWLEDGE_BASE_DIR = Path("knowledge-base")
OUTPUT_FILE = Path("processed-chunks.json")

# Embedding Model Configuration
EMBEDDING_MODEL = "openai/text-embedding-3-small"
EMBEDDING_DIMENSIONS = 512

# Chunking Configuration (Optimized based on content analysis)
MAX_TOKENS = 350        # Optimized for focused retrieval
OVERLAP_TOKENS = 50     # 14% overlap for context preservation
MIN_CHUNK_TOKENS = 75   # Filter navigation/boilerplate chunks

# Metadata
PRACTICE_NAME = "Shoreline Dental Chicago"
PRACTICE_ADDRESS = "737 North Michigan Avenue, Suite 910, Chicago, IL 60611"
PRACTICE_PHONE = "(312) 266-3399"
DOCTORS = ["Dr. Mollie Rojas", "Dr. Sonal Patel"]

# Statistics tracking
stats = {
    "original_lines": 0,
    "cleaned_lines": 0,
    "removed_lines": 0,
    "faq_chunks": 0,
    "business_chunks": 0,
    "service_chunks": 0
}


# ============================================================================
# CONTENT CLEANING FUNCTIONS
# ============================================================================

def clean_markdown_content(content: str, filename: str) -> str:
    """
    Remove boilerplate navigation and duplicate content from markdown files.

    This removes ~40-50% of noise from scraped website markdown:
    - Navigation menus (duplicate across all files)
    - Icon/image references
    - Social media links
    - Repeated patient reviews (after first occurrence)
    - Repeated business hours (extracted separately)
    - Copyright notices
    """
    lines = content.split('\n')
    cleaned = []

    # Patterns to skip (boilerplate)
    skip_patterns = [
        '![Spinner',
        '![logo]',
        '![icon]',
        'Back',
        '- [Home](',
        '- [About](',
        '- [Services](',
        '- [Patient Resources](',
        '- [Contact Us](',
        '- [Cosmetic Dentistry](',
        '- [General & Family Dentistry](',
        '- [Oral Surgery](',
        '- [Restorative Dentistry](',
        '- [Meet Our Team](',
        '- [Office Tour](',
        '- [Financial Options](',
        '- [Special Offers](',
        '[Review](',
        '[Directions](',
        '[Call Us](',
        '[Request Appointment](',
        '[Get Directions]',
        '[Make a Payment]',
        '[Schedule an Appointment]',
        '© Copyright',
        '**Website Design**',
        '👋 Hello! What can I do',
        '_Invisalign and the Invisalign logo',
        'Facebook icon',
        'Google icon',
        'YouTube icon',
        'Yelp icon',
    ]

    # State tracking
    in_navigation_section = False
    in_duplicate_reviews = False
    in_footer_hours = False
    seen_patient_reviews = False
    skip_line_count = 0

    global stats
    stats["original_lines"] += len(lines)

    for i, line in enumerate(lines):
        # Skip front matter (first 4 lines with ---)
        if i < 5 and (line.startswith('---') or line.startswith('url:') or line.startswith('title:')):
            skip_line_count += 1
            continue

        # Skip lines matching boilerplate patterns
        if any(pattern in line for pattern in skip_patterns):
            skip_line_count += 1
            continue

        # Detect and skip navigation sections (nested list structures)
        if line.strip().startswith('- [') and ('(' in line):
            in_navigation_section = True
            skip_line_count += 1
            continue
        elif in_navigation_section:
            # Continue skipping until we hit non-navigation content
            if line.strip() and not line.strip().startswith('-') and not line.strip().startswith(' '):
                in_navigation_section = False
            else:
                skip_line_count += 1
                continue

        # Skip patient reviews after first occurrence
        if '## Andrea M.' in line or '## Diana D.' in line or '## Lina D.' in line or '## Sandra G.' in line:
            if seen_patient_reviews:
                in_duplicate_reviews = True
                skip_line_count += 1
                continue
            else:
                seen_patient_reviews = True

        if in_duplicate_reviews:
            # Stop at next major section or end of file
            if line.startswith('###') or line.startswith('##') and 'Reviews' not in line:
                in_duplicate_reviews = False
            else:
                skip_line_count += 1
                continue

        # Skip duplicate business hours tables (after first occurrence)
        if line.startswith('| Day | Hours |') or line.startswith('| Monday |'):
            if in_footer_hours:
                # Skip this table
                while i < len(lines) and (lines[i].startswith('|') or lines[i].startswith('\\*Every')):
                    skip_line_count += 1
                    i += 1
                continue
            else:
                in_footer_hours = True

        # Keep the line
        cleaned.append(line)

    stats["cleaned_lines"] += len(cleaned)
    stats["removed_lines"] += skip_line_count

    return '\n'.join(cleaned).strip()


# ============================================================================
# STRUCTURED CONTENT EXTRACTION
# ============================================================================

def extract_business_hours(content: str) -> Optional[Dict[str, Any]]:
    """Extract business hours table into a dedicated chunk."""
    # Look for the hours table
    if '| Day | Hours |' not in content:
        return None

    hours_text = f"""Shoreline Dental Chicago Business Hours:

Monday: 11:00 AM - 7:00 PM
Tuesday: 7:00 AM - 7:00 PM
Wednesday: 7:00 AM - 7:00 PM
Thursday: 7:00 AM - 3:00 PM
Friday: 7:00 AM - 3:00 PM
Saturday: 8:00 AM - 1:00 PM (Every other Saturday)
Sunday: Closed

Located at {PRACTICE_ADDRESS}
Call {PRACTICE_PHONE} to schedule an appointment."""

    return {
        "text": hours_text,
        "metadata": {
            "contentType": "business-hours",
            "category": "scheduling",
            "priority": "high",
            "service": "general-information",
            "practice": PRACTICE_NAME,
            "practiceAddress": PRACTICE_ADDRESS,
            "practicePhone": PRACTICE_PHONE,
        }
    }


def extract_faq_questions(content: str, filename: str) -> List[Dict[str, Any]]:
    """Extract FAQ section and split into individual Q&A chunks."""
    faq_chunks = []

    # Look for FAQ section markers
    if '### FAQ' not in content and '**FAQ**' not in content:
        return faq_chunks

    # Extract FAQ section
    faq_start = content.find('### FAQ')
    if faq_start == -1:
        faq_start = content.find('**FAQ**')
    if faq_start == -1:
        return faq_chunks

    # Get FAQ content until next major section
    faq_section = content[faq_start:]
    faq_end = faq_section.find('\n### ', 10)  # Find next section
    if faq_end != -1:
        faq_section = faq_section[:faq_end]

    # Parse Q&A pairs (markdown bold questions)
    qa_pattern = r'\*\*(.*?)\*\*\s*\n+(.*?)(?=\n\*\*|\n###|\Z)'
    matches = re.findall(qa_pattern, faq_section, re.DOTALL)

    for question, answer in matches:
        question = question.strip()
        answer = answer.strip()

        if len(question) > 10 and len(answer) > 20:  # Filter noise
            faq_chunks.append({
                "text": f"Q: {question}\n\nA: {answer}",
                "metadata": {
                    "contentType": "faq",
                    "question": question,
                    "source": filename,
                }
            })
            global stats
            stats["faq_chunks"] += 1

    return faq_chunks


def extract_special_offers(content: str) -> Optional[Dict[str, Any]]:
    """Extract special offers/pricing into dedicated chunk."""
    if 'New Patient Special' not in content and '$99' not in content:
        return None

    offer_text = f"""Shoreline Dental Chicago - New Patient Special

For uninsured patients: Initial visit for only $99

This special includes:
- Comprehensive dental cleaning
- Dental X-rays
- Dental exam with Dr. Mollie Rojas or Dr. Sonal Patel
- Fluoride treatment

Note: Not valid for patients with dental insurance.

Call {PRACTICE_PHONE} to schedule your appointment and take advantage of this special offer.
Located at {PRACTICE_ADDRESS}"""

    return {
        "text": offer_text,
        "metadata": {
            "contentType": "pricing",
            "hasPrice": True,
            "category": "special-offers",
            "priority": "high",
            "practice": PRACTICE_NAME,
            "practicePhone": PRACTICE_PHONE,
        }
    }


# ============================================================================
# CONTENT CATEGORIZATION
# ============================================================================

def extract_category_from_filename(filename: str) -> str:
    """Extract service category from filename."""
    parts = filename.replace(".md", "").split("_")

    if "services" in parts:
        service_idx = parts.index("services")
        if len(parts) > service_idx + 1:
            return parts[service_idx + 1]

    if "about" in parts:
        return "about"
    elif "patient-resources" in parts:
        return "patient-resources"
    elif "contact" in parts:
        return "contact"

    return "general"


def extract_service_name(filename: str) -> str:
    """Extract specific service name from filename."""
    parts = filename.replace(".md", "").split("_")

    # Get the last meaningful part
    for part in reversed(parts):
        if part and part not in ['www', 'shorelinedentalchicago', 'com', '']:
            return part

    return "general"


def determine_service_type(category: str, content: str) -> str:
    """Determine service type from category and content."""
    content_lower = content.lower()

    if "cosmetic" in category:
        return "cosmetic"
    elif "restorative" in category or any(word in content_lower for word in ["crown", "filling", "bridge"]):
        return "restorative"
    elif "oral-surgery" in category or "surgery" in category:
        return "oral-surgery"
    elif "general" in category or "family" in category:
        return "general"
    else:
        return "general"


def determine_content_type(text: str) -> str:
    """Determine the type of content in a chunk."""
    text_lower = text.lower()

    # FAQ
    if text.startswith('Q:') or '**' in text and '?' in text[:100]:
        return "faq"

    # Pricing
    if '$' in text or 'cost' in text_lower or 'price' in text_lower:
        return "pricing"

    # Procedure details
    if 'what to expect' in text_lower or 'process' in text_lower or 'procedure' in text_lower:
        return "procedure"

    # Benefits
    if 'benefits' in text_lower or 'advantages' in text_lower:
        return "benefits"

    # Overview/description (default)
    return "service-description"


# ============================================================================
# ENHANCED METADATA GENERATION
# ============================================================================

def create_enhanced_metadata(
    text: str,
    filename: str,
    original_content: str,
    doc_metadata: Dict = None
) -> Dict[str, Any]:
    """Generate rich metadata for each chunk."""
    category = extract_category_from_filename(filename)
    service = extract_service_name(filename)
    service_type = determine_service_type(category, original_content)
    content_type = determine_content_type(text)

    metadata = {
        # Source information
        "source": filename,
        "sourceUrl": filename.replace("_", "/").replace(".md", "").replace("www.shorelinedentalchicago.com/", ""),
        "uploadedAt": datetime.now().isoformat(),

        # Classification
        "category": category,
        "service": service,
        "serviceType": service_type,
        "contentType": content_type,

        # Flags
        "hasPrice": '$' in text or 'price' in text.lower() or 'cost' in text.lower(),
        "hasFAQ": text.startswith('Q:'),
        "isProcedureDetail": 'what to expect' in text.lower() or 'procedure' in text.lower(),

        # Practice information
        "practice": PRACTICE_NAME,
        "practiceAddress": PRACTICE_ADDRESS,
        "practicePhone": PRACTICE_PHONE,
        "doctors": DOCTORS,

        # File metadata
        "fileType": "md",
    }

    # Add Docling metadata if available
    if doc_metadata:
        metadata.update({k: v for k, v in doc_metadata.items()
                        if k not in ["source", "page_content"]})

    return metadata


# ============================================================================
# MAIN PROCESSING FUNCTION
# ============================================================================

def process_knowledge_base():
    """Main function to process all markdown files with Docling."""
    print("=" * 70)
    print("  Enhanced Docling Knowledge Base Preprocessing")
    print("  with Content Cleaning & Structured Extraction")
    print("=" * 70)
    print()

    # Check if knowledge base directory exists
    if not KNOWLEDGE_BASE_DIR.exists():
        print(f"❌ Error: Directory '{KNOWLEDGE_BASE_DIR}' not found")
        return

    # Find all markdown files
    md_files = list(KNOWLEDGE_BASE_DIR.glob("*.md"))

    if not md_files:
        print(f"❌ Error: No markdown files found in '{KNOWLEDGE_BASE_DIR}'")
        return

    print(f"📂 Found {len(md_files)} markdown files")
    print()

    # Initialize Docling chunker
    print("⚙️  Initializing Enhanced Docling HybridChunker...")
    print(f"   - Embedding Model: {EMBEDDING_MODEL}")
    print(f"   - Embedding Dimensions: {EMBEDDING_DIMENSIONS}")
    print(f"   - Max Tokens: {MAX_TOKENS} (optimized)")
    print(f"   - Overlap Tokens: {OVERLAP_TOKENS} (14% overlap)")
    print(f"   - Min Chunk Tokens: {MIN_CHUNK_TOKENS} (filters noise)")
    print()
    print("🧹 Content Cleaning Enabled:")
    print("   - Removing navigation boilerplate")
    print("   - Filtering duplicate content")
    print("   - Extracting structured data (FAQs, hours, pricing)")
    print()

    try:
        chunker = HybridChunker(
            tokenizer="gpt2",  # Compatible with Hugging Face
            max_tokens=MAX_TOKENS,
            overlap_tokens=OVERLAP_TOKENS,
            min_chunk_tokens=MIN_CHUNK_TOKENS
        )
    except Exception as e:
        print(f"❌ Error initializing chunker: {e}")
        return

    # Process all files
    all_chunks: List[Dict[str, Any]] = []
    total_chunks = 0

    # Extract business hours once (not per file)
    business_hours_chunk = extract_business_hours("| Day | Hours |")
    if business_hours_chunk:
        all_chunks.append(business_hours_chunk)
        total_chunks += 1
        stats["business_chunks"] += 1
        print("✓ Created business hours chunk")

    # Extract special offers once
    special_offers_processed = False

    for idx, md_file in enumerate(md_files, 1):
        print(f"[{idx}/{len(md_files)}] Processing: {md_file.name}")

        try:
            # Read original content
            with open(md_file, 'r', encoding='utf-8') as f:
                original_content = f.read()

            # Pre-clean content
            cleaned_content = clean_markdown_content(original_content, md_file.name)

            # Save cleaned content to temp file for Docling
            temp_file = Path(f"/tmp/{md_file.name}")
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)

            # Extract FAQs as individual chunks
            faq_chunks = extract_faq_questions(cleaned_content, md_file.name)
            for faq_chunk in faq_chunks:
                # Add practice info to FAQ metadata
                faq_chunk["metadata"].update({
                    "practice": PRACTICE_NAME,
                    "practiceAddress": PRACTICE_ADDRESS,
                    "practicePhone": PRACTICE_PHONE,
                })
                all_chunks.append(faq_chunk)
                total_chunks += 1

            if faq_chunks:
                print(f"   ✓ Extracted {len(faq_chunks)} FAQ chunks")

            # Extract special offers (once only)
            if not special_offers_processed and 'special-offers' in md_file.name:
                offer_chunk = extract_special_offers(cleaned_content)
                if offer_chunk:
                    all_chunks.append(offer_chunk)
                    total_chunks += 1
                    special_offers_processed = True
                    stats["business_chunks"] += 1
                    print(f"   ✓ Extracted special offers chunk")

            # Process with Docling
            loader = DoclingLoader(
                file_path=str(temp_file),
                chunker=chunker
            )

            docs = loader.load()

            # Process each chunk with enhanced metadata
            file_chunks = 0
            for doc in docs:
                # Skip very short chunks (likely navigation remnants)
                if len(doc.page_content.strip()) < 100:
                    continue

                metadata = create_enhanced_metadata(
                    doc.page_content,
                    md_file.name,
                    original_content,
                    doc.metadata
                )

                chunk_data = {
                    "text": doc.page_content,
                    "metadata": metadata
                }

                all_chunks.append(chunk_data)
                file_chunks += 1
                stats["service_chunks"] += 1

            total_chunks += file_chunks
            print(f"   ✓ Created {file_chunks} content chunks")

            # Clean up temp file
            temp_file.unlink()

        except Exception as e:
            print(f"   ❌ Error processing {md_file.name}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print()
    print("=" * 70)
    print(f"✅ Processing Complete!")
    print(f"   - Total files processed: {len(md_files)}")
    print(f"   - Total chunks created: {total_chunks}")
    print(f"   - Average chunks per file: {total_chunks / len(md_files):.1f}")
    print()
    print(f"📊 Content Statistics:")
    print(f"   - Original lines: {stats['original_lines']:,}")
    print(f"   - Cleaned lines: {stats['cleaned_lines']:,}")
    print(f"   - Removed lines: {stats['removed_lines']:,} ({stats['removed_lines']/stats['original_lines']*100:.1f}% reduction)")
    print()
    print(f"📦 Chunk Distribution:")
    print(f"   - Service content: {stats['service_chunks']} ({stats['service_chunks']/total_chunks*100:.1f}%)")
    print(f"   - FAQ chunks: {stats['faq_chunks']} ({stats['faq_chunks']/total_chunks*100:.1f}%)")
    print(f"   - Business info: {stats['business_chunks']} ({stats['business_chunks']/total_chunks*100:.1f}%)")
    print("=" * 70)
    print()

    # Save to JSON
    print(f"💾 Saving chunks to {OUTPUT_FILE}...")

    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(all_chunks, f, indent=2, ensure_ascii=False)

        file_size_kb = OUTPUT_FILE.stat().st_size / 1024
        print(f"   ✓ Saved {file_size_kb:.2f} KB")

    except Exception as e:
        print(f"   ❌ Error saving file: {e}")
        return

    print()
    print("🎉 Success! Optimized chunks ready for upload to Pinecone.")
    print()
    print("Next steps:")
    print("  1. Review processed-chunks.json (optional)")
    print("  2. Run: npm run upload:docling")
    print()


# ============================================================================
# SCRIPT ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    try:
        process_knowledge_base()
    except KeyboardInterrupt:
        print("\n\n⚠️  Processing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
