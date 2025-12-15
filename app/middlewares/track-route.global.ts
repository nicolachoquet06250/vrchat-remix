export interface RouteMeta {
    previousRoute?: {
        name: string,
        path: string,
        fullPath: string,
        params: Record<string, string>,
        query: Record<string, string>
    }
}

export default defineNuxtRouteMiddleware((to, from) => {
    console.log('Route précédente :', from.fullPath)
    console.log('Route actuelle :', to.fullPath)
    to.meta.previousRoute = {
        name: from.name,
        path: from.path,
        fullPath: from.fullPath,
        params: from.params,
        query: from.query
    }
})
