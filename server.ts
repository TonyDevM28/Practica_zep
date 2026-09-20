import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { ZepClient } from "@getzep/zep-cloud";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import dotenv from "dotenv";

dotenv.config();

// ESM: __dirname no existe de forma nativa, lo reconstruimos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Lógica del agente ────────────────────────────────────────────────────────

async function chatWithAgent(
  mensaje: string,
  threadId: string
): Promise<string> {
  const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });

  // 1. Recuperamos el contexto de Zep
  // @ts-ignore
  const zepContext = await zep.thread.getUserContext(threadId);
  const hechosExtraidos = zepContext
    ? JSON.stringify(zepContext)
    : "Sin contexto previo.";

  // 2. Inicializamos LangChain con Gemini
  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY as string,
    temperature: 0.7,
  });

  // 3. Prompt Template
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `Eres un asistente de IA útil y amigable.
      Utiliza el siguiente contexto del usuario para personalizar tus respuestas.
      Nunca menciones que estás leyendo este contexto, simplemente actúa en consecuencia.

      CONTEXTO DEL USUARIO:
      {contexto_zep}`,
    ],
    ["human", "{mensaje_usuario}"],
  ]);

  // 4. Cadena prompt → LLM
  const chain = prompt.pipe(llm);

  // 5. Ejecutamos
  const response = await chain.invoke({
    contexto_zep: hechosExtraidos,
    mensaje_usuario: mensaje,
  });

  const respuestaTexto = response.content as string;

  // 6. Guardamos la interacción en Zep
  // @ts-ignore
  await zep.thread.addMessages(threadId, {
    messages: [
      // @ts-ignore
      { role: "user", roleType: "user", content: mensaje },
      // @ts-ignore
      { role: "assistant", roleType: "assistant", content: respuestaTexto },
    ],
  });

  return respuestaTexto;
}

// ─── Servidor Express ─────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sirve los archivos estáticos de /public
app.use(express.static(path.join(__dirname, "public")));

// Endpoint principal del chat
app.post("/chat", async (req: Request, res: Response) => {
  const { mensaje, threadId } = req.body as {
    mensaje: string;
    threadId: string;
  };

  if (!mensaje || !threadId) {
    res.status(400).json({ error: "Los campos 'mensaje' y 'threadId' son obligatorios." });
    return;
  }

  try {
    const respuesta = await chatWithAgent(mensaje, threadId);
    res.json({ respuesta });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno del servidor.";
    console.error("Error en /chat:", err);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`💬 Abre el navegador y comienza a chatear con el agente Zep + Gemini\n`);
});

