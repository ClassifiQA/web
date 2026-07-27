import {
  Account,
  Avatars,
  Client,
  Functions,
  Realtime,
  TablesDB,
} from "appwrite"

// variables
const endpoint = import.meta.env.PUBLIC_APPWRITE_ENDPOINT
const project = import.meta.env.PUBLIC_APPWRITE_PROJECT
const realtimeEndpoint =
  import.meta.env.PUBLIC_APPWRITE_REALTIME_ENDPOINT ??
  "wss://appwrite.danfq.dev/v1"

// services
const client = new Client()
  .setEndpoint(endpoint)
  .setEndpointRealtime(realtimeEndpoint)
  .setProject(project)
const tablesDb = new TablesDB(client)
const auth = new Account(client)
const avatars = new Avatars(client)
const functions = new Functions(client)
const realtime = new Realtime(client)

/**
 * hook for appwrite client operations
 */
export const useAppwrite = () => {
  // return services
  return { tablesDb, auth, avatars, functions, realtime }
}
