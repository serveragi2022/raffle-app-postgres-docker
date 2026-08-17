import { NextResponse } from "next/server";
import { authenticate } from "@/lib/services/auth";
import { signSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await authenticate(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    const response = NextResponse.json({ role: user.role });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Login failed." }, { status: 500 });
  }
}
