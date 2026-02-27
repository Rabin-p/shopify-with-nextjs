const SITE_CUSTOMER_TAG = 'headless-site';
const CUSTOMER_CART_METAFIELD_NAMESPACE = 'headless';
const CUSTOMER_CART_METAFIELD_KEY = 'active_cart_id';

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

type AdminCustomerCartMetafieldResponse = {
  customer: {
    id: string;
    metafield: {
      value: string;
    } | null;
  } | null;
};

type AdminCustomerUpdateResponse = {
  customerUpdate: {
    customer: {
      id: string;
    } | null;
    userErrors: Array<{ message: string }>;
  };
};

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

const ADMIN_CUSTOMER_CART_METAFIELD_QUERY = `
  query customerCartMetafield($id: ID!, $namespace: String!, $key: String!) {
    customer(id: $id) {
      id
      metafield(namespace: $namespace, key: $key) {
        value
      }
    }
  }
`;

const ADMIN_CUSTOMER_CART_METAFIELD_SET_MUTATION = `
  mutation customerCartMetafieldSet($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
      }
      userErrors {
        message
      }
    }
  }
`;

const adminStoreDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const adminApiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-04';

export function canUseAdminCustomerTagVerification() {
  return Boolean(adminStoreDomain && adminAccessToken);
}

export function canUseAdminCustomerCartPersistence() {
  return canUseAdminCustomerTagVerification();
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

export async function getStoredCustomerCartId(customerId: string) {
  if (!canUseAdminCustomerCartPersistence()) return null;

  const data = await adminGraphqlFetch<AdminCustomerCartMetafieldResponse>({
    query: ADMIN_CUSTOMER_CART_METAFIELD_QUERY,
    variables: {
      id: customerId,
      namespace: CUSTOMER_CART_METAFIELD_NAMESPACE,
      key: CUSTOMER_CART_METAFIELD_KEY,
    },
  });

  const value = data.customer?.metafield?.value?.trim();
  return value || null;
}

export async function setStoredCustomerCartId(
  customerId: string,
  cartId: string
) {
  if (!canUseAdminCustomerCartPersistence()) return;

  const data = await adminGraphqlFetch<AdminCustomerUpdateResponse>({
    query: ADMIN_CUSTOMER_CART_METAFIELD_SET_MUTATION,
    variables: {
      input: {
        id: customerId,
        metafields: [
          {
            namespace: CUSTOMER_CART_METAFIELD_NAMESPACE,
            key: CUSTOMER_CART_METAFIELD_KEY,
            type: 'single_line_text_field',
            value: cartId,
          },
        ],
      },
    },
  });

  if (data.customerUpdate.userErrors.length > 0) {
    throw new Error(
      data.customerUpdate.userErrors[0]?.message ||
        'Failed to persist customer cart ID.'
    );
  }
}
