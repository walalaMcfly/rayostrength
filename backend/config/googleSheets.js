const { google } = require('googleapis');
const envConfig = require('./environment.js');

class GoogleSheetsService {
  constructor() {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials: envConfig.getGoogleCredentials(),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.defaultSpreadsheetId = envConfig.getSheetId(); // Puede ser null
      
      console.log('✅ Google Sheets service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets service:', error.message);
      throw error;
    }
  }

  async healthCheck() {
    try {
      // Solo verifica si tenemos credenciales válidas
      await this.auth.getClient();
      return { 
        healthy: true, 
        message: 'Google Sheets connection OK',
        hasDefaultSheet: !!this.defaultSpreadsheetId
      };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }

  // 🆕 NUEVO MÉTODO: Leer cualquier hoja por ID y nombre de pestaña
  async readAnySheet(spreadsheetId, sheetName = '4 semanas') {
    try {
      console.log(`📖 Reading custom sheet: ${sheetName} from ${spreadsheetId}`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      
      let data = response.data.values || [];
      console.log(`✅ Read ${data.length} rows from custom sheet`);

      // Filtrar filas vacías
      if (data.length > 0) {
        let startRow = 0;
        for (let i = 0; i < data.length; i++) {
          if (data[i] && data[i].length > 0 && data[i][0]) {
            startRow = i;
            break;
          }
        }
        console.log(`📊 Datos empiezan en fila: ${startRow + 1}`);
        data = data.slice(startRow);
      }

      console.log(`📊 Datos después de filtrar: ${data.length} filas`);
      return data;
    } catch (error) {
      console.error(`❌ Error reading custom sheet ${spreadsheetId}:`, error.message);
      throw new Error(`Failed to read custom sheet: ${error.message}`);
    }
  }

  // 🔄 MÉTODO ORIGINAL (para compatibilidad con rutinas generales)
  async readSheet(sheetName) {
    if (!this.defaultSpreadsheetId) {
      throw new Error('No default spreadsheet configured. Use readAnySheet() for custom sheets.');
    }
    
    return this.readAnySheet(this.defaultSpreadsheetId, sheetName);
  }

  async updateRow(sheetName, rowIndex, newData) {
    try {
      if (!this.defaultSpreadsheetId) {
        throw new Error('No default spreadsheet configured for updates.');
      }

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.defaultSpreadsheetId,
        range: `${sheetName}!A${rowIndex + 1}:Z${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [newData] },
      });
      
      console.log(`✅ Updated row ${rowIndex + 1} in ${sheetName}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error updating row in ${sheetName}:`, error.message);
      throw error;
    }
  }

  generateId() {
    return `RS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getRutinasSemana(semana) {
    try {
      const data = await this.readSheet(semana);
      return data;
    } catch (error) {
      console.error(`Error obteniendo rutinas de ${semana}:`, error);
      throw error;
    }
  }

  async updateRutina(semana, ejercicioId, updates) {
    try {
      const data = await this.readSheet(semana);
      const rowIndex = this.findRutinaRow(data, ejercicioId);
      
      if (rowIndex === -1) {
        throw new Error(`Ejercicio ${ejercicioId} no encontrado`);
      }
      
      await this.updateRow(semana, rowIndex, updates);
      return true;
    } catch (error) {
      console.error(`Error actualizando rutina:`, error);
      throw error;
    }
  }

  findRutinaRow(data, ejercicioId) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === ejercicioId || data[i][1] === ejercicioId) {
        return i;
      }
    }
    return -1;
  }
}

module.exports = new GoogleSheetsService();