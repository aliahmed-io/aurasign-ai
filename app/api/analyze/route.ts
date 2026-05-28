import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

// Setup pdf.js worker for Node
// @ts-expect-error - No types for the worker file
await import('pdfjs-dist/legacy/build/pdf.worker.mjs');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ANALYSIS_PROMPT = `You are an expert legal AI contract analyzer. Analyze the following contract and extract ALL key Risks, Obligations, and important Clauses.

Return ONLY valid JSON as an array of objects — no markdown, no explanation, no code fences:
[{"id":"string","text":"string","riskSeverity":"low"|"medium"|"high","date":"YYYY-MM-DD or null","entities":["string"],"reasoning":"string"}]

Rules:
- "text": Extract the EXACT VERBATIM quote of the clause word-by-word from the contract text. DO NOT summarize, DO NOT rephrase, DO NOT shorten or change any words. It must exist exactly as written in the contract text (maximum 400 characters).
- "riskSeverity": STRICTLY use the following definitions:
    - "high": Uncapped liabilities, total loss of intellectual property, one-sided termination rights, impossible deadlines, or massive financial penalties.
    - "medium": Rigid timelines, non-standard payment terms (e.g. Net-90+), exclusivity clauses, or burdensome maintenance obligations.
    - "low": Standard boilerplate, basic scope definitions, governing law, or mutual non-disclosure.
- "date": Specific deadline/effective date if mentioned, else null
- "entities": 1–3 concepts or parties (e.g. "Payment Terms", "IP", "Buyer", "Termination")
- "reasoning": A concise, 1-2 sentence explanation of WHY this specific clause is legally problematic. Use a highly professional, objective legal tone (e.g., "This clause creates an uncompensated liability...").
- Extract 4–12 clauses total`;

const MOCK_TEXT = `INDEPENDENT CONTRACTOR AGREEMENT

EFFECTIVE DATE: May 29, 2026

PARTIES: OmniCorp Global Solutions ("Client") and the Undersigned Web Developer ("Contractor").

1. SCOPE OF SERVICES Contractor agrees to provide full-stack web development, AI integration, and any other related or unrelated digital services requested by the Client at any time, without limitation. Client reserves the right to expand the scope of work infinitely without adjusting compensation.

2. COMPENSATION AND PAYMENT TERMS The total compensation for the project is $5,000 USD. Payment shall be made on a Net-120 basis (120 days after project completion). Client reserves the sole and absolute right to withhold 100% of compensation if the Client determines, subjectively, that the final product is not "perfect." Any revisions requested by the Client shall be performed by the Contractor immediately and at zero additional cost.

3. TIMELINE AND MILESTONES Contractor is strictly bound to the following delivery schedule. Time is of the essence.
• Phase 1 (Frontend UI): Due June 15, 2026.
• Phase 2 (Backend AI Integration): Due June 10, 2026. (Note: This date purposely precedes Phase 1 to create a temporal paradox).
• Phase 3 (Final Deployment): Due July 1, 2026.
• Maintenance: Contractor agrees to provide 24/7 on-call server maintenance for a period of 48 months following Phase 3, without additional compensation.

4. INTELLECTUAL PROPERTY AND OWNERSHIP Upon signing this Agreement, Contractor assigns all rights, title, and interest in the work product to the Client. Furthermore, Client shall claim full ownership of any pre-existing code, open-source libraries, templates, or personal frameworks utilized by the Contractor during the execution of this project.

5. NON-COMPETE AND EXCLUSIVITY During the term of this agreement and for a period of ten (10) years following its termination, Contractor is strictly prohibited from providing software development, consulting, or IT services to any other individual, startup, or corporation worldwide.

6. LIABILITY AND INDEMNIFICATION Contractor agrees to indemnify and hold harmless the Client against any and all losses, server downtimes, third-party data breaches, or loss of revenue. Contractor's liability under this agreement is uncapped. Client's maximum liability to the Contractor for any breach of this agreement shall not exceed $1.00 USD.

7. TERMINATION Client may terminate this agreement at any time, for any reason, with zero days' notice. If Client terminates the agreement, Contractor forfeits all rights to pending payments for work already completed. Contractor may not terminate this agreement under any circumstances.

SIGNATURES:
[ ] Client Signature __________
[ ] Contractor Signature __________`;

/** Attempt to detect a password-protected PDF by looking for the /Encrypt key */
function isPasswordProtected(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  const str = new TextDecoder('latin1').decode(bytes.slice(0, 2048));
  return str.includes('/Encrypt');
}

/** Extract text from PDF using pdfjs while strictly preserving exact line breaks and layouts */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function extractPdfText(buffer: ArrayBuffer): Promise<string | null> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    let lastY = -1;
    let pageText = '';
    
    for (const item of content.items as Array<{ transform: number[], str: string }>) {
      const currentY = item.transform[5];
      
      // If y-coordinate shifts significantly, it indicates a new line in the PDF layout
      if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
        pageText += '\n';
      } else if (lastY !== -1) {
        pageText += ' ';
      }
      
      pageText += item.str;
      lastY = currentY;
    }
    
    fullText += pageText + '\n\n';
  }
  
  const avgCharsPerPage = fullText.trim().length / pdf.numPages;
  return avgCharsPerPage > 80 ? fullText : null;
}

/** Extract plain text from image or unparseable PDF using Gemini Vision */
async function extractTextWithVision(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const base64 = Buffer.from(buffer).toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: 'Extract the exact text of this document verbatim. Format the output strictly as well-structured Semantic HTML (e.g., <p>, <strong>, <h1>, <ul>, <li>) to perfectly mimic the original visual style, bolding, sizing, and layout. Wrap the entire response in a single root <div>. Return ONLY the raw HTML code without markdown code fences, comments, or explanations.',
          },
        ],
      },
    ],
  });

  return (response.text || '').replace(/^```html\s*([\s\S]*?)```$/, '$1').trim();
}

/** Analyze plain text with Gemini */
async function analyzeText(text: string): Promise<Record<string, unknown>[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${ANALYSIS_PROMPT}\n\nDocument Text:\n${text.substring(0, 80000)}`,
    config: { 
      responseMimeType: 'application/json',
      temperature: 0.1, // Ensure consistent analysis across repeated uploads
    },
  });
  return parseJsonResponse(response.text || '[]');
}

function parseJsonResponse(raw: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fallback: extract JSON array from response
  }
  const match = raw.match(/\[[\s\S]*\]/);
  if (match) return JSON.parse(match[0]);
  throw new Error('AI returned malformed JSON');
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle direct JSON re-analysis payloads (for edited contracts)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const text = body.text || '';

      if (!text || text.trim().length < 50) {
        return NextResponse.json(
          { error: 'Document text is too short to analyze (minimum 50 characters).' },
          { status: 422 }
        );
      }

      let clauses: Record<string, unknown>[];
      if (!process.env.GEMINI_API_KEY) {
        // Return mock analysis matching verbatim text
        clauses = [
          { id: '1', text: 'Client reserves the right to expand the scope of work infinitely without adjusting compensation.', riskSeverity: 'high', date: '2026-05-29', entities: ['Scope of Services', 'Client'], reasoning: 'Allows unilateral expansion of work without additional pay, creating infinite uncompensated liability.' },
          { id: '2', text: 'Payment shall be made on a Net-120 basis (120 days after project completion). Client reserves the sole and absolute right to withhold 100% of compensation if the Client determines, subjectively, that the final product is not "perfect." Any revisions requested by the Client shall be performed by the Contractor immediately and at zero additional cost.', riskSeverity: 'high', entities: ['Compensation', 'Client'], reasoning: 'Net-120 is an extremely delayed payment term, and subjective withholding of 100% compensation creates massive financial risk.' },
          { id: '3', text: 'Phase 2 (Backend AI Integration): Due June 10, 2026. (Note: This date purposely precedes Phase 1 to create a temporal paradox).', riskSeverity: 'high', date: '2026-06-10', entities: ['Timeline', 'Milestones'], reasoning: 'The timeline is impossible as it requires Phase 2 completion before Phase 1, guaranteeing a breach of contract.' },
          { id: '4', text: 'Contractor agrees to provide 24/7 on-call server maintenance for a period of 48 months following Phase 3, without additional compensation.', riskSeverity: 'high', entities: ['Maintenance', 'Contractor'], reasoning: 'Requires 4 years of unpaid, 24/7 maintenance which is highly unusual and exploitative.' },
          { id: '5', text: 'Client shall claim full ownership of any pre-existing code, open-source libraries, templates, or personal frameworks utilized by the Contractor during the execution of this project.', riskSeverity: 'high', entities: ['Intellectual Property', 'Client'], reasoning: 'Demands surrender of pre-existing intellectual property, which strips the contractor of their own underlying tools.' },
          { id: '6', text: 'Contractor agrees to indemnify and hold harmless the Client against any and all losses, server downtimes, third-party data breaches, or loss of revenue. Contractor\'s liability under this agreement is uncapped. Client\'s maximum liability to the Contractor for any breach of this agreement shall not exceed $1.00 USD.', riskSeverity: 'high', entities: ['Liability', 'OmniCorp'], reasoning: 'Uncapped liability for the contractor while capping the client\'s liability at $1 creates a severe risk imbalance.' },
          { id: '7', text: 'Client may terminate this agreement at any time, for any reason, with zero days\' notice. If Client terminates the agreement, Contractor forfeits all rights to pending payments for work already completed.', riskSeverity: 'high', entities: ['Termination', 'OmniCorp'], reasoning: 'Allows termination without notice and confiscation of earned wages for completed work.' }
        ];
      } else {
        clauses = await analyzeText(text);
      }

      return NextResponse.json({ clauses, fullText: text });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 20 MB.` },
        { status: 413 }
      );
    }

    const buffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = file.type || 'application/octet-stream';

    // --- No API key: return mock data ---
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        clauses: [
          { id: '1', text: 'Client reserves the right to expand the scope of work infinitely without adjusting compensation.', riskSeverity: 'high', date: '2026-05-29', entities: ['Scope of Services', 'Client'], reasoning: 'Allows unilateral expansion of work without additional pay, creating infinite uncompensated liability.' },
          { id: '2', text: 'Payment shall be made on a Net-120 basis (120 days after project completion). Client reserves the sole and absolute right to withhold 100% of compensation if the Client determines, subjectively, that the final product is not "perfect." Any revisions requested by the Client shall be performed by the Contractor immediately and at zero additional cost.', riskSeverity: 'high', entities: ['Compensation', 'Client'], reasoning: 'Net-120 is an extremely delayed payment term, and subjective withholding of 100% compensation creates massive financial risk.' },
          { id: '3', text: 'Phase 2 (Backend AI Integration): Due June 10, 2026. (Note: This date purposely precedes Phase 1 to create a temporal paradox).', riskSeverity: 'high', date: '2026-06-10', entities: ['Timeline', 'Milestones'], reasoning: 'The timeline is impossible as it requires Phase 2 completion before Phase 1, guaranteeing a breach of contract.' },
          { id: '4', text: 'Contractor agrees to provide 24/7 on-call server maintenance for a period of 48 months following Phase 3, without additional compensation.', riskSeverity: 'high', entities: ['Maintenance', 'Contractor'], reasoning: 'Requires 4 years of unpaid, 24/7 maintenance which is highly unusual and exploitative.' },
          { id: '5', text: 'Client shall claim full ownership of any pre-existing code, open-source libraries, templates, or personal frameworks utilized by the Contractor during the execution of this project.', riskSeverity: 'high', entities: ['Intellectual Property', 'Client'], reasoning: 'Demands surrender of pre-existing intellectual property, which strips the contractor of their own underlying tools.' },
          { id: '6', text: 'Contractor agrees to indemnify and hold harmless the Client against any and all losses, server downtimes, third-party data breaches, or loss of revenue. Contractor\'s liability under this agreement is uncapped. Client\'s maximum liability to the Contractor for any breach of this agreement shall not exceed $1.00 USD.', riskSeverity: 'high', entities: ['Liability', 'OmniCorp'], reasoning: 'Uncapped liability for the contractor while capping the client\'s liability at $1 creates a severe risk imbalance.' },
          { id: '7', text: 'Client may terminate this agreement at any time, for any reason, with zero days\' notice. If Client terminates the agreement, Contractor forfeits all rights to pending payments for work already completed.', riskSeverity: 'high', entities: ['Termination', 'OmniCorp'], reasoning: 'Allows termination without notice and confiscation of earned wages for completed work.' }
        ],
        fullText: MOCK_TEXT,
      });
    }

    let clauses: Record<string, unknown>[];
    let fullText = '';

    // ── PDF path ──────────────────────────────────────────────────────────────
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      // 1. Check for encryption first (password protected)
      if (isPasswordProtected(buffer)) {
        return NextResponse.json(
          { error: 'This PDF is password-protected. Please remove the password and try again.' },
          { status: 422 }
        );
      }

      // 2. Extract Semantic HTML perfectly mimicking original style via Gemini Vision
      const htmlText = await extractTextWithVision(buffer, 'application/pdf');
      clauses = await analyzeText(htmlText);
      fullText = htmlText;

    // ── DOCX / DOC path ───────────────────────────────────────────────────────
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      ext === 'docx' || ext === 'doc'
    ) {
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      const text = result.value.trim();
      if (text.length < 50) {
        return NextResponse.json(
          { error: 'This Word document appears to be empty or contains no readable text.' },
          { status: 422 }
        );
      }
      clauses = await analyzeText(text);
      fullText = text;

    // ── Plain text / Markdown / RTF path ────────────────────────────────────
    } else if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf'].includes(ext)) {
      const text = new TextDecoder('utf-8').decode(buffer).trim();
      const htmlText = `<div style="white-space: pre-wrap; font-family: monospace;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
      if (text.length < 50) {
        return NextResponse.json(
          { error: 'This file appears to be empty or too short to analyze.' },
          { status: 422 }
        );
      }
      clauses = await analyzeText(text);
      fullText = htmlText;

    // ── Image files (JPG / PNG / WEBP / TIFF) — direct vision ───────────────
    } else if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif'].includes(ext)) {
      const visionMime = mimeType.startsWith('image/') ? mimeType : `image/${ext}`;
      const ocrText = await extractTextWithVision(buffer, visionMime);
      clauses = await analyzeText(ocrText);
      fullText = ocrText;

    } else {
      return NextResponse.json(
        { error: `Unsupported file type "${ext || mimeType}". Please upload a PDF, Word document, plain text, or image file.` },
        { status: 415 }
      );
    }

    if (!Array.isArray(clauses) || clauses.length === 0) {
      return NextResponse.json(
        { error: 'No clauses could be extracted. The document may not contain contract language.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ clauses, fullText });

  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
