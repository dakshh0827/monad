import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Set or update display name (Database only - no blockchain)
export const setDisplayName = async (req, res, next) => {
  try {
    const { walletAddress, displayName } = req.body;
    
    if (!walletAddress || !displayName) {
      return res.status(400).json({ error: 'Wallet address and display name are required' });
    }
    
    // Validate display name length
    if (displayName.trim().length < 1 || displayName.trim().length > 32) {
      return res.status(400).json({ error: 'Display name must be 1-32 characters' });
    }
    
    // Upsert user (create if doesn't exist, update if exists)
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { 
        displayName: displayName.trim(),
        updatedAt: new Date()
      },
      create: { 
        walletAddress,
        displayName: displayName.trim()
      }
    });
    
    console.log('✅ Display name saved to database:', walletAddress, '→', displayName.trim());
    
    res.json({ 
      success: true,
      message: 'Display name saved successfully',
      user: {
        walletAddress: user.walletAddress,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Set display name error:', error.message);
    next(error);
  }
};

// Get user by wallet address
export const getUserByWallet = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error.message);
    next(error);
  }
};

// Get or create user
export const getOrCreateUser = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress }
      });
      console.log('✅ New user created:', walletAddress);
    } else {
      console.log('✅ Existing user found:', walletAddress);
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get or create user error:', error.message);
    next(error);
  }
};
