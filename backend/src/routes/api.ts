import { Router, Request, Response } from 'express';
import { store } from '../store/index.js';
import { v4 as uuidv4 } from 'uuid';

export const apiRouter = Router();

// 1. Devices
apiRouter.get('/devices', (_req: Request, res: Response) => {
  res.json({ success: true, data: store.getDevices() });
});

apiRouter.get('/devices/:id', (req: Request, res: Response) => {
  const device = store.getDeviceById(req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
  res.json({ success: true, data: device });
});

apiRouter.post('/devices/pair', (req: Request, res: Response) => {
  const { pairingCode, name, model, osVersion } = req.body;
  if (!pairingCode) return res.status(400).json({ success: false, error: 'Pairing code required' });

  let device = store.getDeviceByPairingCode(pairingCode);
  if (device) {
    device = store.updateDevice(device.id, {
      isPaired: true,
      name: name || device.name,
      model: model || device.model,
      osVersion: osVersion || device.osVersion,
      status: 'online',
      lastSeen: new Date().toISOString()
    });
    return res.json({ success: true, message: 'Device paired successfully', data: device });
  }

  // Create new device if not found with code
  const newDev = store.addDevice({
    id: `child-${uuidv4().substring(0, 8)}`,
    name: name || 'Child Phone',
    pairingCode: pairingCode || Math.floor(100000 + Math.random() * 900000).toString(),
    isPaired: true,
    model: model || 'Android Device',
    osVersion: osVersion || 'Android 14',
    batteryLevel: 100,
    isCharging: false,
    isLocked: false,
    lastSeen: new Date().toISOString(),
    status: 'online'
  });

  res.json({ success: true, message: 'New device paired', data: newDev });
});

// Generate new pairing code for parent to show QR
apiRouter.post('/devices/generate-pairing', (req: Request, res: Response) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const id = `child-${uuidv4().substring(0, 8)}`;
  const dev = store.addDevice({
    id,
    name: req.body.name || 'New Child Device',
    pairingCode: code,
    isPaired: false,
    model: 'Pending Enrollment',
    osVersion: 'Android',
    batteryLevel: 100,
    isCharging: false,
    isLocked: false,
    lastSeen: new Date().toISOString(),
    status: 'offline'
  });
  res.json({ success: true, data: { deviceId: id, pairingCode: code } });
});

// 2. Screen Time Policies
apiRouter.get('/devices/:id/screentime', (req: Request, res: Response) => {
  const policy = store.getScreenTimePolicy(req.params.id);
  res.json({ success: true, data: policy });
});

apiRouter.put('/devices/:id/screentime', (req: Request, res: Response) => {
  const updated = store.updateScreenTimePolicy(req.params.id, req.body);
  res.json({ success: true, data: updated });
});

// 3. Web Filtering Policies
apiRouter.get('/devices/:id/webfilter', (req: Request, res: Response) => {
  const policy = store.getWebFilterPolicy(req.params.id);
  res.json({ success: true, data: policy });
});

apiRouter.put('/devices/:id/webfilter', (req: Request, res: Response) => {
  const updated = store.updateWebFilterPolicy(req.params.id, req.body);
  res.json({ success: true, data: updated });
});

// 4. Locations & History
apiRouter.get('/devices/:id/locations', (req: Request, res: Response) => {
  const locations = store.getLocations(req.params.id, Number(req.query.limit) || 50);
  res.json({ success: true, data: locations });
});

apiRouter.post('/devices/:id/locations', (req: Request, res: Response) => {
  const { latitude, longitude, accuracy, address } = req.body;
  const point = {
    id: uuidv4(),
    deviceId: req.params.id,
    latitude,
    longitude,
    accuracy: accuracy || 10,
    timestamp: new Date().toISOString(),
    address
  };
  store.addLocation(point);
  res.json({ success: true, data: point });
});

// 5. App Usage
apiRouter.get('/devices/:id/usage', (req: Request, res: Response) => {
  const usage = store.getAppUsage(req.params.id);
  res.json({ success: true, data: usage });
});

// 6. Screenshots Gallery
apiRouter.get('/devices/:id/screenshots', (req: Request, res: Response) => {
  const shots = store.getScreenshots(req.params.id);
  res.json({ success: true, data: shots });
});

apiRouter.post('/devices/:id/screenshots', (req: Request, res: Response) => {
  const { imageBase64, triggeredBy } = req.body;
  const shot = {
    id: uuidv4(),
    deviceId: req.params.id,
    imageUrl: imageBase64,
    timestamp: new Date().toISOString(),
    triggeredBy: triggeredBy || 'manual'
  };
  store.addScreenshot(shot);
  res.json({ success: true, data: shot });
});

// 7. Safety Alerts
apiRouter.get('/alerts', (req: Request, res: Response) => {
  const deviceId = req.query.deviceId as string | undefined;
  const alerts = store.getAlerts(deviceId);
  res.json({ success: true, data: alerts });
});
