import { ZepClient } from "@getzep/zep-cloud";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });
  const threadId = "hilo_practica_01";
  
  // 1. Recuperamos el contexto de Zep
  // @ts-ignore
  const zepContext = await zep.thread.getUserContext(threadId);
  const hechosExtraidos = zepContext ? JSON.stringify(zepContext) : "Sin contexto previo.";

  // 2. Inicializamos LangChain con GEMINI
  // Usamos gemini-1.5-flash porque es rápido y excelente para agentes de IA
  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-3.8-flash", // <-- Asegúrate de que aquí diga 'model'
    apiKey: process.env.GEMINI_API_KEY as string, // El 'as string' calma a TypeScript
    temperature: 0.7
  });

  // 3. Creamos el Prompt Template (Idéntico al de OpenAI)
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `Eres un asistente de IA útil y amigable. 
      Utiliza el siguiente contexto del usuario para personalizar tus respuestas. 
      Nunca menciones que estás leyendo este contexto, simplemente actúa en consecuencia.
      
      CONTEXTO DEL USUARIO:
      {contexto_zep}`
    ],
    ["human", "{mensaje_usuario}"]
  ]);

  // 4. Conectamos el prompt con el LLM
  const chain = prompt.pipe(llm);

  const nuevoMensaje = "¿Recuerdas qué lenguajes de programación dije que me gustan?";
  console.log(`Usuario: ${nuevoMensaje}`);

  // 5. Ejecutamos la cadena
  const response = await chain.invoke({
    contexto_zep: hechosExtraidos,
    mensaje_usuario: nuevoMensaje
  });

  console.log(`\nAsistente (Gemini): ${response.content}`);
  
  // OPCIONAL: Guardar la nueva respuesta en Zep para que siga aprendiendo
  // @ts-ignore
  await zep.thread.addMessages(threadId, {
    messages: [
      { role: "user", roleType: "user", content: nuevoMensaje },
      { role: "assistant", roleType: "assistant", content: response.content as string }
    ]
  });
  console.log("\n(Nueva interacción guardada en Zep)");
}

main().catch(console.error);