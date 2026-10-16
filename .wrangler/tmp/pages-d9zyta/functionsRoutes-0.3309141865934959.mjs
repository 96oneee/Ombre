import { onRequestGet as __media__id__js_onRequestGet } from "/home/claude/ombre/functions/media/[id].js"
import { onRequest as __api___path___js_onRequest } from "/home/claude/ombre/functions/api/[[path]].js"

export const routes = [
    {
      routePath: "/media/:id",
      mountPath: "/media",
      method: "GET",
      middlewares: [],
      modules: [__media__id__js_onRequestGet],
    },
  {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]