import UserModel from '../models/User.js';
import { success, error } from '../helpers/responseHelper.js';

/**
 * POST /api/users/register
 * Register a new citizen account
 */
export async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return error(res, 'Name is required', 400);
    }
    if (!email || !email.trim()) {
      return error(res, 'Email address is required', 400);
    }
    if (!password || password.trim().length < 4) {
      return error(res, 'Password must be at least 4 characters long', 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    const existing = await UserModel.findByEmail(cleanEmail);
    if (existing) {
      return error(res, 'An account with this email address already exists.', 400);
    }

    const newUser = await UserModel.create({
      name: name.trim(),
      email: cleanEmail,
      password: password.trim(),
      badge: 'Active Citizen'
    });

    const token = `usr_auth_token_${newUser.id || newUser._id}_${Date.now()}`;

    return success(res, {
      token,
      user: {
        id: newUser.id || newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        badge: newUser.badge,
        createdAt: newUser.createdAt
      }
    }, 'Account created successfully! Welcome to CivicSense.', 201);
  } catch (err) {
    console.error('Error registering user:', err);
    return error(res, 'Server error during user registration', 500);
  }
}

/**
 * POST /api/users/login
 * Log in as a citizen
 */
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and Password are required', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findByEmail(cleanEmail);

    if (!user) {
      return error(res, 'No citizen account found with this email address.', 401);
    }

    if (user.password !== password.trim()) {
      return error(res, 'Invalid password. Please check your credentials.', 401);
    }

    const token = `usr_auth_token_${user.id || user._id}_${Date.now()}`;

    return success(res, {
      token,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        badge: user.badge,
        createdAt: user.createdAt
      }
    }, `Welcome back, ${user.name}!`);
  } catch (err) {
    console.error('Error logging in user:', err);
    return error(res, 'Server error during user authentication', 500);
  }
}

/**
 * GET /api/users/me
 * Get profile of current logged-in citizen
 */
export async function getUserProfile(req, res) {
  try {
    const emailHeader = req.headers['x-user-email'] || req.query.email;
    if (!emailHeader) {
      return error(res, 'Not authenticated', 401);
    }

    const user = await UserModel.findByEmail(emailHeader);
    if (!user) {
      return error(res, 'User profile not found', 404);
    }

    return success(res, {
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        badge: user.badge
      }
    }, 'User profile retrieved.');
  } catch (err) {
    return error(res, 'Failed to fetch user profile', 500);
  }
}
