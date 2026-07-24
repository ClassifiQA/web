import { Account, Avatars, Client, TablesDB } from "appwrite"

// variables
const endpoint = import.meta.env.PUBLIC_APPWRITE_ENDPOINT
const project = import.meta.env.PUBLIC_APPWRITE_PROJECT

// services
const client = new Client().setEndpoint(endpoint).setProject(project)
const tablesDb = new TablesDB(client)
const auth = new Account(client)
const avatars = new Avatars(client)

/**
 * hook for appwrite client operations
 */
export const useAppwrite = () => {
  // return services
  return { tablesDb, auth, avatars }
}
