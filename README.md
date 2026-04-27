# AI Search Engine

A modern, fast, and intelligent document search engine and AI assistant. Upload your documents to your own knowledge base and seamlessly chat with them using Retrieval-Augmented Generation (RAG). Powered by Next.js, Supabase, and Google Gemini.

## 🚀 Features

- **Knowledge Base Management**: Drag-and-drop or browse to upload documents (`.pdf`, `.txt`, `.docx`) into your personal knowledge base.
- **Intelligent Search & Chat**: Ask questions about your documents. The system uses vector embeddings to retrieve relevant context and Google Gemini to synthesize a precise answer.
- **Rich Markdown Support**: The AI assistant responds with beautifully formatted GitHub Flavored Markdown, including tables, code blocks, lists, and headings.
- **Premium UI/UX**: 
  - Stunning glassmorphic design system.
  - Fully responsive grid layout that works flawlessly on desktop and mobile.
  - Auto-resizing chat text areas, typing indicators, and smooth transition animations.
- **Cloud Storage & Database**: Securely stores files in Supabase Storage and manages metadata and embeddings in PostgreSQL.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Lucide React](https://lucide.dev/) (Icons), [React Markdown](https://github.com/remarkjs/react-markdown) with `remark-gfm`
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Vector Search, Storage)
- **AI Models**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **File Parsing**: `pdf-parse` for text extraction

## 📦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account and project
- A [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/ai-search-engine.git
cd ai-search-engine
npm install
```

### 2. Environment Variables

Create a `.env` or `.env.local` file in the root of the project with the following keys:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Database Setup

Ensure your Supabase project is configured with a Storage bucket (e.g., `docs_bucket`) and a PostgreSQL table set up with the pgvector extension to store document chunks and embeddings.

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore the AI Search Engine.

## 📁 Project Structure

- `src/app/`: Next.js App Router pages and API routes (`/api/chat`, `/api/docs`, `/api/search`, `/api/upload`).
- `src/components/`: Reusable React components including the `Sidebar`, `ChatInterface`, and `ToastProvider`.
- `src/lib/`: Utility functions and library instantiations (Supabase client, Gemini AI setup).
- `src/app/globals.css`: Tailwind configuration and global glassmorphism CSS utilities.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License

This project is licensed under the MIT License.
