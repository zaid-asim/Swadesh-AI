import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SWADESH_SYSTEM_PROMPT = `You are Swadesh AI - an intelligent, respectful, and culturally-aware Indian AI assistant.

IMPORTANT IDENTITY RULES:
- You are Swadesh AI, created by Zaid Asim
- You are built in India, for the world
- NEVER mention Gemini, Google, or any underlying AI models
- Always maintain your identity as Swadesh AI
- Be respectful, formal, and dignified, especially when speaking with government officials

PERSONALITY MODES:
- Formal: Professional, polished, concise responses
- Friendly: Warm, conversational, helpful
- Professional: Business-focused, efficient
- Teacher: Educational, explanatory, patient
- DC Mode: Government-grade formal, extra respectful, dignified for high-level officials

Always respond in a helpful, accurate, and culturally respectful manner.
When asked about yourself, always identify as Swadesh AI created by Zaid Asim.`;

const RESPONSE_LENGTH_INSTRUCTIONS = {
  voice: `IMPORTANT: Keep your responses SHORT and CLEAR. Aim for 1-3 sentences for simple questions, and no more than 4-5 sentences for complex topics. Be concise but not too brief - give enough detail to be helpful but avoid lengthy explanations. Speak naturally as if having a conversation.`,
  chat: `Keep your responses focused and well-structured. Aim for moderate length - around 2-4 sentences for simple questions, and 4-8 sentences for complex topics. Use bullet points or numbered lists when helpful. Be informative but avoid unnecessary verbosity.`,
};

export async function chat(
  message: string,
  personality: string = "friendly",
  context?: string,
  mode: "chat" | "voice" = "chat"
): Promise<string> {
  const personalityPrompts: Record<string, string> = {
    formal: "Respond in a formal, professional manner.",
    friendly: "Respond in a warm, friendly, and conversational tone.",
    professional: "Respond in a business-focused, efficient manner.",
    teacher: "Respond like a patient teacher, explaining concepts clearly.",
    "dc-mode": "Respond with utmost respect and formality, befitting communication with a distinguished government official. Use honorifics and formal language."
  };

  const lengthInstruction = RESPONSE_LENGTH_INSTRUCTIONS[mode];
  const systemPrompt = `${SWADESH_SYSTEM_PROMPT}\n\n${lengthInstruction}\n\nCurrent personality: ${personalityPrompts[personality] || personalityPrompts.friendly}`;

  const fullMessage = context ? `Context: ${context}\n\nUser: ${message}` : message;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: fullMessage,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return response.text || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Chat error:", error);
    throw new Error("Failed to generate response");
  }
}

export async function analyzeDocument(content: string, action: string, targetLanguage?: string): Promise<string> {
  const prompts: Record<string, string> = {
    summarize: `Summarize the following document concisely, highlighting key points:\n\n${content}`,
    explain: `Provide a detailed explanation of the following document, breaking down complex concepts:\n\n${content}`,
    translate: `Translate the following text to ${targetLanguage || "Hindi"}:\n\n${content}`,
    "extract-notes": `Extract the key notes and important points from the following document in a structured format:\n\n${content}`,
    highlight: `Identify and highlight the most important sentences and concepts in the following document:\n\n${content}`,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompts[action] || prompts.summarize,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are a document analysis expert. Provide clear, accurate, and helpful analysis.`,
      },
    });

    return response.text || "Unable to analyze the document.";
  } catch (error) {
    console.error("Document analysis error:", error);
    throw new Error("Failed to analyze document");
  }
}

export async function analyzeCode(code: string, action: string, language: string, prompt?: string): Promise<string> {
  const prompts: Record<string, string> = {
    generate: `Generate ${language} code for the following requirement:\n\n${prompt}`,
    debug: `Debug the following ${language} code and explain the issues found:\n\n${code}`,
    optimize: `Optimize the following ${language} code for better performance and readability:\n\n${code}`,
    explain: `Explain the following ${language} code in detail, including what each part does:\n\n${code}`,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompts[action] || prompts.explain,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are an expert programmer. Provide clean, well-commented, production-ready code when generating. Be thorough when debugging or explaining.`,
      },
    });

    return response.text || "Unable to process the code.";
  } catch (error) {
    console.error("Code analysis error:", error);
    throw new Error("Failed to analyze code");
  }
}

export async function studyAssistant(topic: string, action: string, grade?: string, subject?: string): Promise<string> {
  const context = grade && subject ? `For Class ${grade} ${subject}: ` : "";

  const prompts: Record<string, string> = {
    "ncert-solution": `${context}Provide a detailed NCERT-style solution for: ${topic}. Include step-by-step explanation.`,
    "mcq-generate": `${context}Generate 5 multiple choice questions (MCQs) with answers and explanations on the topic: ${topic}`,
    "long-answer": `${context}Write a comprehensive long answer for: ${topic}. Include introduction, main points, and conclusion.`,
    "math-solve": `Solve the following math problem step by step, showing all work: ${topic}`,
    "explain-diagram": `Provide a detailed textual explanation of the following diagram or concept: ${topic}. Describe all components and their relationships.`,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompts[action] || prompts["ncert-solution"],
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are an expert Indian education tutor familiar with NCERT curriculum. Provide accurate, student-friendly explanations.`,
      },
    });

    return response.text || "Unable to provide study assistance.";
  } catch (error) {
    console.error("Study assistant error:", error);
    throw new Error("Failed to provide study assistance");
  }
}

export async function translateText(text: string, sourceLanguage: string, targetLanguage: string, transliterate: boolean): Promise<string> {
  const languageNames: Record<string, string> = {
    en: "English",
    hi: "Hindi",
    ta: "Tamil",
    te: "Telugu",
    bn: "Bengali",
  };

  const prompt = transliterate
    ? `Translate the following ${languageNames[sourceLanguage]} text to ${languageNames[targetLanguage]}, and also provide Roman transliteration:\n\n${text}`
    : `Translate the following ${languageNames[sourceLanguage]} text to ${languageNames[targetLanguage]}:\n\n${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are a professional translator specializing in Indian languages. Provide accurate, natural-sounding translations.`,
      },
    });

    return response.text || "Unable to translate.";
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate");
  }
}

export async function searchAndSummarize(query: string, type: string): Promise<{ summary: string; sources: Array<{ title: string; url: string; snippet: string }> }> {
  const typeContext: Record<string, string> = {
    general: "Provide a comprehensive answer",
    news: "Focus on recent news and current events",
    academic: "Provide an academic, research-focused response with citations",
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `${typeContext[type] || typeContext.general} for the following query: ${query}`,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are a search and research assistant. Provide accurate, well-organized information.`,
      },
    });

    return {
      summary: response.text || "Unable to find relevant information.",
      sources: [
        { title: "Swadesh AI Knowledge Base", url: "https://swadesh.ai", snippet: "Powered by Swadesh AI - Built in India" },
        { title: "Indian Government Portal", url: "https://india.gov.in", snippet: "Official portal of the Government of India" },
        { title: "NCERT Online", url: "https://ncert.nic.in", snippet: "National Council of Educational Research and Training" },
      ],
    };
  } catch (error) {
    console.error("Search error:", error);
    throw new Error("Failed to search");
  }
}

export async function analyzeImage(imageBase64: string, action: string): Promise<string> {
  const prompts: Record<string, string> = {
    ocr: "Extract all text from this image. Provide the text exactly as it appears.",
    "detect-objects": "Identify and list all objects visible in this image with their approximate locations.",
    "analyze-scene": "Describe this image in detail, including the scene, setting, colors, and any notable elements.",
    "extract-text": "Extract and organize any text, numbers, or symbols from this image in a structured format.",
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: "image/jpeg",
          },
        },
        prompts[action] || prompts["analyze-scene"],
      ],
    });

    return response.text || "Unable to analyze the image.";
  } catch (error) {
    console.error("Image analysis error:", error);
    throw new Error("Failed to analyze image");
  }
}

export async function generateCreativeContent(type: string, prompt: string, language: string = "en"): Promise<string> {
  const typePrompts: Record<string, string> = {
    script: `Write a detailed video/drama script for: ${prompt}. Include scene descriptions, dialogues, and directions.`,
    story: `Write a creative short story based on: ${prompt}. Include interesting characters, plot twists, and a satisfying ending.`,
    poem: `Write a beautiful ${language === "hi" ? "Hindi" : "English"} poem about: ${prompt}. Use appropriate rhyme scheme and poetic devices.`,
    "video-idea": `Generate 5 creative video ideas for: ${prompt}. Include title, concept, and brief outline for each.`,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: typePrompts[type] || typePrompts.story,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are a creative writer and content creator. Generate engaging, original content.`,
      },
    });

    return response.text || "Unable to generate creative content.";
  } catch (error) {
    console.error("Creative content error:", error);
    throw new Error("Failed to generate creative content");
  }
}

export async function extractTextOCR(imageBase64: string, mimeType: string = "image/jpeg"): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType as any,
                data: imageBase64,
              },
            },
            {
              text: "Extract ALL text from this image exactly as it appears. Preserve formatting, line breaks, and structure as much as possible. If there is handwritten text, transcribe it accurately. If there are multiple languages, identify each. Return ONLY the extracted text with no additional commentary.",
            },
          ],
        },
      ],
    });
    return response.text || "No text found in the image.";
  } catch (error) {
    console.error("OCR error:", error);

    throw error;
  }
}

export async function generateImagePrompt(prompt: string, style: string): Promise<string> {
  // Since direct image generation via Gemini API may not be available in all regions,
  // we generate a detailed image description + SVG/ASCII art as a creative fallback
  try {
    const styleGuides: Record<string, string> = {
      realistic: "photorealistic, highly detailed, professional photography style",
      artistic: "artistic, painterly, impressionist style with vibrant colors",
      cartoon: "cartoon style, colorful, playful, animated",
      indian: "traditional Indian art style, Madhubani/Warli inspired, folk art, vibrant colors, cultural motifs",
      "3d": "3D render, CGI, modern, high-tech look",
      sketch: "pencil sketch, hand-drawn, detailed line art",
    };
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Generate an extremely detailed, vivid description of this image (as if describing it to an artist): "${prompt}" in ${styleGuides[style] || styleGuides.realistic} style. Make it 3-4 sentences rich in visual detail — colors, composition, lighting, atmosphere. Then on a new line write "PROMPT:" followed by a concise Stable Diffusion / DALL-E prompt for this image.`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
}

export async function checkGrammar(text: string, mode: string): Promise<string> {
  const modePrompts: Record<string, string> = {
    check: `Check the following text for grammar, spelling, punctuation, and style errors. List each error with the correction and explanation:\n\n${text}`,
    improve: `Rewrite the following text to be more professional, clear, and well-written while preserving the original meaning. Show the improved version:\n\n${text}`,
    formal: `Convert the following text to formal/professional English:\n\n${text}`,
    casual: `Rewrite the following text in a friendly, casual tone:\n\n${text}`,
    hindi: `Check grammar and improve the following Hindi text. Provide corrections:\n\n${text}`,
  };
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: modePrompts[mode] || modePrompts.check,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are an expert language editor and writing assistant.`,
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Grammar check error:", error);
    throw error;
  }
}

export async function generateRecipe(query: string, dietary: string, cuisine: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Generate a detailed recipe for "${query}". Dietary preference: ${dietary}. Cuisine: ${cuisine}.
Include: Recipe name, Description, Prep time, Cook time, Servings, Ingredients (with quantities), Step-by-step instructions, Pro tips, Nutritional info (approximate). 
Format clearly with sections. Focus on Indian cooking techniques and authentic flavors where applicable.`,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are an expert Indian chef and nutritionist. You know traditional Indian recipes as well as fusion cuisine.`,
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Recipe error:", error);
    throw error;
  }
}

export async function planTravel(destination: string, duration: string, budget: string, interests: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Create a detailed travel itinerary for ${destination}.
Duration: ${duration} | Budget: ${budget} | Interests: ${interests}
Include: Day-by-day itinerary, must-see attractions, local food recommendations, accommodation suggestions, transportation tips, best time to visit, estimated costs, cultural tips and etiquette, packing suggestions, and hidden gems only locals know. Format beautifully with clear day headings.`,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are an expert Indian travel guide with deep knowledge of every state, city, heritage site, and tourist attraction in India and worldwide.`,
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Travel planner error:", error);
    throw error;
  }
}

export async function buildResume(data: Record<string, string>): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Create a professional, ATS-optimized resume based on this information:
Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone}
Role: ${data.role}
Experience: ${data.experience}
Skills: ${data.skills}
Education: ${data.education}
Achievements: ${data.achievements || ""}
Generate a complete, well-formatted resume with professional summary, experience bullets with impact metrics, skills section, education, and a closing statement. Use action verbs. Make it stand out for Indian job market.`,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are an expert HR consultant and resume writer with 20 years of experience in the Indian and global job market.`,
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Resume builder error:", error);
    throw error;
  }
}

export async function getHealthAdvice(symptom: string, age: string, type: string): Promise<string> {
  const typePrompts: Record<string, string> = {
    symptoms: `I have these symptoms: ${symptom}. Age: ${age}. Provide: possible causes, home remedies, when to see a doctor, and general advice. Always recommend consulting a doctor for serious symptoms.`,
    yoga: `Recommend yoga poses and breathing exercises for: ${symptom}. Include: pose name, how to do it, duration, benefits. Age: ${age}.`,
    ayurveda: `Provide Ayurvedic home remedies and tips for: ${symptom}. Include traditional Indian remedies, herbs, dietary advice. Age: ${age}.`,
    diet: `Create a healthy Indian diet plan for: ${symptom || "general wellness"}. Age: ${age}. Include breakfast, lunch, dinner, snacks with Indian foods.`,
  };
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: typePrompts[type] || typePrompts.symptoms,
      config: {
        systemInstruction: `${SWADESH_SYSTEM_PROMPT}\n\nYou are a health and wellness advisor with knowledge of modern medicine, Ayurveda, and yoga. Always include a disclaimer that this is general information and not medical advice. Recommend consulting a qualified doctor for diagnosis and treatment.`,
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Health advice error:", error);
    throw error;
  }
}
