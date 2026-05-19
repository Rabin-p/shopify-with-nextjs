import { NextResponse } from 'next/server';
import { adminShopifyFetch } from '@/lib/shopify';

export type Review = {
  id: string;
  productId: string;
  handle: string;
  author: string;
  rating: number;
  content: string;
  createdAt: string;
};

const GET_REVIEWS_QUERY = `
  query GetReviews($type: String!) {
    metaobjects(type: $type, first: 250) {
      edges {
        node {
          id
          updatedAt
          fields {
            key
            value
          }
        }
      }
    }
  }
`;

const CREATE_REVIEW_MUTATION = `
  mutation CreateReviewMetaobject($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
        updatedAt
        fields {
          key
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// GET: Fetch reviews from Shopify Metaobjects
export async function GET(
  req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    
    // Fetch all 'review' metaobjects using Admin API
    const data = await adminShopifyFetch<any>({
      query: GET_REVIEWS_QUERY,
      variables: { type: 'review' },
    });

    const edges = data?.metaobjects?.edges || [];
    
    // Transform and filter by product handle
    const allReviews: Review[] = edges.map((edge: any) => {
      const node = edge.node;
      const fields = node.fields.reduce((acc: any, field: any) => {
        acc[field.key] = field.value;
        return acc;
      }, {});

      return {
        id: node.id,
        productId: fields.product_id || '',
        handle: fields.product_handle || '',
        author: fields.author || 'Anonymous',
        rating: fields.rating ? Number(fields.rating) : 5,
        content: fields.content || '',
        createdAt: fields.created_at || node.updatedAt,
      };
    });

    const productReviews = allReviews
      .filter((r) => r.handle === handle)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, reviews: productReviews });
  } catch (error) {
    console.error('Failed to get reviews from Shopify:', error);
    // If Admin API fails (e.g. scopes missing), return empty array so frontend doesn't crash
    return NextResponse.json({ success: false, reviews: [] }, { status: 500 });
  }
}

// POST: Create a new review in Shopify Metaobjects
export async function POST(
  req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const body = await req.json();
    const { author, rating, content, productId } = body;

    // Validate inputs
    if (!author || !rating || !content || !productId) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const createdAt = new Date().toISOString();

    const metaobjectInput = {
      type: "review",
      capabilities: {
        publishable: {
          status: "ACTIVE"
        }
      },
      fields: [
        { key: "product_id", value: productId },
        { key: "product_handle", value: handle },
        { key: "author", value: author },
        { key: "rating", value: rating.toString() },
        { key: "content", value: content },
        { key: "created_at", value: createdAt }
      ]
    };

    const data = await adminShopifyFetch<any>({
      query: CREATE_REVIEW_MUTATION,
      variables: { metaobject: metaobjectInput },
    });

    if (data?.metaobjectCreate?.userErrors?.length > 0) {
      console.error("Metaobject creation errors:", data.metaobjectCreate.userErrors);
      throw new Error(data.metaobjectCreate.userErrors[0].message);
    }

    const newReview: Review = {
      id: data?.metaobjectCreate?.metaobject?.id || Math.random().toString(),
      productId,
      handle,
      author,
      rating: Number(rating),
      content,
      createdAt,
    };

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    console.error('Failed to post review to Shopify:', error);
    return NextResponse.json({ success: false, message: 'Failed to create review. Check API scopes.' }, { status: 500 });
  }
}
