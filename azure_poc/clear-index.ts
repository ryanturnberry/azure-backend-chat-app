import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import * as dotenv from "dotenv";

dotenv.config();

// Azure Search configuration
const searchServiceName = process.env.AZURE_SEARCH_SERVICE_NAME!;
const searchServiceKey = process.env.AZURE_SEARCH_KEY!;
const searchIndexName = "turnberry-documents";

// Initialize Search client
const searchClient = new SearchClient(
  `https://${searchServiceName}.search.windows.net`,
  searchIndexName,
  new AzureKeyCredential(searchServiceKey)
);

interface SearchDocument {
  id: string;
}

async function clearIndex() {
  try {
    console.log("Starting to clear the search index...");

    // Get all documents in the index
    const searchResults = await searchClient.search("*", {
      select: ["id"],
      top: 1000, // Adjust if you have more than 1000 documents
    });

    // Collect all document IDs
    const documentIds: string[] = [];
    for await (const result of searchResults.results) {
      const doc = result.document as SearchDocument;
      documentIds.push(doc.id);
    }

    if (documentIds.length === 0) {
      console.log("No documents found in the index.");
      return;
    }

    console.log(`Found ${documentIds.length} documents to delete.`);

    // Delete documents in batches of 1000 (Azure Search limit)
    const batchSize = 1000;
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      await searchClient.deleteDocuments(batch.map((id) => ({ id })));
      console.log(
        `Deleted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
          documentIds.length / batchSize
        )}`
      );
    }

    console.log("Successfully cleared the search index!");
  } catch (error) {
    console.error("Error clearing the index:", error);
    process.exit(1);
  }
}

// Run the clear function
clearIndex().catch((err) => {
  console.error("An error occurred:", err);
  process.exit(1);
});
