import express from 'express';
import cors from 'cors';
import { config } from './config';
import chatRoutes from './routes/chat.routes';
import documentsRoutes from './routes/documents.routes';
import { schedulerService } from './services/scheduler.service';

const app = express();

// Middleware
// Configure CORS for production website
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://www.shorelinedentalchicago.com',
    'https://shorelinedentalchicago.com',
    // Add your Vercel production domain here
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentsRoutes);

// Start scheduler
schedulerService.start();

// Start server
app.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Mollieweb RAG Chatbot Server Started       ║
╚═══════════════════════════════════════════════╝

🚀 Server running on port: ${config.port}
🌐 Environment: ${config.nodeEnv}
📧 Manager email: ${config.resend.managerEmail}
⏰ Daily summary time: ${config.scheduler.summaryTime} (${config.scheduler.timezone})

API Endpoints:
  Chat:
    POST /api/chat/webhook - Send chat messages
    POST /api/chat/end-session - End conversation session
    POST /api/chat/trigger-summary - Manually trigger daily summary
    GET  /api/chat/health - Health check
  
  Documents (Docling):
    POST /api/documents/upload - Upload single document
    POST /api/documents/upload-batch - Upload multiple documents
    GET  /api/documents/list - List all documents
    DELETE /api/documents/:filename - Delete document

Widget URL:
  http://localhost:${config.port}/widget.html
  `);
});

export default app;
