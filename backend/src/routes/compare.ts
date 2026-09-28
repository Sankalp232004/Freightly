import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getCostOptions, ShipmentDetails } from '../services/costEngine';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  try {
    const shipment: ShipmentDetails = req.body;
    
    // Basic validation
    if (!shipment.distanceKm || !shipment.weightKg || !shipment.category) {
      return res.status(400).json({ error: 'Missing required shipment details' });
    }

    // Fetch rates from DB and calculate
    const options = await getCostOptions(shipment, prisma);
    
    // Save quote to DB
    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        origin: shipment.origin || 'Unknown',
        destination: shipment.destination || 'Unknown',
        distanceKm: shipment.distanceKm,
        weightKg: shipment.weightKg,
        category: shipment.category,
        isRcmRegistered: shipment.isRegisteredBusiness !== undefined ? shipment.isRegisteredBusiness : true,
        results: {
          create: options.map(opt => ({
            mode: opt.mode,
            totalCost: opt.costBreakdown.totalCost,
            transitDaysMin: opt.transitTimeDays[0],
            transitDaysMax: opt.transitTimeDays[1],
            isOptimal: opt.isOptimal
          }))
        }
      }
    });

    res.json({ options });
  } catch (error) {
    console.error('Error calculating costs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
