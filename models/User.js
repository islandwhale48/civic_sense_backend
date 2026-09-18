import mongoose from 'mongoose';
import { getUsersStore, setUsersStore, seedUsers } from './dataStore.js';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' },
  badge: { type: String, default: 'Active Citizen' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

export class UserModel {
  /** Find user by email */
  static async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const doc = await User.findOne({ email: cleanEmail }).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('MongoDB User search error, falling back to in-memory store');
    }
    const store = getUsersStore();
    return store.find(u => u.email?.toLowerCase() === cleanEmail);
  }

  /** Find user by ID */
  static async findById(id) {
    try {
      const doc = await User.findById(id).lean();
      if (doc) return doc;
    } catch (err) {
      console.warn('MongoDB User findById error, falling back to in-memory store');
    }
    const store = getUsersStore();
    return store.find(u => u._id === id || u.id === id);
  }

  /** Create a new citizen user */
  static async create(userData) {
    const store = getUsersStore();
    const newUser = {
      id: `usr-${Date.now()}`,
      ...userData,
      email: userData.email.toLowerCase(),
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      badge: userData.badge || 'Active Citizen',
      createdAt: new Date().toISOString()
    };

    store.unshift(newUser);
    setUsersStore(store);

    try {
      const newDoc = new User(userData);
      await newDoc.save();
      return newDoc.toObject();
    } catch (err) {
      console.warn('MongoDB write error for User, saved in-memory only:', err.message);
      return newUser;
    }
  }

  /** Seed initial demo users */
  static async seedIfEmpty() {
    try {
      const count = await User.countDocuments();
      if (count > 0) return;
      await User.insertMany(seedUsers);
      console.log('🌱 Seeded MongoDB with default Citizen User accounts.');
    } catch (err) {
      console.warn('MongoDB User seed skipped:', err.message);
    }
  }
}

export default UserModel;
