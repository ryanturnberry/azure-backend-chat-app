from openai import AzureOpenAI
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from config import (
    AZURE_OPENAI_ENDPOINT, 
    AZURE_OPENAI_KEY, 
    AZURE_OPENAI_DEPLOYMENT, 
    AZURE_SEARCH_INDEX_NAME, 
    AZURE_SEARCH_SERVICE_KEY, 
    AZURE_SEARCH_SERVICE
)

def search_index(query, top_k=5):
    """Retrieves relevant documents from Azure AI Search."""
    search_client = SearchClient(
        endpoint=f"https://{AZURE_SEARCH_SERVICE}.search.windows.net",
        index_name=AZURE_SEARCH_INDEX_NAME,
        credential=AzureKeyCredential(AZURE_SEARCH_SERVICE_KEY)
    )

    results = search_client.search(query, top=top_k)

    retrieved_chunks = [doc['content'] for doc in results]
    return "\n".join(retrieved_chunks)

def get_rag_response(query, context):
    """Generates a RAG-based response with Azure OpenAI."""
    prompt = f"""
    Context: {context}
    Question: {query}
    Answer:
    """

    # Create the Azure OpenAI client
    client = AzureOpenAI(
        api_key=AZURE_OPENAI_KEY,  
        api_version="2024-10-21",
        azure_endpoint = AZURE_OPENAI_ENDPOINT
    )

    response = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message['content']