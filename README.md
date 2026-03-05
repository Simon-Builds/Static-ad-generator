# Static Ad Generator 🍌

A next-generation marketing tool that automates the creation of high-conversion static advertisements using a streamlined multimodal AI pipeline.

## 🚀 The "Omni" Pipeline
This application bypasses traditional multi-step LLM workflows by leveraging the native reasoning capabilities of **Google's Nano Banana Pro (Gemini 3 Pro)**. 

1. **Brand Analysis**: Users define their product and target audience.
2. **Persona Intelligence**: Powered by **Groq (Llama 4 Scout)**, the app generates deep psychological buyer personas (Pain points, Marketing Angles, and Emotional Triggers).
3. **Omni-Generation**: A single prompt containing the competitor ad style, product photo, and persona context is sent to **Nano Banana Pro**, which natively:
   - Analyzes the competitor's layout and style.
   - Crafts targeted ad copy for the specific persona.
   - Renders a photorealistic 2K ad image with perfectly spelled typography.

## 🛠️ Tech Stack
- **Frontend**: Next.js (App Router), TypeScript, Vanilla CSS.
- **LLM**: Groq (Llama 4 Scout) for persona generation.
- **Image Generation**: Google Nano Banana Pro via Replicate.
- **Icons**: Lucide React.

## 📦 Getting Started

### Prerequisites
- Node.js
- Replicate API Token
- Groq API Key

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file and add your keys:
   ```env
   REPLICATE_API_TOKEN=your_token
   GROQ_API_KEY=your_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
