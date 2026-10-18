# tiabwft memory sync on Azure

Optional. Syncs tiabwft's memory across your computers and cloud sessions. One Azure Function plus one Storage account; for one person this costs cents a month.

## Deploy (Azure CLI + Azure Functions Core Tools)

Make a strong key first. The endpoint has no rate limit, so use a long random one:

```bash
openssl rand -hex 32
```

PowerShell: `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`

Keep it somewhere safe (it will also sit in your shell history).

```bash
az login
az group create --name tiabwft-rg --location westeurope
az storage account create --name tiabwftmem<unique> --resource-group tiabwft-rg --sku Standard_LRS
az functionapp create --name tiabwft-memory-<unique> --resource-group tiabwft-rg --storage-account tiabwftmem<unique> --consumption-plan-location westeurope --runtime node --runtime-version 22 --functions-version 4 --https-only true
```

Store the storage connection string in a variable, then set the app settings:

```bash
CONN=$(az storage account show-connection-string --name tiabwftmem<unique> --resource-group tiabwft-rg --query connectionString -o tsv)
az functionapp config appsettings set --name tiabwft-memory-<unique> --resource-group tiabwft-rg --settings TIABWFT_KEY=<your key> TIABWFT_STORAGE="$CONN"
```

Publish (this leaves you in the `azure/` folder):

```bash
cd azure && npm install && func azure functionapp publish tiabwft-memory-<unique>
```

If the function app already exists, enable HTTPS-only with `az functionapp update --name tiabwft-memory-<unique> --resource-group tiabwft-rg --set httpsOnly=true`.

## Connect tiabwft

In the plugin settings, set:

- **Azure sync URL**: `https://tiabwft-memory-<unique>.azurewebsites.net/api/memory`
- **Azure sync key**: the same long random string as `TIABWFT_KEY`

The URL must start with `https://`; tiabwft ignores any other URL and doesn't sync.

Partitions: `personal` for your profile; for a project with a git remote (`origin`, else the first one), `project:<owner>/<repo>` on GitHub and `project:<host>/<path>` on any other host (for example `project:gitlab.com/group/api`), lowercased, without any user name, password or port; and otherwise `project:<folder name>-<8 hex characters of a hash of the full path>`, so two folders with the same name never share memory. Each project holds at most the newest 450 facts.

## Check it

```bash
curl -H "x-tiabwft-key: <key>" "https://tiabwft-memory-<unique>.azurewebsites.net/api/memory?partition=personal"
```

It should print `{"facts":[...],"tombstones":{}}`. Without the header it gives `401`.
