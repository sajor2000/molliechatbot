import { pineconeService } from '../services/pinecone.service';

/**
 * Delete all vectors from Pinecone index
 *
 * Usage: npm run delete:vectors
 *
 * This script deletes all existing vectors from the Pinecone index
 * to prepare for uploading fresh, cleaned chunks.
 */

async function deleteAllVectors() {
  console.log('🗑️  Starting Pinecone Vector Deletion\n');
  console.log('─'.repeat(60));

  try {
    // Delete all vectors from the index
    console.log('\n🔍 Deleting all vectors from Pinecone index...');

    await pineconeService.deleteAll();

    console.log('✅ Successfully deleted all vectors from Pinecone\n');
    console.log('─'.repeat(60));
    console.log('\n🎉 Cleanup complete! Ready for fresh embeddings.\n');
    console.log('Next steps:');
    console.log('  1. Run: npm run upload:docling');
    console.log('  2. Verify with test queries\n');

  } catch (error) {
    console.error('\n❌ Error during vector deletion:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deleteAllVectors()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { deleteAllVectors };
