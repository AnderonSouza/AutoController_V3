import { GoogleGenAI } from "@google/genai";

export interface AnalysisContext {
  store: string;
  period: string;
  data: any;
  view?: string;
  brand?: string;
  department?: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const generateFinancialInsight = async (prompt: string, context: AnalysisContext, history: Message[]) => {
  // Always initialize with the pre-configured API_KEY from environment variables.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })),
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ];

  try {
    // Upgraded to 'gemini-3-pro-preview' as it is best suited for complex reasoning and financial analysis (CFO persona).
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: `Você é Luca, um CFO virtual especialista em análise de resultados de concessionárias de veículos.
Analise os dados financeiros fornecidos e responda de forma consultiva e profissional.
Foque em margens, custos e variações significativas. Forneça insights estratégicos baseados nos dados apresentados.

CONTEXTO:
Empresa: ${context.store}
Período: ${context.period}
Departamento: ${context.department || 'Consolidado'}
Visão: ${context.view || 'DRE'}

DADOS (JSON):
${JSON.stringify(context.data).substring(0, 15000)}`,
        temperature: 0.7,
      },
    });

    // Access generating content text directly via the .text property.
    return response.text || "Não foi possível gerar um insight no momento.";
  } catch (error) {
    console.error("Erro Luca API:", error);
    return "Ocorreu um erro ao consultar o Luca. Verifique sua conexão e tente novamente.";
  }
};
