import { Account, Client, TablesDB } from "node-appwrite"

// variables
const endpoint =
  import.meta.env.APPWRITE_SERVER_ENDPOINT ?? "https://backend.classifiqa.pt/v1"
const project = import.meta.env.PUBLIC_APPWRITE_PROJECT

/**
 * Creates Appwrite services for server-side operations.
 */
export const createServerAppwrite = () => {
  const client = new Client().setEndpoint(endpoint).setProject(project)

  return {
    tablesDb: new TablesDB(client),
    auth: new Account(client),
  }
}
