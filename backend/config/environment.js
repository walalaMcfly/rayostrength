const getGoogleCredentials = () => {
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      console.log('✅ Usando credenciales de Railway');
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (error) {
      console.error('❌ Error parseando GOOGLE_CREDENTIALS:', error);
      throw new Error('Error parsing GOOGLE_CREDENTIALS environment variable');
    }
  } 
  
  else {
    try {
      console.log('✅ Usando credenciales locales');
      return require('./credentials.json');
    } catch (error) {
      console.error('❌ Error cargando credenciales locales:', error);
      throw new Error('Google credentials not found in development');
    }
  }
};


const getSheetId = () => {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    console.warn('⚠️ GOOGLE_SHEET_ID no configurado (opcional para rutinas personalizadas)');
    return null; 
  }
  console.log('📊 Sheet ID general:', sheetId);
  return sheetId;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('❌ JWT_SECRET no configurado');
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
};

module.exports = {
  getGoogleCredentials,
  getSheetId, 
  getJwtSecret
};