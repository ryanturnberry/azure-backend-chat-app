# Azure Simple Chat Application POC

This is a proof of concept application demonstrating Azure AI integration for chat functionality.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Azure OpenAI Service account
- Azure Cognitive Search account
- Azure Storage account

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=<your-azure-openai-endpoint>
AZURE_OPENAI_KEY=<your-azure-openai-key>
AZURE_OPENAI_DEPLOYMENT_NAME=<your-deployment-name>
OPENAI_API_VERSION=<api-version>

# Azure Cognitive Search Configuration
AZURE_SEARCH_ENDPOINT=<your-search-endpoint>
AZURE_SEARCH_KEY=<your-search-key>
AZURE_SEARCH_INDEX_NAME=<your-index-name>
AZURE_SEARCH_SERVICE_NAME=<your-search-service-name>
AZURE_SEARCH_SERVICE_KEY=<your-search-service-key>

# Azure Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=<your-storage-account-name>
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-account-key>
AZURE_STORAGE_CONTAINER_NAME=<your-container-name>
```

## Project Structure

- `index.ts` - Main application entry point
- `cli.ts` - Command-line interface implementation
- `clear-index.ts` - Utility for clearing index data
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables configuration

## Installation

```bash
npm install
```

## Usage

To run the application:

```bash
npm start
```

To clear the index:

```bash
npm run clear-index
```

## Scripts

- `start` - Runs the main application
- `clear` - Clears the index data
