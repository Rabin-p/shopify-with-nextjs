import { shopifyCheckoutFetch } from '@/lib/shopify';
export {
  CUSTOMER_ORIGIN_COOKIE,
  CUSTOMER_TOKEN_COOKIE,
} from '@/lib/constants/cookies';

export type ShopifyCustomer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
};

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
