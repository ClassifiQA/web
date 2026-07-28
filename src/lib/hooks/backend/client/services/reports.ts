import { CONTENT_REPORTS_FUNCTION_ID } from "@/lib/data/members"
import { useAppwrite } from "@/lib/hooks/backend/client/appwrite"
import { parseError } from "@/lib/utils"
import { useCallback } from "react"

export type ContentReportType = "comment" | "member" | "account" | "other"

export type SubmitContentReportInput = {
  contentType: ContentReportType
  contentUrl: string
  reason: string
  locationDetails?: string
  goodFaith: boolean
  website?: string
}

export type ContentReportReceipt = {
  reference: string
  status: "received"
  message: string
}

export const useClientReports = () => {
  const { functions } = useAppwrite()

  const submitContentReport = useCallback(
    async (input: SubmitContentReportInput) => {
      try {
        const execution = await functions.createExecution({
          functionId: CONTENT_REPORTS_FUNCTION_ID,
          body: JSON.stringify(input),
        })
        let response: Record<string, unknown> = {}
        try {
          response = JSON.parse(execution.responseBody) as Record<
            string,
            unknown
          >
        } catch {
          // The status check below handles malformed Function responses.
        }

        if (
          execution.responseStatusCode < 200 ||
          execution.responseStatusCode >= 300
        ) {
          throw new Error(
            typeof response.error === "string"
              ? response.error
              : "Não foi possível processar a denúncia."
          )
        }
        if (
          typeof response.reference !== "string" ||
          response.status !== "received"
        ) {
          throw new Error("A denúncia foi recebida sem uma referência válida.")
        }

        return response as ContentReportReceipt
      } catch (error) {
        return Error(parseError(error))
      }
    },
    [functions]
  )

  return { submitContentReport }
}
