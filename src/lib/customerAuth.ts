import { shopifyCheckoutFetch } from '@/lib/shopify';

export const CUSTOMER_TOKEN_COOKIE = 'shopify_customer_token';
export const CUSTOMER_ORIGIN_COOKIE = 'shopify_customer_origin';
const SITE_CUSTOMER_TAG = 'headless-site';

type CustomerUserError = {
  code: string | null;
  field: string[] | null;
  message: string;
};

type CustomerAccessTokenCreateResponse = {
  customerAccessTokenCreate: {
    customerAccessToken: {
      accessToken: string;
      expiresAt: string;
    } | null;
    customerUserErrors: CustomerUserError[];
  };
};

export type ShopifyCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};

type CustomerCreateResponse = {
  customerCreate: {
    customer: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
    customerUserErrors: CustomerUserError[];
  };
};

type CustomerByTokenResponse = {
  customer: ShopifyCustomer | null;
};

const CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

const CUSTOMER_BY_TOKEN_QUERY = `
  query CustomerByToken($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
    }
  }
`;

const CUSTOMER_CREATE_MUTATION = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        firstName
        lastName
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

const ADMIN_TAGS_ADD_MUTATION = `
  mutation addCustomerTag($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors {
        message
      }
    }
  }
`;

const ADMIN_CUSTOMER_TAGS_QUERY = `
  query customerTags($id: ID!) {
    customer(id: $id) {
      id
      tags
    }
  }
`;

type AdminGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type AdminTagsAddResponse = {
  tagsAdd: {
    userErrors: Array<{ message: string }>;
  };
};

type AdminCustomerTagsResponse = {
  customer: {
    id: string;
    tags: string[];
  } | null;
};

const adminStoreDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const adminApiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-04';

export async function createCustomerAccessToken(input: {
  email: string;
  password: string;
}) {
  const data = await shopifyCheckoutFetch<CustomerAccessTokenCreateResponse>({
    query: CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION,
    variables: { input },
  });

  return data.customerAccessTokenCreate;
}

export async function createCustomer(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const data = await shopifyCheckoutFetch<CustomerCreateResponse>({
    query: CUSTOMER_CREATE_MUTATION,
    variables: { input },
  });

  return data.customerCreate;
}

export async function getCustomerByAccessToken(accessToken: string) {
  const data = await shopifyCheckoutFetch<CustomerByTokenResponse>({
    query: CUSTOMER_BY_TOKEN_QUERY,
    variables: { customerAccessToken: accessToken },
  });

  return data.customer;
}

export function canUseAdminCustomerTagVerification() {
  return Boolean(adminStoreDomain && adminAccessToken);
}

async function adminGraphqlFetch<T>({
  query,
  variables,
}: {
  query: string;
  variables?: Record<string, unknown>;
}) {
  if (!adminStoreDomain || !adminAccessToken) {
    throw new Error('Missing admin API configuration.');
  }

  const response = await fetch(
    `https://${adminStoreDomain}/admin/api/${adminApiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    throw new Error('Admin API request failed.');
  }

  const json = (await response.json()) as AdminGraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || 'Admin API GraphQL error.');
  }

  if (!json.data) {
    throw new Error('Admin API returned no data.');
  }

  return json.data;
}

export async function addSiteCustomerTag(customerId: string) {
  if (!canUseAdminCustomerTagVerification()) return;

  const data = await adminGraphqlFetch<AdminTagsAddResponse>({
    query: ADMIN_TAGS_ADD_MUTATION,
    variables: { id: customerId, tags: [SITE_CUSTOMER_TAG] },
  });

  if (data.tagsAdd.userErrors.length) {
    throw new Error(
      data.tagsAdd.userErrors[0]?.message || 'Failed to tag customer.'
    );
  }
}

export async function isSiteCustomer(customerId: string) {
  if (!canUseAdminCustomerTagVerification()) return true;

  const data = await adminGraphqlFetch<AdminCustomerTagsResponse>({
    query: ADMIN_CUSTOMER_TAGS_QUERY,
    variables: { id: customerId },
  });

  return Boolean(data.customer?.tags.includes(SITE_CUSTOMER_TAG));
}
