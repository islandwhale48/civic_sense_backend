import mongoose from 'mongoose';
import dns from 'node:dns';
import dotenv from 'dotenv';
import IssueModel from '../models/Issues.js';

dotenv.config();

const DEFAULT_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

function srvNameFromUri(uri) {
  const hostname = uri.split('@')[1].split('/')[0];
  return `_mongodb._tcp.${hostname}`;
}

async function configureDnsForSrvUri(uri) {
  if (!uri.includes('mongodb+srv://')) {
    return;
  }
  const srvName = srvNameFromUri(uri);
  try {
    await dns.promises.resolveSrv(srvName);
    return;
  } catch (err) {
    console.warn(`⚠️  SRV lookup failed (${err.code}); retrying with public DNS resolvers...`);
  }
  const servers = (process.env.DNS_SERVERS || DEFAULT_DNS_SERVERS.join(','))
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  dns.setServers(servers);
  await dns.promises.resolveSrv(srvName);
}

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  console.log("MONGODB_URI loaded:", !!process.env.MONGODB_URI);
  if (!uri) {
    console.error('❌ MONGODB_URI not set in .env');
    throw new Error('MONGODB_URI not set');
  }
  try {
    await configureDnsForSrvUri(uri);
    await mongoose.connect(uri);
    console.log('🚀 MongoDB connected');
    await IssueModel.seedIfEmpty();
    return mongoose.connection;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}
