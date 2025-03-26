# Azure OpenAI with AI Search and Blob Storage

This Terraform configuration sets up an Azure environment with OpenAI Service, AI Search, and Blob Storage integration.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) installed (version >= 1.0.0)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed and configured
- Azure subscription with access to Azure OpenAI Service

## Resources Created

- Azure Resource Group
- Azure Storage Account with Blob Container
- Azure OpenAI Service with GPT-3.5 Turbo deployment
- Azure AI Search Service
- Necessary RBAC role assignments for service integration

## Usage

1. Login to Azure:

   ```bash
   az login
   ```

2. Create a `terraform.tfvars` file with your values:

   ```hcl
   resource_group_name  = "your-rg-name"
   storage_account_name = "yourstorageaccount"
   openai_account_name  = "your-openai-service"
   search_service_name  = "your-search-service"
   ```

3. Initialize Terraform:

   ```bash
   terraform init
   ```

4. Review the plan:

   ```bash
   terraform plan
   ```

5. Apply the configuration:
   ```bash
   terraform apply
   ```

## Important Notes

- The storage account name must be globally unique and between 3-24 characters
- The OpenAI service is currently available in limited regions
- Make sure your subscription has the necessary quota for Azure OpenAI Service
- All sensitive outputs (keys) are marked as sensitive and won't be displayed in logs

## Clean Up

To remove all created resources:

```bash
terraform destroy
```
