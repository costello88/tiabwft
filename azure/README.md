# tiabwft memory sync on Azure

Optional. Syncs tiabwft's memory across your computers and cloud sessions. One Azure Function plus one Storage account; for one person this costs cents a month.

## Deploy (Azure CLI + Azure Functions Core Tools)

```bash
az login
az group create --name tiabwft-rg --location westeurope
az storage account create --name tiabwftmem<unique> --resource-group tiabwft-rg --sku Standard_LRS
az functionapp create --name tiabwft-memory-<unique> --resource-group tiabwft-rg --storage-account tiabwftmem<unique> --consumption-plan-location westeurope --runtime node --runtime-version 20 --functions-version 4
az functionapp config appsettings set --name tiabwft-memory-<unique> --resource-group tiabwft-rg --settings TIABWFT_KEY=<a long random string> TIABWFT_STORAGE="<connection string from: az storage account show-connection-string --name tiabwftmem<unique> --resource-group tiabwft-rg --query connectionString -o tsv>"
cd azure && npm install && func azure functionapp publish tiabwft-memory-<unique>
```

## Connect tiabwft

In the plugin settings, set:

- **Azure sync URL**: `https://tiabwft-memory-<unique>.azurewebsites.net/api/memory`
- **Azure sync key**: the same long random string as `TIABWFT_KEY`

## Check it

```bash
curl -H "x-tiabwft-key: <key>" "https://tiabwft-memory-<unique>.azurewebsites.net/api/memory?partition=personal"
```

It should print `{"facts":[...],"tombstones":{}}`. Without the header it gives `401`.
