import { loadGovernmentMembers } from "./government.js"
import { loadDeputies } from "./parliament.js"

const [government, deputies] = await Promise.all([
  loadGovernmentMembers(),
  loadDeputies(),
])

console.log(
  JSON.stringify(
    {
      government: {
        count: government.length,
        sample: government.slice(0, 2),
      },
      deputies: {
        count: deputies.length,
        sample: deputies.slice(0, 2),
      },
    },
    null,
    2,
  ),
)
