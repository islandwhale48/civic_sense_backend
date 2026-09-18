import mongoose from 'mongoose';
import { getAuthoritiesStore, setAuthoritiesStore, seedAuthorities } from './dataStore.js';

const AuthoritySchema = new mongoose.Schema({
  ward_id: { type: String, required: true, unique: true },
  ward_name: { type: String, required: true },
  local_body: { type: String, required: true },
  password: { type: String, required: true },
  department: { type: String, default: 'Civic Administration Department' },
  createdAt: { type: Date, default: Date.now }
});

const Authority = mongoose.model('Authority', AuthoritySchema);

export class AuthorityModel {
  /** Find authority by ward_id */
  static async findByWardId(wardId) {
    try {
      const doc = await Authority.findOne({ ward_id: wardId }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('MongoDB Authority search error, falling back to in-memory store');
    }
    const store = getAuthoritiesStore();
    return store.find(a => a.ward_id?.toLowerCase() === wardId?.toLowerCase());
  }

  /** Find authority by ward name */
  static async findByWardName(wardName) {
    if (!wardName) return null;
    const cleanName = wardName.trim().toLowerCase();
    try {
      const doc = await Authority.findOne({
        $or: [
          { ward_name: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
          { ward_name: { $regex: new RegExp(cleanName, 'i') } }
        ]
      }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('MongoDB Authority search error, falling back to in-memory store');
    }
    const store = getAuthoritiesStore();
    return store.find(a =>
      a.ward_name?.toLowerCase() === cleanName ||
      a.ward_name?.toLowerCase().includes(cleanName) ||
      cleanName.includes(a.ward_name?.toLowerCase())
    );
  }

  /** Retrieve all registered ward authority accounts */
  static async findAll() {
    try {
      const docs = await Authority.find().sort({ createdAt: -1 }).lean();
      if (docs && docs.length > 0) return docs;
    } catch (err) {
      console.warn('MongoDB Authority read error, falling back to in-memory store');
    }
    return getAuthoritiesStore();
  }

  /** Create a new ward authority account */
  static async create(authorityData) {
    const store = getAuthoritiesStore();
    // Check if duplicate in store
    const existing = store.find(a => a.ward_id === authorityData.ward_id);
    if (!existing) {
      store.unshift(authorityData);
      setAuthoritiesStore(store);
    }

    try {
      const newDoc = new Authority(authorityData);
      await newDoc.save();
      return newDoc.toObject();
    } catch (err) {
      console.warn('MongoDB write error for Authority, saved in-memory only:', err.message);
      return authorityData;
    }
  }

  /** Seed initial demo ward authorities */
  static async seedIfEmpty() {
    try {
      const count = await Authority.countDocuments();
      if (count > 0) return;
      await Authority.insertMany(seedAuthorities);
      console.log('🌱 Seeded MongoDB with default Ward Authority accounts.');
    } catch (err) {
      console.warn('MongoDB Authority seed skipped:', err.message);
    }
  }
}

export default AuthorityModel;
