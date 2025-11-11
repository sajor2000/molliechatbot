import { v4 as uuidv4 } from 'uuid';
import { pineconeService } from '../services/pinecone.service';
import { openrouterService } from '../services/openrouter.service';

/**
 * Sample knowledge base entries
 * Replace these with your actual business information
 */
const knowledgeBase = [
  {
    title: 'Company Overview',
    content: `We are Mollieweb, a leading provider of web solutions and digital services. 
    We specialize in creating custom websites, web applications, and digital marketing strategies 
    for businesses of all sizes.`,
  },
  {
    title: 'Services Offered',
    content: `Our services include:
    - Custom website development
    - E-commerce solutions
    - Mobile app development
    - Digital marketing and SEO
    - Web hosting and maintenance
    - UI/UX design`,
  },
  {
    title: 'Pricing Information',
    content: `We offer flexible pricing plans:
    - Starter Package: $2,500 - Perfect for small businesses
    - Professional Package: $5,000 - For growing companies
    - Enterprise Package: Custom pricing - For large organizations
    All packages include initial consultation, design, development, and 3 months of support.`,
  },
  {
    title: 'Contact Information',
    content: `You can reach us at:
    - Email: hello@mollieweb.com
    - Phone: (555) 123-4567
    - Office Hours: Monday-Friday, 9 AM - 6 PM EST
    - Address: 123 Tech Street, San Francisco, CA 94105`,
  },
  {
    title: 'Project Timeline',
    content: `Typical project timelines:
    - Simple website: 2-4 weeks
    - E-commerce site: 4-8 weeks
    - Custom web application: 8-16 weeks
    We provide weekly progress updates and involve you in every stage of development.`,
  },
  {
    title: 'Support and Maintenance',
    content: `We offer ongoing support packages:
    - Basic Support: $200/month - Bug fixes and minor updates
    - Premium Support: $500/month - Priority support, monthly updates
    - Enterprise Support: Custom pricing - 24/7 support, dedicated account manager`,
  },
  {
    title: 'Technology Stack',
    content: `We work with modern technologies including:
    - Frontend: React, Vue.js, Next.js, TypeScript
    - Backend: Node.js, Python, PHP
    - Databases: PostgreSQL, MongoDB, MySQL
    - Cloud: AWS, Google Cloud, Azure
    - CMS: WordPress, Contentful, Strapi`,
  },
  {
    title: 'Getting Started',
    content: `To start a project with us:
    1. Schedule a free consultation call
    2. We'll discuss your requirements and goals
    3. Receive a detailed proposal and quote
    4. Sign contract and make initial deposit (30%)
    5. We begin work on your project
    6. Regular check-ins and reviews
    7. Final delivery and launch support`,
  },
];

async function embedKnowledgeBase() {
  console.log('Starting knowledge base embedding...\n');

  try {
    const vectors = [];

    for (const [index, entry] of knowledgeBase.entries()) {
      console.log(`Processing (${index + 1}/${knowledgeBase.length}): ${entry.title}`);

      // Create embedding for the content
      const embedding = await openrouterService.createEmbedding(
        `${entry.title}\n${entry.content}`
      );

      vectors.push({
        id: uuidv4(),
        values: embedding,
        metadata: {
          title: entry.title,
          text: entry.content,
          source: 'knowledge_base',
        },
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\nUploading embeddings to Pinecone...');
    await pineconeService.upsertEmbeddings(vectors);

    console.log('\n✅ Successfully embedded all knowledge base entries!');
    console.log(`Total entries: ${vectors.length}`);
  } catch (error) {
    console.error('\n❌ Error embedding knowledge base:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  embedKnowledgeBase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { embedKnowledgeBase };
