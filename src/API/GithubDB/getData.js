import { GithubStorage } from "../../lib/githubStorage.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { sessionId, collection } = req.query;
    
    if (!sessionId || !collection) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and collection are required'
      });
    }
    
    const db = await GithubStorage.getDB(sessionId);
    
    const filePath = `database/${collection}.json`;
    const data = await db.readFile(filePath);
    
    if (!data) {
      return res.json({
        success: true,
        data: { items: [], metadata: {} }
      });
    }
    
    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
