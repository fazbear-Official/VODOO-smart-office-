import { GithubStorage } from "../../lib/githubStorage.js";

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { sessionId, collection, itemId } = req.body;
    
    if (!sessionId || !collection || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, collection and itemId are required'
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
    
    const deletedItem = existingData.items.splice(itemIndex, 1)[0];
    existingData.metadata.lastUpdated = new Date().toISOString();
    
    await db.updateFile(filePath, JSON.stringify(existingData, null, 2), `Delete item ${itemId} from ${collection}`);
    
    res.json({
      success: true,
      message: 'Data deleted successfully',
      data: deletedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
