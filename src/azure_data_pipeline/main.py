import argparse
from indexing import index_pdf, create_index
from blob_upload import upload_pdf
from query_search import search_index, get_rag_response

def run_data_pipeline(file_path, blob_name):
  
    # Upload PDF to Blob Storage
    upload_pdf(file_path, blob_name)

    # Create an index for the current file
    create_index()

    # Index PDF into Azure AI Search
    index_pdf(file_path)

    # User query
    user_query = input("Enter your question: ")

    # Retrieve relevant chunks
    context = search_index(user_query)

    # Generate RAG-based response
    response = get_rag_response(user_query, context)
    print(response)

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Upload files to Azure Blob Storage.")
    
    parser.add_argument("--file_path", required=True, help="Path to the local file")
    parser.add_argument("--blob_name", required=True, help="Bob name in Azure Blob Storage")

    args = parser.parse_args()
    run_data_pipeline(file_path=args.file_path, blob_name=args.blob_name)