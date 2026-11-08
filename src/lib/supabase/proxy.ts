import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseKey, supabaseUrl } from './env'

const PUBLIC_PATHS = ['/login', '/cadastro']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function redirectTo(request: NextRequest, from: NextResponse, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const response = NextResponse.redirect(url)
  // Preserva os cookies de sessão renovados
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  return response
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser valida o token no servidor do Supabase (getSession não é confiável aqui)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublic(pathname)) {
    return redirectTo(request, supabaseResponse, '/login')
  }
  if (user && isPublic(pathname)) {
    return redirectTo(request, supabaseResponse, '/')
  }

  return supabaseResponse
}