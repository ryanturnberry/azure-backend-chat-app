import { AzureOpenAI } from "openai";
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/index";
import * as readline from "readline";
import * as dotenv from "dotenv";
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";

dotenv.config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
const apiVersion = process.env.OPENAI_API_VERSION || "2024-06-01";
const deploymentName =
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-3.5-turbo";

const credential = new DefaultAzureCredential();
const scope = "https://cognitiveservices.azure.com/.default";
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

// Add Search configuration
const searchServiceName = process.env.AZURE_SEARCH_SERVICE_NAME!;
const searchServiceKey = process.env.AZURE_SEARCH_KEY!;
const searchIndexName = "turnberry-documents";

// Initialize Search client
const searchClient = new SearchClient(
  `https://${searchServiceName}.search.windows.net`,
  searchIndexName,
  new AzureKeyCredential(searchServiceKey)
);

// Initialize conversation history
const messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "You are a helpful assistant with access to company documents. When answering questions, use the context provided and acknowledge the source of information. If the information isn't in the provided context, say so.",
  },
];

function getClient(): AzureOpenAI {
  return new AzureOpenAI({
    endpoint,
    apiKey: process.env.AZURE_OPENAI_KEY!,
    apiVersion,
    deployment: deploymentName,
  });
}

// Add function to search documents
async function searchDocuments(query: string) {
  const searchResults = await searchClient.search(query, {
    select: ["content", "title"],
    top: 3,
  });

  let context = "";
  for await (const result of searchResults.results) {
    // @ts-ignore
    context += `${result.document.title}:\n${result.document.content}\n\n`;
  }
  return context;
}

// Update createMessages to include relevant context
async function createMessages(
  userQuery: string
): Promise<ChatCompletionCreateParamsNonStreaming> {
  const context = await searchDocuments(userQuery);

  // Keep only the last few messages (e.g., last 5 exchanges)
  const recentMessages = messages.slice(-10); // Adjust number as needed

  return {
    messages: [
      // Always include the initial system message
      messages[0],
      ...recentMessages,
      {
        role: "system",
        content: `Use the following context to answer the user's question:\n\n${context}`,
      },
    ],
    model: process.env.AZURE_OPENAI_MODEL || "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 1500,
  };
}

async function printChoices(completion: ChatCompletion): Promise<void> {
  for (const choice of completion.choices) {
    messages.push(choice.message);
    console.log("\nAssistant:", choice.message.content);
  }
}

async function chatLoop() {
  const client = getClient();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nChat started! Type 'exit' to end the conversation.\n");

  const askQuestion = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      messages.push({ role: "user", content: input });

      try {
        const messageParams = await createMessages(input);

        const result = await client.chat.completions.create(messageParams);
        await printChoices(result);
        askQuestion();
      } catch (error) {
        console.error("Error:", error);
        rl.close();
      }
    });
  };

  askQuestion();
}

export async function main() {
  try {
    await chatLoop();
  } catch (err) {
    console.error("An error occurred:", err);
  }
}

main().catch((err) => {
  console.error("UH OH!! An Error Occurred:", err);
});
