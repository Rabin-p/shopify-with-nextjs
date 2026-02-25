import { NextResponse } from "next/server";
import {
  addSiteCustomerTag,
  createCustomer,
  createCustomerAccessToken,
  CUSTOMER_ORIGIN_COOKIE,
  CUSTOMER_TOKEN_COOKIE,
} from "@/lib/customerAuth";

type RegisterRequest = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterRequest;
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const firstName = body.firstName?.trim() || undefined;
    const lastName = body.lastName?.trim() || undefined;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const { customer, customerUserErrors } = await createCustomer({
      email,
      password,
      firstName,
      lastName,
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: customerUserErrors[0]?.message ?? "Unable to create customer.",
        },
        { status: 400 }
      );
    }

    await addSiteCustomerTag(customer.id);

    const { customerAccessToken, customerUserErrors: tokenErrors } =
      await createCustomerAccessToken({ email, password });

    if (!customerAccessToken) {
      return NextResponse.json(
        {
          success: false,
          message: tokenErrors[0]?.message ?? "Account created but sign-in failed.",
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(CUSTOMER_TOKEN_COOKIE, customerAccessToken.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(customerAccessToken.expiresAt),
    });
    response.cookies.set(CUSTOMER_ORIGIN_COOKIE, customer.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(customerAccessToken.expiresAt),
    });

    return response;
  } catch (error) {
    console.error("Customer registration failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to register customer." },
      { status: 500 }
    );
  }
}
