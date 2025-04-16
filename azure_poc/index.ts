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

interface SearchResult {
  document: {
    content: string;
    title: string;
    page_number: number;
  };
  highlights?: {
    content: string[];
  };
}

// Add function to search documents
async function searchDocuments(query: string) {
  const searchResults = await searchClient.search(query, {
    select: ["content", "title", "page_number"],
    top: 3,
    highlightFields: "content",
    filter: "section eq 'benefits_guide'",
  });

  let context = "";
  for await (const result of searchResults.results) {
    const doc = result.document as SearchResult["document"];
    const highlights = result.highlights as SearchResult["highlights"];

    // Extract only the most relevant passage from each result
    let content: string;
    if (highlights?.content && highlights.content.length > 0) {
      // If highlights are available, use those instead of full content
      const highlightedContent = highlights.content.join("... ");
      content = highlightedContent;
    } else {
      // Otherwise, take a snippet around keyword matches
      const snippetLength = 500;
      const keywordIndex = doc.content
        .toLowerCase()
        .indexOf(query.toLowerCase());
      if (keywordIndex !== -1) {
        const start = Math.max(0, keywordIndex - snippetLength / 2);
        const end = Math.min(
          doc.content.length,
          keywordIndex + snippetLength / 2
        );
        content = doc.content.slice(start, end) + "...";
      } else {
        // If no direct match, take first portion
        content = doc.content.slice(0, snippetLength) + "...";
      }
    }

    context += `[Page ${doc.page_number}] ${doc.title}:\n${content}\n\n`;
  }

  return context;
}

// Update createMessages to include relevant context
async function createMessages(
  userQuery: string
): Promise<ChatCompletionCreateParamsNonStreaming> {
  const context = await searchDocuments(userQuery);

  // Keep minimal conversation history
  const recentMessages = messages.slice(-3);

  return {
    messages: [
      messages[0],
      ...recentMessages,
      {
        role: "system",
        content: `You are helping with questions about the benefits guide. Use the following relevant excerpts to answer the question. Include page numbers in your response when referencing specific information:\n\n${context}`,
      },
      {
        role: "user",
        content: userQuery,
      },
    ],
    model: process.env.AZURE_OPENAI_MODEL || "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 1000,
  };
}

async function printChoices(completion: ChatCompletion): Promise<void> {
  for (const choice of completion.choices) {
    messages.push(choice.message);
    console.log(
      "\nAssistant:",
      "\x1b[33m" + choice.message.content + "\x1b[0m",
      "\n"
    );
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
