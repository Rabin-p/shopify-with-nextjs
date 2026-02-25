import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  canUseAdminCustomerTagVerification,
  CUSTOMER_ORIGIN_COOKIE,
  CUSTOMER_TOKEN_COOKIE,
  getCustomerByAccessToken,
  isSiteCustomer,
} from "@/lib/customerAuth";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_TOKEN_COOKIE)?.value;

  if (!token) {
    redirect("/login");
  }

  const customer = await getCustomerByAccessToken(token).catch(() => null);

  if (!customer) {
    redirect("/login");
  }

  if (canUseAdminCustomerTagVerification()) {
    const originCustomerId = cookieStore.get(CUSTOMER_ORIGIN_COOKIE)?.value;
    if (!originCustomerId || originCustomerId !== customer.id) {
      redirect("/login");
    }

    const verifiedSiteCustomer = await isSiteCustomer(customer.id).catch(() => false);
    if (!verifiedSiteCustomer) {
      redirect("/login");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as {customer.email}
          </p>
        </div>
        <LogoutButton />
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-medium">Profile</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">First name</dt>
            <dd>{customer.firstName || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last name</dt>
            <dd>{customer.lastName || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{customer.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{customer.phone || "-"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
