class EnvironmentConfig {
  constructor() {
    this.requiredVariables = [
      'GOOGLE_PROJECT_ID',
      'GOOGLE_PRIVATE_KEY', 
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_SHEET_ID',
      'JWT_SECRET'
    ];
    
    this.validateConfig();
  }

  
  validateConfig() {
    const missing = this.requiredVariables.filter(varName => !this.get(varName));
    
    if (missing.length > 0) {
      throw new Error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('✅ All required environment variables are set');
  }

  get(variableName) {
    return process.env[variableName];
  }

  getGoogleCredentials() {
    return {
      type: "service_account",
      project_id: this.get('GOOGLE_PROJECT_ID'),
      private_key: this.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      client_email: this.get('GOOGLE_CLIENT_EMAIL'),
    };
  }

  getSheetId() {
    return this.get('GOOGLE_SHEET_ID');
  }
}

module.exports = new EnvironmentConfig();


const getGoogleCredentials = () => {
  // Si estamos en Railway (producción), usa las variables de entorno
  if (process.env.GOOGLE_CREDENTIALS) {
    try {
      return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (error) {
      throw new Error('Error parsing GOOGLE_CREDENTIALS environment variable');
    }
  } else {
    // Si estamos en desarrollo, usa el archivo local
    try {
      return require('./config/credentials.json');
    } catch (error) {
      throw new Error('Google credentials not found in development');
    }
  }
};

const getSheetId = () => {
  // Usa la variable de entorno si existe, sino una por defecto (para desarrollo)
  return process.env.GOOGLE_SHEET_ID || 'tu_sheet_id_por_defecto';
};

module.exports = {
  getGoogleCredentials,
  getSheetId
};


