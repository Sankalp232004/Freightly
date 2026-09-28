import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Protect all routes
router.use(requireAuth);

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination, weightKg, cargoClass, gstRegistered } = req.body;
    
    if (!origin || !destination || !weightKg || !cargoClass) {
      return res.status(400).json({ error: 'Missing required lane details' });
    }

    const lane = await prisma.savedLane.create({
      data: {
        userId: req.userId!,
        origin,
        destination,
        weightKg,
        cargoClass,
        gstRegistered
      }
    });

    res.json(lane);
  } catch (error) {
    console.error('Error saving lane:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const lanes = await prisma.savedLane.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' }
    });
    res.json(lanes);
  } catch (error) {
    console.error('Error fetching lanes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const lane = await prisma.savedLane.findUnique({
      where: { id: req.params.id }
    });

    if (!lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

    if (lane.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.savedLane.delete({
      where: { id: lane.id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lane:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
