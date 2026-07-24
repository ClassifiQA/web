import { Account, Client, TablesDB } from "appwrite"
import { useMemo } from "react"

// variables
const endpoint = import.meta.env.PUBLIC_APPWRITE_ENDPOINT
const project = import.meta.env.PUBLIC_APPWRITE_PROJECT

/**
 * hook for appwrite client operations
 */
export const useAppwrite = () => {
  // client
  const client = useMemo(() => {
    return new Client().setEndpoint(endpoint).setProject(project)
  }, [])

  // tablesdb service
  const tablesDb = useMemo(() => {
    return new TablesDB(client)
  }, [client])

  // auth service
  const auth = useMemo(() => {
    return new Account(client)
  }, [client])

  // return services
  return { tablesDb, auth }
}
