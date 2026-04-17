import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), '.data', 'reviews.db');

export type Review = {
  id: string;
  productId: string;
  handle: string;
  author: string;
  rating: number;
  content: string;
  createdAt: string;
};

// Singleton connection to local SQLite database
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
    // Initialize schema
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        handle TEXT NOT NULL,
        author TEXT NOT NULL,
        rating INTEGER NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  }
  return dbInstance;
}

// GET: Fetch reviews from SQLite database
export async function GET(
  req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const db = getDb();
    
    const stmt = db.prepare('SELECT * FROM reviews WHERE handle = ? ORDER BY createdAt DESC');
    const productReviews = stmt.all(handle);

    return NextResponse.json({ success: true, reviews: productReviews });
  } catch (error) {
    console.error('Failed to get reviews:', error);
    return NextResponse.json({ success: false, reviews: [] }, { status: 500 });
  }
}

// POST: Safely create a new review in the SQLite database
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

    const db = getDb();

    // Create record
    const newReview: Review = {
      id: Math.random().toString(36).substring(2, 16),
      productId,
      handle,
      author,
      rating: Number(rating),
      content,
      createdAt: new Date().toISOString(),
    };

    // Use prepared statements with named parameters to prevent SQL injection vulnerabilities
    const stmt = db.prepare(`
      INSERT INTO reviews (id, productId, handle, author, rating, content, createdAt)
      VALUES (@id, @productId, @handle, @author, @rating, @content, @createdAt)
    `);
    
    stmt.run(newReview);

    /** 
     * NOTE FOR PRODUCTION / SHOPIFY SYNC:
     * Natively update the live Shopify Metafield using the Storefront Admin API.
     * Use `db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE productId = ?').get(productId)`
     * to safely compute the exact final average, then push the new scalar via Shopify Admin GraphQL.
     */

    return NextResponse.json({ success: true, review: newReview });
  } catch (error) {
    console.error('Failed to post review:', error);
    return NextResponse.json({ success: false, message: 'Failed to create review' }, { status: 500 });
  }
}
