import { GithubStorage } from "../../lib/githubStorage.js";

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { sessionId, collection, itemId, field } = req.body;
    
    if (!sessionId || !collection || !itemId || !field) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, collection, itemId and field are required'
      });
    }
    
    const db = await GithubStorage.getDB(sessionId);
    
    const filePath = `database/${collection}.json`;
    const existingData = await db.readFile(filePath);
    
    if (!existingData) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
    }
    
    const itemIndex = existingData.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    delete existingData.items[itemIndex][field];
    existingData.items[itemIndex].updatedAt = new Date().toISOString();
    existingData.metadata.lastUpdated = new Date().toISOString();
    
    await db.updateFile(filePath, JSON.stringify(existingData, null, 2), `Delete field ${field} from ${collection}/${itemId}`);
    
    res.json({
      success: true,
      message: 'Field deleted successfully',
      data: existingData.items[itemIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
