import { GithubStorage } from "../../lib/githubStorage.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { sessionId, collection, data } = req.body;
    
    if (!sessionId || !collection || !data) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, collection and data are required'
      });
    }
    
    const db = await GithubStorage.getDB(sessionId);
    
    const filePath = `database/${collection}.json`;
    let existingData = await db.readFile(filePath);
    
    if (!existingData) {
      existingData = { items: [], metadata: { createdAt: new Date().toISOString() } };
    }
    
    const newItem = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString()
    };
    
    existingData.items.push(newItem);
    existingData.metadata.lastUpdated = new Date().toISOString();
    
    await db.updateFile(filePath, JSON.stringify(existingData, null, 2), `Add item to ${collection}`);
    
    res.json({
      success: true,
      message: 'Data added successfully',
      data: newItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
