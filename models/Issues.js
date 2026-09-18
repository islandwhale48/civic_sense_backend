import mongoose from 'mongoose';
import { getIssuesStore, setIssuesStore, seedIssues } from './dataStore.js';

const GeoDataSchema = new mongoose.Schema({
  address: { type: String, default: '' },
  locality: { type: String, default: '' },
  ward: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  postcode: { type: String, default: '' },
  lat: { type: Number },
  lng: { type: Number },
  rawAddress: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const JurisdictionSchema = new mongoose.Schema({
  type: { type: String, default: 'Municipality / Corporation' },
  code: { type: String, default: 'URBAN_CORP' },
  ward: { type: String, default: '' },
  name: { type: String, default: '' },
}, { _id: false });

const ReporterSchema = new mongoose.Schema({
  name: { type: String, default: 'Prakash Kumar' },
  avatar: { type: String, default: '' },
  badge: { type: String, default: 'Active Citizen' },
}, { _id: false });

const ReportSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  reporterName: { type: String, default: '' },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  createdAt: { type: String, default: '' },
}, { _id: false });

const TimelineEntrySchema = new mongoose.Schema({
  status: { type: String, default: '' },
  date: { type: String, default: '' },
  detail: { type: String, default: '' },
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  author: { type: String, default: '' },
  avatar: { type: String, default: '' },
  text: { type: String, default: '' },
  date: { type: String, default: '' },
}, { _id: false });

const ResolutionSchema = new mongoose.Schema({
  id: { type: String, default: '' },
  submittedBy: { type: String, default: '' },
  description: { type: String, default: '' },
  afterImageUrl: { type: String, default: '' },
  submittedAt: { type: String, default: '' },
  reviewStatus: { type: String, default: 'PENDING' },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: String, default: null },
  adminNotes: { type: String, default: null },
}, { _id: false });

// Define Issue schema matching the full issue document shape
const IssueSchema = new mongoose.Schema({
  id: { type: String, required: true },
  issueNumber: { type: String },
  ticketId: { type: String },
  title: { type: String },
  category: { type: String },
  description: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  location: { type: String },
  address: { type: String },
  assignedAuthority: { type: String },
  departmentType: { type: String },
  status: { type: String },
  priority: { type: String },
  escalationScore: { type: Number },
  imageUrl: { type: String },
  geoData: { type: GeoDataSchema, default: undefined },
  jurisdiction: { type: JurisdictionSchema, default: undefined },
  reporter: { type: ReporterSchema, default: undefined },
  reportsList: { type: [ReportSchema], default: undefined },
  timeline: { type: [TimelineEntrySchema], default: undefined },
  comments: { type: [CommentSchema], default: undefined },
  resolution: { type: ResolutionSchema, default: undefined },
  upvotes: { type: Number, default: 0 },
  upvotedByUser: { type: Boolean, default: false },
  linkedReportsCount: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create model
const Issue = mongoose.model('Issue', IssueSchema);

export class IssueModel {
  /** Retrieve all issues. */
  static async findAll() {
    try {
      const docs = await Issue.find().sort({ createdAt: -1 }).lean();
      return docs;
    } catch (err) {
      console.warn('MongoDB read error, falling back to in‑memory store');
      return getIssuesStore();
    }
  }

  /** Seed the demo issues into MongoDB once, only if the collection is empty. */
  static async seedIfEmpty() {
    try {
      const existingCount = await Issue.countDocuments();
      if (existingCount > 0) return;
      await Issue.insertMany(
        seedIssues.map((seed) => ({
          ...seed,
          createdAt: new Date(seed.createdAt),
          updatedAt: new Date(seed.createdAt)
        }))
      );
      console.log('🌱 Seeded MongoDB with demo civic issues.');
    } catch (err) {
      console.warn('MongoDB seed skipped:', err.message);
    }
  }

  /** Find by ID (Mongo _id or custom id). */
  static async findById(id) {
    // Try MongoDB first
    const doc = await Issue.findOne({ $or: [{ _id: id }, { id }, { issueNumber: id }, { ticketId: id }] }).lean();
    if (doc) return doc;
    // Fallback to in‑memory store
    const issues = getIssuesStore();
    return issues.find(i => i.id === id || i.issueNumber === id || i.ticketId === id);
  }

  /** Create a new issue document. */
  static async create(issueData) {
    // Save to in‑memory store for immediate availability
    const issues = getIssuesStore();
    issues.unshift(issueData);
    setIssuesStore(issues);

    try {
      const newDoc = new Issue(issueData);
      await newDoc.save();
      return newDoc.toObject();
    } catch (err) {
      console.warn('MongoDB write error, data saved only in‑memory');
      return issueData;
    }
  }
}

export default IssueModel;