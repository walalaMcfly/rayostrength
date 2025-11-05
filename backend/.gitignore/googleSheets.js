const { google } = require('googleapis');
const envConfig = require('./environment.js');


class GoogleSheetsService {
  constructor() {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials: envConfig.getGoogleCredentials(),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.spreadsheetId = envConfig.getSheetId();
      
      console.log('✅ Google Sheets service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets service:', error.message);
      throw error;
    }
  }


}

class GoogleSheetsService {
  constructor() {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials: envConfig.getGoogleCredentials(),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.spreadsheetId = envConfig.getSheetId();
      
      console.log('✅ Google Sheets service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets service:', error.message);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      return { healthy: true, message: 'Google Sheets connection OK' };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }

  async readSheet(sheetName) {
    try {
      console.log(`📖 Reading sheet: ${sheetName}`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      
      const data = response.data.values || [];
      console.log(`✅ Read ${data.length} rows from ${sheetName}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Error reading sheet ${sheetName}:`, error.message);
      throw new Error(`Failed to read ${sheetName}: ${error.message}`);
    }
  }

  async appendRow(sheetName, rowData) {
    try {
      console.log(`📝 Appending row to ${sheetName}:`, rowData);
      
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [rowData] },
      });
      
      console.log(`✅ Row appended to ${sheetName}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error appending to ${sheetName}:`, error.message);
      throw new Error(`Failed to append to ${sheetName}: ${error.message}`);
    }
  }

 
  async findRow(sheetName, columnIndex, value) {
    try {
      const data = await this.readSheet(sheetName);
      return data.findIndex(row => row[columnIndex] === value);
    } catch (error) {
      console.error(`❌ Error finding row in ${sheetName}:`, error.message);
      throw error;
    }
  }

 
  async updateRow(sheetName, rowIndex, newData) {
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
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

