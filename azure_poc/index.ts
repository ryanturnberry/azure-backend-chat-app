// import {
//   DefaultAzureCredential,
//   getBearerTokenProvider,
// } from "@azure/identity";
// import { AzureOpenAI } from "openai";
// import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
// import * as dotenv from "dotenv";

// // Load environment variables
// dotenv.config();

// async function initializeClients() {
//   // Initialize Azure OpenAI client with Microsoft Entra ID authentication
//   const credential = new DefaultAzureCredential();
//   const scope = "https://cognitiveservices.azure.com/.default";
//   const azureADTokenProvider = getBearerTokenProvider(credential, scope);

//   const openAIClient = new AzureOpenAI({
//     azureADTokenProvider,
//     endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
//     deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
//     apiVersion: "2024-02-15-preview",
//   });

//   // Initialize Azure Cognitive Search client
//   const searchClient = new SearchClient(
//     process.env.AZURE_SEARCH_ENDPOINT!,
//     process.env.AZURE_SEARCH_INDEX_NAME!,
//     new AzureKeyCredential(process.env.AZURE_SEARCH_KEY!)
//   );

//   return { openAIClient, searchClient };
// }

// async function main() {
//   const { openAIClient, searchClient } = await initializeClients();

//   try {
//     console.log("Testing Azure OpenAI...");
//     const result = await openAIClient.chat.completions.create({
//       model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
//       messages: [{ role: "user", content: "Hello! How are you?" }],
//     });
//     console.log("OpenAI Response:", result.choices[0].message?.content);

//     // Example 2: Using Azure Cognitive Search
//     console.log("\nTesting Azure Cognitive Search...");
//     const searchResults = await searchClient.search("*", {
//       select: ["*"],
//       top: 5,
//     });

//     for await (const result of searchResults.results) {
//       console.log("Search Result:", result.document);
//     }
//   } catch (error) {
//     console.log("Error:", error);
//   }
// }

// main();

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

dotenv.config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
const apiVersion = process.env.OPENAI_API_VERSION || "2024-08-01-preview";
const deploymentName =
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-3.5-turbo";

const credential = new DefaultAzureCredential();
const scope = "https://cognitiveservices.azure.com/.default";
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

// Initialize conversation history
const messages: ChatCompletionMessageParam[] = [
  { role: "system", content: "You are a helpful assistant." },
];

function getClient(): AzureOpenAI {
  return new AzureOpenAI({
    endpoint,
    azureADTokenProvider,
    apiVersion,
    deployment: deploymentName,
  });
}

function createMessages(): ChatCompletionCreateParamsNonStreaming {
  return {
    messages,
    model: "",
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
        const result = await client.chat.completions.create(createMessages());
        await printChoices(result);
        askQuestion();
      } catch (error) {
        console.error("Error:", error);
        askQuestion();
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
