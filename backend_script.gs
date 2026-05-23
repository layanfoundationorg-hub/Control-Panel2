/**
 * Layan Foundation Platform - Google Apps Script Backend
 * 
 * Instructions:
 * 1. Open Google Sheets.
 * 2. Go to Extensions -> Apps Script.
 * 3. Paste this code.
 * 4. Deploy as Web App -> Execute as Me -> Access: Anyone.
 * 5. Copy the Web App URL to the 'api.js' file in your project.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    switch (action) {
      case 'getNews':
        return getSheetData('News');
      case 'getProjects':
        return getSheetData('Projects');
      case 'getUsers':
        return getSheetData('Users');
      case 'getInitiatives':
        return getSheetData('Initiatives');
      case 'getStats':
        return getSheetData('Statistics');
      case 'getMedia':
        return getSheetData('Media');
      default:
        return createResponse({ error: 'Invalid action' });
    }
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

function doPost(e) {
  let data;
  try {
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
  } catch (error) {
    data = e.parameter;
  }
  
  const action = data.action;
  let payload = data.payload || data;
  
  // If payload is a string (from FormData), parse it
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (e) {}
  }
  
  try {
    switch (action) {
      case 'login':
        return handleLogin(payload);
      case 'verifyOTP':
        return handleVerifyOTP(payload);
      case 'addUser':
        return addRowToSheet('Users', payload);
      case 'addNews':
        return addRowToSheet('News', payload);
      case 'addProject':
        return addRowToSheet('Projects', payload);
      case 'addInitiative':
        return addRowToSheet('Initiatives', payload);
      case 'addMedia':
        return addRowToSheet('Media', payload);
      case 'deleteRow':
        return deleteRow(payload.sheet, payload.id, payload.header);
      case 'updateStats':
        return updateStats(payload);
      case 'uploadFile':
        return handleFileUpload(payload);
      default:
        return createResponse({ error: 'Invalid POST action' });
    }
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

// --- Helper Functions ---

function getSheetData(sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createResponse({ error: 'Sheet not found' });
  
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1);
  
  const data = rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  return createResponse(data);
}

function addRowToSheet(sheetName, payload) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createResponse({ error: 'Sheet not found' });
  
  // Handle File Upload if present in payload
  if (payload.FileData) {
    try {
      const folderName = 'Layan Media';
      const folders = DriveApp.getFoldersByName(folderName);
      const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
      
      const blob = Utilities.newBlob(Utilities.base64Decode(payload.FileData), payload.FileType, payload.FileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // Using the direct content URL format which works better for bypassings CORS and embedding
      const fileUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
      payload.Images = fileUrl; // For News/Initiatives
      payload.URL = fileUrl;    // For Media
    } catch (e) {
      return createResponse({ error: 'File upload failed: ' + e.toString() });
    }
  }
  
  const headers = sheet.getDataRange().getValues()[0];
  const newRow = headers.map(header => payload[header] || '');
  
  sheet.appendRow(newRow);
  return createResponse({ success: true, message: 'Data added successfully' });
}

function deleteRow(sheetName, idValue, idHeader = 'ID') {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createResponse({ error: 'Sheet not found' });
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf(idHeader);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == idValue) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true, message: 'Deleted successfully' });
    }
  }
  return createResponse({ error: 'Row not found' });
}

function handleLogin(data) {
  const MASTER_EMAIL = 'jjbb3782@gmail.com';
  const MASTER_PASS = '202025';
  
  let userObj = null;

  if (data.email === MASTER_EMAIL && data.password === MASTER_PASS) {
    userObj = { Name: 'المطور الرئيسي', Email: MASTER_EMAIL, Role: 'master_admin' };
  } else {
    const sheet = ss.getSheetByName('Users');
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const rows = values.slice(1);
    
    const user = rows.find(row => row[2] === data.email && row[3] === data.password);
    if (user) {
      userObj = {};
      headers.forEach((header, index) => userObj[header] = user[index]);
      delete userObj.Password;
    }
  }
  
  if (userObj) {
    // Generate and send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const cache = CacheService.getScriptCache();
    cache.put('OTP_' + data.email, JSON.stringify({ otp: otp, user: userObj }), 600); // 10 minutes
    
    const subject = "رمز التحقق - منصة ليان";
    const body = "رمز التحقق الخاص بك هو: " + otp + "\n\nهذا الرمز صالح لمدة 10 دقائق.";
    
    try {
      MailApp.sendEmail(data.email, subject, body);
      return createResponse({ success: true, requireOTP: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.' });
    } catch(e) {
      return createResponse({ success: false, error: 'فشل في إرسال البريد الإلكتروني: ' + e.message });
    }
  } else {
    return createResponse({ success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
  }
}

function handleVerifyOTP(data) {
  const cache = CacheService.getScriptCache();
  const cachedDataStr = cache.get('OTP_' + data.email);
  
  if (cachedDataStr) {
    const cachedData = JSON.parse(cachedDataStr);
    if (cachedData.otp === data.otp) {
      cache.remove('OTP_' + data.email);
      return createResponse({ success: true, user: cachedData.user });
    }
  }
  return createResponse({ success: false, error: 'رمز التحقق غير صحيح أو منتهي الصلاحية.' });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Initial setup: Create sheets if they don't exist
 */
function setup() {
  const sheets = {
    'Users': ['ID', 'Name', 'Email', 'Password', 'Role', 'CreatedAt', 'LastLogin', 'Status'],
    'Projects': ['ID', 'Title', 'Description', 'Category', 'Region', 'Status', 'Date', 'Images', 'Attachments', 'Beneficiaries'],
    'Initiatives': ['Title', 'Description', 'Images', 'PublishDate', 'Author', 'Status'],
    'News': ['Title', 'Content', 'Images', 'Tags', 'Category', 'Date'],
    'Media': ['Type', 'URL', 'Size', 'UploadDate', 'Uploader'],
    'Statistics': ['Label', 'Value'],
    'ActivityLogs': ['Timestamp', 'User', 'Action', 'Details']
  };
  
  for (const name in sheets) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, sheets[name].length).setValues([sheets[name]]);
    }
  }
}

function testDrive() {
  // هذه الدالة فقط لاختبار وتفعيل صلاحيات جوجل درايف
  const folderName = 'Layan Media Test';
  const folder = DriveApp.createFolder(folderName);
  Logger.log('تم إنشاء المجلد بنجاح: ' + folder.getName());
  DriveApp.removeFolder(folder); // حذفه فوراً بعد الاختبار
  return 'Success';
}
