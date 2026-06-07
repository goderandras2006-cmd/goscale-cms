import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Kérjük add meg a MONGODB_URI env változót a .env.local fájlban');
}

interface GlobalWithMongoose {
  mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}

declare const global: GlobalWithMongoose;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
    };

    // Windows dev: gyakori "unable to verify the first certificate" — nem IP whitelist hiba
    if (process.env.MONGODB_TLS_INSECURE === 'true' || process.env.NODE_ENV === 'development') {
      opts.tlsAllowInvalidCertificates = true;
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
