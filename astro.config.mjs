// @ts-check

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import node from "@astrojs/node"

const appwriteDevOrigin = "https://classifiqa.localhost"
const appwriteUpstreamOrigin = "https://backend.classifiqa.pt"

/** @type {import("vite").Plugin} */
const appwriteDevProxy = {
  name: "appwrite-dev-proxy",
  apply: "serve",
  config() {
    return {
      define: {
        "import.meta.env.PUBLIC_APPWRITE_ENDPOINT": JSON.stringify(
          `${appwriteDevOrigin}/v1`
        ),
      },
      server: {
        proxy: {
          "/v1": {
            target: appwriteUpstreamOrigin,
            changeOrigin: true,
            cookieDomainRewrite: "classifiqa.localhost",
          },
        },
      },
    }
  },
}

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    plugins: [tailwindcss(), appwriteDevProxy],
  },
  integrations: [react()],
})
