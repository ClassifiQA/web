import {
  CLASSIFIQA_DATABASE_ID,
  GRADE_OWNERSHIP_FUNCTION_ID,
  GRADES_TABLE_ID,
  type MemberGrade,
} from "@/lib/data/members"
import { useAppwrite } from "@/lib/hooks/backend/client/appwrite"
import { parseError } from "@/lib/utils"
import { Channel, type Models } from "appwrite"
import { useCallback } from "react"

type CurrentUserGradeResponse = {
  hasGrade: boolean
  grade: CurrentUserGrade | null
}

export type CurrentUserGrade = Pick<
  MemberGrade,
  "$createdAt" | "comment" | "grade"
>

type SubmitGradeInput = {
  memberId: string
  grade: number
  comment?: string
  website?: string
}

type RealtimeGrade = Models.Row &
  MemberGrade & {
    member?: string | { $id: string } | null
  }

type GradeChange = {
  action: "create" | "update" | "delete"
  grade: MemberGrade
}

const memberIdFromGrade = (grade: RealtimeGrade) =>
  typeof grade.member === "string" ? grade.member : grade.member?.$id

const gradeChangeAction = (events: string[]): GradeChange["action"] | null => {
  if (events.some((event) => event.endsWith(".create"))) return "create"
  if (events.some((event) => event.endsWith(".update"))) return "update"
  if (events.some((event) => event.endsWith(".delete"))) return "delete"
  return null
}

export const useClientGrades = () => {
  const { functions, realtime } = useAppwrite()

  const executeGradeFunction = useCallback(
    async (body: object) => {
      const execution = await functions.createExecution({
        functionId: GRADE_OWNERSHIP_FUNCTION_ID,
        body: JSON.stringify(body),
      })

      let response: Record<string, unknown> = {}
      try {
        response = JSON.parse(execution.responseBody) as Record<string, unknown>
      } catch {
        // A malformed function response is handled by the status check below.
      }

      if (
        execution.responseStatusCode < 200 ||
        execution.responseStatusCode >= 300
      ) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : "Não foi possível processar a classificação."
        )
      }

      return response
    },
    [functions]
  )

  const getCurrentUserGrade = useCallback(
    async (memberId: string) => {
      try {
        const result = (await executeGradeFunction({
          action: "get",
          memberId,
        })) as CurrentUserGradeResponse
        return result.hasGrade === true ? result.grade : null
      } catch (error) {
        return Error(parseError(error))
      }
    },
    [executeGradeFunction]
  )

  const submitGrade = useCallback(
    async ({ memberId, grade, comment, website }: SubmitGradeInput) => {
      try {
        const result = (await executeGradeFunction({
          action: "create",
          memberId,
          grade,
          comment,
          website,
        })) as CurrentUserGradeResponse

        if (!result.hasGrade || !result.grade) {
          throw new Error("A classificação não foi guardada.")
        }

        return result.grade
      } catch (error) {
        return Error(parseError(error))
      }
    },
    [executeGradeFunction]
  )

  const subscribeToMemberGrades = useCallback(
    async (memberId: string, onChange: (change: GradeChange) => void) => {
      const subscription = await realtime.subscribe<RealtimeGrade>(
        Channel.tablesdb(CLASSIFIQA_DATABASE_ID).table(GRADES_TABLE_ID).row(),
        ({ events, payload }) => {
          const action = gradeChangeAction(events)
          if (
            !action ||
            (action !== "delete" &&
              (memberIdFromGrade(payload) !== memberId ||
                typeof payload.grade !== "number"))
          ) {
            return
          }

          onChange({
            action,
            grade: {
              $id: payload.$id,
              $createdAt: payload.$createdAt,
              grade: typeof payload.grade === "number" ? payload.grade : 0,
              comment:
                typeof payload.comment === "string" ? payload.comment : null,
            },
          })
        }
      )

      return () => subscription.close()
    },
    [realtime]
  )

  return { getCurrentUserGrade, submitGrade, subscribeToMemberGrades }
}
